import { describe, it, expect } from 'bun:test';
import { conductInterview } from '../src/interview-agent';

describe('Interview Agent', () => {
  it('should start interview with greeting', async () => {
    const result = await conductInterview('test-user-1');
    expect(result.complete).toBe(false);
    expect(result.transcript[0].role).toBe('agent');
  });

  it('should detect evasive responses', async () => {
    const history = [
      { role: 'agent', content: 'How do you verify someone?', timestamp: 1 },
      { role: 'user', content: 'I just trust my gut', timestamp: 2 }
    ];
    const result = await conductInterview('test-user-2', history, 'I dont like questions');
    expect(result.riskScore).toBeGreaterThan(50);
    expect(result.redFlags.length).toBeGreaterThan(0);
  });

  it('should pass cooperative user', async () => {
    const history = [
      { role: 'agent', content: 'What brings you here?', timestamp: 1 },
      { role: 'user', content: 'Looking for genuine connection. I appreciate safety measures.', timestamp: 2 },
      { role: 'agent', content: 'How do you verify?', timestamp: 3 },
      { role: 'user', content: 'Video calls, mutual friends, meeting in public. I have references from prior matches.', timestamp: 4 }
    ];
    const result = await conductInterview('test-user-3', history);
    expect(result.riskScore).toBeLessThan(40);
    expect(result.greenFlags.length).toBeGreaterThan(0);
  });

  it('should auto-reject aggressive pressure', async () => {
    const history = [
      { role: 'agent', content: 'Hi, I conduct brief interviews first...', timestamp: 1 },
      { role: 'user', content: 'This is stupid, just match me now or I leave', timestamp: 2 }
    ];
    const result = await conductInterview('test-user-4', history);
    expect(result.passed).toBe(false);
    expect(result.recommendedTier).toBe('reject');
  });
});

// Integration test
import { checkMatchUnlock } from '../src/interview-agent';

const mockDb = {
  get: async (query: string, params: string[]) => {
    if (params[0] === 'user-safe') {
      return { user_id: 'user-safe', risk_score: 25, passed: true, recommended_tier: 'voice' };
    }
    if (params[0] === 'user-ok') {
      return { user_id: 'user-ok', risk_score: 45, passed: true, recommended_tier: 'text' };
    }
    if (params[0] === 'user-risk') {
      return { user_id: 'user-risk', risk_score: 75, passed: false, recommended_tier: 'reject' };
    }
    return null;
  }
};

describe('Match Unlock', () => {
  it('should unlock when both pass with compatible tiers', async () => {
    const status = await checkMatchUnlock(mockDb, 'user-safe', 'user-ok');
    expect(status.unlocked).toBe(true);
    expect(status.maxRisk).toBe(45);
    expect(status.minTier).toBe('text'); // Lower of voice and text
  });

  it('should not unlock when one fails', async () => {
    const status = await checkMatchUnlock(mockDb, 'user-safe', 'user-risk');
    expect(status.unlocked).toBe(false);
  });
});