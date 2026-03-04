#!/usr/bin/env bun
/**
 * Qwen Tentacles Orchestrator
 * Coordinates multiple agents with persistent memory for autonomous execution
 */

import { parseArgs } from "util";

const PERSISTENT_MEMORY_DIR = "/home/workspace/persistent-agent-memory";
const AGENT_ORCHESTRATOR_DIR = "/home/workspace/agent-orchestrator";

interface Task {
  id: string;
  description: string;
  priority: "low" | "medium" | "high";
  assignedAgent?: string;
  status: "pending" | "in_progress" | "complete" | "failed";
}

interface AgentConfig {
  id: string;
  role: "router" | "worker" | "scanner";
  model: string;
  brainFiles: string[];
}

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  "qwen-router": {
    id: "qwen-router",
    role: "router",
    model: "Qwen/Qwen3.5-4B",
    brainFiles: ["intel-feed.json", "agent-handoffs.json"],
  },
  "qwen-worker": {
    id: "qwen-worker",
    role: "worker",
    model: "Qwen/Qwen3.5-27B",
    brainFiles: ["agent-handoffs.json", "content-vault.json"],
  },
  "qwen-scanner": {
    id: "qwen-scanner",
    role: "scanner",
    model: "Qwen/Qwen3.5-9B",
    brainFiles: ["intel-feed.json", "content-vault.json"],
  },
};

async function bootAgent(agentId: string): Promise<string> {
  const config = AGENT_CONFIGS[agentId];
  if (!config) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  const proc = Bun.spawn([
    "python3",
    `${PERSISTENT_MEMORY_DIR}/scripts/boot_agent.py`,
    "--agent-id",
    agentId,
  ]);

  const output = await new Response(proc.stdout).text();
  await proc.exited;
  
  return output;
}

async function writeMemory(
  agentId: string,
  entry: string
): Promise<void> {
  const proc = Bun.spawn([
    "python3",
    `${PERSISTENT_MEMORY_DIR}/scripts/write_agent_memory.py`,
    "--agent-id",
    agentId,
    "--entry",
    entry,
  ]);

  await proc.exited;
}

async function spawnOrchestratorAgent(
  project: string,
  instructions: string
): Promise<string> {
  const proc = Bun.spawn([
    "node",
    `${AGENT_ORCHESTRATOR_DIR}/packages/cli/dist/index.js`,
    "spawn",
    project,
    instructions,
  ]);

  const output = await new Response(proc.stdout).text();
  await proc.exited;
  
  return output;
}

async function getOrchestratorStatus(): Promise<string> {
  const proc = Bun.spawn([
    "node",
    `${AGENT_ORCHESTRATOR_DIR}/packages/cli/dist/index.js`,
    "status",
  ]);

  const output = await new Response(proc.stdout).text();
  await proc.exited;
  
  return output;
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      agent: {
        type: "string",
        short: "a",
        default: "qwen-router",
      },
      project: {
        type: "string",
        short: "p",
        default: "default",
      },
      task: {
        type: "string",
        short: "t",
      },
      boot: {
        type: "boolean",
        short: "b",
        default: false,
      },
      status: {
        type: "boolean",
        short: "s",
        default: false,
      },
      help: {
        type: "boolean",
        short: "h",
        default: false,
      },
    },
    strict: true,
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Qwen Tentacles Orchestrator

Usage:
  orchestrate.ts --boot --agent <agent-id>
  orchestrate.ts --task "description" --project <name>
  orchestrate.ts --status

Options:
  -a, --agent <id>      Agent to boot (default: qwen-router)
  -p, --project <name> Project name for spawning
  -t, --task <desc>     Task description to spawn
  -b, --boot            Boot agent with context
  -s, --status          Get orchestrator status
  -h, --help            Show this help

Agent Types:
  qwen-router   Fast decision-making (4B)
  qwen-worker   Complex reasoning (27B)
  qwen-scanner  Balanced analysis (9B)

Examples:
  orchestrate.ts --boot --agent qwen-router
  orchestrate.ts --task "Fix auth bug" --project my-app
  orchestrate.ts --status
`);
    process.exit(0);
  }

  if (values.status) {
    const status = await getOrchestratorStatus();
    console.log(status);
    process.exit(0);
  }

  if (values.boot) {
    console.log(`Booting agent: ${values.agent}`);
    const context = await bootAgent(values.agent);
    console.log(context);
    process.exit(0);
  }

  if (values.task) {
    console.log(`Spawning task: ${values.task}`);
    console.log(`Project: ${values.project}`);
    const result = await spawnOrchestratorAgent(values.project, values.task);
    console.log(result);
    process.exit(0);
  }

  console.log("No action specified. Use --help for usage.");
}

main().catch(console.error);
