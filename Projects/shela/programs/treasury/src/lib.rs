use anchor_lang::prelude::*;
use anchor_lang::system_program;

// Shela Treasury Program
// Escrow, stake locking, and release mechanisms

declare_id!("Treasury11111111111111111111111111111111111");

#[program]
pub mod shela_treasury {
    use super::*;

    /// Initialize a new escrow account between two users
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
        escrow.stake_amount = stake_amount;
        escrow.user_a_staked = false;
        escrow.user_b_staked = false;
        escrow.status = EscrowStatus::Pending;
        escrow.created_at = Clock::get()?.unix_timestamp;
        escrow.treasury_bump = ctx.bumps.treasury_account;

        msg!("Escrow initialized for match: {}", match_id);
        Ok(())
    }

    /// User A stakes SOL into the escrow
    pub fn stake_user_a(ctx: Context<StakeUserA>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let user = &ctx.accounts.user;

        require!(
            escrow.status == EscrowStatus::Pending,
            ShelaError::InvalidEscrowStatus
        );
        require!(!escrow.user_a_staked, ShelaError::AlreadyStaked);

        // Transfer stake amount to treasury
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: user.to_account_info(),
                to: ctx.accounts.treasury_account.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, escrow.stake_amount)?;

        escrow.user_a_staked = true;
        escrow.user_a_deposit = escrow.stake_amount;

        msg!("User A staked {} lamports", escrow.stake_amount);
        Ok(())
    }

    /// User B stakes SOL into the escrow
    pub fn stake_user_b(ctx: Context<StakeUserB>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let user = &ctx.accounts.user;

        require!(
            escrow.status == EscrowStatus::Pending,
            ShelaError::InvalidEscrowStatus
        );
        require!(!escrow.user_b_staked, ShelaError::AlreadyStaked);

        // Transfer stake amount to treasury
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: user.to_account_info(),
                to: ctx.accounts.treasury_account.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, escrow.stake_amount)?;

        escrow.user_b_staked = true;
        escrow.user_b_deposit = escrow.stake_amount;

        // Check if both users have staked
        if escrow.user_a_staked && escrow.user_b_staked {
            escrow.status = EscrowStatus::Locked;
            msg!("Escrow locked - both users staked");
        }

        msg!("User B staked {} lamports", escrow.stake_amount);
        Ok(())
    }

    /// Verify meet and release stakes back to both users
    pub fn verify_and_release(ctx: Context<VerifyAndRelease>, 
        user_a_proof: [u8; 32],
        user_b_proof: [u8; 32],
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(
            escrow.status == EscrowStatus::Locked,
            ShelaError::EscrowNotLocked
        );

        // In production: verify ZK proofs here
        // For now, we trust the oracle/slash-oracle program

        // Release stakes to both users
        let treasury_balance = ctx.accounts.treasury_account.lamports();
        let total_stake = escrow.user_a_deposit + escrow.user_b_deposit;

        require!(
            treasury_balance >= total_stake,
            ShelaError::InsufficientTreasuryBalance
        );

        // Transfer to User A
        **ctx.accounts.treasury_account.try_borrow_mut_lamports()? -= escrow.user_a_deposit;
        **ctx.accounts.user_a.try_borrow_mut_lamports()? += escrow.user_a_deposit;

        // Transfer to User B
        **ctx.accounts.treasury_account.try_borrow_mut_lamports()? -= escrow.user_b_deposit;
        **ctx.accounts.user_b.try_borrow_mut_lamports()? += escrow.user_b_deposit;

        escrow.status = EscrowStatus::Released;

        msg!("Stakes released - match completed successfully");
        Ok(())
    }

    /// Slash stake for violation (called by slash oracle)
    pub fn slash_no_show(
        ctx: Context<SlashNoShow>,
        violation_type: ViolationType,
        slash_percentage: u8,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;

        require!(
            escrow.status == EscrowStatus::Locked,
            ShelaError::EscrowNotLocked
        );
        require!(slash_percentage <= 100, ShelaError::InvalidSlashPercentage);

        // Determine who violated
        let (violator, victim, violator_deposit) = if ctx.accounts.violator.key() == escrow.user_a {
            (escrow.user_a, escrow.user_b, escrow.user_a_deposit)
        } else if ctx.accounts.violator.key() == escrow.user_b {
            (escrow.user_b, escrow.user_a, escrow.user_b_deposit)
        } else {
            return Err(ShelaError::InvalidViolator.into());
        };

        // Calculate slash amount
        let slash_amount = (violator_deposit * slash_percentage as u64) / 100;
        let victim_compensation = slash_amount / 2; // Half to victim
        let treasury_fee = slash_amount - victim_compensation;

        // Transfer compensation to victim
        **ctx.accounts.treasury_account.try_borrow_mut_lamports()? -= victim_compensation;
        **ctx.accounts.victim.try_borrow_mut_lamports()? += victim_compensation;

        // Transfer fee to treasury (burn/keep for protocol)
        // In production: send to DAO treasury

        // Return remaining stake to violator
        let violator_return = violator_deposit - slash_amount;
        if violator_return > 0 {
            **ctx.accounts.treasury_account.try_borrow_mut_lamports()? -= violator_return;
            **ctx.accounts.violator.try_borrow_mut_lamports()? += violator_return;
        }

        escrow.status = EscrowStatus::Slashed;
        escrow.violation_type = Some(violation_type);
        escrow.slash_percentage = Some(slash_percentage);

        msg!("Slashed {}% - {} lamports", slash_percentage, slash_amount);
        Ok(())
    }

    /// Close escrow account (cleanup after release/slash)
    pub fn close_escrow(ctx: Context<CloseEscrow>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        
        require!(
            escrow.status == EscrowStatus::Released || 
            escrow.status == EscrowStatus::Slashed,
            ShelaError::EscrowNotFinalized
        );

        // Ensure treasury is empty
        require!(
            ctx.accounts.treasury_account.lamports() == 0,
            ShelaError::TreasuryNotEmpty
        );

        msg!("Escrow closed for match: {}", escrow.match_id);
        Ok(())
    }
}

