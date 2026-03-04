---
name: persistent-agent-memory
description: A4-layer persistent memory system for stateful multi-agent systems. Provides proactive context injection at boot, enforced write-back after tasks, and cross-agent state sharing via filesystem. Cost: ~1,375 tokens per boot.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
  source: https://github.com/jacklevin74/persistent-agent-memory
  version: "1.0.0"
---

# Persistent Agent Memory

Agents that compound instead of reset. Afile-based architecture for stateful multi-agent systems - no middleware, no central server, just SQLite, flat files, and a boot script.

## The Problem

LLM agents are stateless. Every session starts cold — no memory of prior work, no context from other agents, no operational history. RAG helps but it's reactive: you have to know what to search for. You can't search for what you forgot existed.

## The Solution

4 layers of persistent memory:
1. **SQLite Databases** - Structured storage for knowledge, CRM, analytics, usage, runs
2. **Per-Agent Memory** - Daily markdown logs foreach agent
3. **Shared Brain** - Typed JSON files for cross-agent communication
4. **Boot Injection** - Pre-inference context loading

## Quick Start

### 1. Initialize databases

```bash
bun /home/workspace/Skills/persistent-agent-memory/scripts/init.ts
```

Creates 5 SQLite databases:
- `knowledge.db` - Agent-contributed facts
- `crm.db` - Contact tracking
- `social_analytics.db` - Post performance
- `llm_usage.db` - Token and cost tracking
- `agent_runs.db` - Execution history

### 2. Create an agent

```bash
bun /home/workspace/Skills/persistent-agent-memory/scripts/create-agent.ts --id my-agent
```

### 3. Log after every task

```bash
bun /home/workspace/Skills/persistent-agent-memory/scripts/write-memory.ts \
  --agent-id my-agent \
  --entry "Did X, found Y, decided Z"
```

### 4. Boot before every session

```bash
bun /home/workspace/Skills/persistent-agent-memory/scripts/boot.ts --agent-id my-agent
```

Outputs context to load into your agent (~1,375 tokens).

### 5. Check status

```bash
bun /home/workspace/Skills/persistent-agent-memory/scripts/status.ts
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Layer 4: Boot Injection             │
│         boot.ts → pre-inference context           │
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

### Layer 1: Databases

| Database | Purpose |
|----------|---------|
| `knowledge.db` | Agent-contributed facts, semantic retrieval |
| `crm.db` | Contact tracking across channels |
| `social_analytics.db` | Post performance tracking |
| `llm_usage.db` | Per-agent token and cost tracking |
| `agent_runs.db` | Execution history for cron jobs and subagents |

### Layer 2: Per-Agent Memory

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
```markdown
## [14:30] Task: Scanned X for ecosystem intel
- Found 33 tweets across 6 queries
- Updated shared-brain/intel-feed.json
- No high-signal finds, routine scan
```

### Layer 3: Shared Brain

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

### Layer 4: Boot Injection

Configure which shared-brain files each agent loads:

```typescript
const AGENT_BRAIN_MAP = {
  "agent-alpha": ["intel-feed.json", "agent-handoffs.json"],
  "agent-beta": ["agent-handoffs.json", "outreach-log.json"],
  "scanner": ["intel-feed.json", "content-vault.json"],
}
```

Token overhead:
| Component | Tokens |
|-----------|--------|
| Agent identity | ~125 |
| Last 2 days logs | ~500 |
| Shared brain (2-3 files) | ~750 |
| **Total** | **~1,375** |

At $3/M tokens: **~$0.004 per boot**

## Write Protocol

Add to your agent's system instructions:

```
After every meaningful task:
1. Append to your daily agent log (write-memory.ts)
2. Update relevant shared-brain JSON if cross-agent value
3. If handing off to another agent → append to agent-handoffs.json
```

## Comparison

| Approach | Proactive? | Infrastructure | Local-first? |
|----------|-----------|----------------|-------------|
| **This architecture** | ✅ Boot injection | None (files + SQLite) | ✅ |
| RAG only | ❌ Reactive | Vector DB | Depends |
| MemGPT / Letta | ✅ | Middleware server | ❌ |
| Pinecone / Weaviate | ❌ Reactive | Cloud service | ❌ |
| Read entire workspace | ✅ | None | ✅ (expensive) |

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `init.ts` | Create all 5 SQLite databases |
| `create-agent.ts` | Create a new agent memory directory |
| `boot.ts` | Load context for an agent |
| `write-memory.ts` | Append to agent's daily log |
| `status.ts` | Health check across all databases |
| `log-knowledge.ts` | Add a knowledge chunk |
| `log-crm.ts` | Add/update a CRM contact |
| `log-social.ts` | Log a social media post |
| `log-run.ts` | Log an agent/cron run |

## References

- [Whitepaper PDF](/home/workspace/Skills/persistent-agent-memory-deps/persistent-agent-memory-whitepaper.pdf)
- [Architecture HTML](/home/workspace/Skills/persistent-agent-memory-deps/architecture.html)
- [Original Repo](https://github.com/jacklevin74/persistent-agent-memory)