#!/usr/bin/env bun
/**
 * Query agent memory
 * 
 * Usage:
 *   bun query-memory.ts --agent-id <id> [--days <n>] [--search "term"]
 */

import { parseArgs } from "util";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const PAM_DIR = "/home/workspace/persistent-agent-memory";

const args = parseArgs({
  options: {
    "agent-id": { type: "string", short: "a" },
    days: { type: "string", short: "d", default: "2" },
    search: { type: "string", short: "s" },
    json: { type: "boolean", default: false },
  },
  strict: false,
});

function getRecentDays(count: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split("T")[0]);
  }
  return days;
}

function main() {
  const agentId = args.values["agent-id"];
  const days = parseInt(args.values.days || "2");
  const search = args.values.search;
  const json = args.values.json;

  if (!agentId) {
    console.error("Usage: bun query-memory.ts --agent-id <id> [--days <n>] [--search \"term\"]");
    console.error("Example: bun query-memory.ts --agent-id scanner --days 7 --search \"ecosystem\"");
    process.exit(1);
  }

  const memoryDir = join(PAM_DIR, "memory", "agents", agentId);

  if (!existsSync(memoryDir)) {
    console.error(`No memory directory found for agent: ${agentId}`);
    console.error(`Path: ${memoryDir}`);
    process.exit(1);
  }

  const recentDays = getRecentDays(days);
  const results: { date: string; content: string; matches?: boolean }[] = [];

  for (const day of recentDays) {
    const filePath = join(memoryDir, `${day}.md`);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf-8");
      
      if (search) {
        if (content.toLowerCase().includes(search.toLowerCase())) {
          results.push({ date: day, content, matches: true });
        }
      } else {
        results.push({ date: day, content });
      }
    }
  }

  if (json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`\n📜 Memory for ${agentId} (last ${days} days)\n`);
    console.log("=".repeat(50));
    
    if (results.length === 0) {
      if (search) {
        console.log(`No entries found matching "${search}"`);
      } else {
        console.log("No memory entries found");
      }
    } else {
      for (const result of results) {
        console.log(`\n📅 ${result.date}`);
        console.log("-".repeat(40));
        console.log(result.content);
      }
    }
    
    console.log("\n");
  }
}

main();
