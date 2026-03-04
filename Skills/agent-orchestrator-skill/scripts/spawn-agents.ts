#!/usr/bin/env bun
import { $ } from "bun";
import { parseArgs } from "util";

const AO_PATH = "/home/workspace/agent-orchestrator/ao";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    project: { type: "string", short: "p", default: "" },
    issues: { type: "string", short: "i", default: "" },
    tasks: { type: "string", short: "t", default: "" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
});

if (values.help) {
  console.log(`
Spawn multiple agents in parallel

Usage: spawn-agents.ts [options]

Options:
  -p, --project   Project name (required)
  -i, --issues    Comma-separated GitHub issue numbers
  -t, --tasks     Comma-separated ad-hoc task descriptions
  -h, --help      Show this help

Examples:
  spawn-agents.ts -p my-app -i 123,124,125
  spawn-agents.ts -p my-app -t "Add dark mode,Fix login bug,Update docs"
  spawn-agents.ts -p my-app -i 123 -t "Refactor auth module"
`);
  process.exit(0);
}

if (!values.project) {
  console.error("Error: --project is required");
  process.exit(1);
}

const issues = values.issues
  ? values.issues.split(",").map((s) => s.trim()).filter(Boolean)
  : [];
const tasks = values.tasks
  ? values.tasks.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

if (issues.length === 0 && tasks.length === 0) {
  console.error("Error: Provide --issues or --tasks (or both)");
  process.exit(1);
}

console.log(`Spawning agents for project: ${values.project}`);
console.log(`Issues: ${issues.length}, Tasks: ${tasks.length}`);
console.log("---");

let spawned = 0;

for (const issue of issues) {
  console.log(`Spawning agent for issue #${issue}...`);
  try {
    const result = await $`${AO_PATH} spawn ${values.project} ${issue}`.quiet();
    console.log(`  ✓ Spawned for issue #${issue}`);
    spawned++;
  } catch (e: any) {
    console.error(`  ✗ Failed to spawn for issue #${issue}: ${e.message}`);
  }
}

for (const task of tasks) {
  console.log(`Spawning agent for task: "${task.substring(0, 50)}..."`);
  try {
    const result = await $`${AO_PATH} spawn ${values.project} "${task}"`.quiet();
    console.log(`  ✓ Spawned for task`);
    spawned++;
  } catch (e: any) {
    console.error(`  ✗ Failed to spawn for task: ${e.message}`);
  }
}

console.log("---");
console.log(`Total agents spawned: ${spawned}`);
console.log("\nMonitor with: ao status");
