#!/usr/bin/env bun
/**
 * Spawn a strategic agent with memory and model assignment
 */

import { parseArgs } from "node:util";
import { existsSync } from "node:fs";

const ORCHESTRA_DIR = "/home/workspace/Skills/strategic-agent-orchestra";
const MEMORY_DIR = "/home/workspace/Skills/persistent-agent-memory";

const { values } = parseArgs({
  options: {
    "agent-id": { type: "string", short: "a", required: true },
    model: { type: "string", short: "m", default: "auto" },
    task: { type: "string", short: "t", required: true },
    priority: { type: "string", short: "p", default: "normal" }
  },
  strict: true
});

async function spawn() {
  const agentId = values["agent-id"];
  const model = values.model;
  const task = values.task;
  const priority = values.priority;
  
  // Load config
  const configPath = `${ORCHESTRA_DIR}/orchestra-config.json`;
  if (!existsSync(configPath)) {
    console.error("Error: Orchestra not initialized. Run init.ts first.");
    process.exit(1);
  }
  
  const config = await Bun.file(configPath).json();
  
  // Get agent config or create new
  let agentConfig = config.agents[agentId];
  if (!agentConfig) {
    console.log(`Agent '${agentId}' not in config, creating new agent...`);
    agentConfig = {
      model: model === "auto" ? "qwen3.5-4b" : model,
      brain: ["agent-handoffs.json"],
      role: "Custom agent"
    };
    config.agents[agentId] = agentConfig;
    await Bun.write(configPath, JSON.stringify(config, null, 2));
  }
  
  const selectedModel = model === "auto" ? agentConfig.model : model;
  const modelInfo = config.models[selectedModel] || { name: selectedModel, params: "unknown", use: "custom" };
  
  console.log(`\n🚀 Spawning Agent: ${agentId}`);
  console.log(`   Model: ${modelInfo.name} (${modelInfo.params})`);
  console.log(`   Task: ${task}`);
  console.log(`   Priority: ${priority}`);
  console.log(`   Brain: ${agentConfig.brain.join(", ")}`);
  
  // 1. Boot context (load memory)
  console.log("\n📦 Loading agent memory...");
  
  const agentDir = `${MEMORY_DIR}/memory/agents/${agentId}`;
  const today = new Date().toISOString().split("T")[0];
  const time = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
  
  // Create today's log if not exists
  const logFile = `${agentDir}/${today}.md`;
  if (!existsSync(logFile)) {
    await Bun.write(logFile, `# ${agentId} - Memory Log\n\nCreated: ${today}\nRole: ${agentConfig.role}\nModel: ${agentConfig.model}\n\n`);
  }
  
  // Log task start
  const existingLog = await Bun.file(logFile).text();
  await Bun.write(logFile, existingLog + `\n## [${time}] TASK: ${task}\n**Model**: ${selectedModel}\n**Priority**: ${priority}\n**Status**: started\n\n`);
  
  console.log("   ✓ Memory loaded");
  
  // 2. Load brain files
  console.log("\n🧠 Loading shared brain...");
  
  const brainContext: Record<string, unknown> = {};
  for (const brainFile of agentConfig.brain) {
    const brainPath = `${MEMORY_DIR}/shared-brain/${brainFile}`;
    if (existsSync(brainPath)) {
      brainContext[brainFile] = await Bun.file(brainPath).json();
      console.log(`   ✓ ${brainFile}`);
    }
  }
  
  // 3. Create spawn manifest
  const manifest = {
    agentId,
    model: selectedModel,
    modelInfo,
    task,
    priority,
    brain: agentConfig.brain,
    brainContext,
    spawnedAt: new Date().toISOString(),
    status: "ready"
  };
  
  await Bun.write(`${ORCHESTRA_DIR}/active/${agentId}-manifest.json`, JSON.stringify(manifest, null, 2));
  console.log("\n✓ Created spawn manifest");
  
  // 4. Output context for use
  console.log("\n" + "=" .repeat(50));
  console.log("\n📋 Agent Ready\n");
  console.log("Context loaded:");
  console.log(`   - Agent memory: ${logFile}`);
  console.log(`   - Brain files: ${agentConfig.brain.join(", ")}`);
  console.log(`   - Model: ${modelInfo.name} for ${modelInfo.use}`);
  console.log("\nTo run this agent with the context:");
  console.log(`   Use model: ${selectedModel}`);
  console.log(`   Load context from: ${ORCHESTRA_DIR}/active/${agentId}-manifest.json`);
}

spawn();
