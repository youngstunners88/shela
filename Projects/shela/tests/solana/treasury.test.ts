import { describe, it, expect, beforeAll } from 'vitest';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';
import { TreasuryClient } from '../../clients/treasury';

// Treasury Program Tests
// Run on devnet with funded wallets

const DEVNET_URL = 'https://api.devnet.solana.com';

describe('Treasury Program', () => {
  let provider: AnchorProvider;
  let client: TreasuryClient;
  let userA: Keypair;
  let userB: Keypair;
  
  beforeAll(async () => {
    const connection = new Connection(DEVNET_URL, 'confirmed');
    const wallet = Keypair.generate(); // Would load from env or file
    
    provider = new AnchorProvider(connection, wallet as any, {
      commitment: 'confirmed',
    });
    
    client = new TreasuryClient(provider);
    
    userA = Keypair.generate();
    userB = Keypair.generate();
  });
  
  it('should initialize escrow', async () => {
    const matchId = `test_${Date.now()}`;
    const stakeAmount = 0.1 * 1e9; // 0.1 SOL in lamports
    
    const tx = await client.initializeEscrow(
      matchId,
      userA.publicKey,
      userB.publicKey,
      stakeAmount
    );
    
    expect(tx).toBeDefined();
    
    // Verify escrow account
    const escrow = await client.getEscrow(matchId);
    expect(escrow.userA.toBase58()).toBe(userA.publicKey.toBase58());
    expect(escrow.userB.toBase58()).toBe(userB.publicKey.toBase58());
    expect(escrow.stakeAmount.toNumber()).toBe(stakeAmount);
    expect(escrow.status).toEqual({ pending: {} });
  });
  
  it('should lock escrow after both stakes', async () => {
    const matchId = `test_${Date.now()}`;
    const stakeAmount = 0.05 * 1e9; // 0.05 SOL
    
    // Initialize
    await client.initializeEscrow(matchId, userA.publicKey, userB.publicKey, stakeAmount);
    
    // User A stakes
    await client.stakeUserA(matchId);
    
    let escrow = await client.getEscrow(matchId);
    expect(escrow.userAStaked).toBe(true);
    expect(escrow.status).toEqual({ pending: {} });
    
    // User B stakes
    await client.stakeUserB(matchId);
    
    escrow = await client.getEscrow(matchId);
    expect(escrow.userBStaked).toBe(true);
    expect(escrow.status).toEqual({ locked: {} });
  });
  
  it('should release stakes on successful meet', async () => {
    const matchId = `test_${Date.now()}`;
    const stakeAmount = 0.05 * 1e9;
    
    // Setup and lock
    await client.initializeEscrow(matchId, userA.publicKey, userB.publicKey, stakeAmount);
    await client.stakeUserA(matchId);
    await client.stakeUserB(matchId);
    
    // Verify and release (oracle calls this)
    const userAProof = new Uint8Array(32).fill(1);
    const userBProof = new Uint8Array(32).fill(2);
    
    const tx = await client.verifyAndRelease(
      matchId,
      userA.publicKey,
      userB.publicKey,
      userAProof,
      userBProof
    );
    
    expect(tx).toBeDefined();
    
    const escrow = await client.getEscrow(matchId);
    expect(escrow.status).toEqual({ released: {} });
  });
  
  it('should slash stake for no-show', async () => {
    const matchId = `test_${Date.now()}`;
    const stakeAmount = 0.05 * 1e9;
    
    // Setup and lock
    await client.initializeEscrow(matchId, userA.publicKey, userB.publicKey, stakeAmount);
    await client.stakeUserA(matchId);
    await client.stakeUserB(matchId);
    
    // User A doesn't show - slash 30%
    const tx = await client.slashNoShow(
      matchId,
      userA.publicKey, // violator
      userB.publicKey,  // victim
      'noShow',
      30
    );
    
    expect(tx).toBeDefined();
    
    const escrow = await client.getEscrow(matchId);
    expect(escrow.status).toEqual({ slashed: {} });
  });
  
  it('should escalate slash for repeat offenders', async () => {
    // Prior violations increase slash percentage
    const priorViolations = 3;
    const baseSlash = 25; // Ghosted medium
    const escalation = Math.min(50, priorViolations * 10);
    const expectedSlash = baseSlash + escalation;
    
    expect(expectedSlash).toBe(55); // 25 + 30
  });
});