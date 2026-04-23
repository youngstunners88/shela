# Shela TypeScript Clients

SDK for interacting with Shela Solana programs.

## Installation

```bash
npm install @shela-protocol/clients
```

## Quick Start

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';
import { TreasuryClient, ReputationClient, SlashOracleClient } from '@shela-protocol/clients';

// Setup provider
const connection = new Connection('https://api.devnet.solana.com');
const wallet = Keypair.generate(); // Use actual wallet in production
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

// Initialize clients
const treasury = new TreasuryClient(provider);
const reputation = new ReputationClient(provider);
const slashOracle = new SlashOracleClient(provider);
```

## Treasury Client

### Create Escrow

```typescript
const matchId = `match_${Date.now()}`;
const userA = new PublicKey('...');
const userB = new PublicKey('...');
const stakeAmount = 0.1 * 1e9; // 0.1 SOL in lamports

await treasury.initializeEscrow(matchId, userA, userB, stakeAmount);
```

### Stake

```typescript
await treasury.stakeUserA(matchId);
await treasury.stakeUserB(matchId);
```

### Release or Slash

```typescript
// After successful meet
await treasury.verifyAndRelease(matchId, userA, userB, proofA, proofB);

// For violation
await treasury.slashNoShow(matchId, violator, victim, 'noShow', 30);
```

## Reputation Client

```typescript
// Initialize reputation
await reputation.initializeReputation(userPublicKey);

// Record meet outcome
await reputation.recordMeet(userPublicKey, true, 5); // successful, 5-star

// Check tier and discount
const discount = reputation.calculateStakeDiscount('gold'); // 15%
```

## Slash Oracle Client

```typescript
// Submit violation report
const report = await slashOracle.submitReport(
  matchId,
  reportedUser,
  'ghosted',
  'medium',
  evidenceHash
);

// Review as oracle
await slashOracle.reviewReport(reportId, 30, 50); // 30% slash, 50% compensation
```

## Error Handling

All methods throw typed errors:

```typescript
import { ShelaError } from '@shela-protocol/clients';

try {
  await treasury.stakeUserA(matchId);
} catch (err) {
  if (err.code === 6001) {
    console.log('Already staked');
  }
}
```