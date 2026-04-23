import { Connection, PublicKey, Keypair } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('Slash11111111111111111111111111111111111111');

export type ViolationType = 'ghosted' | 'no_show' | 'inappropriate_behavior' | 'unsafe_meet' | 'harassment';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface ViolationReport {
  reportId: string;
  reporter: PublicKey;
  reportedUser: PublicKey;
  matchId: string;
  violationType: ViolationType;
  severity: Severity;
  evidenceHash: string;
  submittedAt: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'appealed';
  slashPercentage: number;
}

export class SlashOracleClient {
  private reports: Map<string, ViolationReport> = new Map();

  constructor(
    private connection: Connection,
    private wallet: Keypair
  ) {}

  async submitReport(
    matchId: string,
    reportedUser: PublicKey,
    violationType: ViolationType,
    severity: Severity,
    evidenceHash: string
  ): Promise<string> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const report: ViolationReport = {
      reportId,
      reporter: this.wallet.publicKey,
      reportedUser,
      matchId,
      violationType,
      severity,
      evidenceHash,
      submittedAt: Date.now(),
      status: 'pending',
      slashPercentage: this.calculatePreliminarySlash(violationType, severity)
    };

    this.reports.set(reportId, report);

    console.log('Violation report submitted:', {
      reportId,
      matchId,
      reportedUser: reportedUser.toBase58(),
      type: violationType,
      severity,
      preliminarySlash: report.slashPercentage + '%'
    });

    return reportId;
  }

  async reviewReport(
    reportId: string,
    slashPercentage: number,
    compensationPercentage: number
  ): Promise<void> {
    const report = this.reports.get(reportId);
    if (!report) throw new Error('Report not found');

    report.slashPercentage = slashPercentage;
    report.status = 'confirmed';

    console.log('Report reviewed:', {
      reportId,
      slashPercentage: slashPercentage + '%',
      compensationPercentage: compensationPercentage + '%',
      status: 'confirmed'
    });
  }

  async appealReport(reportId: string, reason: string): Promise<void> {
    const report = this.reports.get(reportId);
    if (!report) throw new Error('Report not found');
    if (report.status !== 'confirmed') throw new Error('Can only appeal confirmed reports');

    report.status = 'appealed';

    console.log('Appeal submitted:', {
      reportId,
      reason,
      status: 'appealed'
    });
  }

  async getViolationHistory(user: PublicKey): Promise<{
    total: number;
    highSeverity: number;
    criticalSeverity: number;
  }> {
    const userReports = Array.from(this.reports.values()).filter(
      r => r.reportedUser.equals(user)
    );

    return {
      total: userReports.length,
      highSeverity: userReports.filter(r => r.severity === 'high').length,
      criticalSeverity: userReports.filter(r => r.severity === 'critical').length
    };
  }

  async calculateRiskMultiplier(user: PublicKey): Promise<number> {
    const history = await this.getViolationHistory(user);
    
    if (history.criticalSeverity > 0) return 4;
    if (history.highSeverity > 1) return 3;
    if (history.total > 3) return 2;
    if (history.total > 0) return 1.5;
    return 1.0;
  }

  private calculatePreliminarySlash(violationType: ViolationType, severity: Severity): number {
    const baseSlash: Record<ViolationType, Record<Severity, number>> = {
      ghosted: { low: 10, medium: 25, high: 50, critical: 75 },
      no_show: { low: 15, medium: 30, high: 60, critical: 80 },
      inappropriate_behavior: { low: 20, medium: 40, high: 70, critical: 90 },
      unsafe_meet: { low: 30, medium: 50, high: 80, critical: 100 },
      harassment: { low: 40, medium: 60, high: 85, critical: 100 }
    };

    return baseSlash[violationType][severity];
  }
}
