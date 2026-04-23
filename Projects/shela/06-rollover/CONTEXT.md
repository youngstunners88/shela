# 06-rollover — Gamified Stake Escalation

## The Idea
When someone gets ghosted, they choose:
1. **LIQUIDATE** — Take the stake and reset their streak
2. **LEVERAGE** — Compound it for the next meet (multiplier based on tier)

## Tiers & Multipliers
| Tier | Streak | Multiplier | Lock Time |
|------|--------|------------|-----------|
| Brave | 0 | 1.5x | None |
| Bold | 1 | 2.0x | 24h |
| Fearless | 3 | 3.0x | 72h |
| Legend | 5 | 5.0x | 1 week |

## Risk
- Leverage successfully → Unlock accumulated + bonus
- Get ghosted AGAIN → Lose 50% (burned), 50% to treasury for next victim

## Why This Works
- Makes resilience profitable
- Creates compounding stakes that attract attention
- "Pay it forward" — part of catastrophic loss goes to help next victim
- Tier system creates aspirational progression

## Files
- `src/stake-rollover.ts` — Core logic
- `src/RolloverScreen.tsx` — UI for decision
- `CONTEXT.md` — This file
