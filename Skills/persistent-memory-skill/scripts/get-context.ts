#!/usr/bin/env bun
import { parseArgs } from "util";

const MEMORY_BASE = "/home/workspace/persistent-agent-memory";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    "agent-id": { type: "string", short: "a" },
    json: { type: "boolean", short: "j" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
});

if (values.help || !values["agent-id"]) {
  console.log(`
Get boot context for an agent

Usage: get-context.ts [options]

Options:
  -a, --agent-id   Agent identifier (required)
  -j, --json       Output as JSON (default: formatted text)
  -h, --help       Show this help

Examples:
  get-context.ts -a agent-alpha
  get-context.ts -a scanner --json
`);
  process.exit(values.help ? 0 : 1);
}

const agentId = values["agent-id"]!;
const asJson = values.json;

const agentDir = `${MEMORY_BASE}/memory/agents/${agentId}`;
const sharedBrainDir = `${MEMORY_BASE}/shared-brain`;

// Get last 2 days of logs
const logs: string[] = [];
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

for (const date of [today, yesterday]) {
  const dateStr = date.toISOString().split("T")[0];
  const logFile = `${agentDir}/${dateStr}.md`;
  try {
    const content = await Bun.file(logFile).text();
    logs.push(`\n### ${dateStr}\n${content}`);
  } catch {
    // File doesn't exist
  }
}

// Load shared brain files based on agent type
const brainFiles = getBrainFilesForAgent(agentId);
const brainData: Record<string, any> = {};

for (const file of brainFiles) {
  const filePath = `${sharedBrainDir}/${file}`;
  try {
    brainData[file] = await Bun.file(filePath).json();
  } catch {
    // File doesn't exist or not valid JSON
  }
}

// Assemble context
const context = {
  agentId,
  identity: {
    name: agentId,
    description: `Agent: ${agentId}`,
  },
  recentLogs: logs.join("\n"),
  sharedBrain: brainData,
  tokenEstimate: {
    identity: 125,
    logs: logs.join("\n").length / 4, // rough estimate
    sharedBrain: JSON.stringify(brainData).length / 4,
  },
};

if (asJson) {
  console.log(JSON.stringify(context, null, 2));
} else {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`BOOT CONTEXT: ${agentId}`);
  console.log("=".repeat(60));
  
  console.log(`\n📋 Agent Identity`);
  console.log(`   Name: ${agentId}`);
  
  console.log(`\n📝 Recent Logs (last 2 days)`);
  if (logs.length > 0) {
    console.log(logs.join("\n"));
  } else {
    console.log("   No logs found");
  }
  
  console.log(`\n🧠 Shared Brain`);
  for (const [file, data] of Object.entries(brainData)) {
    console.log(`   ${file}: ${JSON.stringify(data).substring(0, 100)}...`);
  }
  
  const totalTokens = context.tokenEstimate.identity + 
    Math.ceil(context.tokenEstimate.logs) + 
    Math.ceil(context.tokenEstimate.sharedBrain);
  console.log(`\n📊 Token Estimate: ~${totalTokens} tokens (~$${(totalTokens * 3 / 1000000).toFixed(6)} at $3/M)`);
  console.log("=".repeat(60));
}

function getBrainFilesForAgent(agentId: string): string[] {
  // Map agents to relevant brain files
  const brainMap: Record<string, string[]> = {
    "agent-alpha": ["intel-feed.json", "agent-handoffs.json"],
    "agent-beta": ["agent-handoffs.json", "outreach-log.json"],
    "scanner": ["intel-feed.json", "content-vault.json"],
    "nduna": ["intel-feed.json", "x1-ecosystem-state.json"],
    "marketing": ["content-vault.json", "social-analytics.json"],
  };
  
  return brainMap[agentId] || ["agent-handoffs.json"];
}
