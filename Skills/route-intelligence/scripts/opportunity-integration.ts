#!/usr/bin/env bun
/**
 * Opportunity Team Integration for Route Intelligence
 * 
 * Provides strategic intelligence to:
 * - Clawrouter leadership
 * - Opportunity scouts
 * - Market positioning decisions
 */

const DB_PATH = process.env.ROUTE_INTEL_DB || "/home/workspace/.route-intelligence";

export interface MarketOpportunity {
  area: string;
  type: 'pricing_gap' | 'underserved' | 'competitor_weakness' | 'expansion';
  priority: 'high' | 'medium' | 'low';
  details: {
    gap_percent?: number;
    competitors?: string[];
    avg_price?: number;
    recommendation: string;
  };
  created_at: string;
}

export interface StrategicInsight {
  insight: string;
  source: 'route_data' | 'competitor_data' | 'driver_feedback';
  confidence: number;
  actionable: boolean;
  suggested_action?: string;
}

/**
 * Find market opportunities for expansion or pricing strategy
 */
export async function findOpportunities(project: string = 'ihhashi'): Promise<MarketOpportunity[]> {
  const fs = require('fs');
  const path = require('path');
  
  const competitorsDir = path.join(DB_PATH, 'projects', project, 'competitors');
  const insightsDir = path.join(DB_PATH, 'projects', project, 'insights');
  
  const opportunities: MarketOpportunity[] = [];
  
  // Load competitor data
  const competitorRecords: any[] = [];
  if (fs.existsSync(competitorsDir)) {
    for (const file of fs.readdirSync(competitorsDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(competitorsDir, file), 'utf8'));
      competitorRecords.push(data);
    }
  }
  
  // Analyze by area
  const byArea: { [area: string]: any[] } = {};
  for (const record of competitorRecords) {
    if (!byArea[record.area]) byArea[record.area] = [];
    byArea[record.area].push(record);
  }
  
  // Find pricing gaps
  for (const [area, records] of Object.entries(byArea)) {
    const byComp: { [comp: string]: number[] } = {};
    for (const r of records) {
      if (!byComp[r.competitor]) byComp[r.competitor] = [];
      byComp[r.competitor].push(r.base_fee);
    }
    
    const avgPrices: { [comp: string]: number } = {};
    for (const [comp, prices] of Object.entries(byComp)) {
      avgPrices[comp] = prices.reduce((a, b) => a + b, 0) / prices.length;
    }
    
    const competitors = Object.keys(avgPrices);
    
    // Pricing gap opportunity
    if (competitors.length >= 2) {
      const minComp = competitors.reduce((a, b) => avgPrices[a] < avgPrices[b] ? a : b);
      const maxComp = competitors.reduce((a, b) => avgPrices[a] > avgPrices[b] ? a : b);
      const gap = (avgPrices[maxComp] - avgPrices[minComp]) / avgPrices[minComp] * 100;
      
      if (gap > 15) {
        opportunities.push({
          area,
          type: 'pricing_gap',
          priority: gap > 25 ? 'high' : 'medium',
          details: {
            gap_percent: gap,
            competitors,
            avg_price: avgPrices[minComp],
            recommendation: `Enter at R${(avgPrices[minComp] * 0.95).toFixed(0)} to undercut ${minComp}`,
          },
          created_at: new Date().toISOString(),
        });
      }
    }
    
    // Underserved area (few competitors)
    if (competitors.length === 1) {
      opportunities.push({
        area,
        type: 'underserved',
        priority: 'medium',
        details: {
          competitors,
          avg_price: avgPrices[competitors[0]],
          recommendation: `Only ${competitors[0]} operates here - expansion opportunity`,
        },
        created_at: new Date().toISOString(),
      });
    }
  }
  
  // Load driver insights for competitor weakness
  if (fs.existsSync(insightsDir)) {
    const weaknessInsights: any[] = [];
    for (const file of fs.readdirSync(insightsDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(insightsDir, file), 'utf8'));
      if (data.note?.toLowerCase().includes('competitor') || 
          data.note?.toLowerCase().includes('slow') ||
          data.note?.toLowerCase().includes('bad service')) {
        weaknessInsights.push(data);
      }
    }
    
    // Group by approximate area (lat/lng bucket)
    const byBucket: { [bucket: string]: any[] } = {};
    for (const insight of weaknessInsights) {
      const bucket = `${Math.round(insight.lat * 100)},${Math.round(insight.lng * 100)}`;
      if (!byBucket[bucket]) byBucket[bucket] = [];
      byBucket[bucket].push(insight);
    }
    
    for (const [bucket, insights] of Object.entries(byBucket)) {
      if (insights.length >= 2) {
        opportunities.push({
          area: `Area ${bucket}`,
          type: 'competitor_weakness',
          priority: 'medium',
          details: {
            competitors: ['unknown'],
            recommendation: `${insights.length} reports of issues - competitor weakness detected`,
          },
          created_at: new Date().toISOString(),
        });
      }
    }
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  opportunities.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return opportunities;
}

/**
 * Generate strategic insights from all intelligence data
 */
