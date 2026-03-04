---
name: route-intelligence
description: Autonomous route intelligence and competitor price monitoring system. Captures driver knowledge, monitors competitor pricing, and provides strategic insights for delivery/logistics platforms. Works across projects - iHhashi, opportunity teams, and strategic planning.
compatibility: Created for Zo Computer
metadata:
  author: kofi.zo.computer
  version: "1.0.0"
  capabilities:
    - route_memory
    - competitor_monitoring
    - price_intelligence
    - driver_knowledge_capture
    - eta_optimization
allowed-tools: Bash Read Write Edit
---

# Route Intelligence Skill

Autonomous intelligence system that combines driver knowledge capture with competitor price monitoring for strategic advantage.

## Core Capabilities

### 1. Route Memory System
- Passive time tracking (actual vs predicted times)
- Driver feedback collection (shortcuts, road work, unsafe areas)
- Community insight validation
- ETA optimization with learned factors

### 2. Competitor Price Monitoring
- Track competitor pricing in real-time
- Compare delivery fees, surge multipliers, service areas
- Identify pricing gaps and opportunities
- Alert on significant price changes

### 3. Strategic Intelligence
- Market positioning analysis
- Competitive advantage identification
- Opportunity team integration
- Cross-project knowledge sharing

## Commands

### `init`
Initialize the route intelligence system for a project.

```bash
bun scripts/init.ts --project <project-name>
```

### `capture <type>`
Capture intelligence data:
- `route-times` - Submit actual delivery times
- `driver-insight` - Report route knowledge
- `competitor-price` - Log competitor pricing
- `feedback` - Quick driver feedback

```bash
bun scripts/capture.ts route-times --driver drv_123 --route route_456 --expected 900 --actual 1120
bun scripts/capture.ts driver-insight --type shortcut --lat -26.2041 --lng 28.0473 --note "Cut through shopping centre"
bun scripts/capture.ts competitor-price --competitor uber-eats --area sandton --fee 25 --surge 1.5x
```

### `analyze <type>`
Analyze intelligence data:
- `routes` - Get route intelligence for a path
- `competitors` - Analyze competitor positioning
- `opportunities` - Find market gaps
- `etl` - Compare predicted vs actual times

```bash
bun scripts/analyze.ts routes --from -26.2041,28.0473 --to -26.1951,28.0553
bun scripts/analyze.ts competitors --area sandton --category food-delivery
bun scripts/analyze.ts opportunities --region johannesburg
```

### `monitor <action>`
Competitor monitoring actions:
- `start` - Begin monitoring a competitor
- `stop` - Stop monitoring
- `status` - Check monitoring status
- `alert` - Set up price alerts

```bash
bun scripts/monitor.ts start --competitor uber-eats --areas "sandton,rosebank,midrand"
bun scripts/monitor.ts alert --condition "price_increase_10pct" --webhook nduna
bun scripts/monitor.ts status
```

### `report <type>`
Generate reports:
- `daily` - Daily intelligence summary
- `weekly` - Weekly strategic insights
- `opportunity` - Opportunity team briefing
- `executive` - Executive dashboard data

```bash
bun scripts/report.ts daily
bun scripts/report.ts opportunity --team clawrouter
```

## Integration Points

### Nduna Bot Integration
Route intelligence feeds into Nduna for:
- Improved ETA calculations
- Dynamic route suggestions
- Driver briefing before deliveries
- Real-time competitor awareness

### Opportunity Team Integration
Provides strategic intelligence to:
- Clawrouter leadership for opportunity scouting
- Market positioning decisions
- Pricing strategy optimization
- Expansion planning

### Cross-Project Usage
Works with any delivery/logistics project:
- iHhashi (food/grocery delivery)
- Future delivery platforms
- Logistics optimization projects

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCES                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Driver App  │  │ Competitor  │  │ Market Data        │  │
│  │ Feedback    │  │ Scraping    │  │ APIs               │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│              ROUTE INTELLIGENCE ENGINE                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Route       │  │ Competitor  │  │ Strategic           │  │
│  │ Memory      │  │ Analysis    │  │ Synthesis           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    CONSUMERS                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Nduna Bot   │  │ Opportunity │  │ Strategic           │  │
│  │ (ETAs)      │  │ Team        │  │ Reports            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Competitor Monitoring Targets

### Food Delivery (South Africa)
- Uber Eats SA
- Mr D Food
- Bolt Food
- OrderIn

### Grocery Delivery
- Checkers Sixty60
- Woolies Dash
- Pick n Pay asap!

### Courier Services
- The Courier Guy
- DSV
- RAM Hand to Hand

## Alert Conditions

### Price Alerts
- Competitor increases fees > 10%
- Surge multiplier > 2x in key area
- New competitor enters market

### Route Intelligence Alerts
- Major road closure reported
- High-risk area identified
- Significant time savings discovered

### Market Opportunities
- Underserved area identified
- Pricing gap > 15%
- Competitor retreat from area

## Autonomous Operations

The skill runs autonomously to:
1. Monitor competitor pricing daily
2. Aggregate driver feedback into route intelligence
3. Identify patterns and opportunities
4. Alert stakeholders to significant changes
5. Feed intelligence to opportunity teams

## Configuration

Set these in your environment or Zo secrets:
- `COMPETITOR_MONITOR_INTERVAL_HOURS` - How often to check competitor prices (default: 6)
- `ROUTE_CONFIDENCE_THRESHOLD` - Minimum data points for route intelligence (default: 5)
- `ALERT_WEBHOOK_URL` - Where to send alerts (Nduna, Slack, etc.)
- `PRICE_CHANGE_THRESHOLD` - Percentage change that triggers alert (default: 10)

## Usage Examples

### For Nduna Bot
```
Use this skill to get route intelligence before dispatching a driver.
The skill will provide:
- ETA adjusted for time-of-day and known factors
- Active insights (road work, shortcuts)
- Competitor pricing in the area
```

### For Opportunity Team
```
Use this skill to find market gaps and competitive advantages.
The skill will provide:
- Pricing disparity analysis
- Underserved areas
- Competitor weakness identification
```

### For Strategic Planning
```
Use this skill for market positioning decisions.
The skill will provide:
- Weekly competitive landscape report
- Expansion opportunity identification
- Driver efficiency insights
```