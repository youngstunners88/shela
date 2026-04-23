// Shela Stake Rollover — Gamified Escalation
// When someone gets stood up, they choose: cash out or double down

import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

interface RolloverAccount {
  userId: string;
  walletAddress: string;
  accumulatedStake: number; // Total SOL available for rollover
  consecutiveWins: number; // Successful meets that compounded
  tier: 'brave' | 'bold' | 'fearless' | 'legend';
  liquidationLockUntil: number; // Timestamp — can't cash out early
}

interface RolloverDecision {
  matchId: string;
  victimId: string; // The one who showed up
  noShowId: string; // The ghost
  originalStake: number;
  decision: 'liquidate' | 'leverage';
  leveragedMultiplier: number; // 1.5x, 2x, 3x based on streak
}

// Tier multipliers and liquidation locks
const TIER_CONFIG = {
  brave: { multiplier: 1.5, lockHours: 0, minStreak: 0 },
  bold: { multiplier: 2.0, lockHours: 24, minStreak: 1 },
  fearless: { multiplier: 3.0, lockHours: 72, minStreak: 3 },
  legend: { multiplier: 5.0, lockHours: 168, minStreak: 5 }, // 1 week lock
};

// When someone gets ghosted, they choose their fate
export async function handleGhostedStake(
  db: any,
  matchId: string,
  victimId: string,
  noShowId: string,
  stakeAmount: number
): Promise<{
  decisionRequired: true;
  options: {
    liquidate: {
      amount: number;
      instant: boolean;
      message: string;
    };
    leverage: {
      multiplier: number;
      newStake: number;
      nextTier: string;
      risk: string;
      message: string;
    };
  };
}> {
  // Get victim's rollover history
  const rollover = await db.get(`
    SELECT * FROM rollover_accounts WHERE user_id = ?
  `, [victimId]);
  
  const currentStreak = rollover?.consecutive_wins || 0;
  const accumulated = rollover?.accumulated_stake || 0;
  
  // Calculate next tier
  let nextTier: 'brave' | 'bold' | 'fearless' | 'legend' = 'brave';
  if (currentStreak >= 5) nextTier = 'legend';
  else if (currentStreak >= 3) nextTier = 'fearless';
  else if (currentStreak >= 1) nextTier = 'bold';
  
  const config = TIER_CONFIG[nextTier];
  const newStake = (accumulated + stakeAmount) * config.multiplier;
  
  return {
    decisionRequired: true,
    options: {
      liquidate: {
        amount: accumulated + stakeAmount,
        instant: !rollover || Date.now() > rollover.liquidation_lock_until,
        message: accumulated > 0 
          ? `Cash out ${(accumulated + stakeAmount).toFixed(3)} SOL now. Your ${currentStreak}x streak ends.`
          : `Take the ${stakeAmount.toFixed(3)} SOL compensation.`
      },
      leverage: {
        multiplier: config.multiplier,
        newStake,
        nextTier,
        risk: nextTier === 'legend' 
          ? 'If next person ghosts too, you lose everything.'
          : `If ghosted again, you lose ${(newStake * 0.5).toFixed(3)} SOL (50% burn, 50% to next victim).`,
        message: `Double down to ${newStake.toFixed(3)} SOL (${config.multiplier}x). You become ${nextTier.toUpperCase()}.`
      }
    }
  };
}

// Execute the victim's choice
export async function executeDecision(
  db: any,
  decision: RolloverDecision,
  victimWallet: string
): Promise<{
  success: boolean;
  txHash?: string;
  newBalance?: number;
  tier?: string;
  message: string;
}> {
  if (decision.decision === 'liquidate') {
    // Transfer all accumulated to victim's wallet
    const total = decision.originalStake + (await getAccumulatedStake(db, decision.victimId));
    
    // Reset streak
    await db.run(`
      UPDATE rollover_accounts 
      SET accumulated_stake = 0, consecutive_wins = 0, tier = 'brave'
      WHERE user_id = ?
    `, [decision.victimId]);
    
    return {
      success: true,
      txHash: 'liquidate_tx_placeholder',
      newBalance: total,
      message: `Liquidated ${total.toFixed(3)} SOL. Streak reset.`
    };
  }
  
  // LEVERAGE: Compound the stake
  const accumulated = await getAccumulatedStake(db, decision.victimId);
  const newTotal = (accumulated + decision.originalStake) * decision.leveragedMultiplier;
  const currentStreak = await getStreak(db, decision.victimId);
  
  // Check for liquidation lock
  const lockHours = TIER_CONFIG[decision.tier as keyof typeof TIER_CONFIG].lockHours;
  const lockUntil = Date.now() + lockHours * 3600 * 1000;
  
  await db.run(`
    INSERT INTO rollover_accounts (user_id, wallet_address, accumulated_stake, consecutive_wins, tier, liquidation_lock_until)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      accumulated_stake = ?,
      consecutive_wins = consecutive_wins + 1,
      tier = ?,
      liquidation_lock_until = ?
  `, [
    decision.victimId, victimWallet, newTotal, currentStreak + 1, decision.tier, lockUntil,
    newTotal, decision.tier, lockUntil
  ]);
  
  return {
    success: true,
    newBalance: newTotal,
    tier: decision.tier,
    message: `🎰 LEVERAGED to ${newTotal.toFixed(3)} SOL! You're now ${decision.tier.toUpperCase()}. Lock expires in ${lockHours}h.`
  };
}

