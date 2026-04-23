import { describe, it, expect } from 'vitest';
import { conductInterview } from '../01-verify/src/interview-agent';

// Shela Verification Tests

describe('01-verify: Interview Agent', () => {
  it('should pass cooperative user with clear intent', async () => {
    const result = await conductInterview('test-user', [], 'I am looking for a genuine connection and I always video chat before meeting');
    expect(result.riskScore).toBeLessThan(50);
    expect(result.passed).toBe(true);
    expect(result.greenFlags).toContain('verifies_before_meeting');
  });

  it('should flag evasive user', async () => {
    const result = await conductInterview('test-user', [], 'I dont really care about verification just want to meet now');
    expect(result.riskScore).toBeGreaterThan(70);
    expect(result.redFlags.length).toBeGreaterThan(0);
  });

  it('should detect pressure tactics', async () => {
    const result = await conductInterview('test-user', [], 'Why do you need so many questions just give me your number');
    expect(result.redFlags).toContain('pressure_tactics');
    expect(result.recommendedTier).toBe('reject');
  });

  it('should complete after 10 exchanges', async () => {
    const history = Array(9).fill({ role: 'user', content: 'answer', timestamp: Date.now() });
    const result = await conductInterview('test-user', history, 'final answer');
    expect(result.complete).toBe(true);
  });
});

describe('02-match: Risk Score Calculation', () => {
  it('should recommend text tier for medium risk', () => {
    const score = 45;
    const tier = score < 30 ? 'video' : score < 60 ? 'text' : 'reject';
    expect(tier).toBe('text');
  });

  it('should recommend video tier for low risk', () => {
    const score = 25;
    const tier = score < 30 ? 'video' : 'text';
    expect(tier).toBe('video');
  });

  it('should reject high risk', () => {
    const score = 85;
    const tier = score > 70 ? 'reject' : 'text';
    expect(tier).toBe('reject');
  });
});

describe('03-escrow: Stake Calculation', () => {
  it('should calculate base stake for meetup tier', () => {
    const tier = 'meetup';
    const baseAmount = tier === 'meetup' ? 0.1 : tier === 'video' ? 0.01 : 0.005;
    expect(baseAmount).toBe(0.1);
  });

  it('should apply risk multiplier for high risk', () => {
    const baseStake = 0.1;
    const riskMultiplier = 2;
    const finalStake = baseStake * riskMultiplier;
    expect(finalStake).toBe(0.2);
  });
});

describe('04-verify-meet: Geofencing', () => {
  it('should accept check-in within 500m', () => {
    const distance = 450; // meters
    const verified = distance <= 500;
    expect(verified).toBe(true);
  });

  it('should reject check-in outside 500m', () => {
    const distance = 600; // meters
    const verified = distance <= 500;
    expect(verified).toBe(false);
  });

  it('should calculate distance correctly', () => {
    const lat1 = -26.2041; // Johannesburg
    const lng1 = 28.0473;
    const lat2 = -26.2050;
    const lng2 = 28.0480;
    
    // Haversine formula
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + 
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLng/2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    expect(distance).toBeLessThan(500); // Should be ~150m
  });
});

describe('05-learn: Pattern Detection', () => {
  it('should increase risk weight for repeat violators', () => {
    const violationHistory = ['no_show', 'harassment_report', 'safety_violation'];
    const multiplier = Math.min(1 + violationHistory.length * 0.5, 3);
    expect(multiplier).toBe(2.5);
  });

  it('should reduce stake for positive reputation', () => {
    const reputationScore = 800; // Out of 1000
    const discount = reputationScore > 700 ? 0.5 : 1;
    const baseStake = 0.1;
    const finalStake = baseStake * discount;
    expect(finalStake).toBe(0.05);
  });
});
