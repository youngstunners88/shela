import { useState } from 'react';
import { Shield, Wallet, Clock, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';
import { calculateStake, createEscrow, type StakeParams } from './escrow-contract';

interface StakeCardProps {
  matchId: string;
  userA: {
    id: string;
    riskScore: number;
    tier: 'text' | 'voice' | 'video' | 'meetup';
  };
  userB: {
    id: string;
    riskScore: number;
    tier: 'text' | 'voice' | 'video' | 'meetup';
  };
  meetupLocation: string;
  meetupTime: Date;
  onStakeLocked: (escrowAddress: string) => void;
}

export function StakeCard({ matchId, userA, userB, meetupLocation, meetupTime, onStakeLocked }: StakeCardProps) {
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [escrowAddress, setEscrowAddress] = useState<string | null>(null);

  const minTier = getMinTier(userA.tier, userB.tier);
  const stakeAmount = calculateStake(userA.riskScore, userB.riskScore, minTier);
  const maxRisk = Math.max(userA.riskScore, userB.riskScore);

  const handleStake = async () => {
    setLoading(true);
    
    const params: StakeParams = {
      matchId,
      userA: userA.id,
      userB: userB.id,
      amountSOL: stakeAmount,
      meetupTime,
      locationHash: hashLocation(meetupLocation),
      stakeTier: minTier
    };
    
    const escrow = await createEscrow(params);
    setEscrowAddress(escrow.contractAddress);
    setConfirmed(true);
    setLoading(false);
    onStakeLocked(escrow.contractAddress);
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-500';
    if (score < 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-emerald-500" />
        <h2 className="text-xl font-bold text-white">Lock Stake</h2>
      </div>

      {/* Match Details */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-zinc-400">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{meetupLocation}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm">{meetupTime.toLocaleString()}</span>
        </div>
      </div>

      {/* Risk Comparison */}
      <div className="bg-zinc-800 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Safety Scores</h3>
        <div className="flex justify-between items-center">
          <div className="text-center">
            <p className="text-xs text-zinc-500">You</p>
            <p className={`text-2xl font-bold ${getRiskColor(userA.riskScore)}`}>
              {userA.riskScore}
            </p>
          </div>
          <div className="text-zinc-600">vs</div>
          <div className="text-center">
            <p className="text-xs text-zinc-500">Them</p>
            <p className={`text-2xl font-bold ${getRiskColor(userB.riskScore)}`}>
              {userB.riskScore}
            </p>
          </div>
        </div>
        {maxRisk >= 60 && (
          <div className="flex items-center gap-2 mt-3 text-orange-400 text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Higher risk = higher stake required</span>
          </div>
        )}
      </div>

      {/* Stake Amount */}
      <div className="bg-zinc-800 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-zinc-400">Stake Required</span>
          <span className="text-2xl font-bold text-emerald-400">
            {stakeAmount.toFixed(3)} SOL
          </span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500 text-xs">
          <Wallet className="w-3 h-3" />
          <span>Locked until mutual check-in or 24h expiry</span>
        </div>
      </div>

      {/* Confirmation */}
      {confirmed ? (
        <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-emerald-400 font-semibold">Stake Locked!</p>
          <p className="text-xs text-zinc-500 mt-1 font-mono truncate">
            {escrowAddress}
          </p>
        </div>
      ) : (
        <button
          onClick={handleStake}
          disabled={loading}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 
                     text-white font-bold rounded-xl transition-colors"
        >
          {loading ? 'Locking...' : 'Lock Stake & Propose Meetup'}
        </button>
      )}

      <p className="text-xs text-zinc-600 mt-4 text-center">
        No show? Your stake burns. Ghost? Slashed. 
        Mutual check-in releases both stakes.
      </p>
    </div>
  );
}

function getMinTier(
  tierA: 'text' | 'voice' | 'video' | 'meetup',
  tierB: 'text' | 'voice' | 'video' | 'meetup'
): 'text' | 'voice' | 'video' | 'meetup' {
  const tiers = ['text', 'voice', 'video', 'meetup'];
  const idxA = tiers.indexOf(tierA);
  const idxB = tiers.indexOf(tierB);
  return tiers[Math.min(idxA, idxB)] as 'text' | 'voice' | 'video' | 'meetup';
}

function hashLocation(location: string): string {
  // Placeholder - real impl uses proper hashing
  return `hash_${location.slice(0, 10)}_${Date.now()}`;
}
