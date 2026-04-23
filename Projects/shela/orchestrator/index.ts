// Shela Orchestrator
// Main entry point - routes users through the 5 layers

import { getOrCreateState, transitionLayer, updateLayerData, getState, Layer } from './state-machine';

// Layer implementations (lazy loaded)
const layers: Record<Layer, any> = {
  '01-verify': null,
  '02-match': null,
  '03-escrow': null,
  '04-verify-meet': null,
  '05-learn': null,
  'complete': null,
};

// Initialize layer modules
async function loadLayer(layer: Layer) {
  if (!layers[layer] && layer !== 'complete') {
    switch (layer) {
      case '01-verify':
        layers[layer] = await import('../01-verify/src/interview-agent');
        break;
      case '02-match':
        layers[layer] = await import('../02-match/src/match-engine');
        break;
      case '03-escrow':
        layers[layer] = await import('../03-escrow/src/escrow-contract');
        break;
      case '04-verify-meet':
        layers[layer] = await import('../04-verify-meet/src/verify-meet');
        break;
      case '05-learn':
        layers[layer] = await import('../05-learn/src/pattern-learner');
        break;
    }
  }
  return layers[layer];
}

// Main orchestration function
export async function processUserAction(
  userId: string,
  action: string,
  payload: any
): Promise<{
  success: boolean;
  currentLayer: Layer;
  result: any;
  nextActions: string[];
}> {
  const state = getOrCreateState(userId);
  const currentLayer = state.currentLayer;
  
  console.log(`[Orchestrator] ${userId} @ ${currentLayer}: ${action}`);
  
  const layer = await loadLayer(currentLayer);
  let result: any;
  
  switch (currentLayer) {
    case '01-verify':
      result = await handleVerify(layer, userId, action, payload, state);
      break;
    case '02-match':
      result = await handleMatch(layer, userId, action, payload, state);
      break;
    case '03-escrow':
      result = await handleEscrow(layer, userId, action, payload, state);
      break;
    case '04-verify-meet':
      result = await handleVerifyMeet(layer, userId, action, payload, state);
      break;
    case '05-learn':
      result = await handleLearn(layer, userId, action, payload, state);
      break;
    default:
      return {
        success: false,
        currentLayer,
        result: { error: 'Unknown layer' },
        nextActions: [],
      };
  }
  
  return {
    success: result.success,
    currentLayer: getState(userId)?.currentLayer || currentLayer,
    result: result.data,
    nextActions: result.nextActions || [],
  };
}

// Layer 01: Interview agent
async function handleVerify(layer: any, userId: string, action: string, payload: any, state: any) {
  if (action === 'start_interview') {
    const interview = await layer.conductInterview(userId);
    updateLayerData(userId, '01-verify', { interview });
    
    return {
      success: true,
      data: { message: interview.transcript[0]?.content, complete: interview.complete },
      nextActions: interview.complete ? ['proceed_to_match'] : ['respond_interview'],
    };
  }
  
  if (action === 'respond_interview') {
    const history = state.layerData['01-verify']?.interview?.transcript || [];
    const interview = await layer.conductInterview(userId, history, payload.message);
    updateLayerData(userId, '01-verify', { interview });
    
    // Auto-transition if passed
    if (interview.passed) {
      transitionLayer(userId, '02-match', { riskScore: interview.riskScore });
    }
    
    return {
      success: true,
      data: { 
        message: interview.transcript[interview.transcript.length - 1]?.content,
        passed: interview.passed,
        riskScore: interview.riskScore,
      },
      nextActions: interview.passed ? ['view_matches'] : (interview.complete ? ['retry_verify'] : ['respond_interview']),
    };
  }
  
  return { success: false, data: { error: 'Unknown action' }, nextActions: [] };
}

