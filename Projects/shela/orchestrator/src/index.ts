// Shela Orchestrator
// Main entry point for layer orchestration

import { ShelaStateMachine, State } from './state-machine';
import { createSmartAccount } from '../../01.5-smart-accounts/src/smart-account';

export interface OrchestratorContext {
  userId: string;
  stateMachine: ShelaStateMachine;
  data: Record<string, unknown>;
}

// Main orchestration function
export async function orchestrate(
  context: OrchestratorContext,
  trigger: string,
  targetState: State,
  data?: Record<string, unknown>
): Promise<{ success: boolean; newState: State; message: string }> {
  try {
    // Validate transition
    if (!context.stateMachine.canTransition(targetState)) {
      return {
        success: false,
        newState: context.stateMachine.getState(),
        message: `Cannot transition to ${targetState} from current state`,
      };
    }

    // Execute pre-transition hooks
    const hookResult = await executeHook(context, trigger, targetState, data);
    if (!hookResult.success) {
      return {
        success: false,
        newState: context.stateMachine.getState(),
        message: hookResult.message,
      };
    }

    // Perform transition
    context.stateMachine.transition(trigger, targetState, data);

    return {
      success: true,
      newState: targetState,
      message: `Successfully transitioned to ${targetState}`,
    };

  } catch (error) {
    return {
      success: false,
      newState: context.stateMachine.getState(),
      message: `Transition failed: ${error.message}`,
    };
  }
}

// Execute layer-specific hooks
async function executeHook(
  context: OrchestratorContext,
  trigger: string,
  targetState: State,
  data?: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  switch (targetState) {
    case 'account_setup':
      // Layer 1.5: Smart Account creation
      return await handleAccountSetup(context, data);
    
    case 'staked':
      // Layer 3: Handle AA vs EOA staking
      if (trigger === 'auto_staked_via_delegation') {
        return await handleAutoStaking(context, data);
      }
      return { success: true, message: 'Standard staking' };
    
    case 'completed':
      // Layer 4: Handle auto-release via AA
      if (trigger === 'auto_release_via_delegation') {
        return await handleAutoRelease(context, data);
      }
      return { success: true, message: 'Manual release' };
    
    default:
      return { success: true, message: 'No hook needed' };
  }
}

// Layer 1.5: Smart Account Setup
async function handleAccountSetup(
  context: OrchestratorContext,
  data?: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if user wants EOA instead
    if (data?.skipSmartAccount) {
      return { success: true, message: 'Using EOA wallet' };
    }

    // Create smart account
    // This would call the actual implementation
    return { success: true, message: 'Smart account created' };
  } catch (error) {
    return { success: false, message: `Account setup failed: ${error.message}` };
  }
}

// Layer 3: Auto-staking via delegation
async function handleAutoStaking(
  context: OrchestratorContext,
  data?: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  try {
    // Redeem delegation to auto-stake
    // This is the AA path - no user signature needed
    return { success: true, message: 'Auto-staked via delegation' };
  } catch (error) {
    return { success: false, message: `Auto-staking failed: ${error.message}` };
  }
}

// Layer 4: Auto-release via delegation
async function handleAutoRelease(
  context: OrchestratorContext,
  data?: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  try {
    // Redeem delegation to auto-release stakes
    // Backend handles this after verification
    return { success: true, message: 'Auto-released via delegation' };
  } catch (error) {
    return { success: false, message: `Auto-release failed: ${error.message}` };
  }
}

export { ShelaStateMachine, State };
