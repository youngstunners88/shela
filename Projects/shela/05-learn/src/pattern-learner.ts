import { generateText } from 'ai';

// Shela Pattern Learning Module
// Analyzes meet outcomes, updates risk models, evolves interview prompts

interface MeetOutcome {
  meetId: string;
  userA: string;
  userB: string;
  timestamp: number;
  checkInSuccess: boolean; // Both verified location?
  userARating: number; // 1-5 or null if no-show
  userBRating: number;
  userASafetyFlag?: string; // ghosted, inappropriate, safe, etc
  userBSafetyFlag?: string;
  violationReported?: {
    reporter: string;
    type: 'ghosted' | 'inappropriate_behavior' | 'unsafe_meet' | 'no_show' | 'harassment';
    evidence?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  duration: number; // minutes
  messagesExchanged: number;
}

interface PatternAnalysis {
  userId: string;
  patternType: 'ghoster' | 'safety_concern' | 'reliable' | 'inconsistent' | 'new_user';
  confidence: number; // 0-100
  evidenceCount: number;
  riskDelta: number; // how much to adjust base risk score
  interviewQuestions: string[]; // additional questions for this user type
}

interface RiskModelUpdate {
  featureName: string; // e.g., "ghosting_history", "prior_violations", "prompt_patience"
  oldWeight: number;
  newWeight: number;
  sampleSize: number;
  significance: 'low' | 'medium' | 'high';
  reasoning: string;
}

// Analyze all meets from last 24 hours
export async function analyzeMeets(
  db: any,
  since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)
): Promise<MeetOutcome[]> {
  return await db.all(`
    SELECT m.id as meet_id, m.user_a, m.user_b, m.created_at,
           o_a.rating as user_a_rating, o_a.safety_flag as user_a_flag,
           o_b.rating as user_b_rating, o_b.safety_flag as user_b_flag,
           o_a.violation_type, o_a.severity,
           m.check_in_a AND m.check_in_b as check_in_success,
           m.duration_minutes, m.messages_count
    FROM meets m
    LEFT JOIN outcomes o_a ON o_a.meet_id = m.id AND o_a.user_id = m.user_a
    LEFT JOIN outcomes o_b ON o_b.meet_id = m.id AND o_b.user_id = m.user_b
    WHERE m.created_at > ?
  `, [since.toISOString()]);
}

// Detect patterns for a specific user
export async function detectUserPatterns(
  db: any,
  userId: string
): Promise<PatternAnalysis> {
  const outcomes = await db.all(`
    SELECT * FROM outcomes WHERE user_id = ? ORDER BY created_at DESC
  `, [userId]);
  
  if (outcomes.length === 0) {
    return {
      userId,
      patternType: 'new_user',
      confidence: 100,
      evidenceCount: 0,
      riskDelta: 0,
      interviewQuestions: []
    };
  }
  
  // Pattern detection logic
  const totalMeets = outcomes.length;
  const ghosted = outcomes.filter((o: any) => o.safety_flag === 'ghosted').length;
  const noShow = outcomes.filter((o: any) => o.safety_flag === 'no_show').length;
  const inappropriate = outcomes.filter((o: any) => o.safety_flag === 'inappropriate_behavior').length;
  const violations = outcomes.filter((o: any) => o.violation_type IS NOT NULL).length;
  const positiveRatings = outcomes.filter((o: any) => o.rating >= 4).length;
  
  // Calculate pattern type
  let patternType: PatternAnalysis['patternType'] = 'inconsistent';
  let confidence = 50;
  let riskDelta = 0;
  const interviewQuestions: string[] = [];
  
  // Ghosting pattern (>30% ghost rate)
  if (ghosted / totalMeets > 0.3) {
    patternType = 'ghoster';
    confidence = Math.min(90, (ghosted / totalMeets) * 100);
    riskDelta = +15; // Higher base risk
    interviewQuestions.push(
      "Have you ever had someone stop responding suddenly? How did that make you feel?",
      "What would you do if you realized you weren't feeling a connection during a date?"
    );
  }
  
  // Safety concern pattern (any violations or inappropriate behavior)
  else if (violations > 0 || inappropriate > 0) {
    patternType = 'safety_concern';
    confidence = Math.min(95, (violations + inappropriate) / totalMeets * 100 + 30);
    riskDelta = +30; // Significantly higher risk
    interviewQuestions.push(
      "Can you tell me about a time someone made you feel uncomfortable?",
      "What boundaries do you set in new relationships?"
    );
  }
  
  // Reliable pattern (>80% positive, no violations)
  else if (positiveRatings / totalMeets > 0.8 && violations === 0) {
    patternType = 'reliable';
    confidence = Math.min(85, (positiveRatings / totalMeets) * 100);
    riskDelta = -10; // Lower base risk
    interviewQuestions.push(
      "What makes you a good person to meet up with?",
      "How do you ensure both people feel safe and comfortable?"
    );
  }
  
  // Inconsistent (mixed signals)
  else {
    patternType = 'inconsistent';
    confidence = 60;
    riskDelta = +5;
    interviewQuestions.push(
      "Do you consider yourself consistent in your commitments?",
      "What factors make you more or less likely to follow through on plans?"
    );
  }
  
  return {
    userId,
    patternType,
    confidence,
    evidenceCount: totalMeets,
    riskDelta,
    interviewQuestions
  };
}

