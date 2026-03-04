#!/usr/bin/env bun
/**
 * Qwen Parallel Task Executor
 * Run multiple Qwen tasks in parallel
 */

import { parseArgs } from "node:util";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    tasks: { type: "string", short: "t" },
    output: { type: "string", short: "o" },
    concurrency: { type: "string", short: "c", default: "5" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`
Qwen Parallel Task Executor

Run multiple Qwen tasks concurrently.

Usage:
  bun qwen-parallel.ts --tasks tasks.json
  bun qwen-parallel.ts -t tasks.json -o results.json -c 10

Options:
  -t, --tasks       Path to tasks JSON file
  -o, --output      Path to output JSON file
  -c, --concurrency Max concurrent requests (default: 5)
  -h, --help        Show this help

Tasks JSON format:
  [
    {"id": "1", "prompt": "Task 1", "model": "9B"},
    {"id": "2", "prompt": "Task 2", "model": "27B"},
    {"id": "3", "prompt": "Task 3", "model": "4B", "task": "summarize"}
  ]

Required models in model field: 0.8B, 2B, 4B, 9B, 27B, 35B, 122B, 397B
`);
  process.exit(0);
}

const MODEL_MAP: Record<string, string> = {
  "0.8B": "Qwen/Qwen3.5-0.8B",
  "2B": "Qwen/Qwen3.5-2B",
  "4B": "Qwen/Qwen3.5-4B",
  "9B": "Qwen/Qwen3.5-9B",
  "27B": "Qwen/Qwen3.5-27B",
  "35B": "Qwen/Qwen3.5-35B-A3B",
  "122B": "Qwen/Qwen3.5-122B-A10B",
  "397B": "Qwen/Qwen3.5-397B-A17B",
};

interface Task {
  id: string;
  prompt: string;
  model?: string;
  task?: string;
  max_tokens?: number;
  temperature?: number;
}

async function executeTask(task: Task, apiKey: string): Promise<{ id: string; success: boolean; output?: string; error?: string }> {
  const modelId = MODEL_MAP[task.model || "9B"];
  
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${modelId}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: task.prompt,
          parameters: {
            max_new_tokens: task.max_tokens || 2000,
            temperature: task.temperature || 0.7,
            return_full_text: false,
          },
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      return { id: task.id, success: false, error: `${response.status}: ${error}` };
    }
    
    const result = await response.json() as Array<{ generated_text: string }>;
    return { id: task.id, success: true, output: result[0]?.generated_text || "" };
    
  } catch (error) {
    return { id: task.id, success: false, error: String(error) };
  }
}

async function main() {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    console.error("HUGGINGFACE_API_KEY not set. Add it in Settings > Advanced.");
    process.exit(1);
  }
  
  if (!values.tasks) {
    console.error("Tasks file required. Use --tasks <file>");
    process.exit(1);
  }
  
  const tasksPath = values.tasks;
  if (!existsSync(tasksPath)) {
    console.error(`Tasks file not found: ${tasksPath}`);
    process.exit(1);
  }
  
  const tasks: Task[] = JSON.parse(readFileSync(tasksPath, "utf-8"));
  const concurrency = parseInt(values.concurrency || "5");
  
  console.log(`Running ${tasks.length} tasks with concurrency ${concurrency}...\n`);
  
  const results: Array<{ id: string; success: boolean; output?: string; error?: string }> = [];
  
  // Process in batches
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(task => executeTask(task, apiKey))
    );
    results.push(...batchResults);
    
    // Progress
    const completed = Math.min(i + concurrency, tasks.length);
    console.error(`Progress: ${completed}/${tasks.length}`);
  }
  
  // Output
  const output = results.map((r, i) => ({
    id: r.id,
    prompt: tasks[i]?.prompt?.slice(0, 100),
    success: r.success,
    output: r.output,
    error: r.error,
  }));
  
  if (values.output) {
    writeFileSync(values.output, JSON.stringify(output, null, 2));
    console.log(`\nResults saved to: ${values.output}`);
  } else {
    console.log(JSON.stringify(output, null, 2));
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  console.log(`\nCompleted: ${successful}/${tasks.length} successful`);
}

main().catch(console.error);
