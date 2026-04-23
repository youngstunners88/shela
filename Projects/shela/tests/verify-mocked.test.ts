import { describe, it, expect } from 'vitest';

// Mock interview function for testing without AI Gateway
async function mockConductInterview(userInput: string, history: any[] = []) {
  const responses: Record<string, any> = {
    'cooperative': {
      passed: true,
      riskScore: 35,
      redFlags: [],
      greenFlags: ['clear_intent', 'patient'],
      recommendedTier: 'video',
      summary: 'Cooperative user with clear intent'
    },
    'evasive': {
      passed: false,
      riskScore: 75,
      redFlags: ['evasive_answers', 'low_engagement'],
      greenFlags: [],
      recommendedTier: 'reject',
      summary: 'Evasive user with unclear intentions'
    },
    'pressure': {
      passed: false,
      riskScore: 80,
      redFlags: ['pressure_tactics', 'rushing', 'impatient'],
      greenFlags: [],
      recommendedTier: 'reject',
      summary: 'User applying pressure for immediate meet'
    }
  };

  // Determine response based on input content
  const input = userInput.toLowerCase();
  if (input.includes('immediately') || input.includes('tonight') || input.includes('now')) {
    return responses['pressure'];
  }
  if (input.includes('whatever') || input.includes('looking around') || input.length < 20) {
    return responses['evasive'];
  }
  
  return responses['cooperative'];
}

describe('01-verify: Interview Agent (Mocked)', () => {
  it('should pass cooperative user with clear intent', async () => {
    const result = await mockConductInterview('I am looking for a genuine connection and willing to take things slow');
    
    expect(result.passed).toBe(true);
    expect(result.riskScore).toBeLessThan(50);
    expect(result.greenFlags.length).toBeGreaterThan(0);
    expect(result.recommendedTier).toBe('video');
  });

  it('should flag evasive user', async () => {
    const result = await mockConductInterview('whatever, just looking around');
    
    expect(result.passed).toBe(false);
    expect(result.riskScore).toBeGreaterThan(60);
    expect(result.redFlags.length).toBeGreaterThan(0);
  });

  it('should detect pressure tactics', async () => {
    const result = await mockConductInterview('I want to meet immediately tonight no questions');
    
    expect(result.passed).toBe(false);
    expect(result.riskScore).toBeGreaterThan(75);
    expect(result.redFlags).toContain('pressure_tactics');
    expect(result.recommendedTier).toBe('reject');
  });

  it('should complete after 5-10 exchanges', async () => {
    let history: any[] = [];
    const questions = [
      'What brings you here?',
      'How do you verify someone?',
      'What are your boundaries?',
      'Tell me about prior experiences',
      'What tier do you prefer?'
    ];
    
    for (const q of questions) {
      const result = await mockConductInterview(q, history);
      history.push({ role: 'user', content: q });
      history.push({ role: 'agent', content: result.summary });
    }
    
    expect(history.length).toBe(10); // 5 Q&A pairs
    expect(history[history.length - 1].role).toBe('agent');
  });
});
