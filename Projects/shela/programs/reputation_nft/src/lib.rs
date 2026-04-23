use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, MintTo};
use anchor_spl::metadata::{MetadataAccount, UpdateMetadataAccountV2, Metadata};

// Shela Reputation NFT Program
// Tier-based reputation system: Bronze -> Silver -> Gold -> Platinum -> Diamond

declare_id!("Reput11111111111111111111111111111111111111");

#[program]
pub mod shela_reputation {
    use super::*;

    /// Initialize a user's reputation account
    pub fn initialize_reputation(ctx: Context<InitializeReputation>) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation;
        reputation.user = ctx.accounts.user.key();
        reputation.score = 500; // Start at 500/1000
        reputation.tier = Tier::Bronze;
        reputation.meets_completed = 0;
        reputation.positive_ratings = 0;
        reputation.violations = 0;
        reputation.safety_flags = 0;
        reputation.created_at = Clock::get()?.unix_timestamp;
        reputation.last_updated = Clock::get()?.unix_timestamp;

        msg!("Reputation initialized for user: {}", ctx.accounts.user.key());
        Ok(())
    }

    /// Record a completed meet and update reputation
    pub fn record_meet(
        ctx: Context<UpdateReputation>,
        was_successful: bool,
        rating: u8, // 1-5
    ) -> Result<()> {
        require!(rating >= 1 && rating <= 5, ReputationError::InvalidRating);

        let reputation = &mut ctx.accounts.reputation;
        
        reputation.meets_completed += 1;
        
        if was_successful && rating >= 4 {
            reputation.positive_ratings += 1;
        }

        // Recalculate score
        reputation.score = calculate_reputation_score(
            reputation.meets_completed,
            reputation.positive_ratings,
            reputation.violations,
            reputation.safety_flags,
        );

        // Update tier
        let new_tier = get_tier_from_score(reputation.score);
        if new_tier != reputation.tier {
            reputation.tier = new_tier;
            msg!("Tier upgraded to {:?}", new_tier);
        }

        reputation.last_updated = Clock::get()?.unix_timestamp;

        msg!(
            "Meet recorded: {} meets, {} positive, score: {}",
            reputation.meets_completed,
            reputation.positive_ratings,
            reputation.score
        );
        Ok(())
    }

    /// Record a violation (negative event)
    pub fn record_violation(
        ctx: Context<UpdateReputation>,
        violation_type: ViolationType,
    ) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation;
        
        reputation.violations += 1;
        
        // Safety flags for specific violations
        match violation_type {
            ViolationType::Ghosted | 
            ViolationType::NoShow | 
            ViolationType::InappropriateBehavior => {
                reputation.safety_flags += 1;
            }
            _ => {}
        }

        // Recalculate score
        reputation.score = calculate_reputation_score(
            reputation.meets_completed,
            reputation.positive_ratings,
            reputation.violations,
            reputation.safety_flags,
        );

        // Check for tier downgrade
        let new_tier = get_tier_from_score(reputation.score);
        if new_tier as u8 > reputation.tier as u8 {
            // Should not happen with proper calculation, but handle just in case
        }
        reputation.tier = new_tier;

        reputation.last_updated = Clock::get()?.unix_timestamp;

        msg!(
            "Violation recorded: {} violations, score dropped to {}",
            reputation.violations,
            reputation.score
        );
        Ok(())
    }

    /// Mint reputation NFT to user (when they reach a milestone)
    pub fn mint_reputation_nft(ctx: Context<MintReputationNft>) -> Result<()> {
        let reputation = &ctx.accounts.reputation;
        
        // Verify user has met minimum requirements
        require!(
            reputation.meets_completed >= 5,
            ReputationError::NotEnoughMeets
        );

        let tier_name = match reputation.tier {
            Tier::Bronze => "Bronze Guardian",
            Tier::Silver => "Silver Protector",
            Tier::Gold => "Gold Guardian",
            Tier::Platinum => "Platinum Shield",
            Tier::Diamond => "Diamond Sentinel",
        };

        // Mint NFT (simplified - would use Metaplex in production)
        msg!("Minting {} NFT for user with score {}", tier_name, reputation.score);
        
        // CPI call to token program would go here
        // For now, just log the achievement
        
        Ok(())
    }

    /// Get stake discount based on tier
    pub fn get_stake_discount(ctx: Context<GetStakeDiscount>) -> Result<u8> {
        let reputation = &ctx.accounts.reputation;
        
        let discount = match reputation.tier {
            Tier::Bronze => 0,
            Tier::Silver => 5,
            Tier::Gold => 15,
            Tier::Platinum => 30,
            Tier::Diamond => 50,
        };

        msg!("Stake discount for {:?}: {}%", reputation.tier, discount);
        Ok(discount)
    }
}

