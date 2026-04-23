import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, TrendingUp, Shield, RefreshCw, Activity } from 'lucide-react';

// Admin dashboard for pattern monitoring and model updates

interface PatternStat {
  patternType: 'ghoster' | 'safety_concern' | 'reliable' | 'inconsistent' | 'new_user';
  count: number;
  confidence: number;
  avgRiskDelta: number;
}

interface ViolationStat {
  type: string;
  count: number;
  totalSlash: number;
  avgSeverity: number;
}

interface ModelUpdate {
  featureName: string;
  oldWeight: number;
  newWeight: number;
  significance: 'low' | 'medium' | 'high';
  reasoning: string;
  appliedAt: string;
}

export function LearningDashboard() {
  const [patterns, setPatterns] = useState<PatternStat[]>([]);
  const [violations, setViolations] = useState<ViolationStat[]>([]);
  const [updates, setUpdates] = useState<ModelUpdate[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  // Mock data - would be fetched from API
  useEffect(() => {
    setPatterns([
      { patternType: 'reliable', count: 142, confidence: 85, avgRiskDelta: -12 },
      { patternType: 'inconsistent', count: 89, confidence: 62, avgRiskDelta: 3 },
      { patternType: 'new_user', count: 203, confidence: 100, avgRiskDelta: 0 },
      { patternType: 'ghoster', count: 34, confidence: 78, avgRiskDelta: 18 },
      { patternType: 'safety_concern', count: 7, confidence: 92, avgRiskDelta: 35 },
    ]);

    setViolations([
      { type: 'ghosted', count: 23, totalSlash: 18.5, avgSeverity: 2.1 },
      { type: 'no_show', count: 11, totalSlash: 9.2, avgSeverity: 2.4 },
      { type: 'inappropriate_behavior', count: 4, totalSlash: 5.8, avgSeverity: 3.2 },
      { type: 'unsafe_meet', count: 2, totalSlash: 4.0, avgSeverity: 3.8 },
    ]);

    setUpdates([
      { featureName: 'check_in_strictness', oldWeight: 1.0, newWeight: 1.2, significance: 'high', reasoning: 'Check-in success rate 68.4% below threshold', appliedAt: '2026-04-22T14:00:00Z' },
      { featureName: 'negative_sentiment_weight', oldWeight: 1.0, newWeight: 1.3, significance: 'medium', reasoning: 'Negative sentiment correlates with lower ratings', appliedAt: '2026-04-22T08:00:00Z' },
      { featureName: 'escalation_rate_weight', oldWeight: 0.8, newWeight: 1.1, significance: 'medium', reasoning: 'Early voice/video escalation predicts better outcomes', appliedAt: '2026-04-21T20:00:00Z' },
    ]);

    setLastRun('2026-04-22T20:00:00Z');
  }, []);

  const runLearningCycle = async () => {
    setIsRunning(true);
    // API call would go here
    await new Promise(r => setTimeout(r, 2000));
    setLastRun(new Date().toISOString());
    setIsRunning(false);
  };

  const getPatternColor = (type: string) => {
    switch (type) {
      case 'reliable': return 'text-green-500 bg-green-500/10';
      case 'ghoster': return 'text-orange-500 bg-orange-500/10';
      case 'safety_concern': return 'text-red-500 bg-red-500/10';
      case 'inconsistent': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-blue-500 bg-blue-500/10';
    }
  };

  const timeSinceLastRun = lastRun 
    ? Math.floor((Date.now() - new Date(lastRun).getTime()) / 1000 / 60)
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-violet-500" />
            <div>
              <h1 className="text-2xl font-bold">Shela Learning</h1>
              <p className="text-zinc-400">Pattern analysis & model evolution</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-zinc-400">Last learning cycle</p>
              <p className="text-lg font-medium">
                {timeSinceLastRun !== null ? `${timeSinceLastRun}m ago` : 'Never'}
              </p>
            </div>
            <button
              onClick={runLearningCycle}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg transition"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running...' : 'Run Cycle'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm">Meets Analyzed</span>
            </div>
            <p className="text-3xl font-bold">475</p>
            <p className="text-sm text-zinc-500">Last 24h</p>
          </div>

          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Safety Score</span>
            </div>
            <p className="text-3xl font-bold text-green-500">94.2%</p>
            <p className="text-sm text-zinc-500">+2.1% from baseline</p>
          </div>

          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Violations</span>
            </div>
            <p className="text-3xl font-bold text-red-500">40</p>
            <p className="text-sm text-zinc-500">8.4% of meets</p>
          </div>

          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Model Updates</span>
            </div>
            <p className="text-3xl font-bold text-violet-500">{updates.length}</p>
            <p className="text-sm text-zinc-500">Active adjustments</p>
          </div>
        </div>

        {/* Patterns Section */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">User Patterns Detected</h2>
            <div className="space-y-3">
              {patterns.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPatternColor(p.patternType)}`}>
                      {p.patternType.replace('_', ' ')}
                    </span>
                    <div>
                      <p className="font-medium">{p.count} users</p>
                      <p className="text-sm text-zinc-500">
                        Risk delta: {p.avgRiskDelta > 0 ? '+' : ''}{p.avgRiskDelta}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{p.confidence}%</p>
                    <p className="text-xs text-zinc-500">confidence</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Violations by Type</h2>
            <div className="space-y-3">
              {violations.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{v.type.replace('_', ' ')}</p>
                    <p className="text-sm text-zinc-500">
                      {v.count} cases • {v.totalSlash.toFixed(1)} SOL slashed
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div
                        key={n}
                        className={`w-2 h-2 rounded-full ${
                          n <= Math.round(v.avgSeverity) ? 'bg-red-500' : 'bg-zinc-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-zinc-800 rounded-lg">
              <p className="text-sm text-zinc-400">
                Total slashed: {violations.reduce((s, v) => s + v.totalSlash, 0).toFixed(2)} SOL
                <br />
                Compensated to victims: {(violations.reduce((s, v) => s + v.totalSlash, 0) * 0.5).toFixed(2)} SOL
              </p>
            </div>
          </div>
        </div>

        {/* Model Updates */}
        <div className="mt-6 bg-zinc-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Model Updates</h2>
          <div className="space-y-3">
            {updates.map((u, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-zinc-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">{u.oldWeight.toFixed(1)}</span>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="font-semibold">{u.newWeight.toFixed(1)}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{u.featureName.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-zinc-500">{u.reasoning}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  u.significance === 'high' ? 'bg-red-500/20 text-red-400' :
                  u.significance === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {u.significance}
                </span>
                <span className="text-sm text-zinc-500">
                  {new Date(u.appliedAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
