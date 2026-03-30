# Canva Plugin for Content Studio

Instant design integration powered by Canva's API.

## Features

- Quick design creation from templates
- Direct export to classroom materials
- Brand kit synchronization
- One-click share to Skool

## Setup

1. Get your Canva API key from https://developers.canva.com
2. Add to Settings > Advanced: `CANVA_API_KEY`
3. Run plugin setup:

```bash
bun scripts/deploy.ts --plugin=canva --setup
```

## Quick Actions

The Content Studio tile provides these quick actions:

| Action | Description |
|--------|-------------|
| Quick Flyer | Create lesson promotion flyer |
| Class Schedule | Weekly schedule template |
| Student Certificate | Achievement certificate |
| Parent Newsletter | Monthly communication |
| Worksheet | Interactive worksheet |

## API Endpoints

```typescript
// Create a design
POST /api/canva/design
{
  template: "lesson-flyer",
  data: {
    title: "Math Basics",
    date: "2026-04-01",
    time: "10:00 AM"
  }
}

// List templates
GET /api/canva/templates

// Export design
POST /api/canva/export/:designId
{
  format: "pdf",
  destination: "skool"
}
```

## Usage in Dashboard

```typescript
import { CanvaQuickAction } from './CanvaQuickAction';

// In your dashboard component
<CanvaQuickAction
  template="flyer"
  onCreate={(design) => shareToSkool(design)}
/>
```
