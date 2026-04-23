import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Shela API Server
// RESTful API for dating safety protocol

const app = new Hono();

app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'shela' }));

// ============== USER ROUTES ==============
app.post('/api/users', async (c) => {
  const body = await c.req.json();
  // Create user with wallet
  return c.json({ userId: 'generated', wallet: 'pubkey' });
});

app.get('/api/users/:id', async (c) => {
  const id = c.req.param('id');
  return c.json({ id, verified: true, riskScore: 45 });
});

// ============== VERIFICATION ROUTES ==============
app.post('/api/verify/start', async (c) => {
  const { userId } = await c.req.json();
  return c.json({ sessionId: 'generated', question: 'What brings you here?' });
});

app.post('/api/verify/answer', async (c) => {
  const { sessionId, answer } = await c.req.json();
  return c.json({ 
    complete: false, 
    riskScore: 45, 
    nextQuestion: 'How do you verify someone before meeting?'
  });
});

app.get('/api/verify/:userId/result', async (c) => {
  const userId = c.req.param('userId');
  return c.json({ 
    passed: true, 
    riskScore: 45, 
    recommendedTier: 'text',
    timestamp: Date.now()
  });
});

// ============== MATCH ROUTES ==============
app.get('/api/matches/:userId', async (c) => {
  const userId = c.req.param('userId');
  return c.json({
    matches: [
      { id: '1', user: { id: 'other', score: 72 }, stake: 0.005, tier: 'text' }
    ]
  });
});

app.post('/api/matches/swipe', async (c) => {
  const { userId, targetId, direction } = await c.req.json();
  return c.json({ match: direction === 'right', escrowReady: true });
});

// ============== ESCROW ROUTES ==============
app.post('/api/escrow/create', async (c) => {
  const { userA, userB, stakeAmount, meetTime, location } = await c.req.json();
  return c.json({ 
    escrowId: 'generated',
    address: 'solana_program_address',
    status: 'awaiting_stake'
  });
});

app.get('/api/escrow/:id', async (c) => {
  const id = c.req.param('id');
  return c.json({
    id,
    status: 'staked',
    amountA: 0.1,
    amountB: 0.1,
    meetTime: Date.now() + 86400000,
    location: { lat: 0, lng: 0 }
  });
});

// ============== CHECK-IN ROUTES ==============
app.post('/api/checkin/:escrowId', async (c) => {
  const escrowId = c.req.param('escrowId');
  const { userId, location, photoHash } = await c.req.json();
  return c.json({
    verified: true,
    distance: 45,
    zkProof: 'proof_hash',
    status: 'both_checked_in'
  });
});

// ============== NOTIFICATION ROUTES ==============
app.post('/api/notifications/subscribe', async (c) => {
  const { userId, ntfyTopic } = await c.req.json();
  return c.json({ subscribed: true, topic: ntfyTopic });
});

export default app;
