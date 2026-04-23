import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';
import { verify } from 'jsonwebtoken';

// Shela Real-Time WebSocket Server
// Handles live match updates, check-in status, stake notifications

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isAlive: boolean;
  subscriptions: Set<string>;
}

interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'check_in' | 'swipe' | 'ping' | 'escrow_update';
  payload: any;
}

// Message types
const MESSAGE_TYPES = {
  MATCH_UNLOCKED: 'match_unlocked',
  STAKE_LOCKED: 'stake_locked',
  CHECK_IN_STATUS: 'check_in_status',
  BOTH_CHECKED_IN: 'both_checked_in',
  ESCROW_RELEASED: 'escrow_released',
  VIOLATION_REPORTED: 'violation_reported',
  SLASH_EXECUTED: 'slash_executed',
  ERROR: 'error',
} as const;

class ShelaWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedSocket> = new Map();
  private matchSubscriptions: Map<string, Set<string>> = new Map(); // matchId -> Set<userId>

  constructor(port: number = 8080) {
    const server = createServer();
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', this.handleConnection.bind(this));
    
    server.listen(port, () => {
      console.log(`🔌 Shela WebSocket Server running on port ${port}`);
    });
  }

  private handleConnection(ws: AuthenticatedSocket, req: any) {
    ws.isAlive = true;
    ws.subscriptions = new Set();
    
    // Parse token from query params
    const { query } = parse(req.url!, true);
    const token = query.token as string;
    
    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      // Verify JWT (in production, use proper secret)
      const decoded = verify(token, process.env.JWT_SECRET || 'shela-dev-secret') as { userId: string };
      ws.userId = decoded.userId;
      this.clients.set(decoded.userId, ws);
      
      console.log(`👤 User connected: ${decoded.userId}`);
    } catch (err) {
      ws.close(1008, 'Invalid token');
      return;
    }

    // Setup ping/pong for connection health
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (err) {
        ws.send(JSON.stringify({
          type: MESSAGE_TYPES.ERROR,
          error: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        this.clients.delete(ws.userId);
        // Unsubscribe from all matches
        ws.subscriptions.forEach(matchId => {
          this.unsubscribeFromMatch(ws.userId!, matchId);
        });
        console.log(`👋 User disconnected: ${ws.userId}`);
      }
    });

    // Send initial connection success
    ws.send(JSON.stringify({
      type: 'connected',
      userId: ws.userId
    }));
  }

  private handleMessage(ws: AuthenticatedSocket, message: WSMessage) {
    switch (message.type) {
      case 'subscribe':
        this.subscribeToMatch(ws, message.payload.matchId);
        break;
      
      case 'unsubscribe':
        this.unsubscribeFromMatch(ws.userId!, message.payload.matchId);
        break;
      
      case 'check_in':
        this.handleCheckIn(ws, message.payload);
        break;
      
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      
      default:
        ws.send(JSON.stringify({
          type: MESSAGE_TYPES.ERROR,
          error: `Unknown message type: ${message.type}`
        }));
    }
  }

  private subscribeToMatch(ws: AuthenticatedSocket, matchId: string) {
    if (!ws.userId) return;
    
    ws.subscriptions.add(matchId);
    
    if (!this.matchSubscriptions.has(matchId)) {
      this.matchSubscriptions.set(matchId, new Set());
    }
    this.matchSubscriptions.get(matchId)!.add(ws.userId);
    
    ws.send(JSON.stringify({
      type: 'subscribed',
      matchId
    }));
    
    console.log(`📡 ${ws.userId} subscribed to match ${matchId}`);
  }

  private unsubscribeFromMatch(userId: string, matchId: string) {
    const subscribers = this.matchSubscriptions.get(matchId);
    if (subscribers) {
      subscribers.delete(userId);
      if (subscribers.size === 0) {
        this.matchSubscriptions.delete(matchId);
      }
    }
  }

  private handleCheckIn(ws: AuthenticatedSocket, payload: {
    matchId: string;
    lat: number;
    lng: number;
    photoHash: string;
  }) {
    // In production, validate location against meet spot
    // Broadcast check-in to other party
    this.broadcastToMatch(payload.matchId, {
      type: MESSAGE_TYPES.CHECK_IN_STATUS,
      payload: {
        userId: ws.userId,
        checkedIn: true,
        timestamp: Date.now()
      }
    }, ws.userId);
  }

  // Public methods for external triggers (from API/webhooks)

  broadcastToMatch(matchId: string, message: any, excludeUserId?: string) {
    const subscribers = this.matchSubscriptions.get(matchId);
    if (!subscribers) return;

    const data = JSON.stringify(message);
    
    for (const userId of subscribers) {
      if (excludeUserId && userId === excludeUserId) continue;
      
      const client = this.clients.get(userId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  notifyMatchUnlocked(matchId: string, userA: string, userB: string) {
    this.broadcastToMatch(matchId, {
      type: MESSAGE_TYPES.MATCH_UNLOCKED,
      payload: {
        matchId,
        message: 'Mutual swipe! Escrow ready for staking.',
        nextStep: 'stake'
      }
    });
  }

  notifyStakeLocked(matchId: string, userId: string, amount: number) {
    this.broadcastToMatch(matchId, {
      type: MESSAGE_TYPES.STAKE_LOCKED,
      payload: {
        matchId,
        userId,
        amount,
        message: 'Stake locked. Meet within 30 minutes.'
      }
    });
  }

  notifyBothCheckedIn(matchId: string) {
    this.broadcastToMatch(matchId, {
      type: MESSAGE_TYPES.BOTH_CHECKED_IN,
      payload: {
        matchId,
        message: 'Both parties checked in! Stakes will be released.',
        nextStep: 'claim'
      }
    });
  }

  notifyEscrowReleased(matchId: string, amount: number) {
    this.broadcastToMatch(matchId, {
      type: MESSAGE_TYPES.ESCROW_RELEASED,
      payload: {
        matchId,
        amount,
        reputationPoints: Math.floor(amount / 100000),
        message: 'Stake returned + reputation points earned!'
      }
    });
  }

  notifyViolationReported(matchId: string, reporter: string, reported: string) {
    this.broadcastToMatch(matchId, {
      type: MESSAGE_TYPES.VIOLATION_REPORTED,
      payload: {
        matchId,
        reporter,
        reported,
        message: 'Violation reported. Under review.',
        status: 'reviewing'
      }
    });
  }

  notifySlashExecuted(matchId: string, slashedUser: string, percentage: number, compensation: number) {
    this.broadcastToMatch(matchId, {
      type: MESSAGE_TYPES.SLASH_EXECUTED,
      payload: {
        matchId,
        slashedUser,
        slashPercentage: percentage,
        victimCompensation: compensation,
        message: `Stake slashed: ${percentage}%. Victim compensated.`
      }
    });
  }

  // Health check interval
  startHealthChecks(intervalMs: number = 30000) {
    setInterval(() => {
      for (const [userId, ws] of this.clients) {
        if (!ws.isAlive) {
          ws.terminate();
          this.clients.delete(userId);
          continue;
        }
        
        ws.isAlive = false;
        ws.ping();
      }
    }, intervalMs);
  }
}

// Start server if run directly
if (import.meta.main) {
  const port = parseInt(process.env.WS_PORT || '8080');
  const server = new ShelaWebSocketServer(port);
  server.startHealthChecks();
}

export { ShelaWebSocketServer, MESSAGE_TYPES };
