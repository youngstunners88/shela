// Shela Orchestrator
// Main entry point for layer orchestration
// Clean 5-layer architecture (01-05)

import { ShelaStateMachine, State } from './state-machine';

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
    case 'verified':
      // Layer 1: Interview passed
      return { success: true, message: 'User verified' };

    case 'matched':
      // Layer 2: Mutual match
      return { success: true, message: 'Match confirmed' };

    case 'staked':
      // Layer 3: Both users staked
      return { success: true, message: 'Stakes locked' };

    case 'verified_meet':
      // Layer 4: Both checked in
      return { success: true, message: 'Meet verified' };

    case 'completed':
      // Layer 4: Stakes released
      return { success: true, message: 'Stakes released' };

    case 'learning':
      // Layer 5: Feedback processed
      return { success: true, message: 'Learning updated' };

    default:
      return { success: true, message: 'No hook needed' };
  }
}

export { ShelaStateMachine, State };
