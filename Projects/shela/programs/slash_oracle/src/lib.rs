use anchor_lang::prelude::*;

// Shela Slash Oracle Program
// Automated violation detection and stake slashing

declare_id!("Slash111111111111111111111111111111111111111");

#[program]
pub mod slash_oracle {
    use super::*;
    
    /// Initialize oracle with AI model parameters
    pub fn initialize_oracle(
        ctx: Context<InitializeOracle>,
        violation_weights: Vec<ViolationWeight>,
    ) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle;
        oracle.authority = ctx.accounts.authority.key();
        oracle.violation_weights = violation_weights;
        oracle.total_reports_processed = 0;
        oracle.total_sol_slashed = 0;
        oracle.created_at = Clock::get()?.unix_timestamp;
        oracle.is_active = true;
        Ok(())
    }
    
    /// Submit violation report with evidence
    pub fn submit_report(
        ctx: Context<SubmitReport>,
        match_id: String,
        violation_type: ViolationType,
        evidence_hash: [u8; 32],
        evidence_url: String,
        description: String,
    ) -> Result<()> {
        require!(description.len() <= 1000, ErrorCode::DescriptionTooLong);
        
        let report = &mut ctx.accounts.report;
        report.id = ctx.accounts.oracle.total_reports_processed + 1;
        report.match_id = match_id;
        report.violation_type = violation_type;
        report.evidence_hash = evidence_hash;
        report.evidence_url = evidence_url;
        report.description = description;
        report.reporter = ctx.accounts.reporter.key();
        report.reported_user = ctx.accounts.reported_user.key();
        report.created_at = Clock::get()?.unix_timestamp;
        report.status = ReportStatus::PendingReview;
        report.ai_confidence = 0; // Will be updated by oracle
        report.recommended_slash_bps = 0; // Basis points (0-10000 = 0-100%)
        report.is_appealed = false;
        report.human_reviewed = false;
        
        // Update oracle counter
        ctx.accounts.oracle.total_reports_processed += 1;
        
        // Emit event for oracle processing
        emit!(ViolationReported {
            report_id: report.id,
            match_id: report.match_id.clone(),
            violation_type: violation_type,
            reporter: ctx.accounts.reporter.key(),
            reported_user: ctx.accounts.reported_user.key(),
        });
        
        Ok(())
    }
    
    /// Oracle processes report with AI analysis
    pub fn process_report(
        ctx: Context<ProcessReport>,
        ai_confidence: u16, // 0-10000 (0-100%)
        recommended_slash_bps: u16,
        reasoning_hash: [u8; 32],
    ) -> Result<()> {
        let oracle = &ctx.accounts.oracle;
        require!(oracle.is_active, ErrorCode::OracleInactive);
        require!(
            ctx.accounts.authority.key() == oracle.authority,
            ErrorCode::Unauthorized
        );
        
        let report = &mut ctx.accounts.report;
        require!(report.status == ReportStatus::PendingReview, ErrorCode::AlreadyProcessed);
        
        // Validate confidence bounds
        require!(ai_confidence <= 10000, ErrorCode::InvalidConfidence);
        require!(recommended_slash_bps <= 10000, ErrorCode::InvalidSlashAmount);
        
        // Apply violation weight from oracle config
        let base_slash = recommended_slash_bps;
        let weight = oracle.violation_weights.iter()
            .find(|w| w.violation_type == report.violation_type)
            .map(|w| w.weight_bps)
            .unwrap_or(5000); // Default 50%
        
        let adjusted_slash = (base_slash as u64 * weight as u64 / 10000) as u16;
        
        report.ai_confidence = ai_confidence;
        report.recommended_slash_bps = adjusted_slash.min(10000);
        
        // Auto-approve high confidence, flag for human review low confidence
        if ai_confidence >= 8500 { // 85%+
            report.status = ReportStatus::Approved;
        } else if ai_confidence >= 6000 { // 60-85%
            report.status = ReportStatus::AwaitingHumanReview;
        } else {
            report.status = ReportStatus::InsufficientEvidence;
        }
        
        report.oracle_processed_at = Some(Clock::get()?.unix_timestamp);
        
        emit!(ReportProcessed {
            report_id: report.id,
            ai_confidence,
            recommended_slash_bps: adjusted_slash,
            status: report.status,
        });
        
        Ok(())
    }
    
    /// Human reviewer confirms or rejects AI recommendation
    pub fn human_review(
        ctx: Context<HumanReview>,
        approved: bool,
        final_slash_bps: u16,
        notes: String,
    ) -> Result<()> {
        let oracle = &ctx.accounts.oracle;
        require!(
            ctx.accounts.reviewer.key() == oracle.authority ||
            oracle.human_reviewers.contains(&ctx.accounts.reviewer.key()),
            ErrorCode::UnauthorizedReviewer
        );
        
        let report = &mut ctx.accounts.report;
        require!(
            report.status == ReportStatus::AwaitingHumanReview ||
            report.status == ReportStatus::PendingReview,
            ErrorCode::InvalidReviewState
        );
        
        report.human_reviewed = true;
        report.human_reviewer = Some(ctx.accounts.reviewer.key());
        report.human_reviewed_at = Some(Clock::get()?.unix_timestamp);
        report.review_notes = Some(notes);
        
        if approved {
            report.status = ReportStatus::Approved;
            report.final_slash_bps = final_slash_bps;
        } else {
            report.status = ReportStatus::Rejected;
            report.final_slash_bps = 0;
        }
        
        emit!(HumanReviewCompleted {
            report_id: report.id,
            approved,
            final_slash_bps,
            reviewer: ctx.accounts.reviewer.key(),
        });
        
        Ok(())
    }
    
    /// Execute approved slash
    pub fn execute_slash(
        ctx: Context<ExecuteSlash>,
        escrow_address: Pubkey,
    ) -> Result<()> {
        let report = &ctx.accounts.report;
        require!(report.status == ReportStatus::Approved, ErrorCode::NotApproved);
        require!(!report.executed, ErrorCode::AlreadyExecuted);
        
        // Mark as executed
        ctx.accounts.report.executed = true;
        ctx.accounts.report.executed_at = Some(Clock::get()?.unix_timestamp);
        ctx.accounts.report.escrow_executed = Some(escrow_address);
        
        // Update oracle stats
        ctx.accounts.oracle.total_sol_slashed += 1; // Count, not amount
        
        emit!(SlashExecuted {
            report_id: report.id,
            escrow_address,
            slash_bps: report.final_slash_bps,
        });
        
        Ok(())
    }
    
    /// Appeal a rejected or slashed report
    pub fn submit_appeal(
        ctx: Context<SubmitAppeal>,
        appeal_reason: String,
        new_evidence_hash: Option<[u8; 32]>,
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        require!(
            report.status == ReportStatus::Rejected ||
            report.status == ReportStatus::Approved,
            ErrorCode::CannotAppeal
        );
        require!(!report.is_appealed, ErrorCode::AlreadyAppealed);
        
        report.is_appealed = true;
        report.appeal_reason = Some(appeal_reason);
        report.appeal_evidence_hash = new_evidence_hash;
        report.appealed_at = Some(Clock::get()?.unix_timestamp);
        report.status = ReportStatus::UnderAppeal;
        
        emit!(AppealSubmitted {
            report_id: report.id,
            appealed_by: ctx.accounts.appellant.key(),
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeOracle<'info> {
    #[account(init, payer = authority, space = 8 + OracleAccount::MAX_SIZE)]
    pub oracle: Account<'info, OracleAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitReport<'info> {
    #[account(
        init,
        payer = reporter,
        space = 8 + ViolationReport::MAX_SIZE
    )]
    pub report: Account<'info, ViolationReport>,
    #[account(mut)]
    pub oracle: Account<'info, OracleAccount>,
    #[account(mut)]
    pub reporter: Signer<'info>,
    /// CHECK: This is just the reported user address
    pub reported_user: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProcessReport<'info> {
    #[account(mut)]
    pub report: Account<'info, ViolationReport>,
    pub oracle: Account<'info, OracleAccount>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct HumanReview<'info> {
    #[account(mut)]
    pub report: Account<'info, ViolationReport>,
    pub oracle: Account<'info, OracleAccount>,
    pub reviewer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteSlash<'info> {
    #[account(mut)]
    pub report: Account<'info, ViolationReport>,
    #[account(mut)]
    pub oracle: Account<'info, OracleAccount>,
    pub executor: Signer<'info>,
}

#[derive(Accounts)]
pub struct SubmitAppeal<'info> {
    #[account(mut)]
    pub report: Account<'info, ViolationReport>,
    pub appellant: Signer<'info>,
}

#[account]
pub struct OracleAccount {
    pub authority: Pubkey,
    pub violation_weights: Vec<ViolationWeight>,
    pub human_reviewers: Vec<Pubkey>,
    pub total_reports_processed: u64,
    pub total_sol_slashed: u64,
    pub created_at: i64,
    pub is_active: bool,
}

impl OracleAccount {
    pub const MAX_SIZE: usize = 32 + // authority
        (4 + 100 * (1 + 2)) + // violation_weights vector
        (4 + 10 * 32) + // human_reviewers (max 10)
        8 + // total_reports
        8 + // total_sol_slashed
        8 + // created_at
        1; // is_active
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub struct ViolationWeight {
    pub violation_type: ViolationType,
    pub weight_bps: u16, // 0-10000 (0-100%)
}

#[account]
pub struct ViolationReport {
    pub id: u64,
    pub match_id: String,
    pub violation_type: ViolationType,
    pub evidence_hash: [u8; 32],
    pub evidence_url: String,
    pub description: String,
    pub reporter: Pubkey,
    pub reported_user: Pubkey,
    pub created_at: i64,
    pub status: ReportStatus,
    pub ai_confidence: u16,
    pub recommended_slash_bps: u16,
    pub final_slash_bps: u16,
    pub is_appealed: bool,
    pub human_reviewed: bool,
    pub human_reviewer: Option<Pubkey>,
    pub human_reviewed_at: Option<i64>,
    pub review_notes: Option<String>,
    pub executed: bool,
    pub executed_at: Option<i64>,
    pub escrow_executed: Option<Pubkey>,
    pub oracle_processed_at: Option<i64>,
    pub appeal_reason: Option<String>,
    pub appeal_evidence_hash: Option<[u8; 32]>,
    pub appealed_at: Option<i64>,
}

impl ViolationReport {
    pub const MAX_SIZE: usize = 8 + // id
        4 + 50 + // match_id
        1 + // violation_type
        32 + // evidence_hash
        4 + 200 + // evidence_url
        4 + 1000 + // description
        32 + // reporter
        32 + // reported_user
        8 + // created_at
        1 + // status
        2 + // ai_confidence
        2 + // recommended_slash_bps
        2 + // final_slash_bps
        1 + // is_appealed
        1 + // human_reviewed
        33 + // human_reviewer
        9 + // human_reviewed_at
        5 + 200 + // review_notes
        1 + // executed
        9 + // executed_at
        33 + // escrow_executed
        9 + // oracle_processed_at
        5 + 500 + // appeal_reason
        33 + // appeal_evidence_hash
        9; // appealed_at
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum ViolationType {
    NoShow,           // Didn't show up to meet
    Harassment,       // Verbal or physical harassment
    IdentityFraud,    // Fake photos/identity
    Threats,          // Threatened violence or harm
    Inappropriate,    // Sexual harassment/inappropriate behavior
    Theft,            // Stole something
    Violence,         // Physical assault
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum ReportStatus {
    PendingReview,
    AwaitingHumanReview,
    Approved,
    Rejected,
    InsufficientEvidence,
    UnderAppeal,
    AppealApproved,
    AppealRejected,
}

#[event]
pub struct ViolationReported {
    pub report_id: u64,
    pub match_id: String,
    pub violation_type: ViolationType,
    pub reporter: Pubkey,
    pub reported_user: Pubkey,
}

#[event]
pub struct ReportProcessed {
    pub report_id: u64,
    pub ai_confidence: u16,
    pub recommended_slash_bps: u16,
    pub status: ReportStatus,
}

#[event]
pub struct HumanReviewCompleted {
    pub report_id: u64,
    pub approved: bool,
    pub final_slash_bps: u16,
    pub reviewer: Pubkey,
}

#[event]
pub struct SlashExecuted {
    pub report_id: u64,
    pub escrow_address: Pubkey,
    pub slash_bps: u16,
}

#[event]
pub struct AppealSubmitted {
    pub report_id: u64,
    pub appealed_by: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Oracle is inactive")]
    OracleInactive,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Description too long")]
    DescriptionTooLong,
    #[msg("Report already processed")]
    AlreadyProcessed,
    #[msg("Invalid confidence value")]
    InvalidConfidence,
    #[msg("Invalid slash amount")]
    InvalidSlashAmount,
    #[msg("Unauthorized reviewer")]
    UnauthorizedReviewer,
    #[msg("Invalid review state")]
    InvalidReviewState,
    #[msg("Report not approved")]
    NotApproved,
    #[msg("Already executed")]
    AlreadyExecuted,
    #[msg("Cannot appeal this report")]
    CannotAppeal,
    #[msg("Already appealed")]
    AlreadyAppealed,
}