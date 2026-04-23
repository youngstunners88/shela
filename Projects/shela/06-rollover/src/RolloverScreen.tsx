import { useState, useEffect } from 'react';
import { Flame, TrendingUp, Wallet, AlertTriangle, Crown, Star, Zap } from 'lucide-react';

interface RolloverState {
  accumulatedStake: number;
  consecutiveWins: number;
  tier: 'brave' | 'bold' | 'fearless' | 'legend';
  lockHours: number;
  canLiquidate: boolean;
}

interface RolloverChoice {
  liquidate: {
    amount: number;
    message: string;
  };
  leverage: {
    multiplier: number;
    newStake: number;
    nextTier: string;
    risk: string;
    message: string;
  };
}

// Gamified stake rollover UI
export function RolloverScreen({ 
  victimState, 
  ghosterName, 
  onDecide,
  isProcessing 
}: { 
  victimState: RolloverState;
  ghosterName: string;
  onDecide: (choice: 'liquidate' | 'leverage') => void;
  isProcessing: boolean;
}) {
  const [selected, setSelected] = useState<'liquidate' | 'leverage' | null>(null);
  const [showRisk, setShowRisk] = useState(false);

  const calculateChoice = (): RolloverChoice => {
    const config = {
      brave: { multiplier: 1.5, lockHours: 0 },
      bold: { multiplier: 2.0, lockHours: 24 },
      fearless: { multiplier: 3.0, lockHours: 72 },
      legend: { multiplier: 5.0, lockHours: 168 },
    }[victimState.tier];

    const accumulated = victimState.accumulatedStake;
    const newStake = (accumulated + 0.1) * config.multiplier; // Assuming 0.1 SOL base
    
    const nextTierMap = { brave: 'bold', bold: 'fearless', fearless: 'legend', legend: 'legend' };
    const nextTier = victimState.tier === 'legend' ? 'legend' : nextTierMap[victimState.tier];
    
    return {
      liquidate: {
        amount: accumulated + 0.1,
        message: accumulated > 0 
          ? `Take ${(accumulated + 0.1).toFixed(3)} SOL now. Your ${victimState.consecutiveWins}x streak ends.`
          : `Take the 0.1 SOL compensation.`
      },
      leverage: {
        multiplier: config.multiplier,
        newStake,
        nextTier,
        risk: victimState.tier === 'legend'
          ? 'LEGENDARY RISK: If ghosted again, you lose EVERYTHING.'
          : `If ghosted again, you lose ${(newStake * 0.5).toFixed(3)} SOL (50% burn, 50% to next victim).`,
        message: `Double down to ${newStake.toFixed(3)} SOL (${config.multiplier}x). Become ${nextTier.toUpperCase()}.`
      }
    };
  };

  const choice = calculateChoice();

  const tierIcons = {
    brave: <Star className="w-6 h-6 text-yellow-500" />,
    bold: <Zap className="w-6 h-6 text-orange-500" />,
    fearless: <Flame className="w-6 h-6 text-red-500" />,
    legend: <Crown className="w-8 h-8 text-purple-500" />
  };

  const tierColors = {
    brave: 'from-yellow-500/20 to-orange-500/20',
    bold: 'from-orange-500/20 to-red-500/20',
    fearless: 'from-red-500/20 to-purple-500/20',
    legend: 'from-purple-500/20 to-pink-500/20'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/50 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-300 font-medium">You've Been Ghosted</span>
        </div>
        <p className="text-slate-400">
          {ghosterName} didn't show up. The stake is yours to claim.
        </p>
      </div>

      {/* Current Status */}
      <div className={`bg-gradient-to-br ${tierColors[victimState.tier]} rounded-2xl p-6 mb-6 border border-white/10`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Current Tier</p>
            <div className="flex items-center gap-2 mt-1">
              {tierIcons[victimState.tier]}
              <span className="text-2xl font-bold capitalize">{victimState.tier}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm">Accumulated</p>
            <p className="text-2xl font-bold">{victimState.accumulatedStake.toFixed(3)} SOL</p>
          </div>
        </div>
        {victimState.consecutiveWins > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-slate-400">Win Streak:</span>
            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
              {victimState.consecutiveWins}x 🔥
            </span>
          </div>
        )}
      </div>

      {/* Choice Cards */}
      <div className="space-y-4">
        {/* Liquidate Option */}
        <button
          onClick={() => setSelected('liquidate')}
          className={`w-full p-6 rounded-2xl border-2 transition-all ${
            selected === 'liquidate'
              ? 'border-green-500 bg-green-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-lg">Take the Money</h3>
              <p className="text-slate-400 text-sm">{choice.liquidate.message}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-400">+{choice.liquidate.amount.toFixed(3)}</p>
              <p className="text-xs text-slate-500">SOL</p>
            </div>
          </div>
        </button>

        {/* Leverage Option */}
        <button
          onClick={() => {
            setSelected('leverage');
            setShowRisk(true);
          }}
          className={`w-full p-6 rounded-2xl border-2 transition-all ${
            selected === 'leverage'
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-lg">Double Down</h3>
              <p className="text-slate-400 text-sm">{choice.leverage.message}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-400">{choice.leverage.newStake.toFixed(3)}</p>
              <p className="text-xs text-slate-500">SOL ({choice.leverage.multiplier}x)</p>
            </div>
          </div>
          
          {selected === 'leverage' && showRisk && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{choice.leverage.risk}</p>
              </div>
            </div>
          )}
        </button>
      </div>

      {/* Action Button */}
      {selected && (
        <button
          onClick={() => onDecide(selected)}
          disabled={isProcessing}
          className={`w-full mt-6 py-4 rounded-2xl font-bold text-lg transition-all ${
            selected === 'liquidate'
              ? 'bg-green-500 hover:bg-green-600 text-black'
              : 'bg-purple-500 hover:bg-purple-600 text-white'
          } disabled:opacity-50`}
        >
          {isProcessing ? 'Processing...' : selected === 'liquidate' ? 'Cash Out 💰' : 'Leverage 🎰'}
        </button>
      )}

      {/* Legendary Status Indicator */}
      {victimState.tier === 'legend' && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
            <Crown className="w-5 h-5" />
            <span className="font-bold">LEGENDARY STATUS</span>
            <Crown className="w-5 h-5" />
          </div>
          <p className="text-slate-400 text-sm mt-2">
            One more successful meet and you become MYTHICAL.
          </p>
        </div>
      )}
    </div>
  );
}

