use anchor_lang::prelude::*;

// Shela Slash Oracle Program
// Decentralized violation arbitration and stake slashing

declare_id!("SlashA1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0");

#[program]
pub mod shela_slash_oracle {
    use super::*;

    /// Initialize the slash oracle
    pub fn initialize(ctx: Context<InitializeOracle>) -> Result<()> {
        let oracle = &mut ctx.accounts.oracle;
        
        oracle.admin = ctx.accounts.admin.key();
        oracle.total_cases = 0;
        oracle.total_slashed = 0;
        oracle.total_compensated = 0;
        oracle.authority_bump = ctx.bumps.oracle;
        
        msg!("Slash oracle initialized by: {}", ctx.accounts.admin.key());
        Ok(())
    }

    /// File a violation report
    pub fn file_report(
        ctx: Context<FileReport>,
        match_id: [u8; 32],
        violator: Pubkey,
        violation_type: ViolationType,
        evidence_hash: [u8; 32],
        description: String,
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        let oracle = &mut ctx.accounts.oracle;
        
        require!(description.len() <= 500, ErrorCode::DescriptionTooLong);
        
        report.id = oracle.total_cases;
        report.match_id = match_id;
        report.reporter = ctx.accounts.reporter.key();
        report.violator = violator;
        report.violation_type = violation_type;
        report.evidence_hash = evidence_hash;
        report.description = description;
        report.created_at = Clock::get()?.unix_timestamp;
        report.status = ReportStatus::Pending;
        report.oracle_authority = oracle.key();
        report.slash_percentage = 0;
        report.compensation_percentage = 0;
        report.resolved_at = 0;
        
        oracle.total_cases += 1;
        
        msg!(
            "Violation report filed: {} | Type: {:?} | Reporter: {}",
            report.id,
            violation_type,
            ctx.accounts.reporter.key()
        );
        
        Ok(())
    }

    /// Oracle resolves a report (auto-slash or human review)
    pub fn resolve_report(
        ctx: Context<ResolveReport>,
        slash_percentage: u8,
        compensation_percentage: u8,
        resolution: String,
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        let oracle = &mut ctx.accounts.oracle;
        
        require!(
            ctx.accounts.authority.key() == oracle.admin,
            ErrorCode::Unauthorized
        );
        require!(
            report.status == ReportStatus::Pending,
            ErrorCode::AlreadyResolved
        );
        require!(
            slash_percentage <= 100,
            ErrorCode::InvalidPercentage
        );
        require!(
            compensation_percentage <= slash_percentage,
            ErrorCode::InvalidCompensation
        );
        
        report.slash_percentage = slash_percentage;
        report.compensation_percentage = compensation_percentage;
        report.resolution = resolution;
        report.resolved_at = Clock::get()?.unix_timestamp;
        
        // Auto-approve if clear-cut cases (ghosting with proof, etc.)
        if should_auto_approve(&report) {
            report.status = ReportStatus::Approved;
            oracle.total_slashed += 1;
            oracle.total_compensated += compensation_percentage as u64;
            msg!("Report auto-approved and slashing authorized");
        } else {
            report.status = ReportStatus::UnderReview;
            msg!("Report flagged for manual review");
        }
        
        msg!(
            "Report {} resolved: {}% slash, {}% compensation",
            report.id,
            slash_percentage,
            compensation_percentage
        );
        
        Ok(())
    }

    /// Finalize an approved slash (called by treasury program)
    pub fn finalize_slash(ctx: Context<FinalizeSlash>) -> Result<()> {
        let report = &mut ctx.accounts.report;
        
        require!(
            report.status == ReportStatus::Approved || 
            report.status == ReportStatus::UnderReview,
            ErrorCode::NotReadyForFinalization
        );
        
        report.status = ReportStatus::Executed;
        
        msg!("Slash finalized for report: {}", report.id);
        Ok(())
    }

    /// Appeal a resolution (within 7 days)
    pub fn appeal_report(
        ctx: Context<AppealReport>,
        appeal_reason: String,
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        
        require!(
            ctx.accounts.appellant.key() == report.violator,
            ErrorCode::Unauthorized
        );
        require!(
            report.status == ReportStatus::Approved ||
            report.status == ReportStatus::UnderReview,
            ErrorCode::CannotAppeal
        );
        
        let current_time = Clock::get()?.unix_timestamp;
        let appeal_window = 7 * 24 * 60 * 60; // 7 days
        
        require!(
            current_time - report.resolved_at <= appeal_window,
            ErrorCode::AppealWindowClosed
        );
        
        report.status = ReportStatus::Appealed;
        report.appeal_reason = appeal_reason;
        report.appealed_at = current_time;
        
        msg!("Report {} appealed by violator", report.id);
        Ok(())
    }

