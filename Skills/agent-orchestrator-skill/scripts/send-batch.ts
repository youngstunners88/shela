#!/usr/bin/env bun
import { $ } from "bun";
import { parseArgs } from "util";

const AO_PATH = "/home/workspace/agent-orchestrator/ao";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    message: { type: "string", short: "m", default: "" },
    session: { type: "string", short: "s", default: "all" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
});

if (values.help || !values.message) {
  console.log(`
Send instructions to agents in batch

Usage: send-batch.ts [options]

Options:
  -m, --message   Message to send (required)
  -s, --session   Session ID or "all" (default: all)
  -h, --help      Show this help

Examples:
  send-batch.ts -m "Focus on test coverage"
  send-batch.ts -m "Fix the lint errors" -s agent-1
`);
  process.exit(values.help ? 0 : 1);
}

const message = values.message;
const targetSession = values.session;

// Get active sessions
let sessions: string[] = [];

if (targetSession === "all") {
  try {
    const result = await $`tmux list-sessions -F "#{session_name}" 2>/dev/null`.quiet();
    sessions = result.stdout.toString().trim().split("\n").filter(Boolean);
  } catch {
    console.log("No active tmux sessions found");
    process.exit(1);
  }
} else {
  sessions = [targetSession];
}

if (sessions.length === 0) {
  console.log("No sessions to send to");
  process.exit(0);
}

console.log(`Sending to ${sessions.length} session(s):`);
console.log(`Message: "${message}"`);
console.log("---");

let sent = 0;

for (const session of sessions) {
  console.log(`Sending to ${session}...`);
  try {
    await $`${AO_PATH} send ${session} "${message}"`.quiet();
    console.log(`  ✓ Sent to ${session}`);
    sent++;
  } catch (e: any) {
    console.error(`  ✗ Failed: ${e.message}`);
  }
}

console.log("---");
console.log(`Sent to ${sent}/${sessions.length} sessions`);
