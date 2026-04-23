# 03-escrow — Crypto Staking

## Context
Both parties want to meet. Need skin in the game.

## Agent Role
Escrow — locks stake, releases on proof of meet, burns on incident.

## Output
Locked stake + meet proposal + smart contract address.

## Trigger
Both staked → route to 04-verify-meet

## Implementation
✅ **COMPLETE:**
- Smart contract: `programs/treasury/src/lib.rs`
- TypeScript SDK: `escrow-contract.ts`
- React UI: `StakeCard.tsx` with tier-based amounts

## Stake Tiers
| Tier | SOL | ~USD | Use Case |
|------|-----|------|----------|
| Text | 0.005 | ~$0.80 | Chat only |
| Voice | 0.008 | ~$1.28 | Voice call |
| Video | 0.01 | ~$1.60 | Video call |
| Meetup | 0.1 | ~$16.00 | In-person meet |

High risk ×2 multiplier.

## Contract States
1. `AwaitingStake` → One party staked
2. `UserAStaked` / `UserBStaked` → One staked
3. `Locked` → Both staked, 30-min timer starts
4. `Verified` → Both checked in
5. `ViolationReported` → Under review
6. `Slashed` → Penalty executed
7. `Expired` → 30 min passed, partial stakes
8. `Completed` → Stakes returned

## Key
Stake amount adapts based on historical safety data for this area/time.
