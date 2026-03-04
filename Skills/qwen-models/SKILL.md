---
name: qwen-models
description: Strategic use of Qwen 3.5 models for autonomous AI tasks. Provides model selection guidance, API integration, and best practices for leveraging Qwen's multimodal capabilities in agent workflows.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
  source: https://huggingface.co/collections/Qwen/qwen35
  models:
    - Qwen3.5-0.8B
    - Qwen3.5-2B
    - Qwen3.5-4B
    - Qwen3.5-9B
    - Qwen3.5-27B
    - Qwen3.5-35B-A3B
    - Qwen3.5-122B-A10B
    - Qwen3.5-397B-A17B
---

# Qwen 3.5 Models Skill

Strategic guidance for using Qwen 3.5 models in autonomous AI workflows. Qwen 3.5 is a family of multimodal (image-text-to-text) models ranging from 0.8B to 397B parameters, suitable for various AI agent tasks.

## Model Selection Guide

Choose the right model for your task:

| Model | Parameters | Use Case | Speed | Memory |
|-------|------------|----------|-------|--------|
| Qwen3.5-0.8B | 0.9B | Quick tasks, simple Q&A | ⚡⚡⚡ | Low |
| Qwen3.5-2B | 2B | Lightweight agents, chat | ⚡⚡⚡ | Low |
| Qwen3.5-4B | 5B | General purpose, balanced | ⚡⚡ | Medium |
| Qwen3.5-9B | 10B | Complex reasoning, code | ⚡ | Medium |
| Qwen3.5-27B | 28B | Advanced reasoning | Medium | High |
| Qwen3.5-35B-A3B | 36B | MoE efficiency, production | Medium | Medium |
| Qwen3.5-122B-A10B | 125B | Enterprise, research | Slow | Very High |
| Qwen3.5-397B-A17B | 403B | Maximum capability | Very Slow | Extreme |

### Model Recommendations by Task

**Code Generation & Review**
- Primary: Qwen3.5-9B (good balance of capability and speed)
- Alternative: Qwen3.5-27B (complex architectures)

**Document Analysis**
- Primary: Qwen3.5-4B (efficient for text)
- Alternative: Qwen3.5-9B (detailed analysis)

**Vision Tasks (Image + Text)**
- All Qwen3.5 models support image-text-to-text
- Use 9B+ for complex visual understanding

**Autonomous Agents**
- Primary: Qwen3.5-35B-A3B (MoE architecture, good efficiency)
- Alternative: Qwen3.5-9B (faster, lower cost)

**Production Services**
- Primary: Qwen3.5-35B-A3B (balanced performance)
- Alternative: Qwen3.5-27B (simpler architecture)

## API Integration

### OpenRouter (Recommended)

```typescript
import { OpenAI } from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const response = await openai.chat.completions.create({
  model: "qwen/qwen-3.5-9b",
  messages: [
    { role: "system", content: "You are a helpful coding assistant." },
    { role: "user", content: "Write a function to sort an array." },
  ],
});
```

### Available OpenRouter Models

- `qwen/qwen-3.5-0.8b`
- `qwen/qwen-3.5-2b`
- `qwen/qwen-3.5-4b`
- `qwen/qwen-3.5-9b`
- `qwen/qwen-3.5-27b`
- `qwen/qwen-3.5-35b-a3b` (MoE)
- `qwen/qwen-3.5-122b-a10b` (MoE)
- `qwen/qwen-3.5-397b-a17b` (MoE)

### Hugging Face Inference

```python
from huggingface_hub import InferenceClient

client = InferenceClient(model="Qwen/Qwen3.5-9B")

response = client.text_generation(
    "Write a function to sort an array:",
    max_new_tokens=500,
)
```

### Local Inference (vLLM)

For self-hosted inference:

```bash
# Install vLLM
pip install vllm

# Run server
vllm serve Qwen/Qwen3.5-9B --port 8000

# Query
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "Qwen/Qwen3.5-9B", "messages": [{"role": "user", "content": "Hello!"}]}'
```

## Strategic Usage Patterns

### 1. Multi-Model Orchestration

Use different models for different complexity levels:

```typescript
function selectModel(complexity: "low" | "medium" | "high"): string {
  switch (complexity) {
    case "low":
      return "qwen/qwen-3.5-2b";      // Fast, cheap
    case "medium":
      return "qwen/qwen-3.5-9b";      // Balanced
    case "high":
      return "qwen/qwen-3.5-35b-a3b"; // MoE efficiency
  }
}
```

### 2. MoE Architecture Benefits

Qwen3.5-35B-A3B uses Mixture of Experts:
- Active parameters during inference: ~3B
- Total parameters: 35B
- Faster inference than dense 35B models
- Lower cost per token

Best for:
- Production services
- Autonomous agents
- High-throughput scenarios

### 3. Vision Capabilities

All Qwen3.5 models support image inputs:

```typescript
const response = await openai.chat.completions.create({
  model: "qwen/qwen-3.5-9b",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Describe this image" },
        { type: "image_url", image_url: { url: "https://..." } },
      ],
    },
  ],
});
```

Use cases:
- Document analysis (PDFs as images)
- UI/UX analysis
- Diagram interpretation
- Visual debugging

### 4. Cost Optimization

Estimate costs based on model size:

```typescript
const MODEL_COSTS = {
  "qwen-3.5-0.8b": { input: 0.0001, output: 0.0001 },  // $/1K tokens
  "qwen-3.5-2b": { input: 0.0002, output: 0.0002 },
  "qwen-3.5-4b": { input: 0.0004, output: 0.0004 },
  "qwen-3.5-9b": { input: 0.001, output: 0.001 },
  "qwen-3.5-27b": { input: 0.003, output: 0.003 },
  "qwen-3.5-35b-a3b": { input: 0.002, output: 0.002 },  // MoE
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model];
  return costs.input * inputTokens + costs.output * outputTokens;
}
```

## FP8 and Quantized Models

For lower memory usage:

- `Qwen3.5-27B-FP8` - FP8 quantization
- `Qwen3.5-35B-A3B-FP8` - FP8 quantization
- `Qwen3.5-122B-A10B-FP8` - FP8 quantization
- `Qwen3.5-397B-A17B-FP8` - FP8 quantization

GPTQ-Int4 variants available for all large models.

## Base vs Instruct Models

**Instruct models** (default):
- Fine-tuned for chat/instruction following
- Better for agents and assistants
- Use for most tasks

**Base models** (suffix `-Base`):
- No instruction tuning
- Better for fine-tuning
- Use for domain adaptation

## Scripts

| Script | Purpose |
|--------|---------|
| `select-model.ts` | Select optimal model for task |
| `estimate-cost.ts` | Calculate API costs |
| `vision-query.ts` | Multimodal queries |

## References

- [Hugging Face Collection](https://huggingface.co/collections/Qwen/qwen35)
- [Qwen Documentation](https://qwenlm.github.io/)
- [OpenRouter Models](https://openrouter.ai/models?qwen)
