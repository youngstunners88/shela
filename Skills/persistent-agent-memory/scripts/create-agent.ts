#!/usr/bin/env bun
/**
 * Create a new agent memory directory
 */

import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    id: { type: "string", short: "i", required: true },
    brain: { type: "string", short: "b", multiple: true, default: [] }
  },
  strict: true
});

const MEMORY_DIR = "/home/workspace/Skills/persistent-agent-memory";
const AGENTS_DIR = `${MEMORY_DIR}/memory/agents`;
const BRAIN_CONFIG_FILE = `${MEMORY_DIR}/scripts/brain-config.json`;

async function createAgent() {
  const agentId = values.id;
  const brainFiles = values.brain;
  
  const agentDir = `${AGENTS_DIR}/${agentId}`;
  
  // Create agent directory
  await Bun.write(`${agentDir}/.gitkeep`, "");
  
  // Create today's log file
  const today = new Date().toISOString().split("T")[0];
  const logFile = `${agentDir}/${today}.md`;
  await Bun.write(logFile, `# ${agentId} - Memory Log\n\nCreated: ${new Date().toISOString()}\n\n`);
  
  // Update brain config
  let brainConfig: Record<string, string[]> = {};
  try {
    brainConfig = await Bun.file(BRAIN_CONFIG_FILE).json();
  } catch {}
  
  if (brainFiles.length > 0) {
    brainConfig[agentId] = brainFiles;
  } else {
    // Default brain files
    brainConfig[agentId] = ["agent-handoffs.json", "intel-feed.json"];
  }
  
  await Bun.write(BRAIN_CONFIG_FILE, JSON.stringify(brainConfig, null, 2));
  
  console.log(`✅ Created agent: ${agentId}`);
  console.log(`   Directory: ${agentDir}`);
  console.log(`   Log file: ${logFile}`);
  console.log(`   Brain files: ${brainConfig[agentId].join(", ")}`);
}

createAgent();
