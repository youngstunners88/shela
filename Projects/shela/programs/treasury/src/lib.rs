use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke;

// Shela Treasury Escrow Program
// Handles stake locking, release, and burning for dating safety

declare_id!("ShelaTreasury11111111111111111111111111111");

#[program]
pub mod shela_treasury {
    use super::*;

    /// Initialize a new escrow for a meet
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        match_id: String,
        user_a: Pubkey,
        user_b: Pubkey,
        stake_amount: u64,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        escrow.match_id = match_id;
        escrow.user_a = user_a;
        escrow.user_b = user_b;
        escrow.stake_amount_per_user = stake_amount;
        escrow.user_a_staked = false;
        escrow.user_b_staked = false;
        escrow.status = EscrowStatus::AwaitingStake;
        escrow.created_at = Clock::get()?.unix_timestamp;
        escrow.expires_at = Clock::get()?.unix_timestamp + (30 * 60); // 30 min
        
        emit!(EscrowInitialized {
            match_id: escrow.match_id.clone(),
            user_a,
            user_b,
            stake_amount,
        });
        
        Ok(())
    }

    /// User A stakes their SOL
    pub fn stake_user_a(ctx: Context<StakeUserA>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let user = &ctx.accounts.user;
        
        require!(escrow.user_a == user.key(), ErrorCode::InvalidUser);
        require!(!escrow.user_a_staked, ErrorCode::AlreadyStaked);
        require!(
            escrow.status == EscrowStatus::AwaitingStake || 
            escrow.status == EscrowStatus::UserBStaked,
            ErrorCode::InvalidEscrowStatus
        );
        
        // Transfer stake to treasury
        let stake_instruction = system_instruction::transfer(
            user.key,
            &ctx.accounts.treasury.key(),
            escrow.stake_amount_per_user,
        );
        
        invoke(
            &stake_instruction,
            &[
                user.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        escrow.user_a_staked = true;
        
        if escrow.user_b_staked {
            escrow.status = EscrowStatus::Locked;
            emit!(EscrowLocked {
                match_id: escrow.match_id.clone(),
            });
        } else {
            escrow.status = EscrowStatus::UserAStaked;
        }
        
        emit!(UserStaked {
            match_id: escrow.match_id.clone(),
            user: user.key(),
            amount: escrow.stake_amount_per_user,
        });
        
        Ok(())
    }

    /// User B stakes their SOL
    pub fn stake_user_b(ctx: Context<StakeUserB>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let user = &ctx.accounts.user;
        
        require!(escrow.user_b == user.key(), ErrorCode::InvalidUser);
        require!(!escrow.user_b_staked, ErrorCode::AlreadyStaked);
        require!(
            escrow.status == EscrowStatus::AwaitingStake || 
            escrow.status == EscrowStatus::UserAStaked,
            ErrorCode::InvalidEscrowStatus
        );
        
        // Transfer stake to treasury
        let stake_instruction = system_instruction::transfer(
            user.key,
            &ctx.accounts.treasury.key(),
            escrow.stake_amount_per_user,
        );
        
        invoke(
            &stake_instruction,
            &[
                user.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        escrow.user_b_staked = true;
        
        if escrow.user_a_staked {
            escrow.status = EscrowStatus::Locked;
            emit!(EscrowLocked {
                match_id: escrow.match_id.clone(),
            });
        } else {
            escrow.status = EscrowStatus::UserBStaked;
        }
        
        emit!(UserStaked {
            match_id: escrow.match_id.clone(),
            user: user.key(),
            amount: escrow.stake_amount_per_user,
        });
        
        Ok(())
    }

    /// Verify meet and release stakes (both parties checked in)
    pub fn verify_and_release(ctx: Context<VerifyAndRelease>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let clock = Clock::get()?;
        
        require!(escrow.status == EscrowStatus::Locked, ErrorCode::InvalidEscrowStatus);
        require!(clock.unix_timestamp <= escrow.expires_at, ErrorCode::EscrowExpired);
        
        // Mark as verified
        escrow.status = EscrowStatus::Verified;
        escrow.verified_at = Some(clock.unix_timestamp);
        
        // Stakes remain in treasury, credited to user reputation scores
        // Actual withdrawal happens through claim_reputation_stake
        
        emit!(EscrowVerified {
            match_id: escrow.match_id.clone(),
            user_a: escrow.user_a,
            user_b: escrow.user_b,
            verified_at: clock.unix_timestamp,
        });
        
        Ok(())
    }

    /// Report no-show or violation, trigger slash
    pub fn report_violation(
        ctx: Context<ReportViolation>,
        violation_type: ViolationType,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let reporter = &ctx.accounts.reporter;
        let clock = Clock::get()?;
        
        require!(
            reporter.key() == escrow.user_a || reporter.key() == escrow.user_b,
            ErrorCode::InvalidReporter
        );
        require!(escrow.status == EscrowStatus::Locked, ErrorCode::InvalidEscrowStatus);
        
        let reported = if reporter.key() == escrow.user_a {
            escrow.user_b
        } else {
            escrow.user_a
        };
        
        escrow.status = EscrowStatus::ViolationReported;
        escrow.violation = Some(ViolationRecord {
            reporter: reporter.key(),
            reported,
            violation_type,
            reported_at: clock.unix_timestamp,
            evidence_hash: ctx.accounts.evidence_hash.clone(),
        });
        
        emit!(ViolationReported {
            match_id: escrow.match_id.clone(),
            reporter: reporter.key(),
            reported,
            violation_type,
        });
        
        Ok(())
    }

    /// Slash oracle executes penalty after review
    pub fn execute_slash(ctx: Context<ExecuteSlash>, slash_percentage: u8) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let clock = Clock::get()?;
        
        require!(
            escrow.status == EscrowStatus::ViolationReported,
            ErrorCode::InvalidEscrowStatus
        );
        require!(slash_percentage <= 100, ErrorCode::InvalidSlashPercentage);
        
        let violation = escrow.violation.as_ref().unwrap();
        let slashed_amount = escrow.stake_amount_per_user * slash_percentage as u64 / 100;
        let victim_compensation = slashed_amount / 2;
        let treasury_burn = slashed_amount - victim_compensation;
        
        escrow.status = EscrowStatus::Slashed;
        escrow.slash_result = Some(SlashResult {
            slashed_user: violation.reported,
            slash_percentage,
            slashed_amount,
            victim_compensation,
            treasury_burn,
            executed_at: clock.unix_timestamp,
        });
        
        // Transfer victim compensation
        if victim_compensation > 0 {
            **ctx.accounts.treasury.to_account_info().lamports.borrow_mut() -= victim_compensation;
            **ctx.accounts.victim.to_account_info().lamports.borrow_mut() += victim_compensation;
        }
        
        // Treasury keeps the rest (simulates burn by not allowing withdrawal)
        
        emit!(SlashExecuted {
            match_id: escrow.match_id.clone(),
            slashed_user: violation.reported,
            slash_percentage,
            slashed_amount,
            victim: violation.reporter,
            victim_compensation,
        });
        
        Ok(())
    }

    /// Withdraw stake after successful verification (adds to reputation)
    pub fn claim_reputation_stake(ctx: Context<ClaimReputationStake>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let user = &ctx.accounts.user;
        
        require!(escrow.status == EscrowStatus::Verified, ErrorCode::InvalidEscrowStatus);
        require!(
            user.key() == escrow.user_a || user.key() == escrow.user_b,
            ErrorCode::InvalidUser
        );
        
        let already_claimed = if user.key() == escrow.user_a {
            escrow.user_a_claimed
        } else {
            escrow.user_b_claimed
        };
        
        require!(!already_claimed, ErrorCode::AlreadyClaimed);
        
        // Return stake to user
        **ctx.accounts.treasury.to_account_info().lamports.borrow_mut() -= escrow.stake_amount_per_user;
        **user.to_account_info().lamports.borrow_mut() += escrow.stake_amount_per_user;
        
        // Mark as claimed
        if user.key() == escrow.user_a {
            escrow.user_a_claimed = true;
        } else {
            escrow.user_b_claimed = true;
        }
        
        // If both claimed, mark completed
        if escrow.user_a_claimed && escrow.user_b_claimed {
            escrow.status = EscrowStatus::Completed;
        }
        
        emit!(StakeClaimed {
            match_id: escrow.match_id.clone(),
            user: user.key(),
            amount: escrow.stake_amount_per_user,
            reputation_points: escrow.stake_amount_per_user / 100_000, // 1 point per 0.001 SOL
        });
        
        Ok(())
    }

    /// Refund if escrow expired without both staking
    pub fn refund_expired(ctx: Context<RefundExpired>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let clock = Clock::get()?;
        
        require!(clock.unix_timestamp > escrow.expires_at, ErrorCode::EscrowNotExpired);
        require!(
            escrow.status == EscrowStatus::UserAStaked || 
            escrow.status == EscrowStatus::UserBStaked,
            ErrorCode::InvalidEscrowStatus
        );
        
        // Refund whoever staked
        if escrow.user_a_staked && !escrow.user_a_claimed {
            **ctx.accounts.treasury.to_account_info().lamports.borrow_mut() -= escrow.stake_amount_per_user;
            **ctx.accounts.user_a.to_account_info().lamports.borrow_mut() += escrow.stake_amount_per_user;
            escrow.user_a_claimed = true;
        }
        
        if escrow.user_b_staked && !escrow.user_b_claimed {
            **ctx.accounts.treasury.to_account_info().lamports.borrow_mut() -= escrow.stake_amount_per_user;
            **ctx.accounts.user_b.to_account_info().lamports.borrow_mut() += escrow.stake_amount_per_user;
            escrow.user_b_claimed = true;
        }
        
        escrow.status = EscrowStatus::Expired;
        
        emit!(EscrowExpired {
            match_id: escrow.match_id.clone(),
        });
        
        Ok(())
    }
}

// === ACCOUNTS ===

#[derive(Accounts)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        payer = initializer,
        space = 8 + EscrowAccount::SIZE,
        seeds = [b"escrow", match_id.as_bytes()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(mut)]
    pub initializer: Signer<'info>,
    
    /// CHECK: Treasury account for holding stakes
    #[account(
        init_if_needed,
        payer = initializer,
        space = 8 + 8, // discriminator + lamports tracking
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeUserA<'info> {
    #[account(
        mut,
        constraint = escrow.user_a == user.key()
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Treasury account
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeUserB<'info> {
    #[account(
        mut,
        constraint = escrow.user_b == user.key()
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Treasury account
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyAndRelease<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    
    /// CHECK: Verification authority (PDA or oracle)
    pub verifier: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReportViolation<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(
        constraint = escrow.user_a == reporter.key() || escrow.user_b == reporter.key()
    )]
    pub reporter: Signer<'info>,
    
    pub evidence_hash: String,
}

