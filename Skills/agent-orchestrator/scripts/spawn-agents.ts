#!/usr/bin/env bun
/**
 * Agent Orchestrator CLI wrapper for Zo
 * Provides convenient access to agent-orchestrator functionality
 */

import { $ } from "bun";
import { parseArgs } from "node:util";

const AO_PATH = "/home/workspace/agent-orchestrator";

async function runAo(...args: string[]) {
  const result = await $`ao ${args}`.quiet();
  return result.stdout.toString();
}

async function spawnAgents(project: string, issues: number[], options: { prompt?: string }) {
  if (issues.length === 0) {
    console.error("No issues specified");
    process.exit(1);
  }

  if (issues.length === 1) {
    const issue = issues[0];
    if (options.prompt) {
      console.log(`Spawning agent for ${project} with prompt: ${options.prompt}`);
      return runAo("spawn", project, "--prompt", options.prompt);
    }
    console.log(`Spawning agent for ${project} issue #${issue}`);
    return runAo("spawn", project, String(issue));
  }

  console.log(`Spawning ${issues.length} agents for ${project}`);
  return runAo("batch-spawn", project, ...issues.map(String));
}

async function checkStatus(json: boolean) {
  if (json) {
    const result = await $`ao status --json`.quiet().catch(() => null);
    if (result) return result.stdout.toString();
  }
  return runAo("status");
}

async function sendToSession(session: string, message: string) {
  console.log(`Sending to ${session}: ${message}`);
  return runAo("send", session, message);
}

async function killSession(session: string) {
  console.log(`Killing session: ${session}`);
  return runAo("session", "kill", session);
}

async function startProject(projectOrUrl: string) {
  console.log(`Starting orchestrator for: ${projectOrUrl}`);
  return runAo("start", projectOrUrl);
}

async function stopProject(project: string) {
  console.log(`Stopping orchestrator for: ${project}`);
  return runAo("stop", project);
}

// CLI
const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    project: { type: "string", short: "p" },
    issues: { type: "string", short: "i" },
    prompt: { type: "string", short: "m" },
    session: { type: "string", short: "s" },
    json: { type: "boolean", short: "j", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: false,
});

const command = positionals[0];

if (values.help || !command) {
  console.log(`
Agent Orchestrator CLI

Commands:
  spawn       Spawn agent(s) for issues
  status      Check status of all sessions
  send        Send message to a session
  kill        Kill a session
  start       Start orchestrator for a project
  stop        Stop orchestrator for a project

Options:
  -p, --project   Project name
  -i, --issues    Comma-separated issue numbers
  -m, --prompt    Custom prompt (instead of issue)
  -s, --session   Session name
  -j, --json      Output as JSON
  -h, --help      Show this help

Examples:
  bun spawn-agents.ts spawn -p my-app -i 123,456
  bun spawn-agents.ts spawn -p my-app -m "Add dark mode"
  bun spawn-agents.ts status -j
  bun spawn-agents.ts send -s app-123 -m "Focus on tests"
`);
  process.exit(0);
}

async function main() {
  switch (command) {
    case "spawn": {
      const project = values.project;
      if (!project) {
        console.error("Project required. Use -p <project>");
        process.exit(1);
      }
      const issues = values.issues?.split(",").map(Number).filter(Boolean) || [];
      const output = await spawnAgents(project, issues, { prompt: values.prompt });
      console.log(output);
      break;
    }
    case "status": {
      const output = await checkStatus(values.json);
      console.log(output);
      break;
    }
    case "send": {
      const session = values.session;
      const message = positionals.slice(1).join(" ") || values.prompt;
      if (!session || !message) {
        console.error("Session and message required. Use -s <session> -m <message>");
        process.exit(1);
      }
      const output = await sendToSession(session, message);
      console.log(output);
      break;
    }
    case "kill": {
      const session = values.session || positionals[1];
      if (!session) {
        console.error("Session required. Use -s <session>");
        process.exit(1);
      }
      const output = await killSession(session);
      console.log(output);
      break;
    }
    case "start": {
      const target = positionals[1] || values.project;
      if (!target) {
        console.error("Project or URL required");
        process.exit(1);
      }
      const output = await startProject(target);
      console.log(output);
      break;
    }
    case "stop": {
      const project = positionals[1] || values.project;
      if (!project) {
        console.error("Project required");
        process.exit(1);
      }
      const output = await stopProject(project);
      console.log(output);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch(console.error);
