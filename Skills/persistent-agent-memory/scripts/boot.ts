#!/usr/bin/env bun
/**
 * Boot injection - load context for an agent
 */

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "agent-id": { type: "string", short: "a", required: true },
    format: { type: "string", short: "f", default: "text" }
  },
  strict: true
});

const MEMORY_DIR = "/home/workspace/Skills/persistent-agent-memory";
const AGENTS_DIR = `${MEMORY_DIR}/memory/agents`;
const SHARED_BRAIN_DIR = `${MEMORY_DIR}/shared-brain`;
const BRAIN_CONFIG_FILE = `${MEMORY_DIR}/scripts/brain-config.json`;

async function boot() {
  const agentId = values["agent-id"];
  const format = values.format;
  
  const agentDir = `${AGENTS_DIR}/${agentId}`;
  
  // Check if agent exists
  const agentExists = await Bun.file(`${agentDir}/.gitkeep`).exists();
  if (!agentExists) {
    console.error(`Error: Agent '${agentId}' not found. Create it first with create-agent.ts`);
    process.exit(1);
  }
  
  // Load brain config
  let brainConfig: Record<string, string[]> = {};
  try {
    brainConfig = await Bun.file(BRAIN_CONFIG_FILE).json();
  } catch {}
  
  const brainFiles = brainConfig[agentId] || ["agent-handoffs.json"];
  
  // Build context
  let context = `# Boot Context for ${agentId}\n\n`;
  context += `**Loaded at**: ${new Date().toISOString()}\n\n`;
  
  // 1. Agent identity (~125 tokens)
  context += `## Agent Identity\n\n`;
  context += `ID: ${agentId}\n`;
  context += `Brain files: ${brainFiles.join(", ")}\n\n`;
  
  // 2. Last 2 days logs (~500 tokens)
  context += `## Recent Memory (Last 2 Days)\n\n`;
  const dates = [0, 1].map(offset => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().split("T")[0];
  });
  
  for (const date of dates) {
    const logFile = `${agentDir}/${date}.md`;
    if (await Bun.file(logFile).exists()) {
      context += `### ${date}\n\n`;
      const content = await Bun.file(logFile).text();
      context += content + "\n";
    }
  }
  
  // 3. Shared brain files (~750 tokens)
  context += `## Shared Brain\n\n`;
  for (const brainFile of brainFiles) {
    const filePath = `${SHARED_BRAIN_DIR}/${brainFile}`;
    if (await Bun.file(filePath).exists()) {
      context += `### ${brainFile}\n\n`;
      const content = await Bun.file(filePath).json();
      context += "```json\n" + JSON.stringify(content, null, 2) + "\n```\n\n";
    }
  }
  
  if (format === "json") {
    console.log(JSON.stringify({ agentId, context, brainFiles, tokenEstimate: context.length / 4 }));
  } else {
    console.log(context);
    console.log(`\n---\nEstimated tokens: ~${Math.round(context.length / 4)}`);
  }
}

boot();