    /// Get slash parameters for a report (called by treasury)
    pub fn get_slash_params(ctx: Context<GetSlashParams>) -> Result<SlashParams> {
        let report = &ctx.accounts.report;
        
        require!(
            report.status == ReportStatus::Approved,
            ErrorCode::NotApproved
        );
        
        Ok(SlashParams {
            violator: report.violator,
            slash_percentage: report.slash_percentage,
            compensation_percentage: report.compensation_percentage,
            reporter: report.reporter,
        })
    }
}

fn should_auto_approve(report: &ReportAccount) -> bool {
    // Auto-approve clear cases:
    // 1. No-show with timestamp proof
    // 2. Ghosting with message read receipts
    // 3. Prior pattern of similar violations
    
    match report.violation_type {
        ViolationType::NoShow => {
            // If evidence includes meet time + no check-in
            report.description.to_lowercase().contains("check-in")
        }
        ViolationType::Ghosted => {
            // If multiple messages unanswered with read receipts
            report.description.to_lowercase().contains("read receipt") ||
            report.description.to_lowercase().contains("24 hours")
        }
        ViolationType::Harassment => {
            // Never auto-approve - always review
            false
        }
        _ => false,
    }
}

#[derive(Accounts)]
pub struct InitializeOracle<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + OracleAccount::SIZE,
        seeds = [b"slash_oracle"],
        bump
    )]
    pub oracle: Account<'info, OracleAccount>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FileReport<'info> {
    #[account(
        init,
        payer = reporter,
        space = 8 + ReportAccount::SIZE,
        seeds = [b"report", &oracle.total_cases.to_le_bytes()],
        bump
    )]
    pub report: Account<'info, ReportAccount>,
    
    #[account(mut)]
    pub oracle: Account<'info, OracleAccount>,
    
    #[account(mut)]
    pub reporter: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveReport<'info> {
    #[account(mut)]
    pub report: Account<'info, ReportAccount>,
    
    #[account(mut)]
    pub oracle: Account<'info, OracleAccount>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FinalizeSlash<'info> {
    #[account(mut)]
    pub report: Account<'info, ReportAccount>,
}

#[derive(Accounts)]
pub struct AppealReport<'info> {
    #[account(mut)]
    pub report: Account<'info, ReportAccount>,
    
    pub appellant: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetSlashParams<'info> {
    pub report: Account<'info, ReportAccount>,
}

#[account]
pub struct OracleAccount {
    pub admin: Pubkey,
    pub total_cases: u64,
    pub total_slashed: u64,
    pub total_compensated: u64,
    pub authority_bump: u8,
}

impl OracleAccount {
    pub const SIZE: usize = 32 + 8 + 8 + 8 + 1;
}

#[account]
pub struct ReportAccount {
    pub id: u64,
    pub match_id: [u8; 32],
    pub reporter: Pubkey,
    pub violator: Pubkey,
    pub violation_type: ViolationType,
    pub evidence_hash: [u8; 32],
    pub description: String, // max 500 chars
    pub created_at: i64,
    pub status: ReportStatus,
    pub oracle_authority: Pubkey,
    pub slash_percentage: u8,
    pub compensation_percentage: u8,
    pub resolution: String, // max 200 chars
    pub resolved_at: i64,
    pub appeal_reason: String, // max 500 chars
    pub appealed_at: i64,
}

impl ReportAccount {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 1 + 32 + 512 + 8 + 1 + 32 + 1 + 1 + 256 + 8 + 512 + 8 + 64;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ViolationType {
    Ghosted,
    NoShow,
    InappropriateBehavior,
    UnsafeMeet,
    Harassment,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ReportStatus {
    Pending,
    UnderReview,
    Approved,
    Rejected,
    Executed,
    Appealed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SlashParams {
    pub violator: Pubkey,
    pub slash_percentage: u8,
    pub compensation_percentage: u8,
    pub reporter: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Description too long (max 500 chars)")]
    DescriptionTooLong,
    #[msg("Report already resolved")]
    AlreadyResolved,
    #[msg("Invalid percentage")]
    InvalidPercentage,
    #[msg("Compensation cannot exceed slash percentage")]
    InvalidCompensation,
    #[msg("Report not ready for finalization")]
    NotReadyForFinalization,
    #[msg("Cannot appeal this report")]
    CannotAppeal,
    #[msg("Appeal window closed (7 days)")]
    AppealWindowClosed,
    #[msg("Report not approved")]
    NotApproved,
}
