#!/usr/bin/env bun
/**
 * Estimate API costs for Qwen models
 * 
 * Usage:
 *   bun estimate-cost.ts --model <name> --input <tokens> --output <tokens>
 * 
 * Options:
 *   --model <name>    Model name (e.g., qwen-3.5-9b)
 *   --input <n>       Input token count
 *   --output <n>      Output token count
 */

import { parseArgs } from "util";

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "qwen-3.5-0.8b": { input: 0.0001, output: 0.0001 },
  "qwen-3.5-2b": { input: 0.0002, output: 0.0002 },
  "qwen-3.5-4b": { input: 0.0004, output: 0.0004 },
  "qwen-3.5-9b": { input: 0.001, output: 0.001 },
  "qwen-3.5-27b": { input: 0.003, output: 0.003 },
  "qwen-3.5-35b-a3b": { input: 0.002, output: 0.002 },
  "qwen-3.5-122b-a10b": { input: 0.01, output: 0.01 },
  "qwen-3.5-397b-a17b": { input: 0.03, output: 0.03 },
};

const args = parseArgs({
  options: {
    model: { type: "string", short: "m", default: "qwen-3.5-9b" },
    input: { type: "string", short: "i", default: "1000" },
    output: { type: "string", short: "o", default: "500" },
  },
  strict: false,
});

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; total: number } {
  const costs = MODEL_COSTS[model] || MODEL_COSTS["qwen-3.5-9b"];
  const inputCost = costs.input * inputTokens / 1000;
  const outputCost = costs.output * outputTokens / 1000;
  return {
    inputCost,
    outputCost,
    total: inputCost + outputCost,
  };
}

function main() {
  const model = args.values.model;
  const inputTokens = parseInt(args.values.input);
  const outputTokens = parseInt(args.values.output);
  
  const result = estimateCost(model, inputTokens, outputTokens);
  
  console.log(`\n💰 Cost Estimate for ${model}\n`);
  console.log(`   Input:  ${inputTokens.toLocaleString()} tokens = $${result.inputCost.toFixed(6)}`);
  console.log(`   Output: ${outputTokens.toLocaleString()} tokens = $${result.outputCost.toFixed(6)}`);
  console.log(`   ─────────────────────────────────────`);
  console.log(`   Total:  $${result.total.toFixed(6)}`);
  console.log(`   Cents:  ${(result.total * 100).toFixed(4)}¢\n`);
}

main();
