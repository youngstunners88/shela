# 05-learn — Pattern Learning

## Context
Meet happened. Outcome recorded. System learns.

## Agent Role
Pattern learner — analyzes outcomes, updates risk models, trains interview weights.

## Output
Updated risk weights, reputation scores, model retraining trigger.

## Trigger
Every 6 hours OR after violation reported.

## Implementation
• Outcome analysis (positive/negative/neutral meet)
• Violation pattern detection
• Risk model weight updates
• Reputation NFT minting/updating
• Interview agent prompt evolution

## Implementation Status
✅ pattern-learner.ts — Outcome analysis, pattern detection, risk model updates, interview prompt evolution
✅ LearningDashboard.tsx — Admin UI for monitoring patterns, violations, model updates
✅ calculateSlash — Violation penalty calculator
✅ calculateReputationScore — Reputation NFT scoring

## Key
Feedback loop: meet outcomes → pattern analysis → model training → better interviews

## Database Schema
```sql
outcomes: id, meet_id, user_id, rating, safety_flag, violation_type, created_at
patterns: id, user_id, pattern_type, confidence, evidence_count, last_updated
risk_weights: feature_name, weight, sample_size, updated_at
reputation_nfts: token_id, user_id, reputation_score, tier, meets_completed
```

## Key Features
• Runs every 6 hours or on violation trigger
• Ghoster/safety_concern/reliable/inconsistent/new_user pattern detection
• Risk delta calculations for each user type
• Slash oracle with severity-based penalties + escalation
• 50% to victim compensation
• Model weight updates based on correlation analysis
• Interview prompt auto-evolution
• Reputation score 0-1000 (bronze/silver/gold/platinum/diamond tiers)
