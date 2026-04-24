import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator, Alert } from 'react-native';

interface SmartAccountSetupProps {
  userId: string;
  onComplete: (accountAddress: string) => void;
  onError: (error: Error) => void;
}

// Mobile UI for Smart Account creation
// Part of 01-verify flow after interview passes

export const SmartAccountSetup: React.FC<SmartAccountSetupProps> = ({
  userId,
  onComplete,
  onError,
}) => {
  const [step, setStep] = useState<'intro' | 'creating' | 'delegating' | 'complete'>('intro');
  const [progress, setProgress] = useState(0);
  const [accountAddress, setAccountAddress] = useState<string | null>(null);

  const createAccount = async () => {
    try {
      setStep('creating');
      setProgress(25);

      // Call API to create smart account
      const response = await fetch('/api/smart-account/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) throw new Error('Failed to create account');

      const { address, delegationRequired } = await response.json();
      setAccountAddress(address);
      setProgress(50);

      if (delegationRequired) {
        setStep('delegating');
        setProgress(75);

        // Create delegation for staking
        await createDelegation(userId, address);
      }

      setStep('complete');
      setProgress(100);
      onComplete(address);

    } catch (err) {
      onError(err as Error);
    }
  };

  const createDelegation = async (userId: string, accountAddress: string) => {
    const response = await fetch('/api/smart-account/delegate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        accountAddress,
        maxAmount: '1000000000', // $1000 USDC in 6 decimals
        duration: 604800, // 7 days
        limit: 10, // max 10 stakes
      }),
    });

    if (!response.ok) throw new Error('Failed to create delegation');
  };

  return (
    <View style={{ padding: 20 }}>
      {step === 'intro' && (
        <View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
            Set Up Smart Account
          </Text>
          <Text style={{ marginBottom: 20, lineHeight: 20 }}>
            Create a Smart Account for gasless staking and automatic meet releases.
            {'\n\n'}
            ✓ No gas fees{'\n'}
            ✓ One-tap meets{'\n'}
            ✓ Auto-refunds
          </Text>
          <Button title="Create Smart Account" onPress={createAccount} />
        </View>
      )}

      {step === 'creating' && (
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 16 }}>Creating your Smart Account... {progress}%</Text>
        </View>
      )}

      {step === 'delegating' && (
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 16 }}>Setting up delegations... {progress}%</Text>
        </View>
      )}

      {step === 'complete' && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: 'green' }}>
            ✓ Account Ready!
          </Text>
          <Text style={{ fontSize: 12, color: 'gray', marginBottom: 20 }}>
            {accountAddress?.slice(0, 6)}...{accountAddress?.slice(-4)}
          </Text>
          <Text>You can now stake without gas fees</Text>
        </View>
      )}
    </View>
  );
};
