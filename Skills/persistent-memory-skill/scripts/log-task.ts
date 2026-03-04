#!/usr/bin/env bun
import { parseArgs } from "util";

const MEMORY_BASE = "/home/workspace/persistent-agent-memory";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    "agent-id": { type: "string", short: "a" },
    task: { type: "string", short: "t" },
    findings: { type: "string", short: "f", default: "" },
    decisions: { type: "string", short: "d", default: "" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
});

if (values.help || !values["agent-id"] || !values.task) {
  console.log(`
Log a task completion for an agent

Usage: log-task.ts [options]

Options:
  -a, --agent-id    Agent identifier (required)
  -t, --task        Task description (required)
  -f, --findings    Key findings (optional)
  -d, --decisions   Decisions made (optional)
  -h, --help        Show this help

Examples:
  log-task.ts -a agent-alpha -t "Analyzed codebase"
  log-task.ts -a scanner -t "Scanned X" -f "3 issues" -d "flagged for review"
`);
  process.exit(values.help ? 0 : 1);
}

const agentId = values["agent-id"]!;
const task = values.task!;
const findings = values.findings;
const decisions = values.decisions;

const agentDir = `${MEMORY_BASE}/memory/agents/${agentId}`;
const today = new Date().toISOString().split("T")[0];
const logFile = `${agentDir}/${today}.md`;

// Ensure directory exists
await Bun.$`mkdir -p ${agentDir}`.quiet();

const timestamp = new Date().toTimeString().split(" ")[0];
let entry = `## [${timestamp}] Task: ${task}\n`;

if (findings) {
  entry += `- Findings: ${findings}\n`;
}

if (decisions) {
  entry += `- Decisions: ${decisions}\n`;
}

entry += "\n";

// Append to log file
const file = Bun.file(logFile);
const content = await file.exists() ? await file.text() : `# ${agentId} - ${today}\n\n`;
const updated = content + entry;
await Bun.write(logFile, updated);

console.log(`✓ Logged task for ${agentId}`);
console.log(`  Task: ${task}`);
if (findings) console.log(`  Findings: ${findings}`);
if (decisions) console.log(`  Decisions: ${decisions}`);
