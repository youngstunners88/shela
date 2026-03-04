---
name: agent-orchestrator
description: Orchestrate parallel AI coding agents with git worktrees, auto CI fixes, and PR management. Spawn multiple agents to work on different issues simultaneously, each in its own isolated branch. Agents auto-fix CI failures and address review comments.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
---

# Agent Orchestrator Skill

Manage fleets of AI coding agents working in parallel on your codebase.

## When to Use

- Multiple issues/tickets need work simultaneously
- CI failures need automatic fixing
- Review comments need addressing
- You want parallel development without conflicts

## Architecture

Each agent gets:
- Its own git worktree (isolated filesystem)
- Its own branch
- Its own PR
- Auto-reactions to CI failures and review comments

## Commands

### Initialize a Project

```bash
# From a repo URL (auto-detects language, package manager, etc.)
ao start https://github.com/your-org/your-repo

# From existing local repo
cd ~/your-project && ao init --auto && ao start
```

### Spawn Agents

```bash
# Spawn agent for a GitHub issue
ao spawn my-project 123

# Spawn multiple agents for multiple issues
ao batch-spawn my-project 123 456 789

# Spawn with ad-hoc task
ao spawn my-project --prompt "Add dark mode to settings page"
```

### Monitor & Control

```bash
ao status                    # Overview of all sessions
ao session ls               # List active sessions
ao send <session> "msg"     # Send instructions to an agent
ao session kill <session>   # Kill a session
ao dashboard                # Open web dashboard
```

## Configuration

Config stored in `agent-orchestrator.yaml`:

```yaml
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

reactions:
  ci-failed:
    auto: true
    action: send-to-agent
  changes-requested:
    auto: true
    action: send-to-agent
```

## Plugin System

8 swappable slots:
- **Runtime**: tmux (default), docker, k8s
- **Agent**: claude-code (default), codex, aider
- **Workspace**: worktree (default), clone
- **Tracker**: github (default), linear
- **SCM**: github
- **Notifier**: desktop (default), slack, webhook
- **Terminal**: iterm2, web
- **Lifecycle**: core

## Scripts

### spawn-agents.ts
Spawn multiple agents in parallel for a list of issues.

```bash
bun scripts/spawn-agents.ts --project my-app --issues 123,456,789
```

### check-status.ts
Get detailed status of all active agents.

```bash
bun scripts/check-status.ts --json
```

### send-bulk.ts
Send the same instruction to multiple agents.

```bash
bun scripts/send-bulk.ts --sessions session1,session2 --message "Focus on tests"
```

## Best Practices

1. **One issue per agent** — keep scope narrow
2. **Check status before spawning** — avoid duplicate work
3. **Use batch-spawn** — handles duplicate detection
4. **Set up reactions** — auto-fix CI, auto-address reviews
5. **Review PRs promptly** — agents wait for human judgment

## Integration with Zo

This skill integrates with:
- **persistent-memory** — agents can log their work
- **qwen-tentacles** — spawn Qwen-powered agents for specific tasks
- **vault-commands** — track agent work in project memory
