import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';

// Shela Slash Oracle Client
// Interact with the violation reporting and arbitration system

const PROGRAM_ID = new web3.PublicKey('Slash11111111111111111111111111111111111111');

export class SlashOracleClient {
  private program: any; // Would use proper IDL type
  
  constructor(provider: AnchorProvider) {
    this.program = { provider }; // Placeholder - would load actual program
  }
  
  // Submit a violation report
  async submitReport(
    matchId: string,
    reportedUser: web3.PublicKey,
    violationType: 'ghosted' | 'noShow' | 'inappropriateBehavior' | 'unsafeMeet' | 'harassment',
    severity: 'low' | 'medium' | 'high' | 'critical',
    evidenceHash: string // IPFS or similar hash
  ) {
    const reportId = `${matchId}_${Date.now()}`;
    
    // Calculate preliminary slash
    const preliminary = this.calculatePreliminarySlash(violationType, severity, 0);
    
    return {
      reportId,
      matchId,
      violationType,
      severity,
      preliminarySlash: preliminary.slashPercentage,
      preliminaryCompensation: preliminary.compensationPercentage,
      status: 'pending',
    };
  }
  
  // Review a report (oracle only)
  async reviewReport(
    reportId: string,
    slashPercentage: number,
    compensationPercentage: number
  ) {
    return {
      reportId,
      slashPercentage,
      compensationPercentage,
      status: 'confirmed',
      reviewedAt: new Date(),
    };
  }
  
  // Calculate preliminary slash based on violation type and severity
  calculatePreliminarySlash(
    violationType: string,
    severity: string,
    priorViolations: number
  ): { slashPercentage: number; compensationPercentage: number } {
    const baseSlashes: Record<string, Record<string, number>> = {
      ghosted: { low: 10, medium: 25, high: 50, critical: 75 },
      noShow: { low: 15, medium: 30, high: 60, critical: 80 },
      inappropriateBehavior: { low: 20, medium: 40, high: 70, critical: 90 },
      unsafeMeet: { low: 30, medium: 50, high: 80, critical: 100 },
      harassment: { low: 40, medium: 60, high: 85, critical: 100 },
    };
    
    const base = baseSlashes[violationType]?.[severity] || 10;
    const escalation = Math.min(50, priorViolations * 10);
    const total = Math.min(100, base + escalation);
    
    return {
      slashPercentage: total,
      compensationPercentage: 50, // Half to victim
    };
  }
  
  // Calculate risk multiplier based on violation history
  calculateRiskMultiplier(
    total: number,
    high: number,
    critical: number
  ): number {
    if (critical > 0) return 4;
    if (high > 1) return 3;
    if (total > 3) return 2;
    if (total > 0) return 1.5;
    return 1.0;
  }
  
  // Appeal a decision
  async appealReport(reportId: string, reason: string) {
    return {
      reportId,
      appealReason: reason,
      status: 'appealed',
      submittedAt: new Date(),
    };
  }
}