# Content Studio Integration Guide

Complete guide for integrating Content Studio into a teacher's workflow.

## Overview

Content Studio provides teachers with:
- **Content Studio Tile**: Quick access to Canva designs and Skool communities
- **ckUSDC Funding**: On-chain stablecoin for classroom expenses
- **Live Classes**: Schedule and manage live sessions
- **Revenue Distribution**: Skool earnings flow to teacher pools

## Architecture

```
┌─────────────────────────────────────────────┐
│           Content Studio Dashboard           │
├───────────────┬──────────────┬────────────────┤
│  Canva Plugin │   Funding    │  Skool Plugin  │
├───────────────┼──────────────┼────────────────┤
│ - Templates   │  - Wallet    │  - Communities │
│ - Designs     │  - Voting    │  - Revenue     │
│ - Export      │  - ckUSDC    │  - Students    │
└───────────────┴──────────────┴────────────────┘
```

## Phase 1: Live Features

### 1. Canva Plugin
- Pre-built templates for teachers
- One-click flyer creation
- Direct export to Skool posts
- Brand kit sync

### 2. Skool Plugin
- Community creation per classroom
- Student enrollment links
- Revenue tracking
- Content auto-posting

### 3. Funding System
- ckUSDC wallet per teacher
- On-chain voting for spends
- 7-day proposal windows
- Automatic distribution

## Setup Steps

### For Teachers

1. **Register Account**
   ```
   POST /api/teachers/register
   {
     "email": "teacher@example.com",
     "name": "Jane Doe"
   }
   ```

2. **Connect Canva**
   - Navigate to `/settings/canva-connect`
   - Authorize Content Studio app
   - Select brand kit (optional)

3. **Connect Skool**
   - Navigate to `/settings/skool-connect`
   - Authorize API access
   - Configure revenue flow settings

4. **Access Dashboard**
   - Visit `https://kofi.zo.space/content-studio`
   - Content Studio tile appears
   - Quick actions for Canva and Skool

### For Developers

1. **Environment Variables**
   ```bash
   # Settings > Advanced
   CANVA_API_KEY=your_canva_key
   SKOOL_API_KEY=your_skool_key
   CKUSDC_RPC=https://ic0.app
   ```

2. **Deploy**
   ```bash
   cd /home/workspace/Skills/content-studio
   bun scripts/deploy.ts --env=production
   ```

3. **Verify**
   ```bash
   curl https://kofi.zo.space/api/teachers/me/dashboard
   ```

## API Reference

### Teachers
- `POST /api/teachers/register` - Create teacher account
- `GET /api/teachers/{id}/dashboard` - Full dashboard data
- `GET /api/teachers/{id}/wallet` - Wallet balance
- `POST /api/teachers/{id}/funding` - Request funding

### Canva
- `POST /api/canva/design` - Create design
- `GET /api/canva/templates` - List templates
- `POST /api/canva/export/:id` - Export design

### Skool
- `POST /api/skool/community` - Create community
- `GET /api/skool/communities` - List communities
- `POST /api/skool/invite` - Invite student

## Revenue Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Skool     │────▶│   Platform   │────▶│   Teacher    │
│   Revenue   │     │   Wallet     │     │   Pool       │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Distribution │
                    │   Voting     │
                    └──────────────┘
```

- 85% direct to teacher
- 10% community pool
- 5% platform fee

## Troubleshooting

### Canva Not Connecting
1. Check API key in Settings
2. Verify Canva developer account
3. Re-authorize app

### Skool Revenue Not Flowing
1. Check revenue flow config in `currency.yaml`
2. Verify Skool community is linked
3. Check CKUSDC wallet address

### Wallet Issues
1. Verify IC wallet is configured
2. Check RPC endpoint is reachable
3. Confirm ckUSDC canister ID

## Files to Read

- `config/currency.yaml` - Currency configuration
- `plugins/canva/README.md` - Canva specific docs
- `plugins/skool/README.md` - Skool specific docs
- `api/teachers.yaml` - API specification
- `components/Dashboard.tsx` - Dashboard component

## Support

For issues:
1. Check logs: `/home/workspace/Skills/content-studio/logs/`
2. Run diagnostics: `bun scripts/deploy.ts --diagnose`
3. File issue with logs included
