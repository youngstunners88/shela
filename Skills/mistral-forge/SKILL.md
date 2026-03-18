---
name: mistral-forge
description: Integration with Mistral Forge platform for training custom AI models on proprietary data. Enables enterprise-grade fine-tuning for domain-specific tasks like insurance claims, risk assessment, and fraud detection.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
  version: 1.0.0
  tags: [ai, ml, fine-tuning, enterprise, insurance]
---

# Mistral Forge Integration

Mistral Forge lets enterprises train custom AI models from scratch on proprietary data. Unlike simple fine-tuning, Forge enables complete model customization for domain-specific tasks.

## Key Capabilities

• Train custom models from proprietary insurance data (claims, policies, risk data)
• Build specialized agents for claims processing, risk assessment, fraud detection
• Maintain data privacy - models trained in customer-controlled environments
• Access Mistral's open-weight models (Mistral Small 4, etc.) as starting points
• Deploy forward-deployed engineering support

## Insurance Use Cases

1. **Claims Processing Agent**
   - Train on historical claims data, policy documents, settlement patterns
   - Automate claim triage, documentation review, approval workflows
   
2. **Risk Assessment Model**
   - Fine-tune on underwriting data, risk factors, pricing models
   - Generate risk scores, pricing recommendations
   
3. **Fraud Detection System**
   - Learn patterns from confirmed fraud cases, anomalies, red flags
   - Real-time fraud scoring for incoming claims

4. **Policy Compliance Checker**
   - Train on regulatory requirements, policy language, legal precedents
   - Validate policy language against regulations

## Usage

```bash
# Check model status
bun /home/workspace/Skills/mistral-forge/scripts/forge.ts --status

# Upload training data
bun /home/workspace/Skills/mistral-forge/scripts/forge.ts --upload --dataset claims-data --path ./data/claims.jsonl

# Start training job
bun /home/workspace/Skills/mistral-forge/scripts/forge.ts --train --dataset claims-data --model-name insurance-claims-v1

# Deploy model
bun /home/workspace/Skills/mistral-forge/scripts/forge.ts --deploy --model insurance-claims-v1

# Query deployed model
bun /home/workspace/Skills/mistral-forge/scripts/forge.ts --query --model insurance-claims-v1 --prompt "Analyze this claim..."
```

## Configuration

Set these secrets in [Settings > Advanced](/?t=settings&s=advanced):

```
MISTRAL_API_KEY - Your Mistral API key
MISTRAL_FORGE_ENDPOINT - Forge platform endpoint (enterprise customers)
FORGE_PROJECT_ID - Your Forge project identifier
```

## Architecture

This skill provides:
- `scripts/forge.ts` - Main CLI for Forge operations
- `references/api.md` - API documentation
- `assets/templates/` - Training data templates

## Integration with StoryChain

Use this skill within StoryChain's agent-swarm system:

```yaml
# In architect/agent-swarm/tasks/ folder
type: model-training
model: mistral-forge
dataset: /data/insurance/claims.jsonl
config:
  base_model: mistral-small-4
  epochs: 3
  learning_rate: 0.0001
```
