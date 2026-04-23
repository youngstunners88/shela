# Shela — Dating Safety Protocol That Learns

## Mission
Build a dating safety protocol that learns. Layer 3: video game behavior, not static matching.

## The 5-Layer Flow (The Movie)

| Step | Layer | Trigger | Action | Next |
|------|-------|---------|--------|------|
| 1 | 01-verify | User opens app | Interview agent assesses safety | Score ≥70 → 02-match |
| 2 | 02-match | Both verified | Risk-weighted profile ranking | Mutual swipe → 03-escrow |
| 3 | 03-escrow | Match confirmed | Calculate stake, lock funds | Both staked → 04-verify-meet |
| 4 | 04-verify-meet | Meet scheduled | Geofenced check-in, photo verify | Both checked in → release stake |
| 5 | 05-learn | Meet complete | Pattern analysis, model update | New weights → 01-verify |

## Routing Commands

```bash
# Development
bun run dev              # Start all layers
bun run test             # Run all tests
bun run test:stress      # Run stress tests

# Layer-specific
bun run layer:verify     # Test interview agent
bun run layer:match      # Test matching engine
bun run layer:escrow     # Test stake calculation
bun run layer:meet       # Test check-in flow
bun run layer:learn      # Test pattern learning

# Production
bun run build            # Build all layers
bun run deploy           # Deploy to production
```

## Architecture

```
User → API Gateway → Layer Router → [01|02|03|04|05] → Database/Blockchain
                          ↓
                   State Machine (current layer, user state)
                          ↓
                   WebSocket (real-time updates)
```

## Key Files
- `orchestrator/index.ts` — Main flow controller
- `orchestrator/state-machine.ts` — User state management
- `orchestrator/router.ts` — Layer routing logic
- `api/server.ts` — HTTP API entry point
- `realtime/websocket-server.ts` — WebSocket for live updates

## Stack
- Runtime: Bun + TypeScript
- API: Hono
- Database: DuckDB
- Blockchain: Solana (devnet)
- Real-time: WebSocket

## Status
Layer 1-5: ✅ Implemented
Layer 2 (Orchestration): 🔄 Building now
