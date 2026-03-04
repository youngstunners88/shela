#!/usr/bin/env bun
import { parseArgs } from "util";
import { $ } from "bun";

const MEMORY_BASE = "/home/workspace/persistent-agent-memory";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    "agent-id": { type: "string", short: "a" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
});

if (values.help || !values["agent-id"]) {
  console.log(`
Initialize memory for a new agent

Usage: init-memory.ts [options]

Options:
  -a, --agent-id   Agent identifier (required)
  -h, --help       Show this help

Examples:
  init-memory.ts -a agent-alpha
  init-memory.ts --agent-id scanner
`);
  process.exit(values.help ? 0 : 1);
}

const agentId = values["agent-id"]!;
const agentDir = `${MEMORY_BASE}/memory/agents/${agentId}`;

try {
  await $`mkdir -p ${agentDir}`;
  console.log(`✓ Created memory directory: ${agentDir}`);
  
  // Create today's log file
  const today = new Date().toISOString().split("T")[0];
  const logFile = `${agentDir}/${today}.md`;
  
  // Check if file exists
  const exists = await Bun.file(logFile).exists();
  if (!exists) {
    await Bun.write(logFile, `# ${agentId} - ${today}\n\nAgent memory log initialized.\n\n`);
    console.log(`✓ Created log file: ${logFile}`);
  } else {
    console.log(`✓ Log file already exists: ${logFile}`);
  }
  
  // Initialize shared brain entry
  const handoffsFile = `${MEMORY_BASE}/shared-brain/agent-handoffs.json`;
  const handoffs = await Bun.file(handoffsFile).json();
  
  // Add agent to brain map if not exists
  if (!handoffs[agentId]) {
    handoffs[agentId] = {
      lastUpdatedBy: agentId,
      lastUpdatedAt: new Date().toISOString(),
      schemaVersion: "1.0",
      entries: []
    };
    await Bun.write(handoffsFile, JSON.stringify(handoffs, null, 2));
    console.log(`✓ Registered agent in shared brain`);
  }
  
  console.log(`\nAgent ${agentId} memory initialized successfully!`);
  console.log(`\nNext steps:`);
  console.log(`  - Log tasks: write_agent_memory.py --agent-id ${agentId} --entry "..."`);
  console.log(`  - Get context: boot_agent.py --agent-id ${agentId}`);
} catch (e: any) {
  console.error(`✗ Failed to initialize: ${e.message}`);
  process.exit(1);
}
