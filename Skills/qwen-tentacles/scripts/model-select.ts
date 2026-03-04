#!/usr/bin/env bun
/**
 * Qwen 3.5 Model Selector
 * Selects appropriate model based on task complexity and available resources
 */

const MODELS = {
  "Qwen3.5-0.8B": {
    parameters: "0.9B",
    useCase: "Quick routing decisions",
    speed: "fastest",
    memoryGB: 2,
    recommendedFor: ["routing", "classification", "simple-qa"],
  },
  "Qwen3.5-2B": {
    parameters: "2B",
    useCase: "Simple tasks, routing",
    speed: "fast",
    memoryGB: 4,
    recommendedFor: ["routing", "simple-tasks", "summarization"],
  },
  "Qwen3.5-4B": {
    parameters: "5B",
    useCase: "Moderate complexity",
    speed: "good",
    memoryGB: 8,
    recommendedFor: ["code-analysis", "moderate-reasoning", "multi-turn-chat"],
  },
  "Qwen3.5-9B": {
    parameters: "10B",
    useCase: "Complex reasoning",
    speed: "medium",
    memoryGB: 18,
    recommendedFor: ["complex-analysis", "research", "code-generation"],
  },
  "Qwen3.5-27B": {
    parameters: "28B",
    useCase: "Deep analysis",
    speed: "slower",
    memoryGB: 55,
    recommendedFor: ["deep-reasoning", "architecture", "complex-code"],
  },
  "Qwen3.5-35B-A3B": {
    parameters: "36B",
    useCase: "MoE efficiency",
    speed: "good",
    memoryGB: 75,
    recommendedFor: ["balanced-moe", "efficient-reasoning"],
  },
  "Qwen3.5-122B-A10B": {
    parameters: "125B",
    useCase: "MoE advanced",
    speed: "slower",
    memoryGB: 250,
    recommendedFor: ["advanced-moe", "specialized-tasks"],
  },
  "Qwen3.5-397B-A17B": {
    parameters: "403B",
    useCase: "Maximum capability",
    speed: "slowest",
    memoryGB: 800,
    recommendedFor: ["maximum-capability", "research-grade"],
  },
};

type TaskComplexity = "trivial" | "simple" | "moderate" | "complex" | "advanced";

function assessComplexity(task: string): TaskComplexity {
  const taskLower = task.toLowerCase();
  
  if (
    taskLower.includes("route") ||
    taskLower.includes("classify") ||
    taskLower.includes("simple") ||
    taskLower.includes("quick")
  ) {
    return "trivial";
  }
  
  if (
    taskLower.includes("summarize") ||
    taskLower.includes("basic") ||
    taskLower.includes("list")
  ) {
    return "simple";
  }
  
  if (
    taskLower.includes("analyze") ||
    taskLower.includes("implement") ||
    taskLower.includes("refactor") ||
    taskLower.includes("debug")
  ) {
    return "moderate";
  }
  
  if (
    taskLower.includes("architecture") ||
    taskLower.includes("design") ||
    taskLower.includes("complex") ||
    taskLower.includes("research")
  ) {
    return "complex";
  }
  
  if (
    taskLower.includes("advanced") ||
    taskLower.includes("novel") ||
    taskLower.includes("groundbreaking")
  ) {
    return "advanced";
  }
  
  return "moderate";
}

function selectModel(
  task: string,
  constraints: { maxMemoryGB?: number; preferSpeed?: boolean } = {}
): { model: string; reason: string } {
  const complexity = assessComplexity(task);
  
  const suitableModels = Object.entries(MODELS)
    .filter(([_, config]) => {
      if (constraints.maxMemoryGB && config.memoryGB > constraints.maxMemoryGB) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (constraints.preferSpeed) {
        const speedOrder = { fastest: 0, fast: 1, good: 2, medium: 3, slower: 4, slowest: 5 };
        return speedOrder[a[1].speed as keyof typeof speedOrder] - speedOrder[b[1].speed as keyof typeof speedOrder];
      }
      return 0;
    });

  // Complexity-based selection
  const complexityModelMap: Record<TaskComplexity, string> = {
    trivial: "Qwen3.5-0.8B",
    simple: "Qwen3.5-2B",
    moderate: "Qwen3.5-4B",
    complex: "Qwen3.5-27B",
    advanced: "Qwen3.5-35B-A3B",
  };

  const recommendedModel = complexityModelMap[complexity];
  const model = suitableModels.find(([name]) => name === recommendedModel) || suitableModels[0];

  if (!model) {
    return { model: "Qwen3.5-4B", reason: "Fallback to balanced model" };
  }

  return {
    model: model[0],
    reason: `Task complexity: ${complexity}. Recommended for: ${model[1].useCase}`,
  };
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Qwen 3.5 Model Selector

Usage:
  model-select.ts "task description"
  model-select.ts "task description" --max-memory 16
  model-select.ts "task description" --prefer-speed

Options:
  --max-memory <gb>    Maximum GPU memory in GB
  --prefer-speed       Prefer faster models
  --help               Show this help

Examples:
  model-select.ts "Route incoming request to appropriate handler"
  model-select.ts "Analyze codebase architecture and suggest improvements" --max-memory 32
  model-select.ts "Quick classification of user intent" --prefer-speed
`);
    process.exit(0);
  }

  const task = args[0];
  const maxMemory = args.includes("--max-memory")
    ? parseInt(args[args.indexOf("--max-memory") + 1])
    : undefined;
  const preferSpeed = args.includes("--prefer-speed");

  const { model, reason } = selectModel(task, { maxMemoryGB: maxMemory, preferSpeed });
  const config = MODELS[model as keyof typeof MODELS];

  console.log(JSON.stringify({
    model,
    huggingFaceId: `Qwen/${model}`,
    reason,
    parameters: config.parameters,
    speed: config.speed,
    memoryRequired: `${config.memoryGB}GB`,
    useCase: config.useCase,
  }, null, 2));
}

main();