#[derive(Accounts)]
pub struct ExecuteSlash<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    
    /// CHECK: Slash oracle authority
    pub slash_oracle: Signer<'info>,
    
    /// CHECK: Treasury account
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: AccountInfo<'info>,
    
    /// CHECK: Victim account (receives 50% of slashed)
    #[account(mut)]
    pub victim: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ClaimReputationStake<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(
        mut,
        constraint = escrow.user_a == user.key() || escrow.user_b == user.key()
    )]
    pub user: Signer<'info>,
    
    /// CHECK: Treasury account
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RefundExpired<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    
    /// CHECK: User A account
    #[account(mut)]
    pub user_a: AccountInfo<'info>,
    
    /// CHECK: User B account  
    #[account(mut)]
    pub user_b: AccountInfo<'info>,
    
    /// CHECK: Treasury account
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: AccountInfo<'info>,
}

// === DATA STRUCTURES ===

#[account]
pub struct EscrowAccount {
    pub match_id: String,
    pub user_a: Pubkey,
    pub user_b: Pubkey,
    pub stake_amount_per_user: u64,
    pub user_a_staked: bool,
    pub user_b_staked: bool,
    pub user_a_claimed: bool,
    pub user_b_claimed: bool,
    pub status: EscrowStatus,
    pub created_at: i64,
    pub expires_at: i64,
    pub verified_at: Option<i64>,
    pub violation: Option<ViolationRecord>,
    pub slash_result: Option<SlashResult>,
}

