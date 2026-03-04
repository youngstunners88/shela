#!/usr/bin/env bun
/**
 * Check status of all agent sessions
 */

import { $ } from "bun";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    json: { type: "boolean", short: "j", default: false },
    verbose: { type: "boolean", short: "v", default: false },
  },
});

async function main() {
  try {
    if (values.json) {
      const result = await $`ao status --json`.quiet();
      console.log(result.stdout.toString());
    } else {
      const result = await $`ao status`.quiet();
      console.log(result.stdout.toString());
    }
  } catch (error) {
    console.error("Failed to get status:", error);
    process.exit(1);
  }
}

main();
