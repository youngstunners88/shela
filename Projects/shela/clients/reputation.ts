import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';

// Shela Reputation NFT Client
// Interact with the reputation and tier system

const PROGRAM_ID = new web3.PublicKey('Reput11111111111111111111111111111111111111');

export class ReputationClient {
  private program: any; // Would use proper IDL type
  
  constructor(provider: AnchorProvider) {
    this.program = { provider }; // Placeholder - would load actual program
  }
  
  // Initialize reputation for a user
  async initializeReputation(userPublicKey: web3.PublicKey) {
    const [reputationPDA] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from('reputation'), userPublicKey.toBuffer()],
      PROGRAM_ID
    );
    
    // Would call program method here
    return {
      reputationPDA,
      initialScore: 500,
      tier: 'bronze',
    };
  }
  
  // Record a successful meet
  async recordMeet(
    userPublicKey: web3.PublicKey,
    wasSuccessful: boolean,
    rating: number // 1-5
  ) {
    // Would call program.record_meet()
    return {
      scoreDelta: wasSuccessful && rating >= 4 ? +20 : -10,
      meetsCompleted: 1, // Would fetch from account
      positiveRatings: wasSuccessful ? 1 : 0,
    };
  }
  
  // Record a violation
  async recordViolation(
    userPublicKey: web3.PublicKey,
    violationType: string
  ) {
    // Would call program.record_violation()
    return {
      scoreDelta: -100,
      violations: 1, // Would fetch from account
    };
  }
  
  // Calculate stake discount based on tier
  calculateStakeDiscount(tier: string): number {
    const discounts: Record<string, number> = {
      bronze: 0,
      silver: 5,
      gold: 15,
      platinum: 30,
      diamond: 50,
    };
    return discounts[tier] || 0;
  }
  
  // Get tier from score
  getTierFromScore(score: number): string {
    if (score < 300) return 'bronze';
    if (score < 500) return 'silver';
    if (score < 700) return 'gold';
    if (score < 900) return 'platinum';
    return 'diamond';
  }
  
  // Calculate reputation score
  calculateScore(
    meetsCompleted: number,
    positiveRatings: number,
    violations: number,
    safetyFlags: number
  ): number {
    const baseScore = 500;
    const meetBonus = Math.min(400, meetsCompleted * 50);
    const ratingBonus = Math.min(200, positiveRatings * 20);
    const violationPenalty = violations * 100;
    const flagPenalty = safetyFlags * 50;
    
    return Math.max(0, Math.min(1000,
      baseScore + meetBonus + ratingBonus - violationPenalty - flagPenalty
    ));
  }
}