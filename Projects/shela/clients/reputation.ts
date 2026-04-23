import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';

const PROGRAM_ID = new PublicKey('Reput11111111111111111111111111111111111111');

export class ReputationClient {
  constructor(
    private connection: Connection,
    private wallet: Keypair
  ) {}

  async initializeReputation(user: PublicKey): Promise<string> {
    const reputationPDA = this.getReputationPDA(user);
    console.log('Initializing reputation:', {
      user: user.toBase58(),
      pda: reputationPDA.toBase58()
    });
    return reputationPDA.toBase58();
  }

  async recordMeet(
    user: PublicKey,
    wasSuccessful: boolean,
    rating: number
  ): Promise<{ score: number; tier: string }> {
    const reputationPDA = this.getReputationPDA(user);
    
    // Simulate score calculation
    let score = 500; // Base
    score += wasSuccessful ? 50 : 0;
    score += rating >= 4 ? 20 : 0;
    score = Math.min(1000, score);

    const tier = this.getTierFromScore(score);
    
    console.log('Meet recorded:', {
      user: user.toBase58(),
      successful: wasSuccessful,
      rating,
      newScore: score,
      tier
    });

    return { score, tier };
  }

  async recordViolation(
    user: PublicKey,
    violationType: string
  ): Promise<{ score: number; tier: string }> {
    const reputationPDA = this.getReputationPDA(user);
    
    // Get current score (simulated)
    let score = 500;
    score -= 100; // Violation penalty
    score = Math.max(0, score);

    const tier = this.getTierFromScore(score);

    console.log('Violation recorded:', {
      user: user.toBase58(),
      type: violationType,
      newScore: score,
      tier
    });

    return { score, tier };
  }

  async getStakeDiscount(user: PublicKey): Promise<number> {
    // Simulate based on reputation tier
    const score = await this.getReputationScore(user);
    
    if (score >= 900) return 50; // Diamond
    if (score >= 700) return 30; // Platinum
    if (score >= 500) return 15; // Gold
    if (score >= 300) return 5;  // Silver
    return 0; // Bronze
  }

  async getReputationScore(user: PublicKey): Promise<number> {
    // Simulated - would fetch from chain
    return 500;
  }

  private getReputationPDA(user: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('reputation'), user.toBuffer()],
      PROGRAM_ID
    )[0];
  }

  private getTierFromScore(score: number): string {
    if (score >= 900) return 'diamond';
    if (score >= 700) return 'platinum';
    if (score >= 500) return 'gold';
    if (score >= 300) return 'silver';
    return 'bronze';
  }
}
