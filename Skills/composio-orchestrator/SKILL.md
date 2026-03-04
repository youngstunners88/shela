---
name: composio-orchestrator
description: Spawn and manage parallel AI coding agents using Composio's Agent Orchestrator. Each agent works in its own git worktree, handles CI failures autonomously, and opens PRs. Use when you need to parallelize coding tasks across multiple issues, branches, or PRs.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
  orchestrator_path: /home/workspace/agent-orchestrator
---

# Agent Orchestrator Skill

Composio's Agent Orchestrator manages fleets of AI coding agents working in parallel on your codebase. Each agent gets its own git worktree, branch, and PR.

## When to Use

- Multiple GitHub issues to solve in parallel
- CI failures that need automatic fixing
- Review comments that need addressing
- Batch PR creation across a codebase
- Multi-project agent coordination

## CLI Reference

The orchestrator CLI is available at:
```
/home/workspace/agent-orchestrator/packages/cli/dist/index.js
```

### Core Commands

```bash
# Initialize a project
node /home/workspace/agent-orchestrator/packages/cli/dist/index.js init --auto

# Start orchestrator with dashboard
node /home/workspace/agent-orchestrator/packages/cli/dist/index.js start

# Spawn an agent for an issue
node /home/workspace/agent-orchestrator/packages/cli/dist/index.js spawn <project> <issue-number>

# Spawn multiple agents
node /home/workspace/agent-orchestrator/packages/cli/dist/index.js batch-spawn <project> <issue1> <issue2> <issue3>

# Check status of all sessions
node /home/workspace/agent-orchestrator/packages/cli/dist/index.js status

# Send instructions to a session
node /home/workspace/agent-orchestrator/packages/cli/dist/index.js send <session-id> "Your instruction"

# Kill a session
node /home/workspace/agent-orchestrator/packages/cli/dist/index.js session kill <session-id>

# Open dashboard
node /home/workspace/agent-orchestrator/packages/cli/dist/index.js dashboard
```

### Short Alias

Create an alias for convenience:
```bash
alias ao='node /home/workspace/agent-orchestrator/packages/cli/dist/index.js'
```

## Configuration

The orchestrator uses `agent-orchestrator.yaml` in your project root:

```yaml
port: 3000

defaults:
  runtime: tmux
  agent: claude-code
  workspace: worktree
  notifiers: [desktop]

projects:
  my-app:
    repo: owner/my-app
    path: ~/my-app
    defaultBranch: main
    sessionPrefix: app

reactions:
  ci-failed:
    auto: true
    action: send-to-agent
    retries: 2
  changes-requested:
    auto: true
    action: send-to-agent
  approved-and-green:
    auto: false
    action: notify
```

## Plugin Architecture

The orchestrator supports swappable plugins:

| Slot | Default | Alternatives |
|------|---------|-------------|
| Runtime | tmux | docker, k8s, process |
| Agent | claude-code | codex, aider, opencode |
| Workspace | worktree | clone |
| Tracker | github | linear |
| SCM | github | — |
| Notifier | desktop | slack, composio, webhook |

## Workflow Examples

### 1. Onboard a new repository
```bash
ao start https://github.com/owner/repo
```

### 2. Spawn agents for GitHub issues
```bash
# Single issue
ao spawn my-project 123

# Multiple issues in parallel
ao batch-spawn my-project 101 102 103 104
```

### 3. Check agent status
```bash
ao status
```

### 4. Send follow-up instructions
```bash
ao send session-abc "Also add unit tests for the new function"
```

## Dashboard

The web dashboard runs at `http://localhost:3000` when the orchestrator is started. It provides:
- Real-time session status
- PR and CI integration
- Agent logs and activity
- Manual control buttons

## Prerequisites

- Node.js 20+
- Git 2.25+
- tmux (for default runtime)
- `gh` CLI (for GitHub integration)

## Architecture Reference

- Core types: `/home/workspace/agent-orchestrator/packages/core/src/types.ts`
- Plugin system: Implements interfaces and exports `PluginModule`
- Reactions: Auto-handle CI failures and review comments
- Worktrees: Each agent gets isolated workspace