/// Calculate reputation score based on history
pub fn calculate_reputation_score(
    meets_completed: u32,
    positive_ratings: u32,
    violations: u32,
    safety_flags: u32,
) -> u16 {
    let base_score: u16 = 500;
    
    // +50 per meet completed (max +400)
    let meet_bonus: u16 = (meets_completed as u16 * 50).min(400);
    
    // +20 per positive rating (max +200)
    let rating_bonus: u16 = (positive_ratings as u16 * 20).min(200);
    
    // -100 per violation
    let violation_penalty: u16 = violations as u16 * 100;
    
    // -50 per safety flag
    let flag_penalty: u16 = safety_flags as u16 * 50;
    
    let score = base_score + meet_bonus + rating_bonus;
    
    // Saturating sub to prevent underflow
    let score = score.saturating_sub(violation_penalty);
    let score = score.saturating_sub(flag_penalty);
    
    score.min(1000)
}

/// Get tier from score
pub fn get_tier_from_score(score: u16) -> Tier {
    match score {
        0..=299 => Tier::Bronze,
        300..=499 => Tier::Silver,
        500..=699 => Tier::Gold,
        700..=899 => Tier::Platinum,
        _ => Tier::Diamond,
    }
}

// Account structures
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
    #[account(
        mut,
        seeds = [b"reputation", user.key().as_ref()],
        bump
    )]
    pub reputation: Account<'info, ReputationAccount>,
    
    /// CHECK: Just for PDA verification
    pub user: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct MintReputationNft<'info> {
    #[account(
        seeds = [b"reputation", user.key().as_ref()],
        bump,
        constraint = reputation.user == user.key()
    )]
    pub reputation: Account<'info, ReputationAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    // Additional NFT accounts would go here
}

#[derive(Accounts)]
pub struct GetStakeDiscount<'info> {
    #[account(
        seeds = [b"reputation", user.key().as_ref()],
        bump,
        constraint = reputation.user == user.key()
    )]
    pub reputation: Account<'info, ReputationAccount>,
    
    /// CHECK: Just for PDA verification
    pub user: AccountInfo<'info>,
}

// Data structures
#[account]
pub struct ReputationAccount {
    pub user: Pubkey,              // 32 bytes
    pub score: u16,                // 2 bytes
    pub tier: Tier,               // 1 byte
    pub meets_completed: u32,     // 4 bytes
    pub positive_ratings: u32,    // 4 bytes
    pub violations: u32,          // 4 bytes
    pub safety_flags: u32,        // 4 bytes
    pub created_at: i64,          // 8 bytes
    pub last_updated: i64,        // 8 bytes
}

impl ReputationAccount {
    pub const SIZE: usize = 32 + 2 + 1 + 4 + 4 + 4 + 4 + 8 + 8 + 50; // Padding
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Tier {
    Bronze,     // 0
    Silver,     // 1
    Gold,       // 2
    Platinum,   // 3
    Diamond,    // 4
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ViolationType {
    Ghosted,                // 0
    NoShow,                 // 1
    InappropriateBehavior,  // 2
    UnsafeMeet,             // 3
    Harassment,             // 4
}

// Error codes
#[error_code]
pub enum ReputationError {
    #[msg("Invalid rating (must be 1-5)")]
    InvalidRating,
    
    #[msg("Not enough meets to mint NFT (minimum 5)")]
    NotEnoughMeets,
}
