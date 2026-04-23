# 04-verify-meet — Location Check-In

## Context
Users are meeting. Need proof they both showed up.

## Agent Role
Verifier — validates geolocation, photos, timestamps.

## Output
Verification proof (ZK) + stake release transaction.

## Trigger
Both checked in within window + photo verified → release stake.

## Implementation
Mobile geofencing + blur-face photo verification + 2-of-2 multisig release.

## Implementation Status
✅ verify-meet.ts — Geofencing logic, distance calculation, privacy proofs
✅ CheckInScreen.tsx — Mobile UI for location + photo verification
✅ 30-minute check-in window
✅ Face-blurring for privacy

## Key Features
• GPS accuracy tracking
• Haversine distance formula
• ZK-style privacy proofs (commitment-based)
• 2-of-2 signature requirement for stake release
• Timeout handling

## Privacy Guarantees
• Exact location not stored
• Only ZK proof committed
• Photos blurred before storage
• 100m geofence (generous for meet spots)