// Layer 02: Matching
async function handleMatch(layer: any, userId: string, action: string, payload: any, state: any) {
  if (action === 'view_matches') {
    const profiles = await layer.rankProfiles(userId);
    return {
      success: true,
      data: { profiles },
      nextActions: ['swipe_profile', 'refresh_matches'],
    };
  }
  
  if (action === 'swipe_profile') {
    const { targetUserId, direction } = payload;
    const result = await layer.recordSwipe(userId, targetUserId, direction);
    
    if (result.mutualMatch) {
      transitionLayer(userId, '03-escrow', { matchId: result.matchId, targetUserId });
    }
    
    return {
      success: true,
      data: { match: result.mutualMatch, matchId: result.matchId },
      nextActions: result.mutualMatch ? ['enter_escrow'] : ['view_matches'],
    };
  }
  
  return { success: false, data: { error: 'Unknown action' }, nextActions: [] };
}

// Layer 03: Escrow
async function handleEscrow(layer: any, userId: string, action: string, payload: any, state: any) {
  if (action === 'enter_escrow') {
    const matchId = state.layerData['02-match']?.matchId;
    const targetUserId = state.layerData['02-match']?.targetUserId;
    const riskScore = state.layerData['01-verify']?.interview?.riskScore || 50;
    
    const stake = layer.calculateStake('meetup', riskScore);
    
    return {
      success: true,
      data: { stakeAmount: stake, matchId, targetUserId },
      nextActions: ['confirm_stake', 'cancel_match'],
    };
  }
  
  if (action === 'confirm_stake') {
    // Would interact with Solana program
    updateLayerData(userId, '03-escrow', { staked: true, timestamp: Date.now() });
    
    // Check if both staked
    const matchData = state.layerData['03-escrow'];
    if (matchData?.otherUserStaked) {
      transitionLayer(userId, '04-verify-meet', matchData);
    }
    
    return {
      success: true,
      data: { status: 'waiting_other_user' },
      nextActions: ['check_escrow_status', 'schedule_meet'],
    };
  }
  
  return { success: false, data: { error: 'Unknown action' }, nextActions: [] };
}

// Layer 04: Verify meet
async function handleVerifyMeet(layer: any, userId: string, action: string, payload: any, state: any) {
  if (action === 'schedule_meet') {
    const { location, time } = payload;
    layer.scheduleMeet({
      matchId: state.layerData['03-escrow']?.matchId,
      userA: userId,
      userB: state.layerData['03-escrow']?.targetUserId,
      location,
      scheduledTime: time,
      stakeAmount: state.layerData['03-escrow']?.stakeAmount,
    });
    
    return {
      success: true,
      data: { scheduled: true, meetTime: time },
      nextActions: ['check_in'],
    };
  }
  
  if (action === 'check_in') {
    const { lat, lng, photoHash } = payload;
    const checkIn = await layer.submitCheckIn({
      userId,
      matchId: state.layerData['03-escrow']?.matchId,
      lat,
      lng,
      timestamp: Date.now(),
      photoHash,
      signature: payload.signature,
    });
    
    if (checkIn.verification?.canRelease) {
      transitionLayer(userId, '05-learn', { meetCompleted: true });
    }
    
    return {
      success: checkIn.success,
      data: checkIn,
      nextActions: checkIn.verification?.canRelease ? ['submit_feedback'] : ['wait_other_checkin'],
    };
  }
  
  return { success: false, data: { error: 'Unknown action' }, nextActions: [] };
}

// Layer 05: Learn
async function handleLearn(layer: any, userId: string, action: string, payload: any, state: any) {
  if (action === 'submit_feedback') {
    const { rating, safetyFlag, otherUserId } = payload;
    
    // Store outcome
    updateLayerData(userId, '05-learn', {
      feedback: { rating, safetyFlag, otherUserId, timestamp: Date.now() },
    });
    
    // Trigger pattern learning (async)
    layer.runLearningCycle?.(null).catch(console.error);
    
    // Update reputation
    const reputationScore = layer.calculateReputationScore?.(5, 3, 0, 0) || 500;
    
    transitionLayer(userId, 'complete', { reputationScore });
    
    return {
      success: true,
      data: { reputationScore, tier: layer.getReputationTier?.(reputationScore) },
      nextActions: ['start_new_cycle'],
    };
  }
  
  return { success: false, data: { error: 'Unknown action' }, nextActions: [] };
}

// Get current state for any user
export function getUserState(userId: string) {
  return getState(userId);
}

// Reset user (for testing)
export function resetUser(userId: string) {
  // stateStore.delete(userId); // Would need export
  transitionLayer(userId, '01-verify');
}
