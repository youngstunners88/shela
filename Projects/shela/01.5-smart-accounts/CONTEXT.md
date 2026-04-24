# 01.5-smart-accounts — Account Abstraction Layer

## Context
Users verified in 01-verify now create Smart Accounts (ERC-4337) for gasless, delegated staking.

## Why This Layer Exists
- **Frictionless UX**: No signing every transaction
- **Gas Abstraction**: Backend pays fees via paymaster
- **Session Keys**: 7-day mobile experience without wallet popups
- **Delegation**: Users pre-authorize stake operations

## Tech Stack
- MetaMask Smart Accounts Kit (Hybrid implementation)
- ERC-4337 EntryPoint
- Bundler (Pimlico/Alchemy)
- Paymaster (sponsored transactions)

## Flow
1. User passes 01-verify interview
2. Create Hybrid Smart Account (EOA + Passkey backup)
3. Create delegation for escrow operations
4. Store session key securely (mobile keychain)

## Outputs
- Smart Account address
- Delegation signature
- Session key
- Paymaster policy ID

## Triggers
- Smart Account created → Continue to 02-match
- Delegation signed → Backend can auto-execute stakes
