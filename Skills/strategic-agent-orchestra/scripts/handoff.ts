#!/usr/bin/env bun
/**
 * Create a handoff from one agent to another
 */

import { parseArgs } from "node:util";
import { existsSync } from "node:fs";

const ORCHESTRA_DIR = "/home/workspace/Skills/strategic-agent-orchestra";
const MEMORY_DIR = "/home/workspace/Skills/persistent-agent-memory";

const { values } = parseArgs({
  options: {
    from: { type: "string", short: "f", required: true },
    to: { type: "string", short: "t", required: true },
    task: { type: "string", short: "s", required: true },
    priority: { type: "string", short: "p", default: "normal" },
    data: { type: "string", short: "d", default: "" }
  },
  strict: true
});

async function handoff() {
  const from = values.from;
  const to = values.to;
  const task = values.task;
  const priority = values.priority;
  const data = values.data;
  
  // Load config
  const configPath = `${ORCHESTRA_DIR}/orchestra-config.json`;
  if (!existsSync(configPath)) {
    console.error("Error: Orchestra not initialized. Run init.ts first.");
    process.exit(1);
  }
  
  const config = await Bun.file(configPath).json();
  
  // Validate agents
  if (!config.agents[from]) {
    console.error(`Error: Source agent '${from}' not found in config.`);
    process.exit(1);
  }
  if (!config.agents[to]) {
    console.error(`Error: Target agent '${to}' not found in config.`);
    process.exit(1);
  }
  
  const now = new Date().toISOString();
  const today = now.split("T")[0];
  
  console.log(`\n🤝 Creating Handoff\n`);
  console.log(`   From: ${from} (${config.agents[from].model})`);
  console.log(`   To: ${to} (${config.agents[to].model})`);
  console.log(`   Task: ${task}`);
  console.log(`   Priority: ${priority}`);
  
  // 1. Update source agent's log
  console.log("\n📝 Logging to source agent...\n");
  
  const fromLogPath = `${MEMORY_DIR}/memory/agents/${from}/${today}.md`;
  const time = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
  
  let fromLog = "";
  if (existsSync(fromLogPath)) {
    fromLog = await Bun.file(fromLogPath).text();
  }
  
  fromLog += `\n## [${time}] HANDOFF TO: ${to}\n**Task**: ${task}\n**Priority**: ${priority}\n\n`;
  await Bun.write(fromLogPath, fromLog);
  console.log(`   ✓ Logged handoff in ${from}'s memory`);
  
  // 2. Update agent-handoffs.json
  console.log("\n🧠 Updating shared brain...\n");
  
  const handoffsPath = `${MEMORY_DIR}/shared-brain/agent-handoffs.json`;
  let handoffs: { lastUpdatedBy: string; lastUpdatedAt: string; schemaVersion: string; entries: unknown[] };
  
  if (existsSync(handoffsPath)) {
    handoffs = await Bun.file(handoffsPath).json();
  } else {
    handoffs = { lastUpdatedBy: "system", lastUpdatedAt: now, schemaVersion: "1.0", entries: [] };
  }
  
  const handoffEntry = {
    id: `handoff-${Date.now()}`,
    from,
    to,
    task,
    priority,
    data: data ? JSON.parse(data) : {},
    status: "pending",
    createdAt: now,
    sourceModel: config.agents[from].model,
    targetModel: config.agents[to].model
  };
  
  handoffs.entries.push(handoffEntry);
  handoffs.lastUpdatedBy = from;
  handoffs.lastUpdatedAt = now;
  
  await Bun.write(handoffsPath, JSON.stringify(handoffs, null, 2));
  console.log(`   ✓ Updated agent-handoffs.json`);
  
  // 3. Create handoff manifest
  const manifestPath = `${ORCHESTRA_DIR}/handoffs/${handoffEntry.id}.json`;
  await Bun.write(manifestPath, JSON.stringify(handoffEntry, null, 2));
  console.log(`   ✓ Created handoff manifest`);
  
  // 4. Log to target agent's memory
  const toLogPath = `${MEMORY_DIR}/memory/agents/${to}/${today}.md`;
  let toLog = "";
  if (existsSync(toLogPath)) {
    toLog = await Bun.file(toLogPath).text();
  }
  
  toLog += `\n## [${time}] HANDOFF FROM: ${from}\n**Task**: ${task}\n**Priority**: ${priority}\n**Status**: pending\n\n`;
  await Bun.write(toLogPath, toLog);
  console.log(`   ✓ Notified ${to}'s memory`);
  
  console.log("\n" + "=" .repeat(50));
  console.log("\n✅ Handoff created!\n");
  console.log(`Handoff ID: ${handoffEntry.id}`);
  console.log(`\nTarget agent '${to}' will see this handoff when it boots.`);
  console.log(`Brain files will include: ${config.agents[to].brain.join(", ")}`);
}

handoff();
