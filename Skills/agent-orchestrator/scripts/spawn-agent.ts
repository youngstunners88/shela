#!/usr/bin/env bun
/**
 * Spawn an agent for an issue
 * 
 * Usage:
 *   bun spawn-agent.ts <project> <issue> [options]
 * 
 * Options:
 *   --title <text>      Issue title (for ad-hoc tasks)
 *   --priority <level>  Priority (low, medium, high)
 */

import { $ } from "bun";
import { parseArgs } from "util";

const AO_PATH = "/root/.npm-global/bin/ao";

const args = parseArgs({
  options: {
    title: { type: "string", short: "t" },
    priority: { type: "string", short: "p", default: "medium" },
  },
  strict: false,
  allowPositionals: true,
});

const project = args.positionals[0];
const issue = args.positionals[1];

if (!project) {
  console.error("Usage: bun spawn-agent.ts <project> <issue> [--title \"Task title\"]");
  console.error("Example: bun spawn-agent.ts my-app 123");
  console.error("         bun spawn-agent.ts my-app --title \"Add dark mode\"");
  process.exit(1);
}

async function main() {
  const cmd = issue 
    ? `${AO_PATH} spawn ${project} ${issue}`
    : `${AO_PATH} spawn ${project} --title "${args.values.title || 'Ad-hoc task'}"`;
  
  console.log(`🤖 Spawning agent for ${project}${issue ? ` issue ${issue}` : ''}...\n`);
  
  try {
    await $`${AO_PATH} spawn ${project} ${issue || ""}`.quiet();
    console.log("✅ Agent spawned successfully");
    console.log(`\n📊 Check status: ao status`);
    console.log(`🌐 Dashboard: http://localhost:3000`);
  } catch (error) {
    console.error("❌ Failed to spawn agent");
    console.error("Make sure:");
    console.error("  1. agent-orchestrator.yaml exists in project");
    console.error("  2. Dashboard is running: ao start");
    process.exit(1);
  }
}

main();