export async function generateStrategicInsights(project: string = 'ihhashi'): Promise<StrategicInsight[]> {
  const fs = require('fs');
  const path = require('path');
  
  const insights: StrategicInsight[] = [];
  
  const routesDir = path.join(DB_PATH, 'projects', project, 'routes');
  const competitorsDir = path.join(DB_PATH, 'projects', project, 'competitors');
  const insightsDir = path.join(DB_PATH, 'projects', project, 'insights');
  
  // Route data insights
  if (fs.existsSync(routesDir)) {
    const routes: any[] = [];
    for (const file of fs.readdirSync(routesDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(routesDir, file), 'utf8'));
      routes.push(data);
    }
    
    // Peak hour analysis
    const hourDelays: { [hour: number]: number[] } = {};
    for (const route of routes) {
      const delay = route.actual_seconds - route.expected_seconds;
      if (!hourDelays[route.time_of_day]) hourDelays[route.time_of_day] = [];
      hourDelays[route.time_of_day].push(delay);
    }
    
    for (const [hour, delays] of Object.entries(hourDelays)) {
      const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
      if (avgDelay > 300 && delays.length >= 3) { // 5+ min average delay
        insights.push({
          insight: `Peak delay at ${hour}:00 - avg ${(avgDelay / 60).toFixed(0)} min extra`,
          source: 'route_data',
          confidence: Math.min(delays.length / 10, 1),
          actionable: true,
          suggested_action: `Consider surge pricing or extra drivers at ${hour}:00`,
        });
      }
    }
  }
  
  // Competitor insights
  if (fs.existsSync(competitorsDir)) {
    const records: any[] = [];
    for (const file of fs.readdirSync(competitorsDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(competitorsDir, file), 'utf8'));
      records.push(data);
    }
    
    // Surge pattern detection
    const surgeByHour: { [hour: number]: number[] } = {};
    for (const record of records) {
      const hour = new Date(record.timestamp).getHours();
      if (record.surge_multiplier > 1) {
        if (!surgeByHour[hour]) surgeByHour[hour] = [];
        surgeByHour[hour].push(record.surge_multiplier);
      }
    }
    
    for (const [hour, surges] of Object.entries(surgeByHour)) {
      const avgSurge = surges.reduce((a, b) => a + b, 0) / surges.length;
      if (avgSurge > 1.5) {
        insights.push({
          insight: `Competitors surge at ${hour}:00 - avg ${avgSurge.toFixed(1)}x`,
          source: 'competitor_data',
          confidence: Math.min(surges.length / 5, 1),
          actionable: true,
          suggested_action: `Prepare for high demand at ${hour}:00 - deploy more drivers`,
        });
      }
    }
  }
  
  return insights;
}

/**
 * Generate opportunity team briefing
 */
export async function generateBriefing(project: string = 'ihhashi'): Promise<{
  opportunities: MarketOpportunity[];
  insights: StrategicInsight[];
  summary: string;
}> {
  const opportunities = await findOpportunities(project);
  const insights = await generateStrategicInsights(project);
  
  const highPriority = opportunities.filter(o => o.priority === 'high').length;
  const mediumPriority = opportunities.filter(o => o.priority === 'medium').length;
  const actionableInsights = insights.filter(i => i.actionable).length;
  
  let summary = `Opportunity Briefing for ${project}:\n`;
  summary += `- ${highPriority} high-priority opportunities\n`;
  summary += `- ${mediumPriority} medium-priority opportunities\n`;
  summary += `- ${actionableInsights} actionable insights\n`;
  
  if (opportunities.length > 0) {
    summary += `\nTop Opportunity: ${opportunities[0].area} - ${opportunities[0].type}`;
    summary += `\n  ${opportunities[0].details.recommendation}`;
  }
  
  return {
    opportunities,
    insights,
    summary,
  };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const project = args[args.indexOf('--project') + 1] || 'ihhashi';
  
  async function run() {
    switch (command) {
      case 'opportunities': {
        const opps = await findOpportunities(project);
        console.log('\n🎯 Market Opportunities:');
        for (const opp of opps.slice(0, 10)) {
          console.log(`\n  [${opp.priority.toUpperCase()}] ${opp.area}`);
          console.log(`  Type: ${opp.type}`);
          console.log(`  ${opp.details.recommendation}`);
        }
        break;
      }
      
      case 'insights': {
        const insights = await generateStrategicInsights(project);
        console.log('\n💡 Strategic Insights:');
        for (const insight of insights) {
          console.log(`\n  [${insight.source}] ${insight.insight}`);
          if (insight.suggested_action) {
            console.log(`  Action: ${insight.suggested_action}`);
          }
        }
        break;
      }
      
      case 'briefing': {
        const briefing = await generateBriefing(project);
        console.log('\n📋 OPPORTUNITY TEAM BRIEFING\n');
        console.log(briefing.summary);
        break;
      }
      
      default:
        console.log(`
Usage:
  bun opportunity-integration.ts opportunities [--project <name>]
  bun opportunity-integration.ts insights [--project <name>]
  bun opportunity-integration.ts briefing [--project <name>]
`);
    }
  }
  
  run();
}
