import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Wallet } from 'lucide-react';

interface VerifiedProfile {
  userId: string;
  riskScore: number;
  recommendedTier: 'text' | 'voice' | 'video' | 'meetup';
  verificationSummary: string;
  greenFlags: string[];
  stakeRequired: number;
}

interface MatchCardProps {
  profile: VerifiedProfile;
  onSwipe: (direction: 'left' | 'right') => void;
}

const tierColors = {
  text: 'bg-blue-500',
  voice: 'bg-purple-500',
  video: 'bg-pink-500',
  meetup: 'bg-green-500'
};

const tierLabels = {
  text: 'Text First',
  voice: 'Voice Ready',
  video: 'Video Ready',
  meetup: 'Meetup Ready'
};

export function MatchCard({ profile, onSwipe }: MatchCardProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const riskLevel = profile.riskScore < 30 ? 'low' : profile.riskScore < 60 ? 'medium' : 'high';
  const riskColor = riskLevel === 'low' ? 'text-green-500' : riskLevel === 'medium' ? 'text-yellow-500' : 'text-red-500';
  
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startX = clientX;
    
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      setDragX(currentX - startX);
    };
    
    const handleEnd = (endEvent: MouseEvent | TouchEvent) => {
      setIsDragging(false);
      const endX = 'changedTouches' in endEvent ? endEvent.changedTouches[0].clientX : endEvent.clientX;
      const diff = endX - startX;
      
      if (Math.abs(diff) > 100) {
        onSwipe(diff > 0 ? 'right' : 'left');
      }
      setDragX(0);
      
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  };
  
  const rotate = dragX * 0.05;
  const opacity = 1 - Math.abs(dragX) / 500;
  
  return (
    <div 
      className="relative w-full max-w-sm mx-auto"
      style={{
        transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
        opacity,
        transition: isDragging ? 'none' : 'transform 0.3s ease'
      }}
    >
      <div 
        className="bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        {/* Risk Badge */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-800/90 backdrop-blur ${riskColor}`}>
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium capitalize">{riskLevel} risk</span>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${tierColors[profile.recommendedTier]} text-white`}>
            <span className="text-xs font-medium">{tierLabels[profile.recommendedTier]}</span>
          </div>
        </div>
        
        {/* Stake Required */}
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-800/90 backdrop-blur text-amber-400">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium">{profile.stakeRequired.toFixed(3)} SOL</span>
          </div>
        </div>
        
        {/* Profile Placeholder */}
        <div className="h-96 bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-zinc-600 flex items-center justify-center">
              <span className="text-3xl font-bold text-zinc-400">
                {profile.userId.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <p className="text-zinc-400 text-sm">Verified User</p>
          </div>
        </div>
        
        {/* Info Section */}
        <div className="p-6">
          <p className="text-zinc-300 text-sm mb-4">{profile.verificationSummary}</p>
          
          {profile.greenFlags.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Safety Signals</p>
              <div className="flex flex-wrap gap-2">
                {profile.greenFlags.slice(0, 3).map((flag, i) => (
                  <span key={i} className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs">
                    <CheckCircle className="w-3 h-3" />
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Swipe Hints */}
          <div className="flex justify-between items-center text-xs text-zinc-500 mt-6">
            <span>← Pass</span>
            <span className="text-zinc-600">Swipe</span>
            <span>Match →</span>
          </div>
        </div>
      </div>
    </div>
  );
}
