# 02-match — Mutual Swipe System

## Context
Both users verified (score ≥70). Now they see each other.

## Agent Role
Matcher — surfaces compatible profiles, weighted by safety score.

## Implementation Status
✅ Match engine (risk-weighted ranking, stake calculation)  
✅ UI components (MatchCard, SwipeStack)  
✅ Lucide icons integration  
⏳ WebSocket real-time updates  
⏳ Escrow trigger integration  
⏳ Backend API endpoints  

## Next Steps
1. Create API routes for /api/matches/profiles and /api/matches/swipe
2. Add WebSocket for real-time match notifications
3. Integrate with 03-escrow stake locking
4. Add match history / chat interface

## Output
Swipeable verified profiles, mutual match → unlocks escrow.

## Trigger
Mutual swipe → route to 03-escrow

## Key Decisions
• Only verified profiles visible (score ≥70, passed=true)
• Stake amount calculated from max(riskA, riskB) × tier multiplier
• Lower risk scores = higher ranking in stack
• Mutual match required before any chat/stake

## Files
• src/match-engine.ts — Core matching logic
• src/MatchCard.tsx — Profile display component
• src/SwipeStack.tsx — Swipeable card stack
• tests/match-flow.test.ts — Integration tests

## Database Schema
```sql
swipes: id, swiper_id, target_id, direction, created_at
matches: id, user_a, user_b, max_risk_score, min_tier, stake_amount, status, created_at
```
