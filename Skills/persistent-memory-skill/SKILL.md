---
name: persistent-memory-skill
description: Persistent Agent Memory for stateful multi-agent systems. A 4-layer architecture with SQLite databases, per-agent memory logs, shared brain JSON files, and boot injection. Use when you need agents to remember context across sessions, share state between agents, or build compound knowledge over time.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
---

# Persistent Agent Memory Skill

Agents that compound instead of reset. A file-based architecture for stateful multi-agent systems with no middleware, no central server - just SQLite, flat files, and boot scripts.

## The Problem

LLM agents are stateless. Every session starts cold - no memory of prior work, no context from other agents, no operational history. RAG helps but it's reactive: you have to know what to search for.

## The Solution

A 4-layer persistent memory system:

1. **Layer 1: Databases** (SQLite) - Structured storage for facts, CRM, analytics, usage, runs
2. **Layer 2: Per-Agent Memory** (Markdown) - Daily logs for each agent
3. **Layer 3: Shared Brain** (JSON) - Cross-agent communication via filesystem
4. **Layer 4: Boot Injection** (Python) - Proactive context loading before inference

Cost: ~1,375 tokens per boot (~$0.004 at $3/M tokens)

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Layer 4: Boot Injection             │
│         boot_agent.py → pre-inference ctx        │
├─────────────────────────────────────────────────┤
│           Layer 3: Shared Brain (JSON)           │
│     Cross-agent state: intel, handoffs, vault    │
├─────────────────────────────────────────────────┤
│        Layer 2: Per-Agent Memory (Markdown)       │
│       memory/agents/{id}/YYYY-MM-DD.md           │
├─────────────────────────────────────────────────┤
│         Layer 1: Structured Storage (SQLite)     │
│   knowledge · crm · analytics · usage · runs     │
└─────────────────────────────────────────────────┘
```

## Databases

| Database | Purpose |
|----------|---------|
| knowledge.db | Agent-contributed facts, semantic retrieval |
| crm.db | Contact tracking across channels |
| social_analytics.db | Post performance tracking |
| llm_usage.db | Per-agent token and cost tracking |
| agent_runs.db | Execution history for cron jobs and subagents |

## Quick Start

### 1. Initialize Databases

```bash
python3 /home/workspace/persistent-agent-memory/scripts/init_databases.py
```

### 2. Create Agent Memory Directory

```bash
mkdir -p /home/workspace/persistent-agent-memory/memory/agents/my-agent
```

### 3. Write After Every Task

```bash
python3 /home/workspace/persistent-agent-memory/scripts/write_agent_memory.py \
  --agent-id my-agent \
  --entry "Did X, found Y, decided Z"
```

### 4. Boot Before Every Session

```bash
python3 /home/workspace/persistent-agent-memory/scripts/boot_agent.py --agent-id my-agent
```

### 5. Check Status

```bash
python3 /home/workspace/persistent-agent-memory/scripts/db_status.py
```

## Per-Agent Memory

Each agent writes a daily markdown log:

```
memory/agents/
  agent-alpha/
    2026-03-01.md
    2026-03-02.md
  agent-beta/
    2026-03-02.md
```

Entry format:

```
## [14:30] Task: Scanned X for ecosystem intel
- Found 33 tweets across 6 queries
- Updated shared-brain/intel-feed.json
- No high-signal finds, routine scan
```

## Shared Brain

Typed JSON files for async cross-agent communication:

```
shared-brain/
  intel-feed.json          # External signal aggregation
  agent-handoffs.json      # Cross-agent task queue
  content-vault.json       # Published content + performance
  outreach-log.json        # Contact tracking
```

Schema convention:

```json
{
  "lastUpdatedBy": "agent-alpha",
  "lastUpdatedAt": "2026-03-02T07:00:00Z",
  "schemaVersion": "1.0",
  "entries": []
}
```

## Boot Injection

The boot script loads relevant context before inference:

```python
AGENT_BRAIN_MAP = {
    "agent-alpha": ["intel-feed.json", "agent-handoffs.json"],
    "agent-beta":  ["agent-handoffs.json", "outreach-log.json"],
    "scanner":     ["intel-feed.json", "content-vault.json"],
}
```

Token overhead:

| Component | Tokens |
|-----------|--------|
| Agent identity | ~125 |
| Last 2 days logs | ~500 |
| Shared brain (2-3 files) | ~750 |
| **Total** | **~1,375** |

## Scripts Reference

| Script | Purpose |
|--------|---------|
| init_databases.py | Create all 5 SQLite databases |
| boot_agent.py | Boot injection - load context for agent |
| write_agent_memory.py | Append to agent's daily log |
| db_status.py | Health check across all databases |
| log_knowledge.py | Add a knowledge chunk |
| log_crm_contact.py | Add/update CRM contact |
| log_social_post.py | Log a social media post |
| log_agent_run.py | Log an agent/cron run |
| sync_llm_usage.py | Sync LLM usage from sessions |

## Integration with Agent Orchestrator

Combine with `agent-orchestrator-skill` for stateful parallel agents:

1. Each spawned agent gets its own memory directory
2. Agents share context via Shared Brain JSON files
3. Boot injection provides proactive context
4. Write protocol ensures state persistence

## Write Protocol

Add to your agent's instructions:

```
After every meaningful task:
1. Append to daily agent log (write_agent_memory.py)
2. Update relevant shared-brain JSON if cross-agent value
3. If handing off → append to agent-handoffs.json
```

## Usage with Zo

```bash
# Initialize memory for a new agent
bun /home/workspace/Skills/persistent-memory-skill/scripts/init-memory.ts --agent-id new-agent

# Log a task completion
bun /home/workspace/Skills/persistent-memory-skill/scripts/log-task.ts \
  --agent-id my-agent \
  --task "Analyzed codebase structure" \
  --findings "Found 3 critical issues, 12 warnings"

# Get boot context for an agent
bun /home/workspace/Skills/persistent-memory-skill/scripts/get-context.ts --agent-id my-agent
```

## Comparison

| Approach | Proactive? | Infrastructure | Local-first? |
|----------|------------|----------------|--------------|
| **This architecture** | ✅ Boot injection | None (files + SQLite) | ✅ |
| RAG only | ❌ Reactive | Vector DB | Depends |
| MemGPT / Letta | ✅ | Middleware server | ❌ |
| Pinecone / Weaviate | ❌ Reactive | Cloud service | ❌ |
| Read entire workspace | ✅ | None | ✅ (expensive) |

## Location

`/home/workspace/persistent-agent-memory/`
