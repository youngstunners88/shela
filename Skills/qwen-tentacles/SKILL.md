---
name: qwen-tentacles
description: Deploy Qwen3.5 models as autonomous "tentacles" for parallel task execution. Spawn specialized Qwen agents for research, coding, analysis, and more via HuggingFace Inference API.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
---

# Qwen Tentacles Skill

Deploy Qwen3.5 models as extra "tentacles" for autonomous, parallel task execution.

## Available Models

| Model | Size | Best For |
|-------|------|----------|
| Qwen3.5-0.8B | 0.9B | Fast, simple tasks |
| Qwen3.5-2B | 2B | Quick analysis |
| Qwen3.5-4B | 5B | Balanced work |
| Qwen3.5-9B | 10B | Complex reasoning |
| Qwen3.5-27B | 28B | Advanced tasks |
| Qwen3.5-35B-A3B | 36B | MoE efficiency |
| Qwen3.5-122B-A10B | 125B | Heavy lifting |
| Qwen3.5-397B-A17B | 403B | Maximum capability |

## Setup

1. Get HuggingFace API key: https://huggingface.co/settings/tokens
2. Add to Zo secrets: [Settings > Advanced](/?t=settings&s=advanced)
3. Key name: `HUGGINGFACE_API_KEY`

## Quick Start

```bash
# Simple query
bun scripts/qwen-task.ts --model 9B --prompt "Summarize this code: ..."

# Research task
bun scripts/qwen-task.ts --model 27B --task research --prompt "Research SA taxi industry"

# Code generation
bun scripts/qwen-task.ts --model 9B --task code --prompt "Write a REST API for user auth"

# Parallel tasks
bun scripts/qwen-parallel.ts --tasks tasks.json
```

## Autonomous Mode

Spawn a Qwen tentacle for autonomous work:

```bash
# Spawn a research tentacle
bun scripts/spawn-tentacle.ts --type research --task "Analyze competitor pricing"

# Spawn a coding tentacle
bun scripts/spawn-tentacle.ts --type code --task "Fix the auth bug" --context ./auth.ts

# Spawn an analysis tentacle
bun scripts/spawn-tentacle.ts --type analyze --task "Review this architecture" --context ./docs/
```

## Tentacle Types

| Type | Model | Purpose |
|------|-------|---------|
| `research` | 27B | Web research, synthesis |
| `code` | 9B | Code generation, debugging |
| `analyze` | 27B | Data analysis, insights |
| `summarize` | 4B | Quick summarization |
| `translate` | 4B | Language tasks |
| `think` | 122B | Deep reasoning |

## Scripts

### qwen-task.ts

Single task execution:

```bash
bun scripts/qwen-task.ts \
  --model 9B \
  --prompt "Explain quantum computing in simple terms" \
  --max-tokens 1000 \
  --temperature 0.7
```

### qwen-parallel.ts

Run multiple tasks in parallel:

```bash
# Create tasks file
cat > tasks.json << 'EOF'
[
  {"id": "1", "prompt": "Research topic A", "model": "27B"},
  {"id": "2", "prompt": "Summarize document B", "model": "4B"},
  {"id": "3", "prompt": "Write code for C", "model": "9B"}
]
EOF

bun scripts/qwen-parallel.ts --tasks tasks.json --output results.json
```

### spawn-tentacle.ts

Spawn autonomous agent:

```bash
bun scripts/spawn-tentacle.ts \
  --type research \
  --task "Research South African fintech regulations" \
  --context "Focus on payment providers" \
  --output ./research-output.md
```

### qwen-chat.ts

Interactive chat session:

```bash
bun scripts/qwen-chat.ts --model 9B --system "You are a helpful coding assistant"
```

## Integration with Agent Orchestrator

Use Qwen tentacles alongside Claude Code agents:

```bash
# Claude agents for complex work
ao spawn my-project 123

# Qwen tentacles for parallel research
bun scripts/qwen-parallel.ts --tasks research-tasks.json
```

## Cost Optimization

- Use smallest model that can do the job
- 0.8B for simple classification
- 4B for summarization
- 9B for coding
- 27B for research
- 122B+ for complex reasoning

## Best Practices

1. **Right-size models** — don't waste tokens on oversized models
2. **Batch similar tasks** — use parallel execution
3. **Cache results** — store outputs for reuse
4. **Set temperature low** — for factual tasks (0.1-0.3)
5. **Set temperature high** — for creative tasks (0.7-0.9)

## Error Handling

If HuggingFace API fails:
1. Check API key is valid
2. Check rate limits (HuggingFace has free tier limits)
3. Fall back to smaller model
4. Use local model via Ollama if available
