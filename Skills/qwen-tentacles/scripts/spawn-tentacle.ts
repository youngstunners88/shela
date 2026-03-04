#!/usr/bin/env bun
/**
 * Spawn a Qwen Tentacle
 * Create an autonomous Qwen agent for a specific task type
 */

import { parseArgs } from "node:util";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    type: { type: "string", short: "t" },
    task: { type: "string", short: "p" },
    context: { type: "string", short: "c" },
    model: { type: "string", short: "m" },
    output: { type: "string", short: "o" },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: false,
});

if (values.help) {
  console.log(`
Qwen Tentacle Spawner

Spawn an autonomous Qwen agent for specific task types.

Usage:
  bun spawn-tentacle.ts --type research --task "Analyze competitor pricing"
  bun spawn-tentacle.ts -t code -p "Fix the auth bug" -c ./auth.ts
  bun spawn-tentacle.ts -t analyze -p "Review architecture" -c ./docs/

Options:
  -t, --type      Tentacle type: research, code, analyze, summarize, translate, think
  -p, --task      Task description
  -c, --context   Context file or directory
  -m, --model     Override default model
  -o, --output    Output file path
  -h, --help      Show this help

Tentacle Types & Default Models:
  research   → 27B  - Web research, synthesis
  code       → 9B   - Code generation, debugging
  analyze    → 27B  - Data analysis, insights
  summarize  → 4B   - Quick summarization
  translate  → 4B   - Language tasks
  think      → 122B - Deep reasoning
`);
  process.exit(0);
}

const TYPE_CONFIG: Record<string, { model: string; system: string }> = {
  research: {
    model: "27B",
    system: `You are a research specialist. Your job is to thoroughly investigate topics and provide:
- Clear, structured findings
- Key insights and patterns
- Actionable recommendations
- Source citations when possible

Be thorough but concise. Focus on what matters most.`,
  },
  code: {
    model: "9B",
    system: `You are a coding specialist. Your job is to write clean, efficient code.
- Include error handling
- Add comments for complex logic
- Follow best practices
- Provide tests when appropriate

Write production-ready code, not prototypes.`,
  },
  analyze: {
    model: "27B",
    system: `You are a data analysis specialist. Your job is to:
- Identify patterns and trends
- Extract key insights
- Provide actionable recommendations
- Highlight anomalies or concerns

Think critically. Challenge assumptions. Be specific.`,
  },
  summarize: {
    model: "4B",
    system: `You are a summarization specialist. Create concise summaries that:
- Capture key points in bullet form
- Preserve essential details
- Remove redundancy
- Stay under 500 words

Be clear and direct.`,
  },
  translate: {
    model: "4B",
    system: `You are a professional translator. Maintain:
- Original tone and style
- Cultural context
- Precise meaning
- Natural flow in target language

Translate faithfully, not literally.`,
  },
  think: {
    model: "122B",
    system: `You are a deep thinking specialist. Your job is to:
- Reason through problems step by step
- Consider multiple perspectives
- Identify assumptions and biases
- Explore implications and edge cases

Think thoroughly. Don't rush to conclusions.`,
  },
};

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

async function main() {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    console.error("HUGGINGFACE_API_KEY not set. Add it in Settings > Advanced.");
    process.exit(1);
  }
  
  const type = values.type || positionals[0];
  const task = values.task || positionals.slice(1).join(" ");
  
  if (!type || !task) {
    console.error("Type and task required.");
    process.exit(1);
  }
  
  const config = TYPE_CONFIG[type];
  if (!config) {
    console.error(`Unknown type: ${type}. Use: research, code, analyze, summarize, translate, think`);
    process.exit(1);
  }
  
  const modelId = MODEL_MAP[values.model || config.model];
  
  // Load context if provided
  let contextStr = "";
  if (values.context) {
    const ctxPath = values.context;
    if (existsSync(ctxPath)) {
      contextStr = `\n\nContext:\n${readFileSync(ctxPath, "utf-8").slice(0, 10000)}`;
    }
  }
  
  const fullPrompt = `${config.system}${contextStr}\n\nTask: ${task}`;
  
  console.log(`\n🧠 Spawning ${type} tentacle (model: ${modelId})`);
  console.log(`📋 Task: ${task.slice(0, 100)}${task.length > 100 ? "..." : ""}`);
  console.log("");
  
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
            max_new_tokens: 3000,
            temperature: 0.7,
            return_full_text: false,
          },
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`API error: ${response.status} - ${error}`);
      process.exit(1);
    }
    
    const result = await response.json() as Array<{ generated_text: string }>;
    const output = result[0]?.generated_text || "";
    
    if (values.output) {
      writeFileSync(values.output, output);
      console.log(`\n✅ Output saved to: ${values.output}`);
    } else {
      console.log(output);
    }
    
  } catch (error) {
    console.error("Request failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
