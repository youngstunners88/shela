---
name: persistent-memory
description: File-based persistent memory system for stateful multi-agent systems. Agents that compound instead of reset. SQLite + flat files + boot injection for proactive context.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
---

# Persistent Agent Memory Skill

Give your agents memory that survives sessions. No middleware, no central server.

## The Problem

LLM agents start cold every session:
- No memory of prior work
- No context from other agents
- No operational history

## The Solution

4-layer memory architecture:
1. **SQLite databases** — structured storage
2. **Per-agent markdown logs** — daily entries
3. **Shared brain JSON** — cross-agent state
4. **Boot injection** — proactive context loading

Cost: ~1,375 tokens per boot (~$0.004)

## Quick Start

```bash
# Initialize all databases
bun scripts/manage-memory.ts init

# Write to agent memory
bun scripts/manage-memory.ts write --agent zo --entry "Completed task X"

# Boot context for an agent
bun scripts/manage-memory.ts boot --agent zo

# Check database status
bun scripts/manage-memory.ts status
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Layer 4: Boot Injection             │
│         boot_agent.py → pre-inference ctx        │
├─────────────────────────────────────────────────┤
│           Layer 3: Shared Brain (JSON)           │
│     Cross-agent state: intel, handoffs, vault    │
├─────────────────────────────────────────────────┤
│        Layer 2: Per-Agent Memory (Markdown)      │
│       memory/agents/{id}/YYYY-MM-DD.md           │
├─────────────────────────────────────────────────┤
│         Layer 1: Structured Storage (SQLite)     │
│   knowledge · crm · analytics · usage · runs     │
└─────────────────────────────────────────────────┘
```

## Databases

| Database | Purpose |
|----------|---------|
| `knowledge.db` | Agent-contributed facts, semantic retrieval |
| `crm.db` | Contact tracking across channels |
| `social_analytics.db` | Post performance tracking |
| `llm_usage.db` | Per-agent token and cost tracking |
| `agent_runs.db` | Execution history |

## Write Protocol

After every meaningful task:
1. Append to daily agent log
2. Update shared-brain JSON if cross-agent value
3. If handing off → append to agent-handoffs.json

## Scripts

### manage-memory.ts

Unified memory management CLI:

```bash
# Initialize
bun scripts/manage-memory.ts init

# Write memory
bun scripts/manage-memory.ts write --agent zo --entry "Task done"

# Boot context
bun scripts/manage-memory.ts boot --agent zo

# Query knowledge
bun scripts/manage-memory.ts query --search "iHhashi"

# Log agent run
bun scripts/manage-memory.ts log-run --agent zo --task "research" --status success

# Check status
bun scripts/manage-memory.ts status
```

### query-knowledge.ts

Search the knowledge base:

```bash
bun scripts/query-knowledge.ts "delivery platform"
bun scripts/query-knowledge.ts --tag architecture
```

### sync-usage.ts

Sync LLM usage from sessions:

```bash
bun scripts/sync-usage.ts --session con_abc123
```

## Integration with Zo

Use this skill when:
- Starting a conversation (load context)
- Ending a conversation (save learnings)
- Multiple agents need to share state
- Tracking long-running project history

## Best Practices

1. **Write immediately** — don't batch memory writes
2. **Be specific** — "Fixed auth bug in login.ts" not "did some work"
3. **Tag entries** — makes retrieval easier
4. **Use shared brain** — for cross-agent coordination
5. **Archive old entries** — keep files under 500KB
