import { generateText } from 'ai';

// Shela Interview Agent
// Safety-first conversation assessment

interface Message {
  role: 'agent' | 'user';
  content: string;
  timestamp: number;
}

interface InterviewResult {
  passed: boolean;
  riskScore: number; // 0-100
  redFlags: string[];
  greenFlags: string[];
  recommendedTier: 'text' | 'voice' | 'video' | 'meetup' | 'reject';
  summary: string;
  transcript: Message[];
}

const SYSTEM_PROMPT = `You are Shela's safety interview agent. Your job: conduct a 5-10 minute conversational interview that assesses dating safety red flags and genuine intent.

SAFETY FRAMEWORK:
🚩 RED FLAGS (auto-reject if severe):
- Refuses to answer basic safety questions
- Pressures for immediate meetup without verification
- Evasive about identity/background
- Aggressive or entitled tone
- History of ghosting patterns (from prior outcomes)
- Requests off-platform contact before tier unlock

✅ GREEN FLAGS (lower stake requirements):
- Patient with verification process
- Clear about intentions (casual/serious/curious)
- Respects boundaries when tested
- Asks reciprocal safety questions
- Prior positive outcomes (from reputation NFT)

INTERVIEW FLOW:
1. Open: "Hi! I'm Shela, your safety agent. Before matching, I conduct brief interviews to keep our community safe. This takes 3-5 minutes. Ready?"
2. Intent: "What brings you here? What are you hoping to find?" (assess clarity, pressure level)
3. Safety awareness: "How do you usually verify someone is who they say they are before meeting?" (assess risk awareness)
4. Boundaries: "What would make you uncomfortable in early conversations?" (test boundary articulation + respect)
5. Prior experience: "Have you had good or bad experiences with dating apps? What happened?" (pattern detection)
6. Tier assessment: "Would you prefer starting with text, or are you comfortable with video early?" (assess impatience vs comfort)

SCORING:
- Risk score 0-30: Low risk → recommend higher tier (voice/video early)
- Risk score 30-60: Medium → text tier, escalate gradually
- Risk score 60-85: High → extended interview or reject
- Risk score 85-100: Critical → auto-reject

OUTPUT FORMAT (JSON):
{
  "passed": boolean,
  "riskScore": number,
  "redFlags": string[],
  "greenFlags": string[],
  "recommendedTier": "text|voice|video|meetup|reject",
  "summary": "Brief assessment for other agent",
  "nextQuestion": string | null
}

RULES:
- Never reveal specific scoring criteria to user
- If red flag detected, probe deeper once, then decide
- Match is only unlocked if BOTH parties pass
- Always maintain professional, non-judgmental tone`;

export async function conductInterview(
  userId: string,
  history: Message[] = [],
  userInput: string | null = null
): Promise<InterviewResult & { complete: boolean }> {
  
  // Build transcript
  const transcript = [...history];
  if (userInput) {
    transcript.push({ role: 'user', content: userInput, timestamp: Date.now() });
  }
  
  // Determine if interview is complete (10+ exchanges or clear decision)
  const isComplete = transcript.length >= 10 || 
    transcript.some(m => m.role === 'agent' && m.content.includes('INTERVIEW_COMPLETE'));
  
  // Generate agent response
  const response = await generateText({
    model: 'vercel:moonshotai/kimi-k2.5',
    system: SYSTEM_PROMPT,
    messages: transcript.map(m => ({
      role: m.role === 'agent' ? 'assistant' : 'user',
      content: m.content
    })),
  });
  
  // Parse structured output
  const structuredMatch = response.text.match(/\{[\s\S]*\}/);
  if (!structuredMatch) {
    // Fallback: continue conversation
    return {
      passed: false,
      riskScore: 50,
      redFlags: [],
      greenFlags: [],
      recommendedTier: 'text',
      summary: 'Interview in progress',
      transcript,
      complete: false
    };
  }
  
  const result = JSON.parse(structuredMatch[0]);
  
  // Add agent response to transcript
  transcript.push({ 
    role: 'agent', 
    content: result.nextQuestion || response.text, 
    timestamp: Date.now() 
  });
  
  return {
    passed: result.passed,
    riskScore: result.riskScore,
    redFlags: result.redFlags || [],
    greenFlags: result.greenFlags || [],
    recommendedTier: result.recommendedTier,
    summary: result.summary,
    transcript,
    complete: isComplete || result.passed === false
  };
}

// Database integration
export async function saveVerification(
  db: any,
  result: InterviewResult,
  userId: string
): Promise<void> {
  await db.run(`
    INSERT INTO verifications (user_id, risk_score, red_flags, green_flags, recommended_tier, passed, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    userId,
    result.riskScore,
    JSON.stringify(result.redFlags),
    JSON.stringify(result.greenFlags),
    result.recommendedTier,
    result.passed,
    new Date().toISOString()
  ]);
}

// Check if two users can be matched
export async function checkMatchUnlock(
  db: any,
  userA: string,
  userB: string
): Promise<{ unlocked: boolean; maxRisk: number; minTier: string }> {
  const [verA, verB] = await Promise.all([
    db.get('SELECT * FROM verifications WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1', [userA]),
    db.get('SELECT * FROM verifications WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1', [userB])
  ]);
  
  if (!verA || !verB) {
    return { unlocked: false, maxRisk: 100, minTier: 'reject' };
  }
  
  const bothPassed = verA.passed && verB.passed;
  const maxRisk = Math.max(verA.risk_score, verB.risk_score);
  
  // Tier is the lower of both recommendations
  const tierOrder = { reject: 0, text: 1, voice: 2, video: 3, meetup: 4 };
  const tierA = verA.recommended_tier;
  const tierB = verB.recommended_tier;
  const minTier = tierOrder[tierA] < tierOrder[tierB] ? tierA : tierB;
  
  return {
    unlocked: bothPassed && tierOrder[minTier] > 0,
    maxRisk,
    minTier
  };
}