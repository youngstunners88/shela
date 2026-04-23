# Shela

> Dating safety protocol that learns. Layer 3: video game behavior, not static matching.

[![Solana](https://img.shields.io/badge/Solana-black?logo=solana)](https://solana.com)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## One Line

"Dating apps ask: Do you like them? Shela asks: Will it be safe? Then learns."

## The Problem

Current dating apps:
- Match first, vet later (if at all)
- No consequences for bad behavior
- No learning from outcomes
- Women bear the safety burden

## The Solution

**5-Layer Safety Protocol:**

| Layer | Function | Tech |
|-------|----------|------|
| 01-verify | AI interview assesses risk | Claude/Kimi agents |
| 02-match | Only verified users swipe | Risk-weighted ranking |
| 03-escrow | Stake SOL before meeting | Smart contract escrow |
| 04-verify-meet | Location + photo proof | ZK geofencing |
| 05-learn | Outcomes train the model | Pattern detection |

## Architecture

```
┌─────────────────────────────────────────┐
│  Mobile App (React Native)              │
│  • Interview chat • Swipe UI • Wallet   │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│  API Server (Hono/Node)                 │
│  • REST endpoints • WebSocket real-time │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│  Smart Contracts (Solana/Anchor)        │
│  • Treasury (escrow) • Reputation NFT   │
│  • Slash oracle (violation enforcement) │
└─────────────────────────────────────────┘
```

## Quick Start

```bash
# Clone and install
git clone https://github.com/youngstunners88/shela.git
cd shela
npm install

# Set up environment
cp .env.example .env
# Edit .env with your keys

# Run database migrations
npm run db:migrate

# Start development
npm run dev
```

## Stake Tiers

| Tier | Stake (SOL) | Interaction |
|------|-------------|-------------|
| Text | 0.005 (~$0.80) | Messaging only |
| Voice | 0.008 (~$1.28) | Voice calls |
| Video | 0.01 (~$1.60) | Video calls |
| Meetup | 0.1 (~$16) | In-person meet |

Risk multiplier: 2x for high-risk profiles

## ZK Location Proofs

Users prove they're within 500m of meet spot without revealing exact coordinates:

```circom
// Private inputs (not revealed)
userLat, userLng  // Actual location

// Public inputs (on-chain)
meetLat, meetLng  // Meet spot
radius = 500       // 500 meters

// Output
proof // Zero-knowledge proof of "within radius"
```

## Smart Contracts

### Treasury Program
- `initialize_escrow()` — Create stake agreement
- `stake_user_a/b()` — Lock SOL from both parties  
- `verify_and_release()` — Release stakes after meet
- `slash_no_show()` — Burn stake for violation

### Reputation NFT
- Minted after 5+ positive meets
- Tiers: Bronze → Silver → Gold → Platinum → Diamond
- Reduces required stake for future meets

### Slash Oracle
- Automated violation detection
- Evidence-based slashing
- Appeal process via DAO

## Safety Interview

The AI interviewer asks questions that predict safe meets:

1. "What brings you here?" (assess clarity, pressure)
2. "How do you verify someone before meeting?" (risk awareness)
3. "What would make you uncomfortable?" (boundary articulation)

Risk score 0-100 determines tier and stake.

## Deployment

```bash
# Docker Compose (production)
docker-compose -f docker/docker-compose.yml up -d

# Solana programs
anchor build
anchor deploy --provider.cluster devnet
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT © 2026 Shela Protocol

---

**Built for Zo Contra 2026**
