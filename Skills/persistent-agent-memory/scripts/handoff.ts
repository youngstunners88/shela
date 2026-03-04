#!/usr/bin/env bun
/**
 * Create a handoff between agents
 * 
 * Usage:
 *   bun handoff.ts --from <agent> --to <agent> --task "description" [--context "additional context"]
 */

import { parseArgs } from "util";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const PAM_DIR = "/home/workspace/persistent-agent-memory";

const args = parseArgs({
  options: {
    from: { type: "string", short: "f" },
    to: { type: "string", short: "t" },
    task: { type: "string", short: "d" },
    context: { type: "string", short: "c" },
  },
  strict: false,
});

interface Handoff {
  timestamp: string;
  from: string;
  to: string;
  task: string;
  status: string;
  context?: string;
}

interface HandoffsFile {
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  schemaVersion: string;
  entries: Handoff[];
}

function main() {
  const from = args.values.from;
  const to = args.values.to;
  const task = args.values.task;
  const context = args.values.context;

  if (!from || !to || !task) {
    console.error("Usage: bun handoff.ts --from <agent> --to <agent> --task \"description\"");
    console.error("Example: bun handoff.ts --from scanner --to writer --task \"Draft blog post\" --context \"Found 3 key insights\"");
    process.exit(1);
  }

  const handoffsPath = join(PAM_DIR, "shared-brain", "agent-handoffs.json");

  // Load or create file
  let handoffs: HandoffsFile;
  if (existsSync(handoffsPath)) {
    handoffs = JSON.parse(readFileSync(handoffsPath, "utf-8"));
  } else {
    handoffs = {
      lastUpdatedBy: "",
      lastUpdatedAt: "",
      schemaVersion: "1.0",
      entries: [],
    };
  }

  // Add handoff
  const newHandoff: Handoff = {
    timestamp: new Date().toISOString(),
    from,
    to,
    task,
    status: "pending",
    context,
  };

  handoffs.entries.push(newHandoff);
  handoffs.lastUpdatedBy = from;
  handoffs.lastUpdatedAt = new Date().toISOString();

  // Save
  writeFileSync(handoffsPath, JSON.stringify(handoffs, null, 2));

  console.log(`✅ Created handoff from ${from} to ${to}`);
  console.log(`   Task: ${task}`);
  console.log(`   Status: pending`);
  console.log(`   File: ${handoffsPath}`);
}

main();
