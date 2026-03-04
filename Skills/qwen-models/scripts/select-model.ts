#!/usr/bin/env bun
/**
 * Select optimal Qwen model for a task
 * 
 * Usage:
 *   bun select-model.ts [options]
 * 
 * Options:
 *   --task <type>      Task type: code, document, vision, agent, chat
 *   --complexity <n>   Complexity level: low, medium, high
 *   --budget <cents>   Max budget per request in cents
 *   --json             Output as JSON
 */

import { parseArgs } from "util";

interface ModelInfo {
  name: string;
  openrouter: string;
  params: string;
  context: number;
  inputCost: number;  // $/1K tokens
  outputCost: number; // $/1K tokens
  speed: string;
  useCases: string[];
}

const MODELS: ModelInfo[] = [
  {
    name: "Qwen3.5-0.8B",
    openrouter: "qwen/qwen-3.5-0.8b",
    params: "0.9B",
    context: 32768,
    inputCost: 0.0001,
    outputCost: 0.0001,
    speed: "⚡⚡⚡",
    useCases: ["quick-tasks", "simple-qa", "chat"],
  },
  {
    name: "Qwen3.5-2B",
    openrouter: "qwen/qwen-3.5-2b",
    params: "2B",
    context: 32768,
    inputCost: 0.0002,
    outputCost: 0.0002,
    speed: "⚡⚡⚡",
    useCases: ["lightweight-agents", "chat", "classification"],
  },
  {
    name: "Qwen3.5-4B",
    openrouter: "qwen/qwen-3.5-4b",
    params: "5B",
    context: 32768,
    inputCost: 0.0004,
    outputCost: 0.0004,
    speed: "⚡⚡",
    useCases: ["general-purpose", "document-analysis", "summarization"],
  },
  {
    name: "Qwen3.5-9B",
    openrouter: "qwen/qwen-3.5-9b",
    params: "10B",
    context: 32768,
    inputCost: 0.001,
    outputCost: 0.001,
    speed: "⚡",
    useCases: ["code-generation", "complex-reasoning", "vision"],
  },
  {
    name: "Qwen3.5-27B",
    openrouter: "qwen/qwen-3.5-27b",
    params: "28B",
    context: 32768,
    inputCost: 0.003,
    outputCost: 0.003,
    speed: "medium",
    useCases: ["advanced-reasoning", "research", "code-review"],
  },
  {
    name: "Qwen3.5-35B-A3B",
    openrouter: "qwen/qwen-3.5-35b-a3b",
    params: "36B (MoE)",
    context: 32768,
    inputCost: 0.002,
    outputCost: 0.002,
    speed: "medium",
    useCases: ["production-agents", "autonomous-tasks", "enterprise"],
  },
];

const TASK_TO_USECASE: Record<string, string> = {
  code: "code-generation",
  document: "document-analysis",
  vision: "vision",
  agent: "production-agents",
  chat: "chat",
};

const COMPLEXITY_WEIGHT = {
  low: 0,
  medium: 1,
  high: 2,
};

const args = parseArgs({
  options: {
    task: { type: "string", short: "t" },
    complexity: { type: "string", short: "c", default: "medium" },
    budget: { type: "string", short: "b" },
    json: { type: "boolean", default: false },
  },
  strict: false,
});

function selectModel(
  task?: string,
  complexity: string = "medium",
  budget?: number
): ModelInfo {
  const useCase = task ? TASK_TO_USECASE[task] : undefined;
  const compLevel = COMPLEXITY_WEIGHT[complexity as keyof typeof COMPLEXITY_WEIGHT] || 1;
  
  // Filter by use case if specified
  let candidates = useCase
    ? MODELS.filter((m) => m.useCases.includes(useCase))
    : MODELS;
  
  // Filter by budget if specified
  if (budget !== undefined) {
    const maxCost = budget / 100; // Convert cents to dollars
    candidates = candidates.filter(
      (m) => m.inputCost <= maxCost && m.outputCost <= maxCost
    );
  }
  
  // Select based on complexity
  if (compLevel === 0) {
    // Low complexity: prefer smallest/fastest
    return candidates[0];
  } else if (compLevel === 2) {
    // High complexity: prefer largest capable
    return candidates[candidates.length - 1];
  } else {
    // Medium: prefer middle option
    const midIndex = Math.floor(candidates.length / 2);
    return candidates[midIndex];
  }
}

function main() {
  const task = args.values.task;
  const complexity = args.values.complexity || "medium";
  const budget = args.values.budget ? parseFloat(args.values.budget) : undefined;
  
  const model = selectModel(task, complexity, budget);
  
  if (args.values.json) {
    console.log(JSON.stringify(model, null, 2));
  } else {
    console.log(`\n🎯 Recommended Model: ${model.name}\n`);
    console.log(`   OpenRouter: ${model.openrouter}`);
    console.log(`   Parameters: ${model.params}`);
    console.log(`   Context: ${model.context} tokens`);
    console.log(`   Speed: ${model.speed}`);
    console.log(`   Cost: $${model.inputCost}/1K input, $${model.outputCost}/1K output`);
    console.log(`\n   Use Cases: ${model.useCases.join(", ")}\n`);
  }
}

main();
