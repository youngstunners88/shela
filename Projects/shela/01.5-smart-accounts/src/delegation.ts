import {
  createDelegation,
  createCaveatBuilder,
  DelegationManager,
  ExecutionMode,
} from '@metamask/smart-accounts-kit';
import { parseUnits, erc20Abi, encodeFunctionData } from 'viem';

// Shela Delegation System
// Users pre-authorize escrow staking via delegations

interface StakeDelegation {
  delegator: `0x${string}`;
  delegate: `0x${string}`; // Shela backend
  tokenAddress: `0x${string}`;
  maxAmount: bigint;
  duration: number; // seconds
  limit: number; // max calls
}

// Create delegation for staking operations
export function createStakeDelegation(
  params: StakeDelegation
) {
  const caveatBuilder = createCaveatBuilder();

  const caveats = caveatBuilder
    // Time limit: delegation expires after duration
    .add('timestamp', {
      afterThreshold: Math.floor(Date.now() / 1000),
      beforeThreshold: Math.floor(Date.now() / 1000) + params.duration,
    })
    // Call limit: max number of stakes
    .add('limitedCalls', { limit: params.limit })
    // Redeemer restriction: only Shela backend
    .add('redeemer', { redeemers: [params.delegate] })
    // Token transfer limit
    .add('erc20TransferAmount', {
      tokenAddress: params.tokenAddress,
      maxAmount: params.maxAmount,
    })
    .build();

  return createDelegation({
    to: params.delegate,
    from: params.delegator,
    environment: getShelaEnvironment(),
    scope: {
      type: 'erc20TransferAmount',
      tokenAddress: params.tokenAddress,
      maxAmount: params.maxAmount,
    },
    caveats,
  });
}

// Sign delegation with smart account
export async function signDelegation(
  smartAccount: any,
  delegation: any
): Promise<string> {
  return await smartAccount.signDelegation({ delegation });
}

// Backend redeems delegation to execute stake
export async function redeemStakeDelegation(
  bundlerClient: any,
  backendAccount: any,
  signedDelegation: any,
  execution: any
) {
  const redeemCalldata = DelegationManager.encode.redeemDelegations({
    delegations: [[signedDelegation]],
    modes: [ExecutionMode.SingleDefault],
    executions: [[execution]],
  });

  return await bundlerClient.sendUserOperation({
    account: backendAccount,
    calls: [{
      to: backendAccount.address,
      data: redeemCalldata,
    }],
  });
}

// Helper to get Shela contract environment
function getShelaEnvironment() {
  return {
    DelegationManager: '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3',
    EntryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    // Add other Shela-specific contracts
  };
}