// When a leveraged user successfully meets, they unlock rewards
export async function successfulMeetPayout(
  db: any,
  userId: string,
  matchStake: number
): Promise<{
  released: number;
  profit: number;
  message: string;
  newTier: string;
}> {
  const rollover = await db.get(`SELECT * FROM rollover_accounts WHERE user_id = ?`, [userId]);
  
  if (!rollover || rollover.accumulated_stake === 0) {
    return { released: matchStake, profit: 0, message: 'Standard stake returned.', newTier: 'brave' };
  }
  
  // Release accumulated stake + current match stake
  const totalReleased = rollover.accumulated_stake + matchStake;
  
  // Calculate profit (the "house edge" of successful gambling)
  const profit = rollover.accumulated_stake * 0.1; // 10% bonus for successful streak
  
  // Reset but keep streak count for tier
  await db.run(`
    UPDATE rollover_accounts 
    SET accumulated_stake = 0, liquidation_lock_until = 0
    WHERE user_id = ?
  `, [userId]);
  
  const tierMessages: Record<string, string> = {
    brave: 'You played it safe.',
    bold: 'BOLD move paid off!',
    fearless: 'FEARLESS legend!',
    legend: 'MYTHICAL status achieved.'
  };
  
  return {
    released: totalReleased,
    profit,
    message: `${tierMessages[rollover.tier]} Released ${totalReleased.toFixed(3)} SOL (+${profit.toFixed(3)} bonus).`,
    newTier: rollover.tier
  };
}

// If a leveraged user gets ghosted AGAIN — catastrophic loss
export async function catastrophicGhost(
  db: any,
  victimId: string,
  noShowId: string
): Promise<{
  burned: number;
  passedToNextVictim: number;
  message: string;
  reset: boolean;
}> {
  const rollover = await db.get(`SELECT * FROM rollover_accounts WHERE user_id = ?`, [victimId]);
  
  if (!rollover || rollover.accumulated_stake === 0) {
    return { burned: 0, passedToNextVictim: 0, message: 'No rollover stake to lose.', reset: false };
  }
  
  const totalLost = rollover.accumulated_stake;
  const burned = totalLost * 0.5; // 50% burned forever
  const passedToNext = totalLost * 0.5; // 50% goes to treasury for next victim
  
  // Reset everything
  await db.run(`DELETE FROM rollover_accounts WHERE user_id = ?`, [victimId]);
  
  return {
    burned,
    passedToNextVictim: passedToNext,
    message: `💀 CATASTROPHIC LOSS. ${totalLost.toFixed(3)} SOL gone. ${burned.toFixed(3)} burned, ${passedToNext.toFixed(3)} to victim pool.`,
    reset: true
  };
}

// Helper: Get accumulated stake
async function getAccumulatedStake(db: any, userId: string): Promise<number> {
  const row = await db.get(`SELECT accumulated_stake FROM rollover_accounts WHERE user_id = ?`, [userId]);
  return row?.accumulated_stake || 0;
}

async function getStreak(db: any, userId: string): Promise<number> {
  const row = await db.get(`SELECT consecutive_wins FROM rollover_accounts WHERE user_id = ?`, [userId]);
  return row?.consecutive_wins || 0;
}

// Database schema additions
export const ROLLOVER_SCHEMA = `
CREATE TABLE IF NOT EXISTS rollover_accounts (
  user_id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  accumulated_stake REAL DEFAULT 0,
  consecutive_wins INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'brave',
  liquidation_lock_until INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rollover_tier ON rollover_accounts(tier);
`;
