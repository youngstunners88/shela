---
name: content-studio
description: Teacher-focused Content Studio dashboard with Canva + Skool integration. Features ckUSDC funding, on-chain voting for classroom spends, and live class management.
compatibility: Created for Zo Computer. Requires Bun runtime.
metadata:
  author: kofi.zo.computer
  category: education
  phase: 1
allowed-tools: bun bash fetch create_or_rewrite_file edit_file_llm
---

# Content Studio for Teachers

An all-in-one hub teachers actually want — live classes, instant Canva designs, Skool communities, and real ckUSDC funding for your classroom.

## Quick Start

```bash
# Deploy the Content Studio
cd /home/workspace/Skills/content-studio
bun scripts/deploy.ts --env=production

# Start the dashboard
bun run dev
```

## Features

### Phase 1 (Live Now)
- [x] Content Studio tile with Canva + Skool quick actions
- [x] ckUSDC wallet integration
- [x] On-chain voting for classroom spends
- [x] Teacher profile and classroom setup

### Phase 2 (Coming Soon)
- [ ] Live class scheduling
- [ ] Student management
- [ ] Revenue sharing dashboard

## Architecture

```
content-studio/
├── plugins/
│   ├── canva/          # Canva design plugin
│   └── skool/          # Skool community plugin
├── api/
│   └── teachers.yaml   # Teacher endpoints
├── components/
│   └── Dashboard.tsx   # Main dashboard
├── scripts/
│   └── deploy.ts       # Deployment script
└── config/
    └── currency.yaml   # ckUSDC configuration
```

## Environment Variables

Create these in Settings > Advanced:
- `CANVA_API_KEY` - Canva integration key
- `SKOOL_API_KEY` - Skool community API
- `CKUSDC_RPC` - IC RPC endpoint for ckUSDC
- `CONTENT_STUDIO_SECRET` - Webhook secret

## Usage

The dashboard is teacher-ready on day one. Teachers can:

1. Connect their Canva account for instant designs
2. Link their Skool community for student engagement
3. Receive ckUSDC funding through on-chain votes
4. Vote on classroom spend proposals

## Files to Read

1. `plugins/canva/README.md` - Canva integration guide
2. `plugins/skool/README.md` - Skool plugin setup
3. `api/teachers.yaml` - API reference
4. `references/integration-guide.md` - Full integration docs
