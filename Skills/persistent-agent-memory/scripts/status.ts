#!/usr/bin/env bun
/**
 * Health check across all databases and memory
 */

import { Database } from "bun:sqlite";
import { readdir, stat } from "node:fs/promises";

const MEMORY_DIR = "/home/workspace/Skills/persistent-agent-memory";
const DB_DIR = `${MEMORY_DIR}/databases`;
const AGENTS_DIR = `${MEMORY_DIR}/memory/agents`;
const SHARED_BRAIN_DIR = `${MEMORY_DIR}/shared-brain`;

async function status() {
  console.log("Persistent Agent Memory Status\n");
  console.log("=" .repeat(50) + "\n");
  
  // 1. Check databases
  console.log("📦 Databases:\n");
  const dbNames = ["knowledge", "crm", "social_analytics", "llm_usage", "agent_runs"];
  
  for (const name of dbNames) {
    const dbPath = `${DB_DIR}/${name}.db`;
    try {
      const db = new Database(dbPath);
      const result = db.query("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'").get() as { count: number };
      db.close();
      console.log(`   ✓ ${name}.db (${result.count} tables)`);
    } catch {
      console.log(`   ✗ ${name}.db (not initialized)`);
    }
  }
  
  // 2. Check agents
  console.log("\n🤖 Agents:\n");
  try {
    const agents = await readdir(AGENTS_DIR);
    for (const agent of agents) {
      if (agent.startsWith(".")) continue;
      const agentDir = `${AGENTS_DIR}/${agent}`;
      const files = await readdir(agentDir).catch(() => []);
      const logFiles = files.filter(f => f.endsWith(".md"));
      console.log(`   • ${agent} (${logFiles.length} log files)`);
    }
  } catch {
    console.log("   (no agents created yet)");
  }
  
  // 3. Check shared brain
  console.log("\n🧠 Shared Brain:\n");
  try {
    const brainFiles = await readdir(SHARED_BRAIN_DIR);
    for (const file of brainFiles) {
      if (!file.endsWith(".json")) continue;
      const filePath = `${SHARED_BRAIN_DIR}/${file}`;
      const content = await Bun.file(filePath).json();
      const entries = content.entries?.length || 0;
      const lastUpdated = content.lastUpdatedAt || "never";
      console.log(`   • ${file}: ${entries} entries, last updated: ${lastUpdated}`);
    }
  } catch {
    console.log("   (shared brain not initialized)");
  }
  
  console.log("\n" + "=" .repeat(50));
  console.log("\nRun `bun init.ts` to initialize missing components.");
}

status();
