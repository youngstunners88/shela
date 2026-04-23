use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::metadata::{create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata};

// Shela Reputation NFT Program
// Soul-bound reputation tokens that reduce stake requirements

declare_id!("RepN9u8dQ2j9J3z8kK1m2n3o4p5q6r7s8t9u0v1w2x3y4");

#[program]
pub mod shela_reputation {
    use super::*;

    /// Initialize reputation system for a user
    pub fn initialize_reputation(ctx: Context<InitializeReputation>) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation;
        
        reputation.user = ctx.accounts.user.key();
        reputation.score = 500; // Start at Bronze tier (500/1000)
        reputation.tier = 1; // Bronze
        reputation.meets_completed = 0;
        reputation.positive_ratings = 0;
        reputation.violations = 0;
        reputation.safety_flags = 0;
        reputation.streak = 0;
        reputation.consecutive_good_meets = 0;
        reputation.last_meet_time = 0;
        reputation.created_at = Clock::get()?.unix_timestamp;
        
        msg!("Reputation initialized for user: {}", ctx.accounts.user.key());
        Ok(())
    }

    /// Record a successful meet outcome
    pub fn record_successful_meet(
        ctx: Context<UpdateReputation>,
        rating: u8, // 1-5
    ) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation;
        
        require!(rating >= 1 && rating <= 5, ErrorCode::InvalidRating);
        require_eq!(reputation.user, ctx.accounts.authority.key(), ErrorCode::Unauthorized);
        
        reputation.meets_completed += 1;
        
        if rating >= 4 {
            reputation.positive_ratings += 1;
            reputation.consecutive_good_meets += 1;
            reputation.streak = reputation.streak.saturating_add(1);
        } else {
            reputation.consecutive_good_meets = 0;
        }
        
        reputation.last_meet_time = Clock::get()?.unix_timestamp;
        
        // Recalculate score
        let new_score = calculate_score(
            reputation.meets_completed,
            reputation.positive_ratings,
            reputation.violations,
            reputation.safety_flags,
            reputation.consecutive_good_meets,
        );
        
        reputation.score = new_score;
        reputation.tier = tier_from_score(new_score);
        
        // Mint or upgrade NFT if tier changed
        if should_mint_or_upgrade(reputation) {
            msg!("Tier upgraded to: {:?}", reputation.tier);
        }
        
        msg!(
            "Meet recorded. Score: {}, Tier: {:?}, Streak: {}",
            reputation.score,
            reputation.tier,
            reputation.streak
        );
        
        Ok(())
    }

    /// Record a violation or safety flag
    pub fn record_violation(
        ctx: Context<UpdateReputation>,
        violation_type: ViolationType,
        severity: u8, // 1-4
    ) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation;
        
        require_eq!(reputation.user, ctx.accounts.authority.key(), ErrorCode::Unauthorized);
        require!(severity >= 1 && severity <= 4, ErrorCode::InvalidSeverity);
        
        match violation_type {
            ViolationType::Ghosted => {
                reputation.safety_flags += 1;
            }
            ViolationType::NoShow => {
                reputation.safety_flags += 1;
                reputation.consecutive_good_meets = 0;
            }
            ViolationType::InappropriateBehavior => {
                reputation.safety_flags += 1;
                reputation.violations += 1;
                reputation.consecutive_good_meets = 0;
                reputation.streak = 0;
            }
            ViolationType::UnsafeMeet => {
                reputation.violations += 1;
                reputation.consecutive_good_meets = 0;
                reputation.streak = 0;
            }
            ViolationType::Harassment => {
                reputation.violations += 1;
                reputation.consecutive_good_meets = 0;
                reputation.streak = 0;
            }
        }
        
        // Recalculate score
        let new_score = calculate_score(
            reputation.meets_completed,
            reputation.positive_ratings,
            reputation.violations,
            reputation.safety_flags,
            reputation.consecutive_good_meets,
        );
        
        reputation.score = new_score.max(0); // Never go below 0
        reputation.tier = tier_from_score(reputation.score);
        
        msg!(
            "Violation recorded. Score: {}, Tier: {:?}, Violations: {}",
            reputation.score,
            reputation.tier,
            reputation.violations
        );
        
        Ok(())
    }

    /// Get stake discount based on reputation tier
    pub fn get_stake_discount(ctx: Context<GetReputation>) -> Result<u8> {
        let reputation = &ctx.accounts.reputation;
        
        let discount = match reputation.tier {
            1 => 0,      // Bronze: no discount
            2 => 10,     // Silver: 10% off
            3 => 20,     // Gold: 20% off
            4 => 35,     // Platinum: 35% off
            5 => 50,     // Diamond: 50% off
            _ => 0,
        };
        
        msg!("Stake discount for tier {:?}: {}%", reputation.tier, discount);
        Ok(discount)
    }
}

