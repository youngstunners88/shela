import { useEffect, useState } from 'react';
import { MatchCard } from './MatchCard';
import type { VerifiedProfile } from './match-engine';

interface SwipeStackProps {
  profiles: VerifiedProfile[];
  onSwipe: (targetId: string, direction: 'left' | 'right') => void;
  onMatch: (match: { userId: string; stakeAmount: number }) => void;
}

export function SwipeStack({ profiles, onSwipe, onMatch }: SwipeStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  
  const currentProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];
  
  const handleSwipe = (swipeDirection: 'left' | 'right') => {
    if (!currentProfile) return;
    
    setDirection(swipeDirection);
    onSwipe(currentProfile.userId, swipeDirection);
    
    // Check if this creates a match (would need backend confirmation)
    if (swipeDirection === 'right') {
      // Optimistically show match potential
      setTimeout(() => {
        onMatch({ 
          userId: currentProfile.userId, 
          stakeAmount: currentProfile.stakeRequired 
        });
      }, 300);
    }
    
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setDirection(null);
    }, 300);
  };
  
  if (!currentProfile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-zinc-400 mb-2">No more profiles</p>
          <p className="text-zinc-500 text-sm">Check back later for new verified users</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full max-w-md mx-auto h-[600px]">
      {/* Next Card (Background) */}
      {nextProfile && (
        <div className="absolute inset-0 scale-95 opacity-50">
          <div className="bg-zinc-900 rounded-2xl h-full" />
        </div>
      )}
      
      {/* Current Card */}
      <div 
        className={`absolute inset-0 transition-transform duration-300 ${
          direction === 'left' ? '-translate-x-full rotate-12' :
          direction === 'right' ? 'translate-x-full -rotate-12' : ''
        }`}
      >
        <MatchCard 
          profile={currentProfile} 
          onSwipe={handleSwipe}
        />
      </div>
      
      {/* Button Controls */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 pb-4">
        <button
          onClick={() => handleSwipe('left')}
          className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-red-500 hover:bg-zinc-700 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <button
          onClick={() => handleSwipe('right')}
          className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-green-500 hover:bg-zinc-700 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
      
      {/* Progress */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 px-4 pt-2">
        {profiles.slice(0, 5).map((_, i) => (
          <div 
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < currentIndex ? 'bg-zinc-600' : 
              i === currentIndex ? 'bg-white' : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
