#!/usr/bin/env bun
/**
 * Send instruction to a running agent
 * 
 * Usage:
 *   bun send-instruction.ts <session> "instruction"
 */

import { $ } from "bun";
import { parseArgs } from "util";

const AO_PATH = "/root/.npm-global/bin/ao";

const args = parseArgs({
  strict: false,
  allowPositionals: true,
});

const session = args.positionals[0];
const instruction = args.positionals[1];

if (!session || !instruction) {
  console.error("Usage: bun send-instruction.ts <session> \"instruction\"");
  console.error("Example: bun send-instruction.ts app-101 \"Run tests first\"");
  process.exit(1);
}

async function main() {
  console.log(`📤 Sending instruction to ${session}...\n`);
  await $`${AO_PATH} send ${session} ${instruction}`;
  console.log("✅ Instruction sent");
}

main().catch((e) => {
  console.error("❌ Failed to send instruction");
  console.error("Is the session running? Check: ao status");
});
