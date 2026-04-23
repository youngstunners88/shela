import { Hono } from 'hono';
import { cors } from 'hono/cors';
import orchestratorRouter from '../orchestrator/router';
import { WebSocketServer } from 'ws';
import { createWebSocketHandler } from '../orchestrator/router';

const app = new Hono();

// Middleware
app.use(cors());

// Mount orchestrator routes at /api
app.route('/api', orchestratorRouter);

// Legacy routes (backward compatibility)
app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0', layers: 5 }));

// Start HTTP server
const PORT = process.env.PORT || 3000;

if (import.meta.main) {
  // HTTP server
  Bun.serve({
    fetch: app.fetch,
    port: PORT,
  });
  
  console.log(`🚀 Shela API running on http://localhost:${PORT}`);
  
  // WebSocket server (for real-time updates)
  const wss = new WebSocketServer({ port: 3001 });
  wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected');
    createWebSocketHandler(ws);
  });
  
  console.log(`🔄 WebSocket running on ws://localhost:3001`);
}

export default app;
