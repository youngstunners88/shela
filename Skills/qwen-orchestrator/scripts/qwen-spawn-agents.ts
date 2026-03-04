#!/usr/bin/env bun
/**
 * Qwen Spawn Agents
 * Spawns multiple agents with optimal model assignment based on issue complexity
 */

import { $ } from 'bun';

const ORCHESTRATOR_CLI = '/home/workspace/agent-orchestrator/packages/cli/dist/index.js';

interface Issue {
  number: number;
  title: string;
  body?: string;
}

interface SpawnConfig {
  project: string;
  issues: number[];
  defaultModel?: string;
  dryRun?: boolean;
}

// Model recommendations based on issue title patterns
function getModelForIssue(title: string): string {
  const lower = title.toLowerCase();
  
  if (lower.includes('typo') || lower.includes('docs') || lower.includes('comment')) {
    return 'qwen-3.5-2b';
  }
  if (lower.includes('bug') || lower.includes('fix')) {
    return 'qwen-3.5-4b';
  }
  if (lower.includes('feature') || lower.includes('implement') || lower.includes('add')) {
    return 'qwen-3.5-9b';
  }
  if (lower.includes('refactor') || lower.includes('architecture') || lower.includes('security')) {
    return 'qwen-3.5-27b';
  }
  
  return 'qwen-3.5-4b'; // Default
}

async function fetchIssueDetails(project: string, issueNumber: number): Promise<Issue | null> {
  try {
    const result = await $`gh issue view ${issueNumber} --repo ${project} --json number,title,body`.quiet();
    return JSON.parse(result.stdout.toString());
  } catch {
    return null;
  }
}

async function spawnAgents(config: SpawnConfig): Promise<void> {
  console.log(`\n🚀 Spawning Qwen agents for project: ${config.project}`);
  console.log(`   Issues: ${config.issues.join(', ')}\n`);
  
  for (const issueNum of config.issues) {
    // Fetch issue details
    const issue = await fetchIssueDetails(config.project, issueNum);
    
    if (!issue) {
      console.log(`⚠️  Issue #${issueNum} not found or gh CLI not authenticated`);
      continue;
    }
    
    // Determine optimal model
    const model = config.defaultModel || getModelForIssue(issue.title);
    
    console.log(`\n📋 Issue #${issueNum}: ${issue.title}`);
    console.log(`   Model: ${model}`);
    
    if (config.dryRun) {
      console.log(`   [DRY RUN] Would spawn agent`);
      continue;
    }
    
    // Spawn agent via orchestrator
    try {
      await $`node ${ORCHESTRATOR_CLI} spawn ${config.project} ${issueNum}`.quiet();
      console.log(`   ✅ Agent spawned successfully`);
    } catch (err) {
      console.log(`   ❌ Failed to spawn: ${err}`);
    }
  }
  
  console.log('\n✨ Done!\n');
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Qwen Spawn Agents

Usage: bun qwen-spawn-agents.ts --project owner/repo --issues 101,102,103

Options:
  --project <repo>     GitHub repository (owner/repo format)
  --issues <list>      Comma-separated issue numbers
  --model <model>      Override default model selection
  --dry-run            Show what would be done without spawning
  --help               Show this help

Examples:
  bun qwen-spawn-agents.ts --project myorg/myapp --issues 101,102,103
  bun qwen-spawn-agents.ts --project myorg/myapp --issues 101-105
  bun qwen-spawn-agents.ts --project myorg/myapp --issues 101 --model qwen-3.5-27b
`);
  process.exit(0);
}

// Parse args
let project = '';
let issues: number[] = [];
let defaultModel: string | undefined;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project') {
    project = args[++i];
  } else if (args[i] === '--issues') {
    const issueArg = args[++i];
    issues = issueArg.split(',').flatMap(n => {
      if (n.includes('-')) {
        const [start, end] = n.split('-').map(Number);
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
      }
      return [Number(n)];
    });
  } else if (args[i] === '--model') {
    defaultModel = args[++i];
  } else if (args[i] === '--dry-run') {
    dryRun = true;
  }
}

if (!project || issues.length === 0) {
  console.error('Error: --project and --issues are required');
  process.exit(1);
}

await spawnAgents({ project, issues, defaultModel, dryRun });
