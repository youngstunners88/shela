#!/bin/bash
# Insurance Hackathon - Mistral Forge Deployment Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FORGE_CLI="/home/workspace/Skills/mistral-forge/scripts/forge.ts"

echo "=== Insurance Hackathon Deployment ==="
echo "Project: $PROJECT_DIR"
echo ""

# Check environment
if [ -z "$MISTRAL_API_KEY" ]; then
    echo "ERROR: MISTRAL_API_KEY not set"
    echo "Set it in Settings > Advanced"
    exit 1
fi

# Function to train a model
train_model() {
    local model_name=$1
    local dataset=$2
    
    echo "Training model: $model_name"
    echo "Dataset: $dataset"
    
    bun "$FORGE_CLI" --upload \
        --dataset "$model_name-data" \
        --path "$PROJECT_DIR/$dataset"
    
    bun "$FORGE_CLI" --train \
        --dataset "$model_name-data" \
        --model-name "$model_name"
    
    echo "Training initiated for $model_name"
    echo "Monitor with: bun $FORGE_CLI --list-jobs"
}

# Function to deploy a model
deploy_model() {
    local model_name=$1
    
    echo "Deploying model: $model_name"
    
    bun "$FORGE_CLI" --deploy \
        --model "$model_name"
    
    echo "Model $model_name deployed"
}

# Parse command line arguments
MODE=${1:-all}

 case "$MODE" in
    claims)
        train_model "claims-processor-v1" "data/claims/training.jsonl"
        ;;
    risk)
        train_model "risk-assessor-v1" "data/risk/training.jsonl"
        ;;
    fraud)
        train_model "fraud-detector-v1" "data/fraud/training.jsonl"
        ;;
    deploy-claims)
        deploy_model "claims-processor-v1"
        ;;
    deploy-risk)
        deploy_model "risk-assessor-v1"
        ;;
    deploy-fraud)
        deploy_model "fraud-detector-v1"
        ;;
    all)
        echo "Training all models..."
        train_model "claims-processor-v1" "data/claims/training.jsonl"
        train_model "risk-assessor-v1" "data/risk/training.jsonl"
        train_model "fraud-detector-v1" "data/fraud/training.jsonl"
        echo ""
        echo "All training jobs submitted!"
        echo "Monitor progress with: bun $FORGE_CLI --list-jobs"
        ;;
    status)
        bun "$FORGE_CLI" --status
        bun "$FORGE_CLI" --list-models
        bun "$FORGE_CLI" --list-jobs
        ;;
    help)
        echo "Usage: deploy.sh [MODE]"
        echo ""
        echo "Modes:"
        echo "  all           - Train all models (default)"
        echo "  claims        - Train claims processor only"
        echo "  risk          - Train risk assessor only"
        echo "  fraud         - Train fraud detector only"
        echo "  deploy-claims - Deploy claims processor"
        echo "  deploy-risk   - Deploy risk assessor"
        echo "  deploy-fraud  - Deploy fraud detector"
        echo "  status        - Check API and model status"
        echo "  help          - Show this help"
        ;;
    *)
        echo "Unknown mode: $MODE"
        echo "Run 'deploy.sh help' for usage"
        exit 1
        ;;
esac

echo ""
echo "=== Deployment Complete ==="
