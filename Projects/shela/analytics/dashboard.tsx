// Shela Analytics Dashboard
// Real-time insights into dating safety metrics

import { useState, useEffect } from 'react';
import { useDatabase } from '../database/hooks';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Users, Shield, AlertTriangle, TrendingUp, 
  Wallet, MapPin, Activity, Award 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SafetyMetrics {
  totalUsers: number;
  verifiedUsers: number;
  verificationRate: number;
  activeMatches: number;
  totalStakes: number;
  totalStakedSol: number;
  successfulMeets: number;
  slashEvents: number;
  avgRiskScore: number;
  safetyTrend: Array<{ date: string; score: number }>;
}

interface MatchAnalytics {
  date: string;
  swipes: number;
  matches: number;
  stakes: number;
  meets: number;
}

interface ViolationBreakdown {
  type: string;
  count: number;
  percentage: number;
}

export function AnalyticsDashboard() {
  const db = useDatabase();
  const [metrics, setMetrics] = useState<SafetyMetrics | null>(null);
  const [matchData, setMatchData] = useState<MatchAnalytics[]>([]);
  const [violations, setViolations] = useState<ViolationBreakdown[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    loadMetrics();
    loadMatchHistory();
    loadViolations();
  }, [timeRange]);

  async function loadMetrics() {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN v.passed = true THEN 1 ELSE 0 END) as verified_users,
        AVG(v.risk_score) as avg_risk_score
      FROM users u
      LEFT JOIN verifications v ON u.id = v.user_id
    `);

    const stakes = await db.query(`
      SELECT 
        COUNT(*) as total_stakes,
        SUM(amount) as total_staked_sol,
        SUM(CASE WHEN s.status = 'verified' THEN 1 ELSE 0 END) as successful_meets
      FROM stakes s
      WHERE s.created_at > datetime('now', '-${timeRange}')
    `);

    const slashes = await db.query(`
      SELECT COUNT(*) as slash_count
      FROM violations WHERE slashed = true
    `);

    const trend = await db.query(`
      SELECT 
        date(created_at) as date,
        AVG(risk_score) as score
      FROM verifications
      GROUP BY date(created_at)
      ORDER BY date DESC
      LIMIT 30
    `);

    setMetrics({
      totalUsers: stats.total_users,
      verifiedUsers: stats.verified_users,
      verificationRate: (stats.verified_users / stats.total_users) * 100,
      activeMatches: await getActiveMatches(),
      totalStakes: stakes.total_stakes,
      totalStakedSol: stakes.total_staked_sol,
      successfulMeets: stakes.successful_meets,
      slashEvents: slashes.slash_count,
      avgRiskScore: stats.avg_risk_score || 50,
      safetyTrend: trend.reverse(),
    });
  }

  async function loadMatchHistory() {
    const data = await db.query(`
      SELECT 
        date(created_at) as date,
        COUNT(DISTINCT CASE WHEN table_name = 'swipes' THEN id END) as swipes,
        COUNT(DISTINCT CASE WHEN table_name = 'matches' THEN id END) as matches,
        COUNT(DISTINCT CASE WHEN table_name = 'stakes' THEN id END) as stakes,
        COUNT(DISTINCT CASE WHEN table_name = 'check_ins' THEN id END) as meets
      FROM (
        SELECT 'swipes' as table_name, id, created_at FROM swipes
        UNION ALL
        SELECT 'matches', id, created_at FROM matches WHERE status = 'active'
        UNION ALL
        SELECT 'stakes', id, created_at FROM stakes
        UNION ALL
        SELECT 'check_ins', id, created_at FROM check_ins
      )
      WHERE created_at > datetime('now', '-${timeRange}')
      GROUP BY date(created_at)
      ORDER BY date
    `);

    setMatchData(data);
  }

  async function loadViolations() {
    const data = await db.query(`
      SELECT 
        violation_type as type,
        COUNT(*) as count
      FROM violations
      WHERE created_at > datetime('now', '-${timeRange}')
      GROUP BY violation_type
    `);

    const total = data.reduce((sum, v) => sum + v.count, 0);
    setViolations(data.map(v => ({
      ...v,
      percentage: total > 0 ? (v.count / total) * 100 : 0
    })));
  }

  async function getActiveMatches(): Promise<number> {
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM matches 
      WHERE status = 'active' 
      AND created_at > datetime('now', '-24 hours')
    `);
    return result.count;
  }

  if (!metrics) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Shela Analytics</h1>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range as any)}
              className={`px-4 py-2 rounded ${
                timeRange === range 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-gray-500">
              {metrics.verifiedUsers.toLocaleString()} verified ({metrics.verificationRate.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgRiskScore.toFixed(1)}</div>
            <p className="text-xs text-gray-500">
              Lower is safer (0-100 scale)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Staked</CardTitle>
            <Wallet className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStakedSol.toFixed(2)} SOL</div>
            <p className="text-xs text-gray-500">
              Across {metrics.totalStakes} stakes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics.successfulMeets / (metrics.totalStakes || 1)) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500">
              Successful meets / Total stakes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <CardTitle className="mb-4">Match Activity</CardTitle>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={matchData}>
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip />
              <Line type="monotone" dataKey="matches" stroke="#3b82f6" name="Matches" />
              <Line type="monotone" dataKey="meets" stroke="#22c55e" name="Meets" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <CardTitle className="mb-4">Risk Score Trend</CardTitle>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={metrics.safetyTrend}>
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis domain={[0, 100]} tick={{fontSize: 12}} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#f59e0b" name="Avg Risk" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Violations Breakdown */}
      <Card className="p-4">
        <CardTitle className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Violation Breakdown
        </CardTitle>
        {violations.length > 0 ? (
          <div className="space-y-3">
            {violations.map((v) => (
              <div key={v.type} className="flex items-center gap-4">
                <div className="w-24 text-sm">{v.type}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-red-500 h-4 rounded-full" 
                    style={{ width: `${v.percentage}%` }}
                  />
                </div>
                <div className="w-16 text-sm text-right">{v.count}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No violations in selected period 🎉</p>
        )}
      </Card>

      {/* Live Activity Feed */}
      <LiveActivityFeed />
    </div>
  );
}

function LiveActivityFeed() {
  const [events, setEvents] = useState<Array<{
    id: string;
    type: string;
    message: string;
    time: string;
  }>>([]);

  useEffect(() => {
    // Simulate real-time events (replace with WebSocket)
    const interval = setInterval(async () => {
      // Fetch recent events from API
      const response = await fetch('/api/events?limit=10');
      const data = await response.json();
      setEvents(data);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-4">
      <CardTitle className="mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-green-500" />
        Live Activity
      </CardTitle>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {events.map((event) => (
          <div 
            key={event.id} 
            className="flex items-center gap-3 p-2 rounded bg-gray-50"
          >
            <span className="text-xs text-gray-400">{event.time}</span>
            <span className={`text-xs px-2 py-1 rounded ${
              event.type === 'match' ? 'bg-blue-100 text-blue-700' :
              event.type === 'stake' ? 'bg-purple-100 text-purple-700' :
              event.type === 'meet' ? 'bg-green-100 text-green-700' :
              'bg-red-100 text-red-700'
            }`}>
              {event.type}
            </span>
            <span className="text-sm">{event.message}</span>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-gray-500 text-sm">Waiting for activity...</p>
        )}
      </div>
    </Card>
  );
}