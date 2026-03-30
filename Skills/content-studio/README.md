# Content Studio

An all-in-one hub teachers actually want — live classes, instant Canva designs, Skool communities, and real ckUSDC funding for your classroom.

## Quick Start

```bash
# Clone and enter directory
cd /home/workspace/Skills/content-studio

# Install dependencies
bun install

# Deploy to production
bun scripts/deploy.ts --env=production

# Or deploy specific plugin
bun scripts/deploy.ts --plugin=canva --setup
```

## Features

### Phase 1 (Live Now ✓)
- [x] Content Studio tile with Canva + Skool quick actions
- [x] ckUSDC wallet integration
- [x] On-chain voting for classroom spends
- [x] Teacher profile and classroom setup
- [x] Revenue distribution from Skool to teacher pools

### Phase 2 (Coming Soon)
- [ ] Live class scheduling and management
- [ ] Student progress tracking
- [ ] Advanced analytics
- [ ] Mobile app

## Architecture

```
content-studio/
├── SKILL.md                    # This skill's main documentation
├── README.md                   # Quick start guide
├── config/
│   ├── currency.yaml          # ckUSDC configuration
│   └── dashboard.yaml         # Dashboard settings
├── plugins/
│   ├── canva/
│   │   ├── README.md          # Canva integration guide
│   │   └── index.ts           # Canva plugin implementation
│   └── skool/
│       ├── README.md          # Skool integration guide
│       └── index.ts           # Skool plugin implementation
├── api/
│   └── teachers.yaml          # Teacher API specification
├── components/
│   └── Dashboard.tsx          # Main dashboard component
├── scripts/
│   └── deploy.ts             # Deployment script
└── references/
    └── integration-guide.md   # Full integration docs
```

## Environment Variables

Add these in Settings > Advanced:

```env
CANVA_API_KEY=your_canva_key
SKOOL_API_KEY=your_skool_key
CKUSDC_RPC=https://ic0.app
CONTENT_STUDIO_SECRET=your_webhook_secret
```

## Usage

### For Teachers

1. **Register**: Create your teacher account
2. **Connect**: Link Canva and Skool
3. **Design**: Use Content Studio tile for quick designs
4. **Fund**: Receive ckUSDC for classroom needs
5. **Engage**: Invite students to your Skool community

### For Developers

```bash
# Deploy everything
bun scripts/deploy.ts

# Deploy with setup
bun scripts/deploy.ts --setup

# Deploy specific environment
bun scripts/deploy.ts --env=production

# Deploy single plugin
bun scripts/deploy.ts --plugin=canva
```

## API Endpoints

- `POST /api/teachers/register` — Create teacher account
- `GET /api/teachers/{id}/dashboard` — Full dashboard data
- `GET /api/teachers/{id}/wallet` — Wallet balance & history
- `POST /api/teachers/{id}/funding` — Request classroom funding

### Canva
- `POST /api/canva/design` — Create a design
- `GET /api/canva/templates` — List teacher templates
- `POST /api/canva/export/:id` — Export to PDF/PNG

### Skool
- `POST /api/skool/community` — Create community
- `GET /api/skool/communities` — List communities
- `POST /api/skool/invite` — Invite student
- `POST /api/skool/revenue/distribute` — Distribute revenue

## License

MIT — Created for Zo Computer by kofi.zo.computer
