-- Shela Database Schema
-- DuckDB-based storage for dating safety protocol

-- ============================================================
-- USERS & VERIFICATION
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY,
    public_key VARCHAR(44) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP,
    status VARCHAR DEFAULT 'active', -- active, suspended, banned
    total_meets INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 500 -- 0-1000
);

CREATE TABLE IF NOT EXISTS verifications (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    risk_score INTEGER NOT NULL, -- 0-100
    red_flags JSON,
    green_flags JSON,
    recommended_tier VARCHAR NOT NULL, -- text, voice, video, meetup, reject
    passed BOOLEAN NOT NULL,
    transcript JSON, -- Full interview transcript
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- MATCHING & SWIPES
-- ============================================================

CREATE TABLE IF NOT EXISTS swipes (
    id VARCHAR PRIMARY KEY,
    swiper_id VARCHAR NOT NULL,
    target_id VARCHAR NOT NULL,
    direction VARCHAR NOT NULL, -- left, right, super
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (swiper_id) REFERENCES users(id),
    FOREIGN KEY (target_id) REFERENCES users(id),
    UNIQUE(swiper_id, target_id)
);

CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR PRIMARY KEY,
    user_a_id VARCHAR NOT NULL,
    user_b_id VARCHAR NOT NULL,
    user_a_verification_id VARCHAR NOT NULL,
    user_b_verification_id VARCHAR NOT NULL,
    max_risk_score INTEGER NOT NULL,
    min_tier VARCHAR NOT NULL,
    stake_amount_sol DECIMAL(10, 9) NOT NULL,
    status VARCHAR DEFAULT 'pending', -- pending, locked, verified, violated, completed, expired
    escrow_address VARCHAR(44), -- Solana PDA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    locked_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    FOREIGN KEY (user_a_id) REFERENCES users(id),
    FOREIGN KEY (user_b_id) REFERENCES users(id),
    FOREIGN KEY (user_a_verification_id) REFERENCES verifications(id),
    FOREIGN KEY (user_b_verification_id) REFERENCES verifications(id),
    UNIQUE(user_a_id, user_b_id)
);

-- ============================================================
-- ESCROW & STAKING
-- ============================================================

CREATE TABLE IF NOT EXISTS stakes (
    id VARCHAR PRIMARY KEY,
    match_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    amount_sol DECIMAL(10, 9) NOT NULL,
    transaction_signature VARCHAR(88) UNIQUE,
    status VARCHAR DEFAULT 'locked', -- locked, released, slashed, refunded
    staked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP,
    
    FOREIGN KEY (match_id) REFERENCES matches(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- VERIFY-MEET (LOCATION CHECK-INS)
-- ============================================================

CREATE TABLE IF NOT EXISTS meet_proposals (
    id VARCHAR PRIMARY KEY,
    match_id VARCHAR NOT NULL,
    proposed_by VARCHAR NOT NULL,
    proposed_location_lat DECIMAL(10, 8),
    proposed_location_lng DECIMAL(11, 8),
    proposed_time TIMESTAMP,
    status VARCHAR DEFAULT 'pending', -- pending, accepted, declined, expired
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (match_id) REFERENCES matches(id),
    FOREIGN KEY (proposed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS check_ins (
    id VARCHAR PRIMARY KEY,
    meet_proposal_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    distance_meters DECIMAL(8, 2),
    photo_hash VARCHAR(64), -- Blurred photo hash
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (meet_proposal_id) REFERENCES meet_proposals(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- OUTCOMES & VIOLATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS meet_outcomes (
    id VARCHAR PRIMARY KEY,
    match_id VARCHAR NOT NULL,
    outcome_type VARCHAR NOT NULL, -- success, no_show, safety_concern, ghosted, declined
    reported_by VARCHAR NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (match_id) REFERENCES matches(id),
    FOREIGN KEY (reported_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS violations (
    id VARCHAR PRIMARY KEY,
    match_id VARCHAR NOT NULL,
    reported_by VARCHAR NOT NULL,
    reported_user VARCHAR NOT NULL,
    violation_type VARCHAR NOT NULL, -- no_show, safety_concern, harassment, catfishing, terms_violation
    evidence_hash VARCHAR(64),
    slash_percentage INTEGER, -- 0-100
    slashed_amount_sol DECIMAL(10, 9),
    victim_compensation_sol DECIMAL(10, 9),
    status VARCHAR DEFAULT 'reported', -- reported, reviewed, executed, appealed
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    executed_at TIMESTAMP,
    
    FOREIGN KEY (match_id) REFERENCES matches(id),
    FOREIGN KEY (reported_by) REFERENCES users(id),
    FOREIGN KEY (reported_user) REFERENCES users(id)
);

-- ============================================================
-- PATTERN LEARNING & REPUTATION
-- ============================================================

CREATE TABLE IF NOT EXISTS pattern_features (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    feature_name VARCHAR NOT NULL, -- response_time, message_length, boundary_respect, etc.
    feature_value DECIMAL(10, 6),
    sample_count INTEGER DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, feature_name)
);

CREATE TABLE IF NOT EXISTS user_patterns (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    pattern_type VARCHAR NOT NULL, -- ghoster, safety_concern, reliable, inconsistent, new_user
    confidence_score DECIMAL(5, 4), -- 0.0-1.0
    evidence_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reputation_events (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    event_type VARCHAR NOT NULL, -- successful_meet, no_show, safety_report, interview_pass, stake_return
    points_change INTEGER NOT NULL,
    new_total INTEGER NOT NULL,
    match_id VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (match_id) REFERENCES matches(id)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_reputation ON users(reputation_score);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_passed ON verifications(passed);
CREATE INDEX IF NOT EXISTS idx_matches_user_a ON matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON matches(user_b_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_stakes_match ON stakes(match_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_meet ON check_ins(meet_proposal_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_match ON meet_outcomes(match_id);
CREATE INDEX IF NOT EXISTS idx_violations_reported ON violations(reported_user);
CREATE INDEX IF NOT EXISTS idx_reputation_events_user ON reputation_events(user_id);
