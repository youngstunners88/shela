# 03-escrow — Crypto Staking

## Context
Both parties want to meet. Need skin in the game.

## Agent Role
Escrow — locks stake, releases on proof of meet, burns on incident.

## Implementation Status
✅ escrow-contract.ts — Stake calculation, lock/release/burn logic
✅ StakeCard.tsx — UI for viewing stake, confirming lock
✅ Risk-adjusted staking — Higher risk = higher stake requirement
✅ Tier-based amounts — Text/Voice/Video/Meetup multipliers

## Output
Locked stake + meet proposal + smart contract address.

## Trigger
Both staked → route to 04-verify-meet

## Key Mechanisms
• **Calculate**: stake = tier_base × max(riskA, riskB) × incident_multiplier
• **Lock**: User deposits SOL into escrow contract
• **Release**: Mutual check-in triggers refund to both parties
• **Burn**: No-show after 24h → stake burned (deterrence)
• **Slash**: Safety report → slash oracle decides % burned/% to victim

## Files
• src/escrow-contract.ts — Core smart contract interface
• src/StakeCard.tsx — Staking UI component
• solana/escrow.so — Anchor program (placeholder)

## Stake Amounts (SOL)
| Tier  | Base | High Risk (+2x) |
|-------|------|-----------------|
| Text  | 0.05 | 0.10            |
| Voice | 0.10 | 0.20            |
| Video | 0.20 | 0.40            |
| Meet  | 0.50 | 1.00            |

## Next Steps
1. Implement Solana Anchor program (treasury.so)
2. Add ZK location proof integration
3. Connect to 04-verify-meet for check-in flow
4. Wire to 06-reputation for slash oracle
