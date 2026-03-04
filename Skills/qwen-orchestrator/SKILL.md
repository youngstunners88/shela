---
name: qwen-orchestrator
description: Strategic multi-agent orchestration using Qwen 3.5 models. Combines Alibaba's Qwen 3.5 LLM family with agent-orchestrator for autonomous parallel coding, research, and task execution. Use when you need powerful, cost-effective multi-agent workflows with stateful memory.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
  models:
    - Qwen3.5-0.8B
    - Qwen3.5-2B
    - Qwen3.5-4B
    - Qwen3.5-9B
    - Qwen3.5-27B
    - Qwen3.5-35B-A3B (MoE)
    - Qwen3.5-122B-A10B (MoE)
    - Qwen3.5-397B-A17B (MoE)
---

# Qwen Orchestrator Skill

Strategic multi-agent system combining Qwen 3.5 models with agent orchestration for autonomous parallel execution.

## Qwen 3.5 Model Family

| Model | Parameters | Best For |
|-------|------------|----------|
| Qwen3.5-0.8B | 0.9B | Fast, simple tasks |
| Qwen3.5-2B | 2B | Lightweight agents |
| Qwen3.5-4B | 5B | Balanced performance |
| Qwen3.5-9B | 10B | Complex reasoning |
| Qwen3.5-27B | 28B | Advanced coding |
| Qwen3.5-35B-A3B | 36B (MoE) | Efficient scaling |
| Qwen3.5-122B-A10B | 125B (MoE) | Heavy tasks |
| Qwen3.5-397B-A17B | 403B (MoE) | Maximum capability |

MoE (Mixture of Experts) models activate only a fraction of parameters, making them efficient.

## Access Methods

### 1. HuggingFace Inference API
```bash
# Requires HF_TOKEN in environment
curl -X POST https://api-inference.huggingface.co/models/Qwen/Qwen3.5-4B \
  -H "Authorization: Bearer $HF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "Your prompt here"}'
```

### 2. Local Inference (via transformers)
```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model_name = "Qwen/Qwen3.5-4B"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)
```

### 3. Via OpenRouter
```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen/qwen-3.5-4b",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Strategic Agent Deployment

### Model Selection Strategy

```
Task Type                → Recommended Model
─────────────────────────────────────────────
Simple classification    → Qwen3.5-0.8B
Quick summaries          → Qwen3.5-2B
Code generation          → Qwen3.5-9B or Qwen3.5-27B
Complex reasoning        → Qwen3.5-27B
Multi-file refactors     → Qwen3.5-35B-A3B
Architecture decisions   → Qwen3.5-122B-A10B
```

### Cost Optimization

MoE models provide better cost-performance:
- Qwen3.5-35B-A3B: Only 3B active params (efficient)
- Qwen3.5-122B-A10B: Only 10B active params
- Qwen3.5-397B-A17B: Only 17B active params

## Integration with Agent Orchestrator

### 1. Configure Qwen as Agent Backend

Create a custom agent plugin for the orchestrator:

```typescript
// In agent-orchestrator config
defaults:
  agent: qwen-adapter  # Custom Qwen adapter
```

### 2. Spawn Qwen-Powered Agents

```bash
# Use composio-orchestrator skill to spawn
ao spawn my-project 123 --agent qwen-adapter
```

### 3. Multi-Model Strategy

Spawn different agents with different models:
```bash
# Research agent (fast)
ao spawn my-project 100 --model qwen-3.5-2b

# Code agent (capable)
ao spawn my-project 101 --model qwen-3.5-9b

# Review agent (thorough)
ao spawn my-project 102 --model qwen-3.5-27b
```

## Autonomous Workflow Patterns

### Pattern 1: Parallel Issue Resolution
```
1. Fetch open issues from GitHub
2. Classify by complexity (use Qwen3.5-2B)
3. Assign appropriate model
4. Spawn parallel agents
5. Monitor and merge PRs
```

### Pattern 2: Research + Code Pipeline
```
1. Research agent (Qwen3.5-27B) analyzes codebase
2. Writes findings to shared-brain
3. Code agents (Qwen3.5-9B) implement changes
4. Review agent (Qwen3.5-27B) validates
```

### Pattern 3: Continuous Integration
```
1. Monitor CI failures
2. Spawn fix agent with context
3. Agent fixes and pushes
4. Auto-merge if tests pass
```

## Scripts

### qwen-classify.ts
Classifies task complexity to select appropriate model:
```bash
bun /home/workspace/Skills/qwen-orchestrator/scripts/qwen-classify.ts "Implement user authentication with OAuth2"
# Output: qwen-3.5-9b (complexity: medium-high)
```

### qwen-spawn-agents.ts
Spawns multiple agents with optimal model assignment:
```bash
bun /home/workspace/Skills/qwen-orchestrator/scripts/qwen-spawn-agents.ts --issues 101,102,103 --project my-app
```

### qwen-status.ts
Monitors all Qwen agents and their progress:
```bash
bun /home/workspace/Skills/qwen-orchestrator/scripts/qwen-status.ts
```

## Memory Integration

Combine with persistent-memory skill for stateful agents:

```bash
# Boot agent with memory context
python3 /home/workspace/persistent-agent-memory/scripts/boot_agent.py --agent-id qwen-coder-01

# After task, save to memory
python3 /home/workspace/persistent-agent-memory/scripts/write_agent_memory.py \
  --agent-id qwen-coder-01 \
  --entry "Fixed auth bug, added OAuth2 support"
```

## Configuration

Set up API keys in Settings > Advanced:
- `HF_TOKEN` - HuggingFace API token
- `OPENROUTER_API_KEY` - OpenRouter API key (alternative)

## Best Practices

1. **Match model to task complexity** - Don't waste large models on simple tasks
2. **Use MoE for efficiency** - MoE models give large-model capability at lower cost
3. **Parallelize strategically** - Spawn agents for independent tasks
4. **Persist learnings** - Use persistent-memory to compound knowledge
5. **Monitor costs** - Track token usage via llm_usage.db

## Comparison with Other Models

| Aspect | Qwen 3.5 | Claude | GPT-4 |
|--------|----------|--------|-------|
| Open weights | ✅ | ❌ | ❌ |
| MoE efficiency | ✅ | ❌ | ✅ |
| Multi-lingual | ✅ Strong | ✅ | ✅ |
| Coding ability | ✅ Strong | ✅ Excellent | ✅ Excellent |
| Cost | Low | Medium | High |
| Local deployment | ✅ | ❌ | ❌ |
