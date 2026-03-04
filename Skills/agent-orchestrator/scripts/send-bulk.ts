#!/usr/bin/env bun
/**
 * Send the same instruction to multiple sessions
 */

import { $ } from "bun";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    sessions: { type: "string", short: "s" },
    message: { type: "string", short: "m" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`
Send bulk messages to multiple agent sessions.

Usage:
  bun send-bulk.ts -s session1,session2 -m "Focus on tests"

Options:
  -s, --sessions   Comma-separated session names
  -m, --message    Message to send to all sessions
  -h, --help       Show this help
`);
  process.exit(0);
}

const sessions = values.sessions?.split(",").filter(Boolean) || [];
const message = values.message || positionals.join(" ");

if (sessions.length === 0 || !message) {
  console.error("Sessions and message required");
  process.exit(1);
}

async function sendToSession(session: string, msg: string) {
  try {
    const result = await $`ao send ${session} ${msg}`.quiet();
    return { session, success: true, output: result.stdout.toString() };
  } catch (error) {
    return { session, success: false, error: String(error) };
  }
}

async function main() {
  console.log(`Sending to ${sessions.length} sessions: ${message}\n`);

  const results = await Promise.all(sessions.map(s => sendToSession(s, message)));

  for (const r of results) {
    if (r.success) {
      console.log(`✅ ${r.session}: sent`);
    } else {
      console.log(`❌ ${r.session}: ${r.error}`);
    }
  }
}

main();
