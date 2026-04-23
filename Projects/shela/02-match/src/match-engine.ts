import { generateText } from 'ai';

// Shela Match Engine
// Mutual swipe system with safety-weighted ranking

interface VerifiedProfile {
  userId: string;
  riskScore: number;
  recommendedTier: 'text' | 'voice' | 'video' | 'meetup';
  verificationSummary: string;
  redFlags: string[];
  greenFlags: string[];
  verificationDate: string;
  stakeRequired: number;
}

interface SwipeAction {
  swiperId: string;
  targetId: string;
  direction: 'left' | 'right';
  timestamp: number;
}

interface Match {
  userA: string;
  userB: string;
  matchedAt: number;
  maxRiskScore: number;
  minTier: string;
  stakeAmount: number;
  status: 'pending_stake' | 'staked' | 'escrow_ready';
}

// Calculate stake based on risk scores and tier
export function calculateStake(
  riskA: number,
  riskB: number,
  tier: string
): number {
  const baseStake = 0.05; // 0.05 SOL minimum
  const riskMultiplier = Math.max(riskA, riskB) / 50; // Higher risk = higher stake
  const tierMultipliers: Record<string, number> = {
    text: 1,
    voice: 1.5,
    video: 2,
    meetup: 3
  };
  
  return baseStake * riskMultiplier * (tierMultipliers[tier] || 1);
}

// Get swipeable profiles for a user
export async function getSwipeableProfiles(
  db: any,
  userId: string,
  limit: number = 10
): Promise<VerifiedProfile[]> {
  // Get user's verification
  const myVer = await db.get(
    'SELECT * FROM verifications WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1',
    [userId]
  );
  
  if (!myVer || !myVer.passed) {
    return []; // Not verified, no matches
  }
  
  // Get profiles I've already swiped on
  const swiped = await db.all(
    'SELECT target_id FROM swipes WHERE swiper_id = ?',
    [userId]
  );
  const swipedIds = swiped.map((s: any) => s.target_id);
  swipedIds.push(userId); // Exclude self
  
  // Get verified profiles I haven't swiped on
  // Weighted by: lower risk score, complementary flags
  const placeholders = swipedIds.map(() => '?').join(',');
  const profiles = await db.all(`
    SELECT 
      v.user_id,
      v.risk_score,
      v.recommended_tier,
      v.red_flags,
      v.green_flags,
      v.completed_at,
      u.profile_data
    FROM verifications v
    JOIN users u ON v.user_id = u.id
    WHERE v.passed = true
      AND v.user_id NOT IN (${placeholders || "''"})
    ORDER BY v.risk_score ASC, v.completed_at DESC
    LIMIT ?
  `, [...swipedIds, limit]);
  
  return profiles.map((p: any) => ({
    userId: p.user_id,
    riskScore: p.risk_score,
    recommendedTier: p.recommended_tier,
    verificationSummary: p.profile_data?.bio || '',
    redFlags: JSON.parse(p.red_flags || '[]'),
    greenFlags: JSON.parse(p.green_flags || '[]'),
    verificationDate: p.completed_at,
    stakeRequired: calculateStake(myVer.risk_score, p.risk_score, p.recommended_tier)
  }));
}

// Record a swipe action
export async function recordSwipe(
  db: any,
  action: SwipeAction
): Promise<{ matchCreated: boolean; match?: Match }> {
  await db.run(`
    INSERT INTO swipes (swiper_id, target_id, direction, created_at)
    VALUES (?, ?, ?, ?)
  `, [action.swiperId, action.targetId, action.direction, action.timestamp]);
  
  if (action.direction === 'left') {
    return { matchCreated: false };
  }
  
  // Check if mutual (other person already swiped right on us)
  const mutual = await db.get(`
    SELECT 1 FROM swipes
    WHERE swiper_id = ? AND target_id = ? AND direction = 'right'
  `, [action.targetId, action.swiperId]);
  
  if (!mutual) {
    return { matchCreated: false };
  }
  
  // Mutual match! Create match record
  const verA = await db.get(
    'SELECT * FROM verifications WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1',
    [action.swiperId]
  );
  const verB = await db.get(
    'SELECT * FROM verifications WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1',
    [action.targetId]
  );
  
  const maxRisk = Math.max(verA.risk_score, verB.risk_score);
  const minTier = getMinTier(verA.recommended_tier, verB.recommended_tier);
  const stake = calculateStake(verA.risk_score, verB.risk_score, minTier);
  
  const matchId = `${action.swiperId}_${action.targetId}`;
  await db.run(`
    INSERT INTO matches (id, user_a, user_b, max_risk_score, min_tier, stake_amount, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [matchId, action.swiperId, action.targetId, maxRisk, minTier, stake, 'pending_stake', Date.now()]);
  
  return {
    matchCreated: true,
    match: {
      userA: action.swiperId,
      userB: action.targetId,
      matchedAt: action.timestamp,
      maxRiskScore: maxRisk,
      minTier,
      stakeAmount: stake,
      status: 'pending_stake'
    }
  };
}

// Get minimum tier between two users
function getMinTier(tierA: string, tierB: string): string {
  const order: Record<string, number> = {
    reject: 0,
    text: 1,
    voice: 2,
    video: 3,
    meetup: 4
  };
  return order[tierA] < order[tierB] ? tierA : tierB;
}

// Get matches waiting for stake
export async function getPendingStakes(
  db: any,
  userId: string
): Promise<Match[]> {
  const matches = await db.all(`
    SELECT * FROM matches
    WHERE (user_a = ? OR user_b = ?)
      AND status = 'pending_stake'
  `, [userId, userId]);
  
  return matches.map((m: any) => ({
    userA: m.user_a,
    userB: m.user_b,
    matchedAt: m.created_at,
    maxRiskScore: m.max_risk_score,
    minTier: m.min_tier,
    stakeAmount: m.stake_amount,
    status: m.status
  }));
}
