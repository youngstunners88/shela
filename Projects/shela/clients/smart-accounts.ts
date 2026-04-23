// Shela Smart Accounts Integration
// Uses MetaMask Smart Accounts Kit for account abstraction
// Perfect for escrow staking with delegated permissions

import {
  Implementation,
  toMetaMaskSmartAccount,
  createDelegation,
  createExecution,
  ExecutionMode,
  DelegationManager,
} from '@metamask/smart-accounts-kit'
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { parseUnits, encodeFunctionData, erc20Abi } from 'viem'
import { getAccountNonce } from 'permissionless'
import { entryPoint07Address } from 'viem/account-abstraction'

// Shela-specific: Escrow delegation types
interface EscrowDelegation {
  matchId: string
  userAddress: string
  stakeAmount: bigint
  expiry: number
  caveats: any[]
}

// Create a Shela smart account for a user
export async function createShelaSmartAccount(
  publicClient: any,
  ownerPrivateKey: string
) {
  const owner = privateKeyToAccount(ownerPrivateKey as `0x${string}`)

  // Hybrid account: EOA + passkey support (most flexible for dating app users)
  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [owner.address, [], [], []],
    deploySalt: '0x',
    signer: { account: owner },
  })

  console.log('Shela Smart Account created:', smartAccount.address)
  return smartAccount
}

// Create a delegation for escrow staking
// User delegates staking permission to Shela backend
export async function createEscrowDelegation(
  userSmartAccount: any,
  shelaBackendAddress: string,
  stakeAmount: bigint,
  matchId: string,
  expiryDays: number = 7
) {
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + expiryDays * 24 * 60 * 60

  // Create delegation with spending limit + time limit caveats
  const delegation = createDelegation({
    to: shelaBackendAddress as `0x${string}`,
    from: userSmartAccount.address,
    environment: userSmartAccount.environment,
    scope: {
      type: 'erc20TransferAmount',
      tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
      maxAmount: stakeAmount,
    },
    caveats: [
      // Time limit: delegation expires after 7 days
      { type: 'timestamp', afterThreshold: now, beforeThreshold: expiry },
      // Limited calls: can only stake once per match
      { type: 'limitedCalls', limit: 1 },
      // Only Shela backend can redeem
      { type: 'redeemer', redeemers: [shelaBackendAddress as `0x${string}`] },
    ],
  })

  console.log(`Escrow delegation created for match ${matchId}:`, {
    maxAmount: stakeAmount.toString(),
    expiry: new Date(expiry * 1000).toISOString(),
  })

  return delegation
}

// Shela backend redeems delegation to stake for user
export async function redeemEscrowDelegation(
  shelaBackendAccount: any,
  signedDelegation: any,
  tokenAddress: string,
  escrowContractAddress: string,
  bundlerClient: any,
  publicClient: any
) {
  // Create execution: transfer USDC to escrow contract
  const execution = createExecution({
    target: tokenAddress as `0x${string}`,
    callData: encodeFunctionData({
      abi: erc20Abi,
      args: [escrowContractAddress as `0x${string}`, signedDelegation.scope.maxAmount],
      functionName: 'transfer',
    }),
  })

  // Encode redemption calldata
  const redeemCalldata = DelegationManager.encode.redeemDelegations({
    delegations: [[signedDelegation]],
    modes: [ExecutionMode.SingleDefault],
    executions: [[execution]],
  })

  // Get parallel nonce for high-throughput
  const nonce = await getAccountNonce(publicClient, {
    address: shelaBackendAccount.address,
    entryPointAddress: entryPoint07Address,
    key: BigInt(Date.now()), // Unique key for parallel execution
  })

  // Send UserOperation (backend stakes on behalf of user)
  const userOpHash = await bundlerClient.sendUserOperation({
    account: shelaBackendAccount,
    calls: [{ to: shelaBackendAccount.address, data: redeemCalldata }],
    nonce,
  })

  console.log('Escrow delegation redeemed:', userOpHash)
  return userOpHash
}

// Create session key for automated operations (e.g., match releases)
export async function createSessionKey() {
  const sessionKey = generatePrivateKey()
  const sessionAccount = privateKeyToAccount(sessionKey)

  console.log('Session key created:', sessionAccount.address)
  return { sessionKey, sessionAccount }
}

