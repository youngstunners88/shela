import { groth16 } from 'snarkjs';
import { Circuit } from 'snarkjs';

// Shela ZK Location Proof Module
// Proves user is within meet radius without revealing exact location

const WITNESS_PATH = './circuits/location.wtns';
const PROOF_PATH = './circuits/proof.json';
const PUBLIC_PATH = './circuits/public.json';

export interface LocationProofInputs {
  userLat: number;  // Private - actual user latitude
  userLng: number;  // Private - actual user longitude
  meetLat: number; // Public - meet location latitude
  meetLng: number; // Public - meet location longitude
  radius: number;  // Public - allowed radius in meters
}

export interface LocationProofResult {
  proof: any;
  publicSignals: string[];
  withinRadius: boolean;
  verifyTime: number;
}

/**
 * Generate ZK proof that user is within radius of meet location
 * WITHOUT revealing exact user coordinates
 */
export async function generateLocationProof(
  inputs: LocationProofInputs
): Promise<LocationProofResult> {
  const startTime = Date.now();
  
  // Scale coordinates for circuit precision (6 decimal places)
  const scale = 1_000_000;
  
  const circuitInputs = {
    userLat: Math.floor(inputs.userLat * scale),
    userLng: Math.floor(inputs.userLng * scale),
    meetLat: Math.floor(inputs.meetLat * scale),
    meetLng: Math.floor(inputs.meetLng * scale),
    radius: inputs.radius * 10 // Scale meters for precision
  };
  
  // Generate proof
  const { proof, publicSignals } = await groth16.fullProve(
    circuitInputs,
    './circuits/location.wasm',
    './circuits/location_final.zkey'
  );
  
  // Verify the proof
  const vKey = await import('./circuits/verification_key.json');
  const valid = await groth16.verify(vKey, publicSignals, proof);
  
  return {
    proof,
    publicSignals,
    withinRadius: valid && publicSignals[0] === '1',
    verifyTime: Date.now() - startTime
  };
}

/**
 * Verify location proof on-chain
 * Can be called by smart contract or server
 */
export async function verifyLocationProof(
  proof: any,
  publicSignals: string[],
  vKey: any
): Promise<boolean> {
  return await groth16.verify(vKey, publicSignals, proof);
}

/**
 * Generate calldata for on-chain verification
 */
export async function exportSolidityCalldata(
  proof: any,
  publicSignals: string[]
): Promise<string> {
  return await groth16.exportSolidityCallData(proof, publicSignals);
}

// Privacy-preserving location check
export async function verifyMeetLocation(
  userLocation: { lat: number; lng: number },
  meetLocation: { lat: number; lng: number },
  radiusMeters: number = 500
): Promise<{ proof: any; isValid: boolean }> {
  try {
    const result = await generateLocationProof({
      userLat: userLocation.lat,
      userLng: userLocation.lng,
      meetLat: meetLocation.lat,
      meetLng: meetLocation.lng,
      radius: radiusMeters
    });
    
    return {
      proof: result.proof,
      isValid: result.withinRadius
    };
  } catch (error) {
    console.error('ZK proof generation failed:', error);
    // Fallback to server-side verification (less private)
    return { proof: null, isValid: false };
  }
}