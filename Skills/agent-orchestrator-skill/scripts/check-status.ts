#!/usr/bin/env bun
import { $ } from "bun";

const AO_PATH = "/home/workspace/agent-orchestrator/ao";

console.log("Agent Orchestrator Status");
console.log("=".repeat(50));

// Check tmux sessions
console.log("\n📦 Active tmux sessions:");
try {
  const result = await $`tmux list-sessions -F "#{session_name}" 2>/dev/null`.quiet();
  const sessions = result.stdout.toString().trim().split("\n").filter(Boolean);
  if (sessions.length > 0) {
    sessions.forEach(s => console.log(`  - ${s}`));
  } else {
    console.log("  None");
  }
} catch {
  console.log("  None");
}

// Check dashboard port
console.log("\n🌐 Dashboard (port 3000):");
try {
  const portCheck = await $`lsof -i :3000`.quiet();
  const inUse = portCheck.stdout.toString().includes("LISTEN");
  console.log(`  ${inUse ? "✓ Running at http://localhost:3000" : "✗ Not running"}`);
} catch {
  console.log("  ✗ Not running");
}

// Check config files
console.log("\n📁 Configuration:");
try {
  const configs = await $`find /home/workspace -name "agent-orchestrator.yaml" -o -name "*.ao.yaml" 2>/dev/null`.quiet();
  const found = configs.stdout.toString().trim().split("\n").filter(Boolean);
  if (found.length > 0) {
    found.forEach(f => console.log(`  ${f}`));
  } else {
    console.log("  No config files found");
  }
} catch {
  console.log("  No config files found");
}

console.log("\n" + "=".repeat(50));
console.log("Commands:");
console.log("  Start orchestrator:  ao start <repo-url>");
console.log("  Spawn agent:         ao spawn <project> <issue|task>");
console.log("  View sessions:       ao status");