// Request delegation from user to session account for automated post-meet release
export async function requestReleaseDelegation(
  userSmartAccount: any,
  sessionAccountAddress: string,
  matchId: string,
  releaseDelayHours: number = 24
) {
  const now = Math.floor(Date.now() / 1000)
  const canReleaseAfter = now + releaseDelayHours * 60 * 60 // 24h after meet

  const delegation = createDelegation({
    to: sessionAccountAddress as `0x${string}`,
    from: userSmartAccount.address,
    environment: userSmartAccount.environment,
    scope: {
      type: 'functionCall',
      targets: ['TREASURY_CONTRACT_ADDRESS'], // Shela treasury
      selectors: ['release_stake(bytes32)'], // Release function
    },
    caveats: [
      // Can only release after 24h (safety window)
      { type: 'timestamp', afterThreshold: canReleaseAfter, beforeThreshold: now + 7 * 24 * 60 * 60 },
      // Only for this specific match
      { type: 'exactCalldata', calldata: matchId },
      // Limited: only 1 release per match
      { type: 'limitedCalls', limit: 1 },
    ],
  })

  console.log(`Release delegation created for match ${matchId}:`, {
    canReleaseAfter: new Date(canReleaseAfter * 1000).toISOString(),
  })

  return delegation
}

// Shela treasury multi-sig for high-value stakes
export async function createTreasuryMultisig(
  publicClient: any,
  owners: string[],
  threshold: number
) {
  // Use MultiSig implementation for treasury
  const treasuryAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.MultiSig,
    deployParams: [owners, threshold, [], []],
    deploySalt: '0x',
    signer: { account: privateKeyToAccount(generatePrivateKey()) }, // One owner signs
  })

  console.log('Shela Treasury MultiSig created:', treasuryAccount.address)
  console.log(`Owners: ${owners.length}, Threshold: ${threshold}`)

  return treasuryAccount
}

// Error handling for common delegation errors
export function handleDelegationError(error: any): string {
  const errorMessage = error.message || error.toString()

  if (errorMessage.includes('0xb5863604')) {
    return 'InvalidDelegate: Caller is not the authorized delegate. Check backend address.'
  }
  if (errorMessage.includes('0xb9f0f171')) {
    return 'InvalidDelegator: Account not deployed or wrong delegator. Deploy account first.'
  }
  if (errorMessage.includes('0x05baa052')) {
    return 'DelegationDisabled: User has disabled this delegation. Request new one.'
  }
  if (errorMessage.includes('allowance-exceeded')) {
    return 'StakeLimit: Delegated amount exceeded. User needs to create larger delegation.'
  }
  if (errorMessage.includes('timestamp')) {
    return 'TimeExpired: Delegation expired or not yet valid. Check time caveats.'
  }

  return `Unknown error: ${errorMessage}`
}

// Example integration for Shela flow
export async function demonstrateShelaEscrowFlow() {
  console.log('=== Shela Smart Account Escrow Flow ===\n')

  // 1. User creates smart account
  console.log('1. User creates Hybrid Smart Account')
  const userAccount = await createShelaSmartAccount(
    null, // publicClient
    '0x...' // user's private key
  )

  // 2. User delegates staking to Shela backend
  console.log('\n2. User creates escrow delegation')
  const delegation = await createEscrowDelegation(
    userAccount,
    '0xSHELA_BACKEND', // Shela's backend address
    parseUnits('0.1', 6), // 0.1 USDC
    'match_123',
    7 // 7 day expiry
  )

  // 3. User signs delegation
  console.log('\n3. User signs delegation')
  const signedDelegation = {
    ...delegation,
    signature: '0x...', // User's signature
  }

  // 4. Shela backend redeems to stake
  console.log('\n4. Shela backend redeems delegation')
  const userOpHash = await redeemEscrowDelegation(
    null, // shelaBackendAccount
    signedDelegation,
    'USDC_ADDRESS',
    'TREASURY_ADDRESS',
    null, // bundlerClient
    null  // publicClient
  )

  console.log('\n✅ Escrow staked via Account Abstraction!')
  console.log('User never signed a transaction — only a delegation.')
  console.log('Shela backend handled all blockchain interactions.')
}
