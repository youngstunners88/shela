#!/usr/bin/env bun
/**
 * Qwen Interactive Chat
 * Start an interactive chat session with a Qwen model
 */

import { parseArgs } from "node:util";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    model: { type: "string", short: "m", default: "9B" },
    system: { type: "string", short: "s" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`
Qwen Interactive Chat

Start an interactive chat session with a Qwen model.

Usage:
  bun qwen-chat.ts -m 27B
  bun qwen-chat.ts --model 9B --system "You are a helpful coding assistant"

Options:
  -m, --model    Model size: 0.8B, 2B, 4B, 9B, 27B, 35B, 122B, 397B (default: 9B)
  -s, --system   System prompt
  -h, --help     Show this help

Commands during chat:
  /clear    Clear conversation history
  /exit     Exit the chat
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

async function main() {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    console.error("HUGGINGFACE_API_KEY not set. Add it in Settings > Advanced.");
    process.exit(1);
  }
  
  const modelId = MODEL_MAP[values.model || "9B"];
  const systemPrompt = values.system || "You are a helpful assistant.";
  
  console.log(`\n🤖 Qwen Chat (${values.model || "9B"})`);
  console.log("Type /exit to quit, /clear to reset history\n");
  
  const rl = readline.createInterface({ input, output });
  const history: string[] = [];
  
  while (true) {
    const userInput = await rl.question("You: ");
    
    if (userInput.trim() === "/exit") {
      console.log("\nGoodbye!");
      rl.close();
      break;
    }
    
    if (userInput.trim() === "/clear") {
      history.length = 0;
      console.log("History cleared.\n");
      continue;
    }
    
    // Build prompt with history
    let prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
    
    for (let i = 0; i < history.length; i += 2) {
      prompt += `<|im_start|>user\n${history[i]}<|im_end|>\n`;
      if (history[i + 1]) {
        prompt += `<|im_start|>assistant\n${history[i + 1]}<|im_end|>\n`;
      }
    }
    
    prompt += `<|im_start|>user\n${userInput}<|im_end|>\n<|im_start|>assistant\n`;
    
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
            inputs: prompt,
            parameters: {
              max_new_tokens: 2000,
              temperature: 0.7,
              return_full_text: false,
            },
          }),
        }
      );
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`Error: ${response.status} - ${error}\n`);
        continue;
      }
      
      const result = await response.json() as Array<{ generated_text: string }>;
      const assistantResponse = result[0]?.generated_text || "";
      
      // Store in history
      history.push(userInput, assistantResponse);
      
      // Keep last 10 exchanges
      if (history.length > 20) {
        history.splice(0, 2);
      }
      
      console.log(`\nQwen: ${assistantResponse}\n`);
      
    } catch (error) {
      console.error("Request failed:", error, "\n");
    }
  }
}

main().catch(console.error);
