# Insurance AI Hackathon

Custom AI models for insurance workflows powered by Mistral Forge.

## Project Structure

```
insurance-hackathon/
├── README.md              # This file
├── data/                  # Training datasets
│   ├── claims/           # Historical claims data
│   ├── policies/         # Policy documents
│   ├── risk/             # Risk assessment data
│   └── fraud/            # Fraud case examples
├── models/               # Trained model configs
│   ├── claims-processor.yaml
│   ├── risk-assessor.yaml
│   └── fraud-detector.yaml
├── agents/               # AI agent definitions
│   ├── claims/           # Claims processing agents
│   ├── risk/             # Risk assessment agents
│   ├── fraud/            # Fraud detection agents
│   └── policy/           # Policy compliance agents
├── workflows/            # Workflow definitions
│   ├── claims-processing/
│   ├── risk-assessment/
│   └── fraud-detection/
└── integration/          # Mistral Forge integration
    ├── config.yaml
    └── deploy.sh
```

## Quick Start

1. **Prepare Training Data**
   ```bash
   bun /home/workspace/Skills/mistral-forge/scripts/forge.ts --upload \
     --dataset claims-v1 \
     --path ./data/claims/training.jsonl
   ```

2. **Train Custom Model**
   ```bash
   bun /home/workspace/Skills/mistral-forge/scripts/forge.ts --train \
     --dataset claims-v1 \
     --model-name claims-processor-v1
   ```

3. **Deploy and Test**
   ```bash
   bun /home/workspace/Skills/mistral-forge/scripts/forge.ts --deploy \
     --model claims-processor-v1
   ```

## Models

### Claims Processor
- **Purpose**: Automate claim intake, triage, and initial assessment
- **Training Data**: Historical claims, settlement patterns, adjuster notes
- **Use Cases**:
  - Extract key claim information from documents
  - Assess completeness of claim submissions
  - Route claims to appropriate adjusters
  - Estimate initial reserve amounts

### Risk Assessor  
- **Purpose**: Evaluate risk profiles for underwriting
- **Training Data**: Historical underwriting data, risk factors, pricing models
- **Use Cases**:
  - Generate risk scores for new applications
  - Recommend pricing tiers
  - Identify high-risk exposures
  - Suggest risk mitigation strategies

### Fraud Detector
- **Purpose**: Identify potentially fraudulent claims
- **Training Data**: Confirmed fraud cases, anomaly patterns, red flags
- **Use Cases**:
  - Real-time fraud scoring
  - Flag suspicious patterns
  - Generate investigation recommendations
  - Learn from new fraud schemes

## Integration with StoryChain

This project can be integrated with StoryChain's agent-swarm system:

```yaml
# architect/agent-swarm/tasks/train-claims-model.toml
type = "model-training"
name = "Train Claims Processor"
description = "Train custom model for claims processing"

[parameters]
model_provider = "mistral-forge"
dataset = "/insurance-hackathon/data/claims/training.jsonl"
base_model = "mistral-small-4"

[config]
learning_rate = 0.0001
epochs = 3
batch_size = 32

[[dependencies]]
task = "prepare-claims-data"
```

## Configuration

Set these environment variables in [Settings > Advanced](/?t=settings&s=advanced):

```
MISTRAL_API_KEY=your_api_key_here
INSURANCE_DATA_PATH=/home/workspace/insurance-hackathon/data
```

## License

MIT - Hackathon Project