fn calculate_score(
    meets_completed: u32,
    positive_ratings: u32,
    violations: u32,
    safety_flags: u32,
    consecutive_good_meets: u32,
) -> u32 {
    let base_score: u32 = 500;
    
    // +50 per meet completed (max 400)
    let meet_bonus = (meets_completed * 50).min(400);
    
    // +20 per positive rating (max 200)
    let rating_bonus = (positive_ratings * 20).min(200);
    
    // +100 for streaks of 5+ good meets
    let streak_bonus = if consecutive_good_meets >= 5 {
        100
    } else if consecutive_good_meets >= 3 {
        50
    } else {
        0
    };
    
    // -100 per violation
    let violation_penalty = violations * 100;
    
    // -50 per safety flag
    let flag_penalty = safety_flags * 50;
    
    let total = base_score
        .saturating_add(meet_bonus)
        .saturating_add(rating_bonus)
        .saturating_add(streak_bonus)
        .saturating_sub(violation_penalty)
        .saturating_sub(flag_penalty);
    
    total.min(1000).max(0)
}

fn tier_from_score(score: u32) -> u8 {
    match score {
        0..=299 => 1,      // Bronze
        300..=499 => 2,    // Silver
        500..=699 => 3,    // Gold
        700..=899 => 4,    // Platinum
        _ => 5,            // Diamond
    }
}

fn should_mint_or_upgrade(reputation: &ReputationAccount) -> bool {
    // Check if tier milestone reached
    let milestone_reached = match reputation.meets_completed {
        5 => reputation.score >= 500,  // Bronze → Silver potential
        10 => reputation.score >= 600, // Silver → Gold potential
        25 => reputation.score >= 750, // Gold → Platinum potential
        50 => reputation.score >= 900, // Platinum → Diamond potential
        _ => false,
    };
    
    milestone_reached
}

#[derive(Accounts)]
pub struct InitializeReputation<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + ReputationAccount::SIZE,
        seeds = [b"reputation", user.key().as_ref()],
        bump
    )]
    pub reputation: Account<'info, ReputationAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    #[account(mut, has_one = user)]
    pub reputation: Account<'info, ReputationAccount>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct GetReputation<'info> {
    pub reputation: Account<'info, ReputationAccount>,
}

#[account]
pub struct ReputationAccount {
    pub user: Pubkey,
    pub score: u32,         // 0-1000
    pub tier: u8,           // 1=Bronze, 2=Silver, 3=Gold, 4=Platinum, 5=Diamond
    pub meets_completed: u32,
    pub positive_ratings: u32,
    pub violations: u32,
    pub safety_flags: u32,
    pub streak: u32,
    pub consecutive_good_meets: u32,
    pub last_meet_time: i64,
    pub created_at: i64,
}

impl ReputationAccount {
    pub const SIZE: usize = 32 + 4 + 1 + 4 + 4 + 4 + 4 + 4 + 4 + 8 + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ViolationType {
    Ghosted,
    NoShow,
    InappropriateBehavior,
    UnsafeMeet,
    Harassment,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized user")]
    Unauthorized,
    #[msg("Invalid rating (must be 1-5)")]
    InvalidRating,
    #[msg("Invalid severity (must be 1-4)")]
    InvalidSeverity,
    #[msg("Reputation not found")]
    ReputationNotFound,
}
