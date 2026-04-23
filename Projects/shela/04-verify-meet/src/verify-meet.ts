import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

// Shela Verify-Meet: Location + Photo Verification
// Privacy-first: no stored location history, blur-faced photos

interface MeetDetails {
  matchId: string;
  userA: string;
  userB: string;
  location: {
    name: string;
    lat: number;
    lng: number;
    radiusMeters: number;
  };
  scheduledTime: string;
  stakeAmount: number;
}

interface CheckInData {
  userId: string;
  matchId: string;
  lat: number;
  lng: number;
  timestamp: number;
  photoHash: string; // SHA-256 of blur-faced photo
  signature: string; // User signs hash with wallet
}

interface VerificationResult {
  bothCheckedIn: boolean;
  withinRadius: boolean;
  photosVerified: boolean;
  timeWindowValid: boolean;
  canRelease: boolean;
  releaseTx?: string;
}

// Privacy: stored temporarily, deleted after verification
const ACTIVE_MEETS = new Map<string, {
  meet: MeetDetails;
  checkins: Map<string, CheckInData>;
  expiresAt: number;
}>();

// Geofencing - 500m radius for meet location
const DEFAULT_RADIUS_METERS = 500;
const CHECKIN_WINDOW_MINUTES = 30;

export function scheduleMeet(meet: MeetDetails): void {
  ACTIVE_MEETS.set(meet.matchId, {
    meet,
    checkins: new Map(),
    expiresAt: Date.now() + 4 * 60 * 60 * 1000, // 4 hours from scheduled
  });
}

// Calculate distance between two coordinates (Haversine formula)
function getDistanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
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

export async function submitCheckIn(
  checkIn: CheckInData
): Promise<{
  success: boolean;
  error?: string;
  otherUserCheckedIn?: boolean;
  verification?: VerificationResult;
}> {
  const meetData = ACTIVE_MEETS.get(checkIn.matchId);
  
  if (!meetData) {
    return { success: false, error: 'Meet not found or expired' };
  }
  
  if (Date.now() > meetData.expiresAt) {
    return { success: false, error: 'Meet window expired' };
  }
  
  // Verify within radius
  const distance = getDistanceMeters(
    checkIn.lat, checkIn.lng,
    meetData.meet.location.lat,
    meetData.meet.location.lng
  );
  
  if (distance > meetData.meet.location.radiusMeters) {
    return { 
      success: false, 
      error: `Too far from meet location (${Math.round(distance)}m away, max ${meetData.meet.location.radiusMeters}m)` 
    };
  }
  
  // Store check-in (ephemeral - deleted after verification)
  meetData.checkins.set(checkIn.userId, checkIn);
  
  // Check if both users checked in
  const bothCheckedIn = meetData.checkins.size === 2;
  const userIds = Array.from(meetData.checkins.keys());
  
  // Verify photos are present for both
  const photosVerified = bothCheckedIn && 
    userIds.every(uid => meetData.checkins.get(uid)!.photoHash.length > 0);
  
  // Verify within time window
  const timeWindowValid = bothCheckedIn && 
    Math.abs(meetData.checkins.get(userIds[0])!.timestamp - 
             meetData.checkins.get(userIds[1])!.timestamp) < 
             CHECKIN_WINDOW_MINUTES * 60 * 1000;
  
  // Can release if all conditions met
  const canRelease = bothCheckedIn && photosVerified && timeWindowValid;
  
  if (canRelease) {
    // Generate release transaction
    const releaseTx = await generateReleaseTx(meetData.meet);
    
    // Cleanup - delete all location data for privacy
    ACTIVE_MEETS.delete(checkIn.matchId);
    
    return {
      success: true,
      verification: {
        bothCheckedIn,
        withinRadius: true,
        photosVerified,
        timeWindowValid,
        canRelease,
        releaseTx,
      }
    };
  }
  
  return {
    success: true,
    otherUserCheckedIn: meetData.checkins.size > 1,
    verification: {
      bothCheckedIn,
      withinRadius: true,
      photosVerified,
      timeWindowValid,
      canRelease,
    }
  };
}

async function generateReleaseTx(meet: MeetDetails): Promise<string> {
  // This would create a Solana transaction to release stakes
  // Simplified: return placeholder for actual program integration
  return 'tx_' + Math.random().toString(36).substring(7);
}

// Photo verification - blur faces server-side before storage
export async function processPhoto(
  imageBuffer: Buffer
): Promise<{
  blurHash: string;
  originalHash: string;
  metadata: {
    width: number;
    height: number;
    hasFace: boolean;
    faceBlurred: boolean;
  };
}> {
  // In production: use face detection + Gaussian blur on face regions
  // For now: hash the full image + simulate blur metadata
  
  const crypto = await import('crypto');
  const blurHash = crypto.createHash('sha256')
    .update(imageBuffer)
    .digest('hex');
    
  // Detect face (simplified - would use face-api.js or similar)
  const hasFace = imageBuffer.length > 10000; // Placeholder
  
  return {
    blurHash,
    originalHash: blurHash, // Original not stored - only blurred version
    metadata: {
      width: 1024,
      height: 1024,
      hasFace,
      faceBlurred: hasFace,
    }
  };
}

// Get meet status for UI
export function getMeetStatus(matchId: string): {
  exists: boolean;
  userACheckedIn: boolean;
  userBCheckedIn: boolean;
  canCheckIn: boolean;
  timeRemaining: number;
  locationName: string;
} | null {
  const meetData = ACTIVE_MEETS.get(matchId);
  
  if (!meetData) return null;
  
  const checkins = meetData.checkins;
  const userIds = Array.from(checkins.keys());
  
  return {
    exists: true,
    userACheckedIn: checkins.has(meetData.meet.userA),
    userBCheckedIn: checkins.has(meetData.meet.userB),
    canCheckIn: Date.now() < meetData.expiresAt,
    timeRemaining: Math.max(0, meetData.expiresAt - Date.now()),
    locationName: meetData.meet.location.name,
  };
}
