import { toMetaMaskSmartAccount, Implementation } from '@metamask/smart-accounts-kit';
import { createClient } from '@solana/client';
import { createBundlerClient } from '@metamask/smart-accounts-kit';
import { http } from 'viem';

// Shela Smart Account Integration
// Creates ERC-4337 accounts for gasless, delegated staking

interface SmartAccountConfig {
  ownerPrivateKey: `0x${string}`;
  rpcUrl: string;
  bundlerUrl: string;
  paymasterUrl?: string;
  chainId: number;
}

interface SmartAccountResult {
  address: `0x${string}`;
  account: any;
  bundlerClient: any;
  isDeployed: boolean;
}

// Create Hybrid Smart Account (EOA + Passkey backup)
export async function createSmartAccount(
  config: SmartAccountConfig
): Promise<SmartAccountResult> {
  const client = createClient({
    transport: http(config.rpcUrl),
  });

  // Create account from owner private key
  const owner = privateKeyToAccount(config.ownerPrivateKey);

  // Hybrid implementation: EOA signer + passkey backup
  const smartAccount = await toMetaMaskSmartAccount({
    client,
    implementation: Implementation.Hybrid,
    deployParams: [owner.address, [], [], []],
    deploySalt: '0x',
    signer: { account: owner },
  });

  // Check if already deployed
  const code = await client.getBytecode({ address: smartAccount.address });
  const isDeployed = code !== undefined && code !== '0x';

  // Create bundler client with optional paymaster
  const bundlerClient = createBundlerClient({
    account: smartAccount,
    transport: http(config.bundlerUrl),
    paymaster: config.paymasterUrl ? {
      transport: http(config.paymasterUrl),
    } : undefined,
  });

  return {
    address: smartAccount.address,
    account: smartAccount,
    bundlerClient,
    isDeployed,
  };
}

// Deploy account on first use (counterfactual deployment)
export async function deployAccount(
  bundlerClient: any,
  paymasterClient?: any
): Promise<`0x${string}`> {
  // Send empty UserOp to trigger deployment
  const userOpHash = await bundlerClient.sendUserOperation({
    calls: [],
    paymaster: paymasterClient ? {
      transport: paymasterClient.transport,
    } : undefined,
  });

  // Wait for receipt
  const receipt = await bundlerClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  return receipt.transactionHash;
}

// Helper for private key
function privateKeyToAccount(privateKey: `0x${string}`) {
  // Implementation would use viem's privateKeyToAccount
  // This is a placeholder for the actual implementation
  return {
    address: '0x...', // Derived from private key
    signMessage: async (message: string) => '0x...',
    signTypedData: async (data: any) => '0x...',
  };
}