impl EscrowAccount {
    pub const SIZE: usize = 8 // discriminator
        + 50  // match_id (max 50 chars)
        + 32  // user_a
        + 32  // user_b
        + 8   // stake_amount_per_user
        + 1   // user_a_staked
        + 1   // user_b_staked
        + 1   // user_a_claimed
        + 1   // user_b_claimed
        + 1   // status (enum)
        + 8   // created_at
        + 8   // expires_at
        + 9   // verified_at (Option<i64>)
        + 200 // violation (Option<ViolationRecord>)
        + 200 // slash_result (Option<SlashResult>)
        + 50; // padding
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowStatus {
    AwaitingStake,
    UserAStaked,
    UserBStaked,
    Locked,
    Verified,
    ViolationReported,
    Slashed,
    Expired,
    Completed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ViolationRecord {
    pub reporter: Pubkey,
    pub reported: Pubkey,
    pub violation_type: ViolationType,
    pub reported_at: i64,
    pub evidence_hash: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SlashResult {
    pub slashed_user: Pubkey,
    pub slash_percentage: u8,
    pub slashed_amount: u64,
    pub victim_compensation: u64,
    pub treasury_burn: u64,
    pub executed_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ViolationType {
    NoShow,
    SafetyConcern,
    Harassment,
    Catfishing,
    ViolationOfTerms,
}

// === EVENTS ===

#[event]
pub struct EscrowInitialized {
    pub match_id: String,
    pub user_a: Pubkey,
    pub user_b: Pubkey,
    pub stake_amount: u64,
}

#[event]
pub struct UserStaked {
    pub match_id: String,
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct EscrowLocked {
    pub match_id: String,
}

#[event]
pub struct EscrowVerified {
    pub match_id: String,
    pub user_a: Pubkey,
    pub user_b: Pubkey,
    pub verified_at: i64,
}

#[event]
pub struct ViolationReported {
    pub match_id: String,
    pub reporter: Pubkey,
    pub reported: Pubkey,
    pub violation_type: ViolationType,
}

#[event]
pub struct SlashExecuted {
    pub match_id: String,
    pub slashed_user: Pubkey,
    pub slash_percentage: u8,
    pub slashed_amount: u64,
    pub victim: Pubkey,
    pub victim_compensation: u64,
}

#[event]
pub struct StakeClaimed {
    pub match_id: String,
    pub user: Pubkey,
    pub amount: u64,
    pub reputation_points: u64,
}

#[event]
pub struct EscrowExpired {
    pub match_id: String,
}

// === ERRORS ===

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid user for this escrow")]
    InvalidUser,
    #[msg("Invalid escrow status for this operation")]
    InvalidEscrowStatus,
    #[msg("User already staked")]
    AlreadyStaked,
    #[msg("Invalid reporter")]
    InvalidReporter,
    #[msg("Escrow has expired")]
    EscrowExpired,
    #[msg("Escrow has not expired yet")]
    EscrowNotExpired,
    #[msg("Invalid slash percentage (0-100)")]
    InvalidSlashPercentage,
    #[msg("Stake already claimed")]
    AlreadyClaimed,
}
