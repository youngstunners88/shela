#!/usr/bin/env bun
/**
 * Run Monitor - Entry point for competitor price monitoring
 * 
 * Usage:
 *   bun run-monitor.ts
 *   bun run-monitor.ts -- --market delivery
 *   bun run-monitor.ts -- --market taxi
 */

import { spawn } from "child_process";

const args = process.argv.slice(2);

const proc = spawn("bun", [
  "/home/workspace/Skills/competitor-price-monitor/scripts/monitor.ts",
  "scan",
  ...args
], {
  stdio: "inherit"
});

proc.on("close", (code) => {
  if (code === 0) {
    console.log("\n✅ Monitor scan complete\n");
    console.log("Next steps:");
    console.log("  bun scripts/intelligence.ts all        # Run all intelligence queries");
    console.log("  bun scripts/reporter.ts weekly          # Generate weekly summary");
  }
  process.exit(code || 0);
});
