---
name: strategic-agent-orchestra
description: Fuses Agent Orchestrator with Persistent Memory and Qwen3.5 models for autonomous strategic multi-agent operations. Agents that compound knowledge, coordinate via shared brain, and operate with different model personalities.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
  version: "1.0.0"
---

# Strategic Agent Orchestra

An autonomous multi-agent system that combines:
- **Agent Orchestrator** - Parallel agent execution with git worktrees
- **Persistent Agent Memory** - Stateful agents that compound knowledge
- **Qwen3.5 Models** - Different model sizes for different task types

## Philosophy

Agents that compound instead of reset. Each agent:
1. Loads its memory + relevant shared brain files at boot
2. Works autonomously on its assigned task
3. Writes back learnings to its daily log
4. Updates shared brain for cross-agent coordination

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Strategic Orchestra                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ Scanner │  │ Builder │  │ Tester  │  │ DocGen  │       │
│  │ (0.8B)  │  │ (9B)    │  │ (4B)    │  │ (2B)    │       │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
│       │            │            │            │              │
│       └────────────┼────────────┼────────────┘              │
│                    │            │                           │
│              ┌─────┴────────────┴─────┐                     │
│              │    Shared Brain        │                     │
│              │  (intel, handoffs)     │                     │
│              └────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## Model Selection

Qwen3.5 offers different sizes for different tasks:

| Model | Parameters | Best For |
|-------|------------|----------|
| Qwen3.5-0.8B | 0.9B | Quick scans, classifications, simple tasks |
| Qwen3.5-2B | 2B | Documentation, summaries, light work |
| Qwen3.5-4B | 5B | Testing, validation, medium complexity |
| Qwen3.5-9B | 10B | Building, coding, complex reasoning |
| Qwen3.5-27B | 28B | Architecture, planning, high-stakes decisions |
| Qwen3.5-35B-A3B | 36B | MoE efficiency for varied tasks |
| Qwen3.5-122B-A10B | 125B | MoE for expert-level reasoning |

## Quick Start

### 1. Initialize the orchestra

```bash
bun /home/workspace/Skills/strategic-agent-orchestra/scripts/init.ts
```

### 2. Spawn a strategic agent

```bash
bun /home/workspace/Skills/strategic-agent-orchestra/scripts/spawn.ts \
  --agent-id scanner \
  --model qwen3.5-0.8b \
  --task "Scan codebase for security issues"
```

### 3. Check status

```bash
bun /home/workspace/Skills/strategic-agent-orchestra/scripts/status.ts
```

### 4. Coordinate handoffs

```bash
bun /home/workspace/Skills/strategic-agent-orchestra/scripts/handoff.ts \
  --from scanner \
  --to builder \
  --task "Fix security issues found in auth module"
```

## Agent Types

### Scanner Agent (Qwen3.5-0.8B)
- Fast classification and detection
- Code scanning for patterns
- Quick triage of issues
- Feeds intel to other agents

### Builder Agent (Qwen3.5-9B)
- Code generation and refactoring
- Feature implementation
- Bug fixes with context

### Tester Agent (Qwen3.5-4B)
- Test generation
- Validation logic
- CI/CD integration

### Architect Agent (Qwen3.5-27B)
- System design decisions
- Architecture planning
- High-stakes refactoring

### DocGen Agent (Qwen3.5-2B)
- Documentation generation
- README updates
- Comment writing

## Shared Brain

Agents communicate asynchronously via typed JSON files:

```json
{
  "lastUpdatedBy": "scanner",
  "lastUpdatedAt": "2026-03-03T15:00:00Z",
  "schemaVersion": "1.0",
  "entries": [
    {
      "id": "issue-001",
      "type": "security",
      "severity": "high",
      "file": "auth/login.ts",
      "description": "SQL injection vulnerability",
      "assignedTo": "builder"
    }
  ]
}
```

## CLI Reference

```bash
# Initialize
orchestra init

# Spawn agents
orchestra spawn <agent-id> --model <model> --task <task>

# Send instruction
orchestra send <agent-id> --instruction "Do X"

# Check status
orchestra status

# Create handoff
orchestra handoff --from <agent> --to <agent> --task <task>

# Boot agent (load memory)
orchestra boot <agent-id>
```

## Integration with Agent Orchestrator

This skill extends the Agent Orchestrator by:

1. **Memory Layer** - Each agent gets persistent memory via boot injection
2. **Model Routing** - Routes tasks to appropriate Qwen3.5 models
3. **Shared Brain** - Cross-agent coordination without direct messaging
4. **Write Protocol** - Enforces logging after each task

### Example Workflow

```bash
# 1. Scanner finds issues
orchestra spawn scanner --model qwen3.5-0.8b --task "Scan for TODOs and FIXMEs"

# 2. Scanner logs to shared brain
# shared-brain/intel-feed.json gets updated

# 3. Builder picks up handoff
orchestra handoff --from scanner --to builder --task "Address FIXMEs in auth"

# 4. Builder works with context
# Loads scanner's intel + own memory + assigned task

# 5. Tester validates
orchestra handoff --from builder --to tester --task "Verify auth fixes"
```

## Configuration

Create `orchestra-config.yaml`:

```yaml
agents:
  scanner:
    model: qwen3.5-0.8b
    brain: [intel-feed.json]
    workspace: ~/worktrees/scanner
    
  builder:
    model: qwen3.5-9b
    brain: [agent-handoffs.json, intel-feed.json]
    workspace: ~/worktrees/builder
    
  tester:
    model: qwen3.5-4b
    brain: [agent-handoffs.json]
    workspace: ~/worktrees/tester
    
  architect:
    model: qwen3.5-27b
    brain: [intel-feed.json, agent-handoffs.json]
    workspace: ~/worktrees/architect

reactions:
  ci-failed:
    auto: true
    route: tester
  review-requested:
    auto: true
    route: architect
```

## References

- [Agent Orchestrator](/home/workspace/Skills/agent-orchestrator/SKILL.md)
- [Persistent Agent Memory](/home/workspace/Skills/persistent-agent-memory/SKILL.md)
- [Qwen3.5 Models](https://huggingface.co/collections/Qwen/qwen35)