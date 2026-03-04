# Qwen 3.5 Model Reference

## Available Models

### Qwen3.5-0.8B (0.9B parameters)
- **HuggingFace**: `Qwen/Qwen3.5-0.8B`
- **Use Case**: Quick routing decisions
- **Speed**: Fastest
- **Memory**: ~2GB
- **Best For**: Classification, routing, simple QA

### Qwen3.5-2B (2B parameters)
- **HuggingFace**: `Qwen/Qwen3.5-2B`
- **Use Case**: Simple tasks, routing
- **Speed**: Fast
- **Memory**: ~4GB
- **Best For**: Summarization, simple tasks

### Qwen3.5-4B (5B parameters)
- **HuggingFace**: `Qwen/Qwen3.5-4B`
- **Use Case**: Moderate complexity
- **Speed**: Good
- **Memory**: ~8GB
- **Best For**: Code analysis, moderate reasoning, multi-turn chat
- **Recommended for most tasks**

### Qwen3.5-9B (10B parameters)
- **HuggingFace**: `Qwen/Qwen3.5-9B`
- **Use Case**: Complex reasoning
- **Speed**: Medium
- **Memory**: ~18GB
- **Best For**: Complex analysis, research, code generation

### Qwen3.5-27B (28B parameters)
- **HuggingFace**: `Qwen/Qwen3.5-27B`
- **Use Case**: Deep analysis
- **Speed**: Slower
- **Memory**: ~55GB
- **Best For**: Deep reasoning, architecture, complex code

### Qwen3.5-35B-A3B (36B parameters, MoE)
- **HuggingFace**: `Qwen/Qwen3.5-35B-A3B`
- **Use Case**: MoE efficiency
- **Speed**: Good (for size)
- **Memory**: ~75GB
- **Best For**: Balanced MoE, efficient reasoning
- **Note**: Mixture of Experts with only 3B active parameters

### Qwen3.5-122B-A10B (125B parameters, MoE)
- **HuggingFace**: `Qwen/Qwen3.5-122B-A10B`
- **Use Case**: MoE advanced
- **Speed**: Slower
- **Memory**: ~250GB
- **Best For**: Advanced MoE, specialized tasks
- **Note**: Mixture of Experts with 10B active parameters

### Qwen3.5-397B-A17B (403B parameters, MoE)
- **HuggingFace**: `Qwen/Qwen3.5-397B-A17B`
- **Use Case**: Maximum capability
- **Speed**: Slowest
- **Memory**: ~800GB
- **Best For**: Maximum capability, research-grade tasks
- **Note**: Mixture of Experts with 17B active parameters

## Quantized Variants

Each model also has quantized versions:
- **FP8**: `Qwen/Qwen3.5-{size}-FP8` - Half precision, faster inference
- **GPTQ-Int4**: `Qwen/Qwen3.5-{size}-GPTQ-Int4` - 4-bit quantization, much smaller

## Base vs Instruct

- **Instruct models**: `Qwen/Qwen3.5-{size}` - Fine-tuned for chat/instruction
- **Base models**: `Qwen/Qwen3.5-{size}-Base` - Raw model for fine-tuning

## Download Commands

```bash
# Using huggingface-hub
pip install huggingface-hub

# Download Qwen3.5-4B (recommended for most tasks)
huggingface-cli download Qwen/Qwen3.5-4B --local-dir ./models/Qwen3.5-4B

# Download with FP8 quantization
huggingface-cli download Qwen/Qwen3.5-4B-FP8 --local-dir ./models/Qwen3.5-4B-FP8
```

## Python Usage

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen3.5-4B",
    torch_dtype="auto",
    device_map="auto"
)
tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen3.5-4B")

response = model.generate(
    **tokenizer("Your prompt here", return_tensors="pt"),
    max_new_tokens=512
)
print(tokenizer.decode(response[0]))
```

## Selection Guide

| Task Type | Recommended Model |
|-----------|-------------------|
| Routing/Classification | Qwen3.5-0.8B or 2B |
| Code Review | Qwen3.5-4B |
| Architecture Design | Qwen3.5-27B |
| Research/Analysis | Qwen3.5-9B or 27B |
| Resource Constrained | Qwen3.5-4B-FP8 |
| Maximum Quality | Qwen3.5-35B-A3B (MoE) |
