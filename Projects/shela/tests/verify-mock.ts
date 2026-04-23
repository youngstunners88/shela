// Mock for AI Gateway tests
export async function mockConductInterview(userInput: string, history: any[] = []) {
  const responses: Record<string, any> = {
    'What brings you here?': {
      passed: true,
      riskScore: 35,
      redFlags: [],
      greenFlags: ['clear_intent', 'patient'],
      recommendedTier: 'video',
      summary: 'Cooperative user with clear intent'
    },
    'I want to meet immediately tonight': {
      passed: false,
      riskScore: 75,
      redFlags: ['pressure_tactics', 'rushing'],
      greenFlags: [],
      recommendedTier: 'reject',
      summary: 'Evasive user applying pressure'
    },
    'Just looking around, whatever': {
      passed: false,
      riskScore: 65,
      redFlags: ['unclear_intent', 'low_engagement'],
      greenFlags: [],
      recommendedTier: 'text',
      summary: 'Low engagement, unclear intentions'
    }
  };

  return responses[userInput] || {
    passed: true,
    riskScore: 50,
    redFlags: [],
    greenFlags: [],
    recommendedTier: 'text',
    summary: 'Neutral assessment'
  };
}
