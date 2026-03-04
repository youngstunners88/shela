#!/usr/bin/env bun
/**
 * Persistent Agent Memory Management CLI
 * Unified interface for the persistent-agent-memory system
 */

import { $ } from "bun";
import { parseArgs } from "node:util";
import { existsSync, mkdirSync, appendFileSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const MEMORY_ROOT = "/home/workspace/persistent-agent-memory";

// Initialize better-sqlite3 if needed
async function ensureDeps() {
  try {
    await $`bun add better-sqlite3`.quiet().cwd(MEMORY_ROOT);
  } catch {
    // Already installed
  }
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getAgentMemoryPath(agentId: string): string {
  return join(MEMORY_ROOT, "memory", "agents", agentId);
}

function getDailyLogPath(agentId: string, date: string = getToday()): string {
  return join(getAgentMemoryPath(agentId), `${date}.md`);
}

function ensureAgentDir(agentId: string) {
  const path = getAgentMemoryPath(agentId);
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

async function initDatabases() {
  console.log("Initializing databases...");
  await $`python3 ${MEMORY_ROOT}/scripts/init_databases.py`.cwd(MEMORY_ROOT);
  console.log("✅ Databases initialized");
}

async function writeMemory(agentId: string, entry: string) {
  ensureAgentDir(agentId);
  const logPath = getDailyLogPath(agentId);
  const timestamp = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const formattedEntry = `\n## [${timestamp}] ${entry}\n`;
  appendFileSync(logPath, formattedEntry);
  console.log(`✅ Written to ${logPath}`);
}

async function bootAgent(agentId: string) {
  // Run Python boot script
  const result = await $`python3 ${MEMORY_ROOT}/scripts/boot_agent.py --agent-id ${agentId}`.cwd(MEMORY_ROOT).quiet().catch(() => null);
  
  // Also load last 2 days of memory
  const today = getToday();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  
  let context = "";
  
  for (const date of [today, yesterday]) {
    const logPath = getDailyLogPath(agentId, date);
    if (existsSync(logPath)) {
      context += readFileSync(logPath, "utf-8") + "\n";
    }
  }
  
  // Load shared brain files
  const brainFiles = ["intel-feed.json", "agent-handoffs.json", "content-vault.json"];
  for (const file of brainFiles) {
    const path = join(MEMORY_ROOT, "shared-brain", file);
    if (existsSync(path)) {
      const content = JSON.parse(readFileSync(path, "utf-8"));
      context += `\n### ${file}\n${JSON.stringify(content, null, 2).slice(0, 2000)}\n`;
    }
  }
  
  console.log(`\n=== Context for ${agentId} ===\n`);
  console.log(context.slice(0, 5000)); // Limit output
  console.log("\n=== End Context ===\n");
}

async function queryKnowledge(searchTerm: string) {
  const dbPath = join(MEMORY_ROOT, "data", "knowledge.db");
  if (!existsSync(dbPath)) {
    console.error("Knowledge database not found. Run 'init' first.");
    return;
  }
  
  const db = new Database(dbPath);
  const results = db.prepare(`
    SELECT * FROM chunks 
    WHERE content LIKE ? 
    ORDER BY created_at DESC 
    LIMIT 10
  `).all(`%${searchTerm}%`);
  
  console.log(`Found ${results.length} results for "${searchTerm}":\n`);
  for (const r of results) {
    console.log(`- ${r.content?.slice(0, 200)}...\n`);
  }
}

async function logRun(agentId: string, task: string, status: string) {
  await $`python3 ${MEMORY_ROOT}/scripts/log_agent_run.py --agent-id ${agentId} --task ${task} --status ${status}`.cwd(MEMORY_ROOT);
  console.log(`✅ Logged run: ${agentId} - ${task} - ${status}`);
}

async function checkStatus() {
  await $`python3 ${MEMORY_ROOT}/scripts/db_status.py`.cwd(MEMORY_ROOT);
}

// CLI
const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    agent: { type: "string", short: "a" },
    entry: { type: "string", short: "e" },
    task: { type: "string", short: "t" },
    status: { type: "string", short: "s" },
    search: { type: "string", short: "q" },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: false,
});

const command = positionals[0];

if (values.help || !command) {
  console.log(`
Persistent Agent Memory CLI

Commands:
  init        Initialize all databases
  write       Write to agent memory
  boot        Load context for an agent
  query       Search knowledge base
  log-run     Log an agent run
  status      Check database status

Options:
  -a, --agent     Agent ID
  -e, --entry     Memory entry text
  -t, --task      Task name (for log-run)
  -s, --status    Status: success/failed (for log-run)
  -q, --search    Search term (for query)
  -h, --help      Show this help

Examples:
  bun manage-memory.ts init
  bun manage-memory.ts write -a zo -e "Completed auth feature"
  bun manage-memory.ts boot -a zo
  bun manage-memory.ts query -q "iHhashi"
  bun manage-memory.ts log-run -a zo -t "research" -s success
  bun manage-memory.ts status
`);
  process.exit(0);
}

async function main() {
  await ensureDeps();
  
  switch (command) {
    case "init":
      await initDatabases();
      break;
    case "write":
      if (!values.agent || !values.entry) {
        console.error("Agent and entry required");
        process.exit(1);
      }
      await writeMemory(values.agent, values.entry);
      break;
    case "boot":
      if (!values.agent) {
        console.error("Agent required");
        process.exit(1);
      }
      await bootAgent(values.agent);
      break;
    case "query":
      if (!values.search) {
        console.error("Search term required");
        process.exit(1);
      }
      await queryKnowledge(values.search);
      break;
    case "log-run":
      if (!values.agent || !values.task || !values.status) {
        console.error("Agent, task, and status required");
        process.exit(1);
      }
      await logRun(values.agent, values.task, values.status);
      break;
    case "status":
      await checkStatus();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch(console.error);
