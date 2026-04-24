// Shela Smart Account API Routes
// Part of 01.5-smart-accounts layer

import { Hono } from 'hono';
import { createSmartAccount } from '../01.5-smart-accounts/src/smart-account';
import { createStakeDelegation } from '../01.5-smart-accounts/src/delegation';

const app = new Hono();

// Create Smart Account
app.post('/create', async (c) => {
  try {
    const { userId } = await c.req.json();
    
    // In production: Load user's wallet from secure storage
    // For demo: Generate ephemeral or use existing
    
    const config = {
      ownerPrivateKey: '0x...' as `0x${string}`, // From secure storage
      rpcUrl: process.env.RPC_URL || 'https://mainnet.infura.io/v3/...',
      bundlerUrl: process.env.BUNDLER_URL || 'https://api.pimlico.io/v1/mainnet/rpc',
      paymasterUrl: process.env.PAYMASTER_URL, // Optional
      chainId: parseInt(process.env.CHAIN_ID || '1'),
    };

    const { address, account, bundlerClient, isDeployed } = await createSmartAccount(config);

    return c.json({
      success: true,
      address,
      isDeployed,
      message: isDeployed ? 'Account already exists' : 'Account created (counterfactual)',
    });

  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Create Delegation for Staking
app.post('/delegate', async (c) => {
  try {
    const {
      userId,
      accountAddress,
      maxAmount,
      duration,
      limit,
    } = await c.req.json();

    const delegation = createStakeDelegation({
      delegator: accountAddress as `0x${string}`,
      delegate: process.env.SHELA_BACKEND_ADDRESS as `0x${string}`,
      tokenAddress: process.env.USDC_ADDRESS as `0x${string}`,
      maxAmount: BigInt(maxAmount),
      duration,
      limit,
    });

    return c.json({
      success: true,
      delegation,
      message: 'Delegation created. Sign to authorize gasless staking.',
    });

  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Sign Delegation
app.post('/sign', async (c) => {
  try {
    const { userId, delegation } = await c.req.json();
    
    // In production: Sign with user's smart account
    // This requires wallet interaction
    
    return c.json({
      success: true,
      message: 'Delegation signed and ready for backend execution',
    });

  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Check Account Status
app.get('/status/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    
    // In production: Query database for account status
    
    return c.json({
      success: true,
      hasSmartAccount: true,
      hasDelegation: true,
      canAutoStake: true,
    });

  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