// Catastrophic loss screen
export function CatastrophicLossScreen({
  lostAmount,
  burnedAmount,
  passedAmount,
  onAcknowledge
}: {
  lostAmount: number;
  burnedAmount: number;
  passedAmount: number;
  onAcknowledge: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-slate-900 text-white p-6 flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
          <Flame className="w-12 h-12 text-red-500" />
        </div>
        
        <h1 className="text-4xl font-bold mb-2 text-red-400">CATASTROPHIC LOSS</h1>
        <p className="text-slate-400 mb-8">You got ghosted again. Your leveraged stake is gone.</p>
        
        <div className="bg-slate-800/50 rounded-2xl p-6 mb-8 max-w-sm">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-400">Total Lost</span>
            <span className="text-3xl font-bold text-red-400">{lostAmount.toFixed(3)} SOL</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-red-400">🔥 Burned forever</span>
              <span>{burnedAmount.toFixed(3)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">💚 To next victim</span>
              <span>{passedAmount.toFixed(3)} SOL</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={onAcknowledge}
          className="px-8 py-4 bg-slate-700 hover:bg-slate-600 rounded-2xl font-bold transition-all"
        >
          Back to Brave Tier 🔄
        </button>
      </div>
    </div>
  );
}

export default RolloverScreen;
