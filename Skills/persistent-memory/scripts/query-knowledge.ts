#!/usr/bin/env bun
/**
 * Query the knowledge base
 */

import { parseArgs } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const MEMORY_ROOT = "/home/workspace/persistent-agent-memory";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    tag: { type: "string", short: "t" },
    limit: { type: "string", short: "l", default: "10" },
    json: { type: "boolean", short: "j", default: false },
  },
});

const searchTerm = positionals[0];

if (!searchTerm && !values.tag) {
  console.log(`
Query the knowledge base.

Usage:
  bun query-knowledge.ts <search term>
  bun query-knowledge.ts --tag <tag>

Options:
  -t, --tag     Filter by tag
  -l, --limit   Max results (default: 10)
  -j, --json    Output as JSON
`);
  process.exit(0);
}

async function main() {
  const dbPath = join(MEMORY_ROOT, "data", "knowledge.db");
  
  if (!existsSync(dbPath)) {
    console.error("Knowledge database not found. Run 'bun manage-memory.ts init' first.");
    process.exit(1);
  }
  
  const db = new Database(dbPath);
  const limit = parseInt(values.limit || "10");
  
  let query = "SELECT * FROM chunks WHERE 1=1";
  const params: string[] = [];
  
  if (searchTerm) {
    query += " AND content LIKE ?";
    params.push(`%${searchTerm}%`);
  }
  
  if (values.tag) {
    query += " AND tags LIKE ?";
    params.push(`%${values.tag}%`);
  }
  
  query += " ORDER BY created_at DESC LIMIT ?";
  
  const results = db.prepare(query).all(...params, limit);
  
  if (values.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`Found ${results.length} results:\n`);
    for (const r of results) {
      console.log(`[${r.id}] ${r.created_at}`);
      console.log(`${(r.content as string)?.slice(0, 300)}...\n`);
    }
  }
}

main().catch(console.error);
