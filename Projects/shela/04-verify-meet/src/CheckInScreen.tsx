import { useState, useEffect, useRef } from 'react';
import { MapPin, Camera, CheckCircle, Clock, AlertTriangle, Shield, Users } from 'lucide-react';

interface CheckInScreenProps {
  matchId: string;
  userId: string;
  meetLocation: {
    name: string;
    lat: number;
    lng: number;
    radiusMeters: number;
  };
  scheduledTime: string;
  otherUserName: string;
  onCheckIn: (photo: Blob, location: { lat: number; lng: number }) => Promise<void>;
  onCancel: () => void;
}

type CheckInState = 'waiting' | 'camera' | 'uploading' | 'verifying' | 'success' | 'failed';

export function CheckInScreen({
  matchId,
  userId,
  meetLocation,
  scheduledTime,
  otherUserName,
  onCheckIn,
  onCancel,
}: CheckInScreenProps) {
  const [state, setState] = useState<CheckInState>('waiting');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otherUserStatus, setOtherUserStatus] = useState<'pending' | 'checked-in'>('pending');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate distance and check if within range
  useEffect(() => {
    if (navigator.geolocation && userLocation) {
      const dist = getDistanceMeters(
        userLocation.lat, userLocation.lng,
        meetLocation.lat, meetLocation.lng
      );
      setDistance(dist);
    }
  }, [userLocation, meetLocation]);

  // Countdown timer
  useEffect(() => {
    const scheduled = new Date(scheduledTime).getTime();
    const endTime = scheduled + 4 * 60 * 60 * 1000; // 4 hours
    
    const timer = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [scheduledTime]);

  const getLocation = () => {
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setState('camera');
      },
      (err) => {
        setError('Location access required for verification');
      },
      { enableHighAccuracy: true }
    );
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access required for photo verification');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Apply face blur (simplified - would use face detection API)
    // For now, blur the center region where faces typically are
    const blurRegion = {
      x: canvas.width * 0.25,
      y: canvas.height * 0.2,
      width: canvas.width * 0.5,
      height: canvas.height * 0.4,
    };
    
    ctx.filter = 'blur(20px)';
    ctx.drawImage(
      canvas,
      blurRegion.x, blurRegion.y, blurRegion.width, blurRegion.height,
      blurRegion.x, blurRegion.y, blurRegion.width, blurRegion.height
    );
    ctx.filter = 'none';
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob && userLocation) {
        setState('uploading');
        handleUpload(blob);
      }
    }, 'image/jpeg', 0.8);
  };

  const handleUpload = async (photoBlob: Blob) => {
    if (!userLocation) return;
    
    try {
      setState('verifying');
      await onCheckIn(photoBlob, userLocation);
      setState('success');
    } catch (err) {
      setError('Verification failed. Please try again.');
      setState('failed');
    }
  };

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const isWithinRange = distance !== null && distance <= meetLocation.radiusMeters;

  // Render different states
  if (state === 'waiting') {
    return (
      <div className="bg-slate-900 min-h-screen p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-semibold">Meet Verification</h1>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Location Card */}
        <div className="bg-slate-800 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-white font-medium">{meetLocation.name}</p>
              <p className="text-slate-400 text-sm">
                Within {meetLocation.radiusMeters}m required
              </p>
            </div>
          </div>
          
          {userLocation && distance !== null && (
            <div className={`flex items-center gap-2 text-sm ${isWithinRange ? 'text-green-400' : 'text-red-400'}`}>
              {isWithinRange ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>You're {Math.round(distance)}m away ✓</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>You're {Math.round(distance)}m away — move closer</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Other User Status */}
        <div className="bg-slate-800 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{otherUserName}</p>
              <p className="text-slate-400 text-sm">
                {otherUserStatus === 'pending' ? 'Waiting for check-in...' : 'Checked in! ✓'}
              </p>
            </div>
            {otherUserStatus === 'checked-in' && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="text-slate-400 text-sm space-y-2">
              <p>1. Meet at the location shown above</p>
              <p>2. Click "I'm Here" when you arrive</p>
              <p>3. Take a photo (faces blurred for privacy)</p>
              <p>4. Both must check in within 30 minutes</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-auto">
          <button
            onClick={onCancel}
            className="flex-1 py-4 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={getLocation}
            disabled={!!userLocation && !isWithinRange}
            className="flex-1 py-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {userLocation ? 'Take Photo →' : "I'm Here"}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'camera') {
    return (
      <div className="bg-slate-900 min-h-screen flex flex-col">
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Overlay hint */}
          <div className="absolute top-4 left-4 right-4 bg-black/50 rounded-lg p-3">
            <p className="text-white text-sm text-center">
              Both of you in frame, faces will be blurred automatically
            </p>
          </div>
          
          {/* Privacy badge */}
          <div className="absolute top-4 right-4 bg-blue-500/80 rounded-full p-2">
            <Shield className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <div className="p-6 bg-slate-900">
          <button
            onClick={capturePhoto}
            className="w-full py-4 rounded-xl bg-white text-slate-900 font-semibold text-lg"
          >
            <Camera className="w-6 h-6 inline mr-2" />
            Capture
          </button>
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  if (state === 'uploading' || state === 'verifying') {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">
            {state === 'uploading' ? 'Uploading photo...' : 'Verifying check-in...'}
          </p>
          <p className="text-slate-400 text-sm mt-2">
            {state === 'verifying' && 'This may take a few seconds'}
          </p>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Check-in Complete!</h2>
          <p className="text-slate-400">
            {otherUserStatus === 'checked-in' 
              ? 'Both checked in. Stakes will be released shortly.'
              : `Waiting for ${otherUserName} to check in...`}
          </p>
        </div>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check-in Failed</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => setState('waiting')}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Haversine distance calculation
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}