// Slash oracle: calculates penalty for violations
export async function calculateSlash(
  violationType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  priorViolations: number,
  evidenceQuality: number // 0-100
): Promise<{
  slashPercentage: number; // 0-100% of stake burned
  compensationToVictim: number; // 0-100% to victim
  reasoning: string;
}> {
  const baseSlash = {
    ghosted: { low: 10, medium: 25, high: 50, critical: 75 },
    no_show: { low: 15, medium: 30, high: 60, critical: 80 },
    inappropriate_behavior: { low: 20, medium: 40, high: 70, critical: 90 },
    unsafe_meet: { low: 30, medium: 50, high: 80, critical: 100 },
    harassment: { low: 40, medium: 60, high: 85, critical: 100 }
  }[violationType] || { low: 10, medium: 25, high: 50, critical: 75 };
  
  const base = baseSlash[severity];
  const escalation = Math.min(50, priorViolations * 10); // +10% per prior violation
  const evidenceBonus = evidenceQuality > 70 ? 5 : 0;
  
  const totalSlash = Math.min(100, base + escalation + evidenceBonus);
  const toVictim = totalSlash * 0.5; // Half goes to victim
  
  return {
    slashPercentage: totalSlash,
    compensationToVictim: toVictim,
    reasoning: `${severity} ${violationType}: base ${base}% + ${priorViolations} prior violations (+${escalation}%) + evidence bonus ${evidenceBonus}%`
  };
}

// Update risk model weights based on correlation analysis
export async function updateRiskModel(
  db: any
): Promise<RiskModelUpdate[]> {
  const updates: RiskModelUpdate[] = [];
  
  // Analyze correlations between interview answers and meet outcomes
  const correlations = await db.all(`
    SELECT 
      i.question_key,
      i.response_sentiment,
      AVG(o.rating) as avg_rating,
      COUNT(CASE WHEN o.safety_flag IS NOT NULL THEN 1 END) as flags,
      COUNT(*) as total
    FROM interview_responses i
    JOIN users u ON u.id = i.user_id
    JOIN outcomes o ON o.user_id = u.id
    GROUP BY i.question_key, i.response_sentiment
  `);
  
  // Check-in success correlation
  const checkInCorrelation = await db.get(`
    SELECT 
      AVG(CASE WHEN check_in_a AND check_in_b THEN 1 ELSE 0 END) as success_rate,
      COUNT(*) as total
    FROM meets
    WHERE created_at > datetime('now', '-30 days')
  `);
  
  if (checkInCorrelation.success_rate < 0.7) {
    updates.push({
      featureName: 'check_in_strictness',
      oldWeight: 1.0,
      newWeight: 1.2,
      sampleSize: checkInCorrelation.total,
      significance: 'high',
      reasoning: `Check-in success rate ${(checkInCorrelation.success_rate * 100).toFixed(1)}% below 70% threshold`
    });
  }
  
  // Response sentiment correlation
  const negativeSentiment = correlations.filter((c: any) => 
    c.response_sentiment === 'negative' && c.avg_rating < 3
  );
  
  if (negativeSentiment.length > 5) {
    updates.push({
      featureName: 'negative_sentiment_weight',
      oldWeight: 1.0,
      newWeight: 1.3,
      sampleSize: negativeSentiment.reduce((sum: number, c: any) => sum + c.total, 0),
      significance: 'medium',
      reasoning: 'Negative sentiment responses correlate with lower meet ratings'
    });
  }
  
  return updates;
}

