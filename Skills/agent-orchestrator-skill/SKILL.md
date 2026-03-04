---
name: agent-orchestrator-skill
description: Orchestrate fleets of parallel AI coding agents with Agent Orchestrator. Spawn agents in isolated git worktrees, auto-handle CI failures and review comments, manage PRs from a single dashboard. Use when you need to run multiple coding agents in parallel, automate CI fixes, or manage complex multi-PR workflows.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
---

# Agent Orchestrator Skill

Agent Orchestrator manages fleets of AI coding agents working in parallel on your codebase. Each agent gets its own git worktree, branch, and PR.

## When to Use

- Running multiple coding tasks in parallel
- Automating CI failure fixes
- Managing review comments automatically
- Coordinating multiple PRs across a codebase
- Building self-improving agent systems

## Quick Start

### 1. Initialize a Project

```bash
# From a repo URL (fastest)
/home/workspace/agent-orchestrator/ao start https://github.com/your-org/your-repo

# Or from an existing local repo
cd ~/your-project && /home/workspace/agent-orchestrator/ao init --auto
/home/workspace/agent-orchestrator/ao start
```

### 2. Spawn Agents

```bash
# Spawn an agent for a GitHub issue
/home/workspace/agent-orchestrator/ao spawn my-project 123

# Spawn with ad-hoc task
/home/workspace/agent-orchestrator/ao spawn my-project "Add dark mode support"
```

### 3. Monitor and Control

```bash
# View all sessions
/home/workspace/agent-orchestrator/ao status

# Send instructions to an agent
/home/workspace/agent-orchestrator/ao send <session> "Fix the tests"

# Kill a session
/home/workspace/agent-orchestrator/ao session kill <session>

# Restore a crashed agent
/home/workspace/agent-orchestrator/ao session restore <session>

# Open dashboard
/home/workspace/agent-orchestrator/ao dashboard
```

## Architecture

Agent Orchestrator has 8 swappable plugin slots:

| Slot | Default | Alternatives |
|------|---------|--------------|
| Runtime | tmux | docker, process |
| Agent | claude-code | codex, aider, opencode |
| Workspace | worktree | clone |
| Tracker | github | linear |
| SCM | github | - |
| Notifier | desktop | slack, webhook |
| Terminal | iterm2 | web |
| Lifecycle | core | - |

## Configuration

Configuration is in `agent-orchestrator.yaml`:

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
    escalateAfter: 30m
  approved-and-green:
    auto: false
    action: notify
```

## Reactions

Reactions automate the feedback loop:

- **CI fails** → agent gets logs and fixes it automatically
- **Reviewer requests changes** → agent addresses them
- **PR approved with green CI** → you get notified to merge

## Scripts

### spawn-agents.ts

Spawn multiple agents for parallel work:

```bash
bun /home/workspace/Skills/agent-orchestrator-skill/scripts/spawn-agents.ts --project my-project --issues 123,124,125
```

### check-status.ts

Get detailed status of all running sessions:

```bash
bun /home/workspace/Skills/agent-orchestrator-skill/scripts/check-status.ts
```

### send-batch.ts

Send instructions to multiple agents at once:

```bash
bun /home/workspace/Skills/agent-orchestrator-skill/scripts/send-batch.ts --message "Focus on test coverage"
```

## Dashboard

The web dashboard runs at `http://localhost:3000` when the orchestrator is running. It shows:

- All active sessions
- Agent status and logs
- PR status and CI results
- Review comments
- Notification history

## Prerequisites

- Node.js 20+
- Git 2.25+
- tmux (for default runtime)
- `gh` CLI (for GitHub integration)

## Examples

### Parallel Feature Development

```bash
# Initialize
/home/workspace/agent-orchestrator/ao init --auto

# Spawn agents for different features
/home/workspace/agent-orchestrator/ao spawn my-app "Add user authentication"
/home/workspace/agent-orchestrator/ao spawn my-app "Add payment integration"
/home/workspace/agent-orchestrator/ao spawn my-app "Add admin dashboard"

# Monitor
/home/workspace/agent-orchestrator/ao status
```

### Automated Bug Fixes

```bash
# Spawn agents for GitHub issues
/home/workspace/agent-orchestrator/ao spawn my-app 456  # Bug report
/home/workspace/agent-orchestrator/ao spawn my-app 457  # Another bug

# Agents will:
# 1. Create branches
# 2. Investigate and fix
# 3. Write tests
# 4. Create PRs
# 5. Fix CI failures automatically
# 6. Address review comments
```

## Files

- `scripts/spawn-agents.ts` - Spawn multiple agents
- `scripts/check-status.ts` - Get detailed status
- `scripts/send-batch.ts` - Batch send instructions
