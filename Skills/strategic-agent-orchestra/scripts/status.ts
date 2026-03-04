#!/usr/bin/env bun
/**
 * Check status of all orchestra agents
 */

import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";

const ORCHESTRA_DIR = "/home/workspace/Skills/strategic-agent-orchestra";
const MEMORY_DIR = "/home/workspace/Skills/persistent-agent-memory";

async function status() {
  console.log("\n🎵 Strategic Agent Orchestra Status\n");
  console.log("=" .repeat(50) + "\n");
  
  // 1. Check configuration
  console.log("📋 Configuration:\n");
  const configPath = `${ORCHESTRA_DIR}/orchestra-config.json`;
  
  if (!existsSync(configPath)) {
    console.log("   ⚠ Not initialized. Run: bun init.ts");
    return;
  }
  
  const config = await Bun.file(configPath).json();
  console.log(`   Version: ${config.version}`);
  console.log(`   Models: ${Object.keys(config.models).length} available`);
  console.log(`   Agents: ${Object.keys(config.agents).length} configured`);
  
  // 2. Show configured agents
  console.log("\n🤖 Configured Agents:\n");
  
  for (const [id, agent] of Object.entries(config.agents)) {
    const a = agent as { model: string; brain: string[]; role: string };
    const modelInfo = config.models[a.model] || { name: a.model };
    console.log(`   ${id.padEnd(12)} ${modelInfo.name.padEnd(18)} ${a.role}`);
    console.log(`               Brain: ${a.brain.join(", ")}`);
  }
  
  // 3. Check active agents
  console.log("\n🏃 Active Agents:\n");
  
  const activeDir = `${ORCHESTRA_DIR}/active`;
  if (existsSync(activeDir)) {
    const manifests = await readdir(activeDir).catch(() => []);
    for (const manifest of manifests) {
      if (!manifest.endsWith("-manifest.json")) continue;
      const data = await Bun.file(`${activeDir}/${manifest}`).json();
      console.log(`   ${data.agentId.padEnd(12)} ${data.status} - ${data.task.substring(0, 40)}...`);
      console.log(`               Model: ${data.model}, Priority: ${data.priority}`);
    }
  } else {
    console.log("   (no active agents)");
  }
  
  // 4. Check memory
  console.log("\n💾 Memory Status:\n");
  
  const agentsDir = `${MEMORY_DIR}/memory/agents`;
  if (existsSync(agentsDir)) {
    const agents = await readdir(agentsDir).catch(() => []);
    for (const agent of agents) {
      if (agent.startsWith(".")) continue;
      const agentDir = `${agentsDir}/${agent}`;
      const files = await readdir(agentDir).catch(() => []);
      const logFiles = files.filter(f => f.endsWith(".md"));
      console.log(`   ${agent}: ${logFiles.length} log(s)`);
    }
  }
  
  // 5. Check shared brain
  console.log("\n🧠 Shared Brain:\n");
  
  const brainDir = `${MEMORY_DIR}/shared-brain`;
  if (existsSync(brainDir)) {
    const files = await readdir(brainDir).catch(() => []);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const data = await Bun.file(`${brainDir}/${file}`).json();
      const entries = data.entries?.length || 0;
      const lastUpdate = data.lastUpdatedAt || "never";
      const lastBy = data.lastUpdatedBy || "unknown";
      console.log(`   ${file.padEnd(22)} ${entries} entries (by ${lastBy} at ${lastUpdate.substring(0, 19)})`);
    }
  }
  
  console.log("\n" + "=" .repeat(50));
}

status();
