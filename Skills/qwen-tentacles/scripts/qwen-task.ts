#!/usr/bin/env bun
/**
 * Qwen3.5 Task Executor
 * Execute tasks using Qwen models via HuggingFace Inference API
 */

import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    model: { type: "string", short: "m", default: "9B" },
    prompt: { type: "string", short: "p" },
    task: { type: "string", short: "t" },
    "max-tokens": { type: "string", default: "2000" },
    temperature: { type: "string", default: "0.7" },
    system: { type: "string", short: "s" },
    json: { type: "boolean", short: "j", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: false,
});

if (values.help) {
  console.log(`
Qwen3.5 Task Executor

Execute tasks using Qwen models via HuggingFace Inference API.

Usage:
  bun qwen-task.ts --prompt "Your prompt here"
  bun qwen-task.ts -m 27B -p "Research topic" -t research
  echo "code here" | bun qwen-task.ts -m 9B -t code

Options:
  -m, --model       Model size: 0.8B, 2B, 4B, 9B, 27B, 35B, 122B, 397B (default: 9B)
  -p, --prompt      The prompt/task
  -t, --task        Task type: research, code, analyze, summarize, translate, think
  --max-tokens      Max tokens to generate (default: 2000)
  --temperature     Temperature 0-1 (default: 0.7)
  -s, --system      System prompt
  -j, --json        Output as JSON
  -h, --help        Show this help

Model Recommendations:
  0.8B - Fast, simple tasks
  2B   - Quick analysis
  4B   - Balanced work
  9B   - Coding, general tasks
  27B  - Research, analysis
  35B  - MoE efficiency (good balance)
  122B - Complex reasoning
  397B - Maximum capability

Setup:
  1. Get API key: https://huggingface.co/settings/tokens
  2. Add to Zo secrets: HUGGINGFACE_API_KEY
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

const TASK_PROMPTS: Record<string, string> = {
  research: "You are a thorough research assistant. Provide detailed, well-structured findings with citations where possible.",
  code: "You are an expert programmer. Write clean, efficient, well-documented code. Include error handling and tests.",
  analyze: "You are a data analyst. Provide insights, patterns, and actionable recommendations.",
  summarize: "You are a concise summarizer. Capture key points in bullet form.",
  translate: "You are a professional translator. Maintain tone, style, and meaning accurately.",
  think: "You are a deep thinker. Reason through problems step by step, considering multiple perspectives.",
};

async function main() {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    console.error("HUGGINGFACE_API_KEY not set. Add it in Settings > Advanced.");
    process.exit(1);
  }
  
  const modelId = MODEL_MAP[values.model || "9B"] || MODEL_MAP["9B"];
  const maxTokens = parseInt(values["max-tokens"] || "2000");
  const temperature = parseFloat(values.temperature || "0.7");
  
  // Get prompt from args or stdin
  let prompt = values.prompt || positionals.join(" ");
  
  if (!prompt) {
    // Try reading from stdin
    const stdin = Bun.stdin;
    if (stdin.isTTY) {
      console.error("No prompt provided. Use --prompt or pipe input.");
      process.exit(1);
    }
    prompt = await new Response(stdin).text();
  }
  
  // Build system prompt
  let systemPrompt = values.system || "";
  if (values.task && TASK_PROMPTS[values.task]) {
    systemPrompt = systemPrompt || TASK_PROMPTS[values.task];
  }
  
  const fullPrompt = systemPrompt 
    ? `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`
    : prompt;
  
  console.error(`Using model: ${modelId}`);
  console.error(`Temperature: ${temperature}, Max tokens: ${maxTokens}`);
  
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
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: maxTokens,
            temperature,
            return_full_text: false,
            do_sample: temperature > 0,
          },
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`API error: ${response.status} - ${error}`);
      
      if (response.status === 503) {
        console.error("Model is loading. Try again in a few moments or use a smaller model.");
      }
      process.exit(1);
    }
    
    const result = await response.json() as Array<{ generated_text: string }>;
    const output = result[0]?.generated_text || "";
    
    if (values.json) {
      console.log(JSON.stringify({
        model: modelId,
        prompt: prompt.slice(0, 200),
        output,
        tokens: output.length, // Rough estimate
      }, null, 2));
    } else {
      console.log(output);
    }
    
  } catch (error) {
    console.error("Request failed:", error);
    process.exit(1);
  }
}

main();
