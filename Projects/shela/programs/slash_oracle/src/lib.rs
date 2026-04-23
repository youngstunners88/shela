use anchor_lang::prelude::*;

// Shela Slash Oracle Program
// Automated violation detection and stake slashing authority

declare_id!("Slash11111111111111111111111111111111111111");

/// Violation report submitted by a user
#[account]
pub struct ViolationReport {
    pub reporter: Pubkey,
    pub reported_user: Pubkey,
    pub match_id: String,
    pub violation_type: ViolationType,
    pub severity: Severity,
    pub evidence_hash: [u8; 32], // IPFS hash or similar
    pub submitted_at: i64,
    pub reviewed_by: Option<Pubkey>,
    pub review_status: ReviewStatus,
    pub slash_percentage: u8,
    pub compensation_amount: u64,
    pub resolution: Option<Resolution>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ViolationType {
    Ghosted,                // Stopped responding
    NoShow,                 // Didn't show up to meet
    InappropriateBehavior,  // Unwanted behavior
    UnsafeMeet,             // Made meet unsafe
    Harassment,             // Ongoing harassment
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    Low,      // Minor issue
    Medium,   // Significant issue
    High,     // Serious violation
    Critical, // Dangerous or repeated behavior
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ReviewStatus {
    Pending,      // Report submitted, awaiting review
    Reviewing,    // Oracle or reviewer examining
    Confirmed,    // Violation confirmed
    Rejected,     // No violation found
    Appealed,     // Under appeal
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Resolution {
    Slashed { // Stake was slashed
        slash_tx: Pubkey,
        timestamp: i64,
    },
    Dismissed { // No action taken
        reason: String,
        timestamp: i64,
    },
    Settled { // Mutual settlement
        settlement_amount: u64,
        timestamp: i64,
    },
}

#[program]
pub mod shela_slash_oracle {
    use super::*;

    /// Submit a violation report
    pub fn submit_report(
        ctx: Context<SubmitReport>,
        match_id: String,
        violation_type: ViolationType,
        severity: Severity,
        evidence_hash: [u8; 32],
        description: String,
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        
        report.reporter = ctx.accounts.reporter.key();
        report.reported_user = ctx.accounts.reported_user.key();
        report.match_id = match_id.clone();
        report.violation_type = violation_type;
        report.severity = severity;
        report.evidence_hash = evidence_hash;
        report.submitted_at = Clock::get()?.unix_timestamp;
        report.reviewed_by = None;
        report.review_status = ReviewStatus::Pending;
        report.slash_percentage = 0;
        report.compensation_amount = 0;
        report.resolution = None;

        // Auto-calculate preliminary slash (final determined by oracle)
        let preliminary = calculate_preliminary_slash(&violation_type, &severity, 0);
        report.slash_percentage = preliminary.slash_percentage;
        report.compensation_amount = preliminary.compensation_amount;

        msg!(
            "Violation report submitted for match: {}, type: {:?}, severity: {:?}",
            match_id,
            violation_type,
            severity
        );
        Ok(())
    }

    /// Review a report (called by authorized oracle/reviewer)
    pub fn review_report(
        ctx: Context<ReviewReport>,
        slash_percentage: u8,
        compensation_percentage: u8, // % of slash that goes to victim
    ) -> Result<()> {
        require!(slash_percentage <= 100, OracleError::InvalidSlashPercentage);
        require!(compensation_percentage <= 100, OracleError::InvalidCompensationPercentage);

        let report = &mut ctx.accounts.report;
        
        report.reviewed_by = Some(ctx.accounts.reviewer.key());
        report.review_status = ReviewStatus::Confirmed;
        report.slash_percentage = slash_percentage;
        
        // Store compensation percentage for later calculation
        msg!(
            "Report reviewed: {}% slash, {}% compensation",
            slash_percentage,
            compensation_percentage
        );

        Ok(())
    }

    /// Record a slash resolution (called after treasury executes slash)
    pub fn record_resolution(
        ctx: Context<RecordResolution>,
        resolution: Resolution,
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        
        report.resolution = Some(resolution);
        
        match resolution {
            Resolution::Slashed { slash_tx, .. } => {
                msg!("Slash recorded: tx {}", slash_tx);
            }
            Resolution::Dismissed { reason, .. } => {
                report.review_status = ReviewStatus::Rejected;
                msg!("Dismissed: {}", reason);
            }
            Resolution::Settled { settlement_amount, .. } => {
                msg!("Settled for {} lamports", settlement_amount);
            }
        }

        Ok(())
    }

    /// Get user's violation history
    pub fn get_violation_history(
        ctx: Context<GetViolationHistory>,
    ) -> Result<(u32, u32, u32)> {
        let user = &ctx.accounts.user_account;
        
        // Count by severity
        let critical = user.critical_violations;
        let high = user.high_violations;
        let total = user.total_violations;

        msg!(
            "User {}: {} total, {} high, {} critical",
            ctx.accounts.user.key(),
            total,
            high,
            critical
        );

        Ok((total, high, critical))
    }

    /// Calculate risk multiplier based on violation history
    pub fn calculate_risk_multiplier(
        ctx: Context<GetViolationHistory>,
    ) -> Result<u8> {
        let user = &ctx.accounts.user_account;
        
        let multiplier = calculate_multiplier(
            user.total_violations,
            user.high_violations,
            user.critical_violations,
        );

        msg!("Risk multiplier for user: {}x", multiplier);
        Ok(multiplier)
    }

    /// Appeal a decision (initiates DAO/community review)
    pub fn appeal_report(
        ctx: Context<AppealReport>,
        reason: String,
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        
        require!(
            report.review_status == ReviewStatus::Confirmed,
            OracleError::CannotAppeal
        );

        // In production: would trigger DAO vote
        report.review_status = ReviewStatus::Appealed;

        msg!("Appeal submitted: {}", reason);
        Ok(())
    }
}

/// Calculate preliminary slash based on violation type and severity
pub fn calculate_preliminary_slash(
    violation_type: &ViolationType,
    severity: &Severity,
    prior_violations: u32,
) -> PreliminarySlash {
    let base_slash = match (violation_type, severity) {
        // Ghosting
        (ViolationType::Ghosted, Severity::Low) => 10,
        (ViolationType::Ghosted, Severity::Medium) => 25,
        (ViolationType::Ghosted, Severity::High) => 50,
        (ViolationType::Ghosted, Severity::Critical) => 75,
        
        // No-show
        (ViolationType::NoShow, Severity::Low) => 15,
        (ViolationType::NoShow, Severity::Medium) => 30,
        (ViolationType::NoShow, Severity::High) => 60,
        (ViolationType::NoShow, Severity::Critical) => 80,
        
        // Inappropriate behavior
        (ViolationType::InappropriateBehavior, Severity::Low) => 20,
        (ViolationType::InappropriateBehavior, Severity::Medium) => 40,
        (ViolationType::InappropriateBehavior, Severity::High) => 70,
        (ViolationType::InappropriateBehavior, Severity::Critical) => 90,
        
        // Unsafe meet
        (ViolationType::UnsafeMeet, Severity::Low) => 30,
        (ViolationType::UnsafeMeet, Severity::Medium) => 50,
        (ViolationType::UnsafeMeet, Severity::High) => 80,
        (ViolationType::UnsafeMeet, Severity::Critical) => 100,
        
        // Harassment
        (ViolationType::Harassment, Severity::Low) => 40,
        (ViolationType::Harassment, Severity::Medium) => 60,
        (ViolationType::Harassment, Severity::High) => 85,
        (ViolationType::Harassment, Severity::Critical) => 100,
    };

    // Escalation: +10% per prior violation (max 50%)
    let escalation = (prior_violations * 10).min(50) as u8;
    let total = (base_slash + escalation).min(100);

    // Compensation: 50% of slash to victim
    let compensation_percentage = 50u8;

    PreliminarySlash {
        slash_percentage: total,
        compensation_percentage,
        compensation_amount: (total as u64 * compensation_percentage as u64) / 100,
    }
}

/// Calculate risk multiplier based on violation history
pub fn calculate_multiplier(
    total: u32,
    high: u32,
    critical: u32,
) -> u8 {
    if critical > 0 {
        return 4; // 4x multiplier
    }
    if high > 1 {
        return 3; // 3x multiplier
    }
    if total > 3 {
        return 2; // 2x multiplier
    }
    if total > 0 {
        return 15; // 1.5x (15/10)
    }
    10 // 1.0x baseline (10/10)
}

pub struct PreliminarySlash {
    pub slash_percentage: u8,
    pub compensation_percentage: u8,
    pub compensation_amount: u64,
}

// Account structures
#[derive(Accounts)]
pub struct SubmitReport<'info> {
    #[account(
        init,
        payer = reporter,
        space = 8 + ViolationReport::SIZE,
        seeds = [b"report", match_id.as_bytes(), reporter.key().as_ref()],
        bump
    )]
    pub report: Account<'info, ViolationReport>,
    