// Generate updated interview prompt with learnings
export async function evolveInterviewPrompt(
  currentPrompt: string,
  recentPatterns: PatternAnalysis[],
  riskUpdates: RiskModelUpdate[]
): Promise<string> {
  const prompt = `
You are updating Shela's interview agent based on real meet outcomes.

RECENT PATTERNS DETECTED:
${recentPatterns.map(p => `- ${p.patternType}: ${p.confidence}% confidence, ${p.evidenceCount} samples`).join('\n')}

NEW RISK MODEL WEIGHTS:
${riskUpdates.map(u => `- ${u.featureName}: ${u.oldWeight} → ${u.newWeight} (${u.significance})`).join('\n')}

CURRENT INTERVIEW PROMPT:
${currentPrompt.substring(0, 2000)}

EVOLVE THE PROMPT:
1. Add detection questions for high-risk patterns detected
2. Adjust scoring weights based on model updates
3. Add behavioral indicators for new pattern types
4. Keep the same professional, non-judgmental tone

Return the complete updated prompt with clear [UPDATED] markers for changed sections.
`;

  const response = await generateText({
    model: 'vercel:moonshotai/kimi-k2.5',
    system: 'You are a prompt engineering specialist. Update interview prompts based on data-driven insights.',
    messages: [{ role: 'user', content: prompt }]
  });
  
  return response.text;
}

// Full learning cycle: run every 6 hours
export async function runLearningCycle(db: any): Promise<{
  patterns: PatternAnalysis[];
  slashes: any[];
  riskUpdates: RiskModelUpdate[];
  newPrompt: string;
}> {
  // 1. Analyze recent meets
  const meets = await analyzeMeets(db);
  
  // 2. Detect patterns for users involved in recent meets
  const users = [...new Set(meets.flatMap(m => [m.userA, m.userB]))];
  const patterns = await Promise.all(
    users.map(u => detectUserPatterns(db, u))
  );
  
  // 3. Calculate slashes for any violations
  const slashes = meets
    .filter(m => m.violationReported)
    .map(m => ({
      meetId: m.meetId,
      reporter: m.violationReported!.reporter,
      ...calculateSlash(
        m.violationReported!.type,
        m.violationReported!.severity,
        0, // prior violations count
        50 // evidence quality placeholder
      )
    }));
  
  // 4. Update risk model
  const riskUpdates = await updateRiskModel(db);
  
  // 5. Evolve interview prompt
  const currentPrompt = await db.get(`SELECT prompt FROM interview_prompts ORDER BY version DESC LIMIT 1`);
  const newPrompt = await evolveInterviewPrompt(
    currentPrompt?.prompt || '',
    patterns,
    riskUpdates
  );
  
  // 6. Save new prompt version
  await db.run(`
    INSERT INTO interview_prompts (version, prompt, patterns_detected, created_at)
    VALUES (?, ?, ?, ?)
  `, [
    Date.now(),
    newPrompt,
    JSON.stringify(patterns.map(p => ({ type: p.patternType, confidence: p.confidence }))),
    new Date().toISOString()
  ]);
  
  return { patterns, slashes, riskUpdates, newPrompt };
}

// Reputation NFT calculation
export function calculateReputationScore(
  meetsCompleted: number,
  positiveRatings: number,
  violations: number,
  safetyFlags: number
): number {
  const baseScore = 500; // Start at 500/1000
  
  // +50 per meet completed (max +400)
  const meetBonus = Math.min(400, meetsCompleted * 50);
  
  // +20 per positive rating (max +200)
  const ratingBonus = Math.min(200, positiveRatings * 20);
  
  // -100 per violation
  const violationPenalty = violations * 100;
  
  // -50 per safety flag
  const flagPenalty = safetyFlags * 50;
  
  return Math.max(0, Math.min(1000, 
    baseScore + meetBonus + ratingBonus - violationPenalty - flagPenalty
  ));
}

export function getReputationTier(score: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' {
  if (score < 300) return 'bronze';
  if (score < 500) return 'silver';
  if (score < 700) return 'gold';
  if (score < 900) return 'platinum';
  return 'diamond';
}
