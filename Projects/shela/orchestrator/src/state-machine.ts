// Shela State Machine
// Defines valid state transitions for all 6 layers

export type State = 
  | 'signup'           // Initial state
  | 'interview'        // 01-verify: AI interview
  | 'account_setup'    // 01.5-smart-accounts: Create AA wallet
  | 'verified'         // Interview passed, ready for matching
  | 'matching'         // 02-match: Swipe interface
  | 'matched'          // Mutual match found
  | 'staking'          // 03-escrow: Stake SOL
  | 'staked'           // Both users staked
  | 'meet_scheduled'   // Meet time/location set
  | 'check_in'         // 04-verify-meet: GPS + photo proof
  | 'verified_meet'    // Both checked in
  | 'completed'        // Meet done, stakes released
  | 'feedback'         // 05-learn: Rate + report
  | 'learning'         // AI updates models
  | 'violation'        // 03-escrow: Slash oracle
  | 'rolled_over'      // 06-rollover: Gamified stakes
  | 'finished';       // End state

export interface Transition {
  from: State;
  to: State;
  trigger: string;
  data?: Record<string, unknown>;
}

export const VALID_TRANSITIONS: Transition[] = [
  // Basic flow
  { from: 'signup', to: 'interview', trigger: 'start_interview' },
  { from: 'interview', to: 'account_setup', trigger: 'interview_passed' },
  { from: 'account_setup', to: 'verified', trigger: 'account_created' },
  { from: 'account_setup', to: 'verified', trigger: 'use_eoa' }, // Skip AA
  { from: 'interview', to: 'signup', trigger: 'interview_failed' },
  
  // Matching flow
  { from: 'verified', to: 'matching', trigger: 'start_matching' },
  { from: 'matching', to: 'matched', trigger: 'mutual_like' },
  { from: 'matching', to: 'verified', trigger: 'pause_matching' },
  
  // Escrow flow
  { from: 'matched', to: 'staking', trigger: 'propose_meet' },
  { from: 'staking', to: 'staked', trigger: 'both_staked' },
  { from: 'staking', to: 'verified', trigger: 'cancel_match' },
  
  // AA-based auto-staking (new)
  { from: 'matched', to: 'staked', trigger: 'auto_staked_via_delegation' },
  
  // Meet verification flow
  { from: 'staked', to: 'meet_scheduled', trigger: 'schedule_meet' },
  { from: 'meet_scheduled', to: 'check_in', trigger: 'meet_time' },
  { from: 'check_in', to: 'verified_meet', trigger: 'both_checked_in' },
  { from: 'check_in', to: 'violation', trigger: 'no_show' },
  { from: 'check_in', to: 'violation', trigger: 'false_location' },
  
  // Auto-release via AA (new)
  { from: 'verified_meet', to: 'completed', trigger: 'auto_release_via_delegation' },
  { from: 'verified_meet', to: 'completed', trigger: 'manual_release' },
  
  // Feedback and learning
  { from: 'completed', to: 'feedback', trigger: 'rate_partner' },
  { from: 'feedback', to: 'learning', trigger: 'submit_feedback' },
  { from: 'learning', to: 'verified', trigger: 'return_to_pool' },
  { from: 'learning', to: 'finished', trigger: 'final_exit' },
  
  // Violation flow
  { from: 'violation', to: 'learning', trigger: 'slash_executed' },
  { from: 'violation', to: 'check_in', trigger: 'appeal_success' },
  
  // Rollover flow (Layer 6)
  { from: 'feedback', to: 'rolled_over', trigger: 'both_positive' },
  { from: 'rolled_over', to: 'staking', trigger: 'next_tier' },
  { from: 'rolled_over', to: 'verified', trigger: 'reset' },
];

export class ShelaStateMachine {
  private state: State = 'signup';
  private history: { state: State; timestamp: number; trigger: string }[] = [];

  getState(): State {
    return this.state;
  }

  getHistory() {
    return this.history;
  }

  canTransition(to: State): boolean {
    return VALID_TRANSITIONS.some(
      (t) => t.from === this.state && t.to === to
    );
  }

  transition(trigger: string, to: State, data?: Record<string, unknown>): boolean {
    const valid = VALID_TRANSITIONS.find(
      (t) => t.from === this.state && t.to === to && t.trigger === trigger
    );

    if (!valid) {
      throw new Error(
        `Invalid transition: ${this.state} -> ${to} via ${trigger}`
      );
    }

    this.history.push({
      state: this.state,
      timestamp: Date.now(),
      trigger,
    });

    this.state = to;
    return true;
  }

  // Check if user has smart account (AA path)
  isSmartAccountPath(): boolean {
    const hasAccountSetup = this.history.some(
      (h) => h.state === 'account_setup'
    );
    return hasAccountSetup;
  }

  // Get current layer number
  getCurrentLayer(): number {
    const layerMap: Record<State, number> = {
      signup: 0,
      interview: 1,
      account_setup: 1.5,
      verified: 1,
      matching: 2,
      matched: 2,
      staking: 3,
      staked: 3,
      meet_scheduled: 3,
      check_in: 4,
      verified_meet: 4,
      completed: 4,
      feedback: 5,
      learning: 5,
      violation: 3,
      rolled_over: 6,
      finished: 5,
    };
    return layerMap[this.state] || 0;
  }
}
