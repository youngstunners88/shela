#!/usr/bin/env bun
/**
 * Append to an agent's daily memory log
 */

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "agent-id": { type: "string", short: "a", required: true },
    entry: { type: "string", short: "e", required: true },
    tags: { type: "string", short: "t", multiple: true, default: [] }
  },
  strict: true
});

const MEMORY_DIR = "/home/workspace/Skills/persistent-agent-memory";
const AGENTS_DIR = `${MEMORY_DIR}/memory/agents`;

async function writeMemory() {
  const agentId = values["agent-id"];
  const entry = values.entry;
  const tags = values.tags;
  
  const today = new Date().toISOString().split("T")[0];
  const time = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
  
  const agentDir = `${AGENTS_DIR}/${agentId}`;
  const logFile = `${agentDir}/${today}.md`;
  
  // Check if agent exists
  const agentExists = await Bun.file(`${agentDir}/.gitkeep`).exists();
  if (!agentExists) {
    console.error(`Error: Agent '${agentId}' not found. Create it first with create-agent.ts`);
    process.exit(1);
  }
  
  // Format entry
  const formattedEntry = tags.length > 0
    ? `## [${time}] ${entry}\n**Tags**: ${tags.join(", ")}\n\n`
    : `## [${time}] ${entry}\n\n`;
  
  // Append to log
  const existingContent = await Bun.file(logFile).exists() 
    ? await Bun.file(logFile).text() 
    : `# ${agentId} - Memory Log\n\nCreated: ${today}\n\n`;
  
  await Bun.write(logFile, existingContent + formattedEntry);
  
  console.log(`✓ Logged entry for ${agentId} at ${time}`);
  console.log(`  File: ${logFile}`);
}

writeMemory();