    #[account(mut)]
    pub reporter: Signer<'info>,
    
    /// CHECK: The reported user (validated in logic)
    pub reported_user: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReviewReport<'info> {
    #[account(mut)]
    pub report: Account<'info, ViolationReport>,
    
    pub reviewer: Signer<'info>, // Must be authorized oracle
}

#[derive(Accounts)]
pub struct RecordResolution<'info> {
    #[account(mut)]
    pub report: Account<'info, ViolationReport>,
    
    pub authority: Signer<'info>, // Treasury program or authorized oracle
}

#[derive(Accounts)]
pub struct GetViolationHistory<'info> {
    #[account(
        seeds = [b"violations", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserViolations>,
    
    /// CHECK: User address for PDA verification
    pub user: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct AppealReport<'info> {
    #[account(
        mut,
        constraint = report.reporter == reporter.key() || 
                    report.reported_user == reporter.key()
    )]
    pub report: Account<'info, ViolationReport>,
    
    #[account(mut)]
    pub reporter: Signer<'info>,
}

// Violation history account
#[account]
pub struct UserViolations {
    pub user: Pubkey,
    pub total_violations: u32,
    pub high_violations: u32,
    pub critical_violations: u32,
    pub last_violation_at: i64,
}

// Size calculation for ViolationReport
impl ViolationReport {
    pub const SIZE: usize = 
        32 + // reporter: Pubkey
        32 + // reported_user: Pubkey
        64 + // match_id: String (max 64 chars)
        1 +  // violation_type: ViolationType
        1 +  // severity: Severity
        32 + // evidence_hash: [u8; 32]
        8 +  // submitted_at: i64
        33 + // reviewed_by: Option<Pubkey>
        1 +  // review_status: ReviewStatus
        1 +  // slash_percentage: u8
        8 +  // compensation_amount: u64
        200 + // resolution: Option<Resolution> (variable)
        100; // Padding
}

// Error codes
#[error_code]
pub enum OracleError {
    #[msg("Invalid slash percentage (must be 0-100)")]
    InvalidSlashPercentage,
    
    #[msg("Invalid compensation percentage (must be 0-100)")]
    InvalidCompensationPercentage,
    
    #[msg("Report cannot be appealed in current state")]
    CannotAppeal,
}
