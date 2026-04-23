# Shela Solana Programs

Three Anchor programs for the Shela dating safety protocol.

## Programs

### 1. Treasury (`shela_treasury`)
Escrow and stake management for meet agreements.

**Instructions:**
- `initialize_escrow()` - Create new escrow between two users
- `stake_user_a/b()` - Lock SOL from each user
- `verify_and_release()` - Release stakes after successful meet
- `slash_no_show()` - Burn stake for violations

### 2. Reputation NFT (`shela_reputation_nft`)
Score-based reputation system with tiered NFTs.

**Instructions:**
- `initialize_reputation()` - Create user reputation account (score: 500/1000)
- `record_meet()` - +50 score per meet, +20 per positive rating
- `record_violation()` - -100 per violation, -50 per safety flag
- `mint_reputation_nft()` - Mint tier NFT after 5+ meets

**Tiers:**
- Bronze (0-299): 0% stake discount
- Silver (300-499): 5% discount
- Gold (500-699): 15% discount
- Platinum (700-899): 30% discount
- Diamond (900+): 50% discount

### 3. Slash Oracle (`shela_slash_oracle`)
Violation reporting and arbitration.

**Instructions:**
- `submit_report()` - Report a violation with evidence
- `review_report()` - Oracle confirms slash percentage
- `appeal_report()` - Appeal to DAO/community

**Violation Types:**
- Ghosted: 10-75% slash
- NoShow: 15-80% slash
- InappropriateBehavior: 20-90% slash
- UnsafeMeet: 30-100% slash
- Harassment: 40-100% slash

**Escalation:** +10% per prior violation (max 50%)

## Build & Deploy

```bash
# Install dependencies
npm install

# Build programs
anchor build

# Test on localnet
anchor test

# Deploy to devnet
solana config set --url devnet
solana airdrop 2  # Get SOL for deployment
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

## TypeScript Clients

See `../clients/` for TypeScript SDK:

```typescript
import { TreasuryClient, ReputationClient, SlashOracleClient } from '../clients';

const treasury = new TreasuryClient(provider);
await treasury.initializeEscrow(matchId, userA, userB, stakeAmount);
await treasury.stakeUserA(matchId);
await treasury.verifyAndRelease(matchId, userA, userB, proofA, proofB);
```

## Program IDs (devnet)

- Treasury: `Treasury11111111111111111111111111111111111`
- Reputation: `Reput11111111111111111111111111111111111111`
- Slash Oracle: `Slash11111111111111111111111111111111111111`

Update `Anchor.toml` with actual deployed addresses.