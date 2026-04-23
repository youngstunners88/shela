use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

// Shela Treasury Program
// Handles staking, releases, and rollovers for dating safety

declare_id!("TreasP8u9dQ2j9J3z8kK1m2n3o4p5q6r7s8t9u0v1w2x3");

#[program]
pub mod shela_treasury {
    use super::*;

    /// Initialize a new escrow agreement between two users
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        match_id: [u8; 32],
        user_a: Pubkey,
        user_b: Pubkey,
        stake_amount: u64,
        tier: u8, // 1=text, 2=voice, 3=video, 4=meetup
        meet_time: i64,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        escrow.match_id = match_id;
        escrow.user_a = user_a;
        escrow.user_b = user_b;
        escrow.stake_amount = stake_amount;
        escrow.tier = tier;
        escrow.meet_time = meet_time;
        escrow.user_a_staked = false;
        escrow.user_b_staked = false;
        escrow.user_a_checked_in = false;
        escrow.user_b_checked_in = false;
        escrow.released = false;
        escrow.slash_oracle = ctx.accounts.slash_oracle.key();
        
        msg!("Escrow initialized for match: {:?}", match_id);
        Ok(())
    }

    /// User A stakes their SOL
    pub fn stake_user_a(ctx: Context<StakeUserA>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        require!(!escrow.user_a_staked, ErrorCode::AlreadyStaked);
        require_eq!(escrow.user_a, ctx.accounts.user_a.key(), ErrorCode::Unauthorized);
        
        // Transfer stake to treasury
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_a.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, escrow.stake_amount)?;
        
        escrow.user_a_staked = true;
        msg!("User A staked: {}", escrow.stake_amount);
        
        // Check if both staked
        if escrow.user_b_staked {
            msg!("Both users staked. Meet can proceed.");
        }
        
        Ok(())
    }

    /// User B stakes their SOL
    pub fn stake_user_b(ctx: Context<StakeUserB>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        require!(!escrow.user_b_staked, ErrorCode::AlreadyStaked);
        require_eq!(escrow.user_b, ctx.accounts.user_b.key(), ErrorCode::Unauthorized);
        
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_b.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, escrow.stake_amount)?;
        
        escrow.user_b_staked = true;
        msg!("User B staked: {}", escrow.stake_amount);
        
        Ok(())
    }

    /// Submit location check-in proof (ZK verification would happen off-chain)
    pub fn check_in(
        ctx: Context<CheckIn>,
        proof_hash: [u8; 32], // Hash of ZK proof
        is_user_a: bool,
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        require!(escrow.user_a_staked && escrow.user_b_staked, ErrorCode::NotFullyStaked);
        require!(!escrow.released, ErrorCode::AlreadyReleased);
        
        let current_time = Clock::get()?.unix_timestamp;
        let grace_period = 3600; // 1 hour grace period
        require!(
            current_time >= escrow.meet_time - grace_period && 
            current_time <= escrow.meet_time + grace_period * 4,
            ErrorCode::OutsideCheckInWindow
        );
        
        if is_user_a {
            require_eq!(escrow.user_a, ctx.accounts.user.key(), ErrorCode::Unauthorized);
            require!(!escrow.user_a_checked_in, ErrorCode::AlreadyCheckedIn);
            escrow.user_a_checked_in = true;
            escrow.user_a_proof = proof_hash;
            msg!("User A checked in");
        } else {
            require_eq!(escrow.user_b, ctx.accounts.user.key(), ErrorCode::Unauthorized);
            require!(!escrow.user_b_checked_in, ErrorCode::AlreadyCheckedIn);
            escrow.user_b_checked_in = true;
            escrow.user_b_proof = proof_hash;
            msg!("User B checked in");
        }
        
        // Auto-release if both checked in
        if escrow.user_a_checked_in && escrow.user_b_checked_in {
            msg!("Both checked in! Stakes will be released.");
        }
        
        Ok(())
    }

    /// Release stakes back to both users (called by either after both check in)
    pub fn release_stakes(ctx: Context<ReleaseStakes>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        require!(escrow.user_a_checked_in && escrow.user_b_checked_in, ErrorCode::NotBothCheckedIn);
        require!(!escrow.released, ErrorCode::AlreadyReleased);
        
        // Transfer back to User A
        let seeds = &[b"treasury".as_ref(), &[ctx.bumps.treasury]];
        let signer = &[&seeds[..]];
        
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.treasury.to_account_info(),
                to: ctx.accounts.user_a.to_account_info(),
            },
            signer,
        );
        system_program::transfer(cpi_context, escrow.stake_amount)?;
        
        // Transfer back to User B
        let cpi_context_b = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.treasury.to_account_info(),
                to: ctx.accounts.user_b.to_account_info(),
            },
            signer,
        );
        system_program::transfer(cpi_context_b, escrow.stake_amount)?;
        
        escrow.released = true;
        
        // Update user reputation (simplified - would call reputation program)
        msg!("Stakes released. Users earned reputation points.");
        
        Ok(())
    }

    /// Slash a user for violation (called by slash oracle)
    pub fn slash_violator(
        ctx: Context<SlashViolator>,
        slash_percentage: u8, // 0-100
        compensation_to_victim: u8, // 0-100 of slashed amount
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        require!(
            ctx.accounts.slash_oracle.key() == escrow.slash_oracle,
            ErrorCode::UnauthorizedSlashOracle
        );
        require!(slash_percentage > 0 && slash_percentage <= 100, ErrorCode::InvalidSlashPercentage);
        require!(!escrow.released, ErrorCode::AlreadyReleased);
        
        // Determine who to slash
        let (violator, victim, violator_staked) = if !escrow.user_a_checked_in {
            (escrow.user_a, escrow.user_b, escrow.user_a_staked)
        } else if !escrow.user_b_checked_in {
            (escrow.user_b, escrow.user_a, escrow.user_b_staked)
        } else {
            return Err(ErrorCode::BothCheckedIn.into());
        };
        
        require!(violator_staked, ErrorCode::ViolatorDidNotStake);
        
        let slash_amount = escrow.stake_amount * slash_percentage as u64 / 100;
        let victim_compensation = slash_amount * compensation_to_victim as u64 / 100;
        let treasury_fee = slash_amount - victim_compensation;
        
        // Transfer compensation to victim
        let seeds = &[b"treasury".as_ref(), &[ctx.bumps.treasury]];
        let signer = &[&seeds[..]];
        
        if victim_compensation > 0 {
            let victim_account = if violator == escrow.user_a {
                ctx.accounts.user_b.to_account_info()
            } else {
                ctx.accounts.user_a.to_account_info()
            };
            
            let cpi_context = CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.treasury.to_account_info(),
                    to: victim_account,
                },
                signer,
            );
            system_program::transfer(cpi_context, victim_compensation)?;
        }
        
        // Return remaining to violator (what wasn't slashed)
        let remaining = escrow.stake_amount - slash_amount;
        if remaining > 0 {
            let violator_account = if violator == escrow.user_a {
                ctx.accounts.user_a.to_account_info()
            } else {
                ctx.accounts.user_b.to_account_info()
            };
            
            let cpi_context = CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.treasury.to_account_info(),
                    to: violator_account,
                },
                signer,
            );
            system_program::transfer(cpi_context, remaining)?;
        }
        
        escrow.released = true;
        escrow.slash_percentage = slash_percentage;
        
        msg!(
            "User slashed: {}% of {} SOL. Victim receives: {} SOL. Treasury: {} SOL",
            slash_percentage,
            escrow.stake_amount as f64 / 1_000_000_000.0,
            victim_compensation as f64 / 1_000_000_000.0,
            treasury_fee as f64 / 1_000_000_000.0
        );
        
        Ok(())
    }

    /// Rollover stake to next tier after successful meet
    pub fn rollover_stake(
        ctx: Context<RolloverStake>,
        multiplier: u8, // 15 = 1.5x, 20 = 2x, etc (divide by 10)
    ) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let rollover = &mut ctx.accounts.rollover;
        
        require!(escrow.released, ErrorCode::NotYetReleased);
        require!(multiplier >= 15 && multiplier <= 50, ErrorCode::InvalidMultiplier); // 1.5x to 5x
        
        let user = ctx.accounts.user.key();
        let new_stake = escrow.stake_amount * multiplier as u64 / 10;
        
        rollover.user = user;
        rollover.original_stake = escrow.stake_amount;
        rollover.rollover_stake = new_stake;
        rollover.tier = escrow.tier + 1; // Next tier
        rollover.multiplier = multiplier;
        rollover.created_at = Clock::get()?.unix_timestamp;
        rollover.expires_at = rollover.created_at + 7 * 24 * 60 * 60; // 7 days
        rollover.used = false;
        
        msg!(
            "Stake rolled over: {} SOL → {} SOL ({}x multiplier)",
            escrow.stake_amount as f64 / 1_000_000_000.0,
            new_stake as f64 / 1_000_000_000.0,
            multiplier as f64 / 10.0
        );
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        payer = initializer,
        space = 8 + EscrowAccount::SIZE,
        seeds = [b"escrow", match_id.as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(
        init_if_needed,
        payer = initializer,
        space = 8 + TreasuryAccount::SIZE,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, TreasuryAccount>,
    
    /// CHECK: The slash oracle that can authorize slashing
    pub slash_oracle: AccountInfo<'info>,
    
    #[account(mut)]
    pub initializer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeUserA<'info> {
    #[account(mut, has_one = user_a)]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(mut)]
    pub user_a: Signer<'info>,
    
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: Account<'info, TreasuryAccount>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeUserB<'info> {
    #[account(mut, has_one = user_b)]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(mut)]
    pub user_b: Signer<'info>,
    
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: Account<'info, TreasuryAccount>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckIn<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct ReleaseStakes<'info> {
    #[account(mut, has_one = user_a, has_one = user_b)]
    pub escrow: Account<'info, EscrowAccount>,
    
    /// CHECK: User A account (for lamport transfer)
    #[account(mut)]
    pub user_a: AccountInfo<'info>,
    
    /// CHECK: User B account (for lamport transfer)
    #[account(mut)]
    pub user_b: AccountInfo<'info>,
    
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: Account<'info, TreasuryAccount>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SlashViolator<'info> {
    #[account(mut, has_one = slash_oracle)]
    pub escrow: Account<'info, EscrowAccount>,
    
    /// CHECK: User A
    #[account(mut)]
    pub user_a: AccountInfo<'info>,
    
    /// CHECK: User B
    #[account(mut)]
    pub user_b: AccountInfo<'info>,
    
    #[account(mut, seeds = [b"treasury"], bump)]
    pub treasury: Account<'info, TreasuryAccount>,
    
    pub slash_oracle: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RolloverStake<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    
    #[account(
        init,
        payer = user,
        space = 8 + RolloverAccount::SIZE,
        seeds = [b"rollover", user.key().as_ref(), escrow.key().as_ref()],
        bump
    )]
    pub rollover: Account<'info, RolloverAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct EscrowAccount {
    pub match_id: [u8; 32],
    pub user_a: Pubkey,
    pub user_b: Pubkey,
    pub stake_amount: u64,
    pub tier: u8,
    pub meet_time: i64,
    pub user_a_staked: bool,
    pub user_b_staked: bool,
    pub user_a_checked_in: bool,
    pub user_b_checked_in: bool,
    pub user_a_proof: [u8; 32],
    pub user_b_proof: [u8; 32],
    pub released: bool,
    pub slash_oracle: Pubkey,
    pub slash_percentage: u8,
}

impl EscrowAccount {
    pub const SIZE: usize = 32 + 32 + 32 + 8 + 1 + 8 + 1 + 1 + 1 + 1 + 32 + 32 + 1 + 32 + 1;
}

#[account]
pub struct TreasuryAccount {
    pub total_staked: u64,
    pub total_released: u64,
    pub total_slashed: u64,
}

impl TreasuryAccount {
    pub const SIZE: usize = 8 + 8 + 8;
}

#[account]
pub struct RolloverAccount {
    pub user: Pubkey,
    pub original_stake: u64,
    pub rollover_stake: u64,
    pub tier: u8,
    pub multiplier: u8,
    pub created_at: i64,
    pub expires_at: i64,
    pub used: bool,
}

impl RolloverAccount {
    pub const SIZE: usize = 32 + 8 + 8 + 1 + 1 + 8 + 8 + 1;
}

#[error_code]
pub enum ErrorCode {
    #[msg("User has already staked")]
    AlreadyStaked,
    #[msg("Unauthorized user")]
    Unauthorized,
    #[msg("Escrow is not fully staked yet")]
    NotFullyStaked,
    #[msg("Escrow has already been released")]
    AlreadyReleased,
    #[msg("User has already checked in")]
    AlreadyCheckedIn,
    #[msg("Outside check-in window")]
    OutsideCheckInWindow,
    #[msg("Both users must check in before release")]
    NotBothCheckedIn,
    #[msg("Unauthorized slash oracle")]
    UnauthorizedSlashOracle,
    #[msg("Invalid slash percentage")]
    InvalidSlashPercentage,
    #[msg("Both users checked in - cannot slash")]
    BothCheckedIn,
    #[msg("Violator did not stake")]
    ViolatorDidNotStake,
    #[msg("Invalid rollover multiplier")]
    InvalidMultiplier,
    #[msg("Escrow not yet released")]
    NotYetReleased,
}
