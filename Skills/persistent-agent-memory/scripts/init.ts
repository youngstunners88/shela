#!/usr/bin/env bun
/**
 * Initialize all 5 SQLite databases for persistent agent memory
 */

import { Database } from "bun:sqlite";

const MEMORY_DIR = "/home/workspace/Skills/persistent-agent-memory";
const DB_DIR = `${MEMORY_DIR}/databases`;

const SCHEMAS = {
  knowledge: `
    CREATE TABLE IF NOT EXISTS knowledge (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_knowledge_agent ON knowledge(agent_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge(tags);
  `,
  crm: `
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      phone TEXT,
      platform TEXT,
      platform_id TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_contacts_platform ON contacts(platform, platform_id);
  `,
  social_analytics: `
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      post_id TEXT NOT NULL,
      content TEXT,
      likes INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      posted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform, post_id);
  `,
  llm_usage: `
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      model TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      task TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_usage_agent ON usage(agent_id);
    CREATE INDEX IF NOT EXISTS idx_usage_created ON usage(created_at);
  `,
  agent_runs: `
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      task TEXT,
      status TEXT DEFAULT 'started',
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      duration_ms INTEGER,
      metadata TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_runs_agent ON runs(agent_id);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
  `
};

async function init() {
  // Create databases directory
  await Bun.write(`${DB_DIR}/.gitkeep`, "");
  
  console.log("Initializing persistent agent memory databases...\n");
  
  for (const [name, schema] of Object.entries(SCHEMAS)) {
    const dbPath = `${DB_DIR}/${name}.db`;
    const db = new Database(dbPath);
    db.run(schema);
    db.close();
    console.log(`✓ Created ${name}.db`);
  }
  
  // Create memory directories
  await Bun.write(`${MEMORY_DIR}/memory/agents/.gitkeep`, "");
  await Bun.write(`${MEMORY_DIR}/shared-brain/.gitkeep`, "");
  console.log("\n✓ Created memory/agents directory");
  console.log("✓ Created shared-brain directory");
  
  // Initialize shared-brain JSON files
  const sharedBrainFiles = {
    "intel-feed.json": { lastUpdatedBy: "system", lastUpdatedAt: new Date().toISOString(), schemaVersion: "1.0", entries: [] },
    "agent-handoffs.json": { lastUpdatedBy: "system", lastUpdatedAt: new Date().toISOString(), schemaVersion: "1.0", entries: [] },
    "content-vault.json": { lastUpdatedBy: "system", lastUpdatedAt: new Date().toISOString(), schemaVersion: "1.0", entries: [] },
    "outreach-log.json": { lastUpdatedBy: "system", lastUpdatedAt: new Date().toISOString(), schemaVersion: "1.0", entries: [] }
  };
  
  for (const [filename, content] of Object.entries(sharedBrainFiles)) {
    await Bun.write(`${MEMORY_DIR}/shared-brain/${filename}`, JSON.stringify(content, null, 2));
    console.log(`✓ Created shared-brain/${filename}`);
  }
  
  console.log("\n✅ Persistent agent memory initialized successfully!");
  console.log(`\nDatabases: ${DB_DIR}/`);
  console.log(`Agent memory: ${MEMORY_DIR}/memory/agents/`);
  console.log(`Shared brain: ${MEMORY_DIR}/shared-brain/`);
}

init();