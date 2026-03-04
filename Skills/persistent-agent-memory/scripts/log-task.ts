#!/usr/bin/env bun
/**
 * Log a task completion to agent memory
 * 
 * Usage:
 *   bun log-task.ts --agent-id <id> --task "description" [--findings "what found"] [--decisions "what decided"]
 */

import { parseArgs } from "util";
import { existsSync, appendFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const PAM_DIR = "/home/workspace/persistent-agent-memory";

const args = parseArgs({
  options: {
    "agent-id": { type: "string", short: "a" },
    task: { type: "string", short: "t" },
    findings: { type: "string", short: "f" },
    decisions: { type: "string", short: "d" },
  },
  strict: false,
});

function getTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getTodayFile(agentId: string): string {
  const today = new Date().toISOString().split("T")[0];
  return join(PAM_DIR, "memory", "agents", agentId, `${today}.md`);
}

function main() {
  const agentId = args.values["agent-id"];
  const task = args.values.task;
  const findings = args.values.findings;
  const decisions = args.values.decisions;

  if (!agentId || !task) {
    console.error("Usage: bun log-task.ts --agent-id <id> --task \"description\"");
    console.error("Example: bun log-task.ts --agent-id scanner --task \"Scanned ecosystem\" --findings \"3 new patterns\"");
    process.exit(1);
  }

  // Create memory directory if needed
  const memoryDir = join(PAM_DIR, "memory", "agents", agentId);
  mkdirSync(memoryDir, { recursive: true });

  // Format entry
  const timestamp = getTimestamp();
  const todayFile = getTodayFile(agentId);

  let entry = `\n## [${timestamp}] Task: ${task}\n`;
  
  if (findings) {
    entry += `- Found: ${findings}\n`;
  }
  
  if (decisions) {
    entry += `- Decided: ${decisions}\n`;
  }
  
  entry += `- Status: completed\n`;

  // Append to daily log
  appendFileSync(todayFile, entry);

  console.log(`✅ Logged task for ${agentId}`);
  console.log(`   File: ${todayFile}`);
}

main();
