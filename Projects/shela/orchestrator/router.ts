// Shela API Router
// HTTP endpoints for the orchestrated flow

import { Hono } from 'hono';
import { processUserAction, getUserState } from './index';

export const router = new Hono();

// Get current state
router.get('/state/:userId', async (c) => {
  const userId = c.req.param('userId');
  const state = getUserState(userId);
  
  if (!state) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  return c.json({
    userId: state.userId,
    currentLayer: state.currentLayer,
    history: state.history,
    nextActions: getNextActions(state.currentLayer),
  });
});

// Process action
router.post('/action/:userId', async (c) => {
  const userId = c.req.param('userId');
  const body = await c.req.json();
  const { action, payload } = body;
  
  if (!action) {
    return c.json({ error: 'Action required' }, 400);
  }
  
  try {
    const result = await processUserAction(userId, action, payload || {});
    return c.json(result);
  } catch (error) {
    console.error('[Router Error]', error);
    return c.json({ error: 'Processing failed', details: String(error) }, 500);
  }
});

// WebSocket handler (for real-time updates)
export function createWebSocketHandler(ws: any) {
  ws.on('message', async (data: string) => {
    try {
      const { userId, action, payload } = JSON.parse(data);
      const result = await processUserAction(userId, action, payload);
      ws.send(JSON.stringify(result));
    } catch (error) {
      ws.send(JSON.stringify({ error: 'Invalid message' }));
    }
  });
}

// Helper: Get next possible actions for each layer
function getNextActions(layer: string): string[] {
  const actions: Record<string, string[]> = {
    '01-verify': ['start_interview', 'respond_interview'],
    '02-match': ['view_matches', 'swipe_profile'],
    '03-escrow': ['enter_escrow', 'confirm_stake', 'cancel_match'],
    '04-verify-meet': ['schedule_meet', 'check_in'],
    '05-learn': ['submit_feedback'],
    'complete': ['start_new_cycle'],
  };
  return actions[layer] || [];
}

// Health check
router.get('/health', (c) => c.json({ status: 'ok', layers: ['01-verify', '02-match', '03-escrow', '04-verify-meet', '05-learn'] }));

// Layer info
router.get('/layers', (c) => c.json({
  layers: [
    { id: '01-verify', name: 'Safety Interview', description: 'AI interview to assess risk' },
    { id: '02-match', name: 'Mutual Matching', description: 'Risk-weighted profile ranking' },
    { id: '03-escrow', name: 'Crypto Staking', description: 'Stake funds before meet' },
    { id: '04-verify-meet', name: 'Location Verification', description: 'Geofenced check-in + photo' },
    { id: '05-learn', name: 'Pattern Learning', description: 'System learns from outcomes' },
  ],
}));

export default router;
