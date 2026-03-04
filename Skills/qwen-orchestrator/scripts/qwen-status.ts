#!/usr/bin/env bun
/**
 * Qwen Status Monitor
 * Monitors all Qwen-powered agents and their progress
 */

import { $ } from 'bun';

const ORCHESTRATOR_CLI = '/home/workspace/agent-orchestrator/packages/cli/dist/index.js';
const MEMORY_PATH = '/home/workspace/persistent-agent-memory';

interface AgentStatus {
  id: string;
  project: string;
  branch: string;
  status: string;
  model?: string;
  lastActivity?: string;
  pr?: number;
  ciStatus?: string;
}

async function getOrchestratorStatus(): Promise<string> {
  try {
    const result = await $`node ${ORCHESTRATOR_CLI} status`.quiet();
    return result.stdout.toString();
  } catch {
    return 'Orchestrator not running or no sessions';
  }
}

async function getMemoryStatus(): Promise<void> {
  console.log('\n📊 Persistent Memory Status\n');
  
  try {
    // Check database sizes
    const dbPath = `${MEMORY_PATH}/data`;
    const dbs = ['knowledge.db', 'crm.db', 'social_analytics.db', 'llm_usage.db', 'agent_runs.db'];
    
    for (const db of dbs) {
      try {
        const stat = await Bun.file(`${dbPath}/${db}`).stat();
        const sizeKB = (stat.size / 1024).toFixed(2);
        console.log(`   ${db}: ${sizeKB} KB`);
      } catch {
        console.log(`   ${db}: not found`);
      }
    }
    
    // Check agent memory directories
    console.log('\n   Agent Memory Logs:');
    const agentsDir = `${MEMORY_PATH}/memory/agents`;
    try {
      const agents = await $`ls -1 ${agentsDir}`.quiet();
      const agentList = agents.stdout.toString().trim().split('\n').filter(Boolean);
      
      for (const agent of agentList) {
        try {
          const logs = await $`ls -1 ${agentsDir}/${agent} | tail -3`.quiet();
          const recentLogs = logs.stdout.toString().trim().split('\n').filter(Boolean);
          console.log(`   - ${agent}: ${recentLogs.length} recent logs`);
        } catch {
          console.log(`   - ${agent}: no logs`);
        }
      }
    } catch {
      console.log('   No agent memory directories');
    }
    
  } catch (err) {
    console.log('   Error reading memory status:', err);
  }
}

async function getLLMUsage(): Promise<void> {
  console.log('\n💰 LLM Usage Summary\n');
  
  const usageDb = `${MEMORY_PATH}/data/llm_usage.db`;
  
  try {
    // Query usage from SQLite
    const result = await $`sqlite3 ${usageDb} "SELECT model, SUM(tokens) as total_tokens, SUM(cost) as total_cost FROM usage GROUP BY model ORDER BY total_cost DESC LIMIT 10"`.quiet();
    console.log(result.stdout.toString() || '   No usage data yet');
  } catch {
    console.log('   Usage database not available');
  }
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Qwen Status Monitor

Usage: bun qwen-status.ts [options]

Options:
  --sessions    Show orchestrator sessions
  --memory      Show persistent memory status
  --usage       Show LLM usage summary
  --all         Show everything (default)
  --help        Show this help
`);
  process.exit(0);
}

const showAll = args.length === 0 || args.includes('--all');
const showSessions = showAll || args.includes('--sessions');
const showMemory = showAll || args.includes('--memory');
const showUsage = showAll || args.includes('--usage');

console.log('\n🤖 Qwen Orchestrator Status\n');

if (showSessions) {
  console.log('📋 Active Sessions\n');
  const status = await getOrchestratorStatus();
  console.log(status);
}

if (showMemory) {
  await getMemoryStatus();
}

if (showUsage) {
  await getLLMUsage();
}

console.log('\n✨ Status check complete\n');
