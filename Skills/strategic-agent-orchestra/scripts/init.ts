#!/usr/bin/env bun
/**
 * Initialize the strategic agent orchestra
 * Sets up persistent memory integration with agent orchestrator
 */

import { existsSync } from "node:fs";

const ORCHESTRA_DIR = "/home/workspace/Skills/strategic-agent-orchestra";
const MEMORY_DIR = "/home/workspace/Skills/persistent-agent-memory";
const AO_DIR = "/home/workspace/agent-orchestrator";

const QWEN_MODELS = [
  { id: "qwen3.5-0.8b", name: "Qwen3.5-0.8B", params: "0.9B", use: "Quick scans, classifications" },
  { id: "qwen3.5-2b", name: "Qwen3.5-2B", params: "2B", use: "Documentation, summaries" },
  { id: "qwen3.5-4b", name: "Qwen3.5-4B", params: "5B", use: "Testing, validation" },
  { id: "qwen3.5-9b", name: "Qwen3.5-9B", params: "10B", use: "Building, coding" },
  { id: "qwen3.5-27b", name: "Qwen3.5-27B", params: "28B", use: "Architecture, planning" },
  { id: "qwen3.5-35b-a3b", name: "Qwen3.5-35B-A3B", params: "36B", use: "MoE efficiency" },
  { id: "qwen3.5-122b-a10b", name: "Qwen3.5-122B-A10B", params: "125B", use: "Expert reasoning" }
];

const DEFAULT_AGENTS = [
  { id: "scanner", model: "qwen3.5-0.8b", brain: ["intel-feed.json"], role: "Fast classification and detection" },
  { id: "builder", model: "qwen3.5-9b", brain: ["agent-handoffs.json", "intel-feed.json"], role: "Code generation and implementation" },
  { id: "tester", model: "qwen3.5-4b", brain: ["agent-handoffs.json"], role: "Test generation and validation" },
  { id: "architect", model: "qwen3.5-27b", brain: ["intel-feed.json", "agent-handoffs.json"], role: "System design decisions" },
  { id: "docgen", model: "qwen3.5-2b", brain: ["agent-handoffs.json"], role: "Documentation generation" }
];

async function init() {
  console.log("Initializing Strategic Agent Orchestra...\n");
  
  // 1. Check dependencies
  console.log("1. Checking dependencies...\n");
  
  // Check persistent-agent-memory
  const memoryInit = existsSync(`${MEMORY_DIR}/databases/knowledge.db`);
  if (!memoryInit) {
    console.log("   ⚠ Persistent memory not initialized. Run:");
    console.log("     bun /home/workspace/Skills/persistent-agent-memory/scripts/init.ts");
  } else {
    console.log("   ✓ Persistent memory initialized");
  }
  
  // Check agent-orchestrator
  const aoInstalled = existsSync(AO_DIR);
  if (!aoInstalled) {
    console.log("   ⚠ Agent Orchestrator not installed. Run:");
    console.log("     cd /home/workspace && git clone https://github.com/ComposioHQ/agent-orchestrator.git");
  } else {
    console.log("   ✓ Agent Orchestrator installed");
  }
  
  // 2. Create orchestra config
  console.log("\n2. Creating orchestra configuration...\n");
  
  const config = {
    version: "1.0.0",
    models: Object.fromEntries(QWEN_MODELS.map(m => [m.id, { name: m.name, params: m.params, use: m.use }])),
    agents: Object.fromEntries(DEFAULT_AGENTS.map(a => [a.id, { model: a.model, brain: a.brain, role: a.role }])),
    reactions: {
      "ci-failed": { auto: true, route: "tester" },
      "review-requested": { auto: true, route: "architect" },
      "docs-needed": { auto: true, route: "docgen" }
    }
  };
  
  await Bun.write(`${ORCHESTRA_DIR}/orchestra-config.json`, JSON.stringify(config, null, 2));
  console.log("   ✓ Created orchestra-config.json");
  
  // 3. Create brain config for persistent memory
  console.log("\n3. Creating brain configuration...\n");
  
  const brainConfig = Object.fromEntries(DEFAULT_AGENTS.map(a => [a.id, a.brain]));
  await Bun.write(`${MEMORY_DIR}/scripts/brain-config.json`, JSON.stringify(brainConfig, null, 2));
  console.log("   ✓ Created brain-config.json");
  
  // 4. Create default agents in persistent memory
  console.log("\n4. Creating default agents...\n");
  
  for (const agent of DEFAULT_AGENTS) {
    const agentDir = `${MEMORY_DIR}/memory/agents/${agent.id}`;
    await Bun.write(`${agentDir}/.gitkeep`, "");
    
    const today = new Date().toISOString().split("T")[0];
    const logFile = `${agentDir}/${today}.md`;
    await Bun.write(logFile, `# ${agent.id} - Memory Log\n\nCreated: ${today}\nRole: ${agent.role}\nModel: ${agent.model}\n\n`);
    
    console.log(`   ✓ Created agent: ${agent.id} (${agent.model})`);
  }
  
  // 5. Summary
  console.log("\n" + "=" .repeat(50));
  console.log("\n✅ Strategic Agent Orchestra initialized!\n");
  console.log("Available models:");
  QWEN_MODELS.forEach(m => console.log(`   ${m.id.padEnd(18)} ${m.params.padEnd(6)} - ${m.use}`));
  console.log("\nDefault agents:");
  DEFAULT_AGENTS.forEach(a => console.log(`   ${a.id.padEnd(12)} (${a.model}) - ${a.role}`));
  console.log("\nNext steps:");
  console.log("   1. Spawn an agent: bun spawn.ts --agent-id scanner --task \"Scan for issues\"");
  console.log("   2. Check status: bun status.ts");
}

init();
