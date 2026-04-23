// Shela State Machine — Persist and manage user flow states

import { Database } from 'duckdb-async';
import { UserSession } from './index';

export class StateMachine {
  private db: Database;
  private cache: Map<string, UserSession> = new Map();
  
  constructor(db: Database) {
    this.db = db;
    this.initTables();
  }
  
  private async initTables(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS flow_sessions (
        user_id TEXT PRIMARY KEY,
        current_layer TEXT,
        state JSON,
        risk_score INTEGER,
        stake_amount INTEGER,
        match_id TEXT,
        meet_id TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS flow_transitions (
        id INTEGER PRIMARY KEY,
        user_id TEXT,
        from_layer TEXT,
        to_layer TEXT,
        transition_data JSON,
        created_at TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON flow_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transitions_user ON flow_transitions(user_id);
    `);
  }
  
  // Load session from database
  async loadSession(userId: string): Promise<UserSession | null> {
    // Check cache first
    if (this.cache.has(userId)) {
      return this.cache.get(userId)!;
    }
    
    // Load from database
    const row = await this.db.get(`
      SELECT * FROM flow_sessions WHERE user_id = ?
    `, [userId]);
    
    if (!row) return null;
    
    const session: UserSession = {
      userId: row.user_id,
      currentLayer: row.current_layer,
      state: JSON.parse(row.state || '{}'),
      riskScore: row.risk_score,
      stakeAmount: row.stake_amount,
      matchId: row.match_id,
      meetId: row.meet_id,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    };
    
    // Cache it
    this.cache.set(userId, session);
    return session;
  }
  
  // Save session to database
  async saveSession(session: UserSession): Promise<void> {
    // Update cache
    this.cache.set(session.userId, session);
    
    // Persist to database
    await this.db.run(`
      INSERT INTO flow_sessions (user_id, current_layer, state, risk_score, stake_amount, match_id, meet_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id) DO UPDATE SET
        current_layer = excluded.current_layer,
        state = excluded.state,
        risk_score = excluded.risk_score,
        stake_amount = excluded.stake_amount,
        match_id = excluded.match_id,
        meet_id = excluded.meet_id,
        updated_at = excluded.updated_at
    `, [
      session.userId,
      session.currentLayer,
      JSON.stringify(session.state),
      session.riskScore,
      session.stakeAmount,
      session.matchId,
      session.meetId,
      new Date(session.createdAt).toISOString(),
      new Date(session.updatedAt).toISOString(),
    ]);
  }
  
  // Record a layer transition
  async recordTransition(
    userId: string,
    fromLayer: string,
    toLayer: string,
    data: any
  ): Promise<void> {
    await this.db.run(`
      INSERT INTO flow_transitions (user_id, from_layer, to_layer, transition_data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      userId,
      fromLayer,
      toLayer,
      JSON.stringify(data),
      new Date().toISOString(),
    ]);
  }
  
  // Get transition history for a user
  async getTransitionHistory(userId: string): Promise<any[]> {
    const rows = await this.db.all(`
      SELECT * FROM flow_transitions 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [userId]);
    
    return rows.map(row => ({
      id: row.id,
      fromLayer: row.from_layer,
      toLayer: row.to_layer,
      data: JSON.parse(row.transition_data),
      createdAt: row.created_at,
    }));
  }
  
  // Get analytics: drop-off points
  async getDropOffStats(): Promise<any[]> {
    return await this.db.all(`
      SELECT 
        current_layer,
        COUNT(*) as user_count,
        AVG(JULIANDAY('now') - JULIANDAY(updated_at)) as avg_idle_hours
      FROM flow_sessions
      WHERE updated_at < datetime('now', '-1 hour')
      GROUP BY current_layer
      ORDER BY user_count DESC
    `);
  }
  
  // Clear cache (for memory management)
  clearCache(): void {
    this.cache.clear();
  }
  
  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