// Account structures
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
    
    #[account(
        init,
        payer = initializer,
        space = 0, // Just a vault, no data
        seeds = [b"treasury", match_id.as_bytes()],
        bump
    )]
    /// CHECK: Treasury vault account
    pub treasury_account: AccountInfo<'info>,
    
    #[account(mut)]
    pub initializer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeUserA<'info> {
    #[account(
        mut,
        constraint = escrow.user_a == user.key()
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(
        mut,
        seeds = [b"treasury", escrow.match_id.as_bytes()],
        bump = escrow.treasury_bump
    )]
    /// CHECK: Treasury vault
    pub treasury_account: AccountInfo<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeUserB<'info> {
    #[account(
        mut,
        constraint = escrow.user_b == user.key()
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(
        mut,
        seeds = [b"treasury", escrow.match_id.as_bytes()],
        bump = escrow.treasury_bump
    )]
    /// CHECK: Treasury vault
    pub treasury_account: AccountInfo<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyAndRelease<'info> {
    #[account(
        mut,
        constraint = escrow.status == EscrowStatus::Locked
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(
        mut,
        seeds = [b"treasury", escrow.match_id.as_bytes()],
        bump = escrow.treasury_bump
    )]
    /// CHECK: Treasury vault
    pub treasury_account: AccountInfo<'info>,
    
    /// CHECK: User A account
    #[account(mut, address = escrow.user_a)]
    pub user_a: AccountInfo<'info>,
    
    /// CHECK: User B account  
    #[account(mut, address = escrow.user_b)]
    pub user_b: AccountInfo<'info>,
    
    pub authority: Signer<'info>, // Slash oracle or authorized verifier
}

#[derive(Accounts)]
pub struct SlashNoShow<'info> {
    #[account(
        mut,
        constraint = escrow.status == EscrowStatus::Locked
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(
        mut,
        seeds = [b"treasury", escrow.match_id.as_bytes()],
        bump = escrow.treasury_bump
    )]
    /// CHECK: Treasury vault
    pub treasury_account: AccountInfo<'info>,
    
    /// CHECK: The user who violated (either A or B)
    #[account(mut)]
    pub violator: AccountInfo<'info>,
    
    /// CHECK: The victim (the other user)
    #[account(mut)]
    pub victim: AccountInfo<'info>,
    
    pub authority: Signer<'info>, // Slash oracle
}

#[derive(Accounts)]
pub struct CloseEscrow<'info> {
    #[account(
        mut,
        close = closer,
        constraint = escrow.status == EscrowStatus::Released || escrow.status == EscrowStatus::Slashed
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(
        mut,
        seeds = [b"treasury", escrow.match_id.as_bytes()],
        bump = escrow.treasury_bump,
        close = closer
    )]
    /// CHECK: Treasury vault
    pub treasury_account: AccountInfo<'info>,
    
    #[account(mut)]
    pub closer: Signer<'info>,
}

// Data structures
#[account]
pub struct EscrowAccount {
    pub match_id: String,           // 4 + 64 bytes
    pub user_a: Pubkey,             // 32 bytes
    pub user_b: Pubkey,             // 32 bytes
    pub stake_amount: u64,          // 8 bytes
    pub user_a_staked: bool,        // 1 byte
    pub user_b_staked: bool,        // 1 byte
    pub user_a_deposit: u64,        // 8 bytes
    pub user_b_deposit: u64,        // 8 bytes
    pub status: EscrowStatus,       // 1 byte
    pub created_at: i64,            // 8 bytes
    pub treasury_bump: u8,          // 1 byte
    pub violation_type: Option<ViolationType>, // 2 bytes
    pub slash_percentage: Option<u8>, // 2 bytes
}

impl EscrowAccount {
    pub const SIZE: usize = 64 + 32 + 32 + 8 + 1 + 1 + 8 + 8 + 1 + 8 + 1 + 2 + 2 + 100; // Extra padding
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EscrowStatus {
    Pending,    // 0
    Locked,     // 1
    Released,   // 2
    Slashed,    // 3
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ViolationType {
    Ghosted,                    // 0
    NoShow,                     // 1
    InappropriateBehavior,      // 2
    UnsafeMeet,                 // 3
    Harassment,                 // 4
}

// Error codes
#[error_code]
pub enum ShelaError {
    #[msg("Invalid escrow status for this operation")]
    InvalidEscrowStatus,
    
    #[msg("User has already staked")]
    AlreadyStaked,
    
    #[msg("Escrow is not locked")]
    EscrowNotLocked,
    
    #[msg("Escrow is not finalized")]
    EscrowNotFinalized,
    
    #[msg("Treasury account is not empty")]
    TreasuryNotEmpty,
    
    #[msg("Insufficient treasury balance")]
    InsufficientTreasuryBalance,
    
    #[msg("Invalid slash percentage (must be 0-100)")]
    InvalidSlashPercentage,
    
    #[msg("Invalid violator account")]
    InvalidViolator,
}
