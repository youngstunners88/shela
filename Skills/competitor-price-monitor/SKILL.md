---
name: competitor-price-monitor
description: Monitor competitor pricing, promotions, and market positioning for strategic intelligence. Provides autonomous monitoring across iHhashi (delivery) and Boober (taxi) markets, with integration to opportunity team for leverage analysis.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
  version: "2.0.0"
  markets:
    - delivery
    - taxi
  competitors:
    delivery:
      south_africa:
        - Uber Eats
        - Bolt Food
        - Mr D
        - Checkers Sixty60
    taxi:
      south_africa:
        - Uber
        - Bolt
        - inDriver
---

# Competitor Price Monitor

Autonomous competitor monitoring for iHhashi (delivery) and Boober (taxi) markets in South Africa.

## Quick Start

```bash
# Run full monitor scan
cd /home/workspace/Skills/competitor-price-monitor
bun scripts/run-monitor.ts

# Generate daily briefing
bun scripts/reporter.ts daily

# Run intelligence queries
bun scripts/intelligence.ts list
bun scripts/intelligence.ts ihhashi-opportunities
```

## Phase 2: Intelligence & Reporting

### Intelligence Queries

Analyze competitor data with targeted queries:

```bash
# List all available queries
bun scripts/intelligence.ts list

# Run specific query
bun scripts/intelligence.ts cheapest-delivery
bun scripts/intelligence.ts surge-patterns
bun scripts/intelligence.ts ihhashi-opportunities
bun scripts/intelligence.ts boober-opportunities

# Run all queries
bun scripts/intelligence.ts all
```

**Available Queries:**

| Query | Description |
|-------|-------------|
| `cheapest-delivery` | Which competitor has lowest delivery fees |
| `surge-patterns` | When competitors apply surge pricing |
| `active-promotions` | Current promotional offers |
| `market-gaps` | Unmet needs in the market |
| `ihhashi-opportunities` | Strategic opportunities for iHhashi |
| `boober-opportunities` | Strategic opportunities for Boober |
| `price-trends` | Historical price changes |
| `competitor-activity` | Recent competitor changes summary |

### Shortcut Reporter

Quick summaries for daily/weekly reviews:

```bash
# Daily briefing (default)
bun scripts/reporter.ts daily

# Full daily report
bun scripts/reporter.ts full

# Weekly summary
bun scripts/reporter.ts weekly

# Slack-formatted daily
bun scripts/reporter.ts slack
```

**Report Formats:**

1. **Daily Briefing**: Top insights, alerts, and opportunities for today
2. **Weekly Summary**: 7-day trends, competitor activity patterns
3. **Slack Format**: Compact format for team channels

## Phase 1: Core Monitoring

### Run Monitor

```bash
# Full scan all competitors
bun scripts/run-monitor.ts

# Monitor specific market
bun scripts/run-monitor.ts -- --market delivery
bun scripts/run-monitor.ts -- --market taxi
```

## Integration Points

### Nduna Bot Integration

Add to Nduna bot for automated competitor awareness:

```typescript
import { CompetitorMonitor } from "./competitor-monitor";

// On startup
await monitorCompetitors.startWatching();

// Get alerts for context
const alerts = await getPriceAlerts();
```

### Integration with Opportunity Team

```bash
# Auto-sends to opportunity team for strategic analysis
bun scripts/run-monitor.ts -- --opportunity
```

### Integration with Vault

```bash
# Store insights in vault for long-term memory
bun /home/workspace/Skills/vault-commands/scripts/agent.ts --context
```

## Alert Types

1. **Price Changes**: Competitor changed their base pricing
2. **Promotions**: New promotional offers detected
3. **Surge Patterns**: Surge pricing behavior changes
4. **Market Entry**: New competitor entered market
5. **Feature Launch**: Competitor launched new feature

## Output Formats

### Daily Report

```markdown
# Competitor Price Report - 2026-03-04

## Delivery Market (iHhashi)
- Uber Eats: R25 delivery, surge active
- Bolt Food: R20 delivery, no surge
- Mr D: R15 delivery, new user promo

## Taxi Market (Boober)
- Uber: Base rate unchanged
- Bolt: 10% discount promo active
- inDriver: Bidding model active

## Opportunities
1. Mr D fee increase → iHhashi can highlight free delivery
2. Uber Eats promo ending → Capture customers with retention offer
```

### Intelligence Query Output

```
📊 Query: ihhashi-opportunities
============================================================
Opportunities:
- Uber Eats surge pricing during lunch peak
- Bolt Food limited restaurant selection in Soweto
- Mr D no real-time tracking feature
============================================================
Confidence: high
Sources: report-2026-03-04.md, report-2026-03-03.md
```

## Configuration

Competitors are configured in `references/competitors.json`:

```json
{
  "delivery": {
    "south_africa": [
      {
        "name": "Uber Eats",
        "urls": ["https://www.ubereats.com/za"],
        "monitor": ["pricing", "promotions", "delivery_fees"]
      }
    ]
  }
}
```

## Directory Structure

```
competitor-price-monitor/
├── SKILL.md                 # This file
├── scripts/
│   ├── run-monitor.ts       # Phase 1: Run full monitor
│   ├── intelligence.ts      # Phase 2: Query system
│   └── reporter.ts           # Phase 2: Quick reports
├── references/
│   └── competitors.json      # Competitor configuration
└── reports/                  # Generated reports
    ├── report-YYYY-MM-DD.md
    └── weekly-YYYY-MM-DD.md
```

## Revenue Model

- Basic monitoring: R499/month per market
- Real-time alerts: R999/month
- Strategic intelligence: R1,499/month
