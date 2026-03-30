# Skool Plugin for Content Studio

Community-first learning platform integration.

## Features

- Automatic community creation for each classroom
- Student enrollment via invite links
- Content synchronization from Content Studio
- Revenue distribution to teacher pools

## Setup

1. Get your Skool API key from https://skool.com/settings/api
2. Add to Settings > Advanced: `SKOOL_API_KEY`
3. Configure revenue flow in `config/currency.yaml`
4. Run plugin setup:

```bash
bun scripts/deploy.ts --plugin=skool --setup
```

## Quick Actions

| Action | Description |
|--------|-------------|
| Create Community | New Skool group for class |
| Invite Students | Generate enrollment links |
| Post Update | Quick announcement to class |
| Schedule Event | Live class in Skool |
| Share Design | Post Canva design |

## API Endpoints

```typescript
// Create community
POST /api/skool/community
{
  name: "Grade 5 Math - Spring 2026",
  description: "Interactive math learning community",
  visibility: "private"
}

// List communities
GET /api/skool/communities

// Invite student
POST /api/skool/invite
{
  communityId: "xyz123",
  email: "student@example.com"
}

// Revenue distribution
POST /api/skool/revenue/distribute
{
  amount: 100.00,
  destination: "teacher_pool"
}
```

## Revenue Flow

When Skool revenue is earned:

1. Revenue received in platform wallet
2. 85% allocated to teacher
3. 10% to community pool
4. 5% platform fee
5. Teacher share flows to on-chain pool (configurable)

## Usage in Dashboard

```typescript
import { SkoolQuickAction } from './SkoolQuickAction';

<SkoolQuickAction
  action="create-community"
  onComplete={(community) => setCommunityId(community.id)}
/>
```
