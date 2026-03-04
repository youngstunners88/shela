# Competitor Price Monitor Integration Guide

## Overview

This skill provides autonomous competitor monitoring for iHhashi (delivery) and Boober (taxi) markets. It integrates with:

1. **Nduna Bot** - Provides real-time competitor intelligence for customer-facing responses
2. **Opportunity Team** - Feeds strategic opportunities for marketing and business decisions
3. **Vault Commands** - Stores long-term competitive intelligence for pattern analysis

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Competitor Monitor                        │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Scan      │───▶│  Analyze    │───▶│   Alert     │     │
│  │  (monitor)  │    │             │    │  Generate   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                   │           │
│         ▼                  ▼                   ▼           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Nduna     │    │ Opportunity │    │   Vault     │     │
│  │ Integration │    │    Team     │    │  Commands   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Integration Points

### 1. Nduna Bot Integration

Add to Nduna bot initialization:

```typescript
import { getCompetitorContext, generateTalkingPoints } from "./competitor-price-monitor/scripts/nduna-integration";

// On bot startup
const competitorContext = await getCompetitorContext();

// Include in system prompt
const systemPrompt = `
You are Nduna, the iHhashi assistant.

${competitorContext}

// ... rest of prompt
`;

// When responding about pricing
const talkingPoints = generateTalkingPoints("delivery");
```

### 2. Opportunity Team Integration

The opportunity team can analyze competitor intelligence:

```bash
# Run full analysis pipeline
bun /home/workspace/Skills/competitor-price-monitor/scripts/opportunity-integration.ts full

# Get opportunities for a specific market
bun /home/workspace/Skills/competitor-price-monitor/scripts/opportunity-integration.ts get delivery
```

### 3. Autonomous Skill Usage

When working on iHhashi or Boober projects, use this skill autonomously:

```bash
# Quick scan (all markets)
bun /home/workspace/Skills/competitor-price-monitor/scripts/monitor.ts scan

# Focus on delivery market
bun /home/workspace/Skills/competitor-price-monitor/scripts/monitor.ts scan --market delivery

# Continuous monitoring (every 60 minutes)
bun /home/workspace/Skills/competitor-price-monitor/scripts/monitor.ts watch --interval 60
```

## Data Flow

1. **Scan** → Gathers competitor data from web
2. **Analyze** → Detects changes, generates insights
3. **Alert** → Creates actionable opportunities
4. **Integrate** → Pushes to Nduna, Opportunity Team, Vault

## Competitors Tracked

### Delivery Market (iHhashi)
- Uber Eats
- Bolt Food
- Mr D
- Checkers Sixty60
- Woolies Dash
- Pick n Pay asap!

### Taxi Market (Boober)
- Uber
- Bolt
- inDriver
- Taxify

## Alert Types

| Type | Description | Impact |
|------|-------------|--------|
| price_increase | Competitor raised prices | High |
| price_decrease | Competitor lowered prices | Medium |
| promotion | New promotional offer | Medium |
| surge_change | Surge pricing behavior changed | Medium |
| market_entry | New competitor entered market | High |

## Scheduled Agent

To set up continuous monitoring:

```bash
# Create scheduled agent
bun /home/workspace/Skills/competitor-price-monitor/scripts/monitor.ts watch --interval 60
```

Or use Zo's scheduled agents:

1. Go to [Agents](/?t=agents)
2. Create new agent
3. Schedule: `0 * * * *` (hourly)
4. Instruction: `Run competitor price monitor and send opportunities to opportunity team`

## Example Output

```
🔍 COMPETITOR PRICE MONITOR
============================================================

📊 Scanning DELIVERY market...
   Competitors: Uber Eats, Bolt Food, Mr D, Checkers Sixty60, Woolies Dash

   🔄 Uber Eats...
      ✓ 3 insights, 1 alerts
   🔄 Bolt Food...
      ✓ 2 insights, 0 alerts
   🔄 Mr D...
      ✓ 2 insights, 1 alerts

📊 Scanning TAXI market...
   Competitors: Uber, Bolt, inDriver

   🔄 Uber...
      ✓ 3 insights, 1 alerts
   🔄 Bolt...
      ✓ 2 insights, 0 alerts

✅ Report saved: /home/workspace/Boober/competitor-intelligence/report-2026-03-04.md

🔴 ALERTS:
[Mr D] Delivery fee increased by R5
   → iHhashi can highlight free delivery on orders >R100

[Uber] Surge pricing extended to off-peak hours
   → Boober can market predictable pricing
```

## Revenue Model

This skill supports a monetization model:

| Tier | Price (ZAR/month) | Features |
|------|-------------------|----------|
| Basic | R499 | Daily scans, basic reports |
| Real-time | R999 | Hourly scans, real-time alerts |
| Strategic | R1,499 | Full integration, opportunity analysis |

