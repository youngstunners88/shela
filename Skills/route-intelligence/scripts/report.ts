#!/usr/bin/env bun
/**
 * Route Intelligence Reports
 */

const DB_PATH = process.env.ROUTE_INTEL_DB || "/home/workspace/.route-intelligence";

interface DailyReport {
  project: string;
  date: string;
  route_stats: {
    total_tracked: number;
    avg_eta_accuracy: number;
    avg_delay: number;
  };
  insight_stats: {
    new_insights: number;
    verified_insights: number;
    top_contributors: string[];
  };
  competitor_stats: {
    monitors_active: number;
    price_alerts: number;
    avg_prices: { [competitor: string]: number };
  };
}

async function generateDailyReport(project: string): Promise<DailyReport> {
  const fs = require('fs');
  const path = require('path');
  
  const today = new Date().toISOString().split('T')[0];
  
  // Load route data
  const routesDir = path.join(DB_PATH, 'projects', project, 'routes');
  const routes: any[] = [];
  if (fs.existsSync(routesDir)) {
    for (const file of fs.readdirSync(routesDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(routesDir, file), 'utf8'));
      if (data.created_at?.startsWith(today)) {
        routes.push(data);
      }
    }
  }
  
  // Calculate stats
  let totalExpected = 0;
  let totalActual = 0;
  let delays = 0;
  
  for (const route of routes) {
    totalExpected += route.expected_seconds;
    totalActual += route.actual_seconds;
    if (route.actual_seconds > route.expected_seconds) delays++;
  }
  
  const avgEtaAccuracy = routes.length > 0
    ? (1 - Math.abs(totalActual - totalExpected) / totalExpected) * 100
    : 0;
  
  const avgDelay = routes.length > 0
    ? (totalActual - totalExpected) / routes.length
    : 0;
  
  // Load insights
  const insightsDir = path.join(DB_PATH, 'projects', project, 'insights');
  const insights: any[] = [];
  if (fs.existsSync(insightsDir)) {
    for (const file of fs.readdirSync(insightsDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(insightsDir, file), 'utf8'));
      if (data.created_at?.startsWith(today)) {
        insights.push(data);
      }
    }
  }
  
  // Get top contributors
  const contributorCounts: { [key: string]: number } = {};
  for (const insight of insights) {
    contributorCounts[insight.driver_id] = (contributorCounts[insight.driver_id] || 0) + 1;
  }
  const topContributors = Object.entries(contributorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);
  
  // Load competitor data
  const competitorsDir = path.join(DB_PATH, 'projects', project, 'competitors');
  const competitorRecords: any[] = [];
  if (fs.existsSync(competitorsDir)) {
    for (const file of fs.readdirSync(competitorsDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(competitorsDir, file), 'utf8'));
      if (data.timestamp?.startsWith(today)) {
        competitorRecords.push(data);
      }
    }
  }
  
  // Calculate average prices
  const pricesByCompetitor: { [key: string]: number[] } = {};
  for (const record of competitorRecords) {
    if (!pricesByCompetitor[record.competitor]) {
      pricesByCompetitor[record.competitor] = [];
    }
    pricesByCompetitor[record.competitor].push(record.base_fee);
  }
  
  const avgPrices: { [competitor: string]: number } = {};
  for (const [comp, prices] of Object.entries(pricesByCompetitor)) {
    avgPrices[comp] = prices.reduce((a, b) => a + b, 0) / prices.length;
  }
  
  // Load alerts
  const alertsDir = path.join(DB_PATH, 'projects', project, 'alerts');
  let monitorsActive = 0;
  let priceAlerts = 0;
  
  if (fs.existsSync(alertsDir)) {
    for (const file of fs.readdirSync(alertsDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(alertsDir, file), 'utf8'));
      if (file.startsWith('mon_') && data.active) monitorsActive++;
      if (file.startsWith('pa_') && data.created_at?.startsWith(today)) priceAlerts++;
    }
  }
  
  const report: DailyReport = {
    project,
    date: today,
    route_stats: {
      total_tracked: routes.length,
      avg_eta_accuracy: avgEtaAccuracy,
      avg_delay: avgDelay,
    },
    insight_stats: {
      new_insights: insights.length,
      verified_insights: insights.filter(i => i.verified).length,
      top_contributors: topContributors,
    },
    competitor_stats: {
      monitors_active: monitorsActive,
      price_alerts: priceAlerts,
      avg_prices: avgPrices,
    },
  };
  
  console.log(`\n📊 Daily Intelligence Report - ${project}`);
  console.log(`   Date: ${today}`);
  console.log(`\n   🚚 Route Performance:`);
  console.log(`      Routes tracked: ${routes.length}`);
  console.log(`      ETA accuracy: ${avgEtaAccuracy.toFixed(1)}%`);
  console.log(`      Avg delay: ${avgDelay > 0 ? '+' : ''}${(avgDelay / 60).toFixed(1)} min`);
  
  console.log(`\n   💡 Driver Insights:`);
  console.log(`      New today: ${insights.length}`);
  console.log(`      Verified: ${insights.filter(i => i.verified).length}`);
  if (topContributors.length > 0) {
    console.log(`      Top contributors: ${topContributors.join(', ')}`);
  }
  
  console.log(`\n   💰 Competitor Intelligence:`);
  console.log(`      Active monitors: ${monitorsActive}`);
  console.log(`      Price alerts today: ${priceAlerts}`);
  if (Object.keys(avgPrices).length > 0) {
    console.log(`      Average prices:`);
    for (const [comp, price] of Object.entries(avgPrices)) {
      console.log(`        - ${comp}: R${price.toFixed(2)}`);
    }
  }
  
  // Save report
  const reportsDir = path.join(DB_PATH, 'projects', project, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(reportsDir, `daily_${today}.json`),
    JSON.stringify(report, null, 2)
  );
  
  return report;
}

async function generateOpportunityReport(project: string, team?: string): Promise<any> {
  const fs = require('fs');
  const pathModule = require('path');
  
  // Load all competitor data
  const competitorsDir = pathModule.join(DB_PATH, 'projects', project, 'competitors');
  const records: any[] = [];
  
  if (fs.existsSync(competitorsDir)) {
    for (const file of fs.readdirSync(competitorsDir)) {
      const data = JSON.parse(fs.readFileSync(pathModule.join(competitorsDir, file), 'utf8'));
      records.push(data);
    }
  }
  
  // Analyze by area
  const byArea: { [area: string]: any[] } = {};
  for (const record of records) {
    if (!byArea[record.area]) byArea[record.area] = [];
    byArea[record.area].push(record);
  }
  
  // Find opportunities
  const opportunities = [];
  
  for (const [area, areaRecords] of Object.entries(byArea)) {
    const byComp: { [comp: string]: number[] } = {};
    for (const r of areaRecords) {
      if (!byComp[r.competitor]) byComp[r.competitor] = [];
      byComp[r.competitor].push(r.base_fee);
    }
    
    // Calculate averages
    const avgPrices: { [comp: string]: number } = {};
    for (const [comp, prices] of Object.entries(byComp)) {
      avgPrices[comp] = prices.reduce((a, b) => a + b, 0) / prices.length;
    }
    
    const competitors = Object.keys(avgPrices);
    if (competitors.length >= 2) {
      const minComp = competitors.reduce((a, b) => avgPrices[a] < avgPrices[b] ? a : b);
      const maxComp = competitors.reduce((a, b) => avgPrices[a] > avgPrices[b] ? a : b);
      const gap = (avgPrices[maxComp] - avgPrices[minComp]) / avgPrices[minComp] * 100;
      
      if (gap > 15) {
        opportunities.push({
          area,
          gap_percent: gap,
          lowest: { competitor: minComp, price: avgPrices[minComp] },
          highest: { competitor: maxComp, price: avgPrices[maxComp] },
          recommendation: gap > 25
            ? 'HIGH PRIORITY - Significant pricing gap'
            : 'MEDIUM PRIORITY - Monitor closely',
        });
      }
    }
  }
  
  // Sort by gap
  opportunities.sort((a, b) => b.gap_percent - a.gap_percent);
  
  console.log(`\n🎯 Opportunity Team Briefing - ${project}`);
  console.log(`   ${team ? `For: ${team}` : ''}`);
  console.log(`\n   High-Priority Opportunities: ${opportunities.filter(o => o.gap_percent > 25).length}`);
  console.log(`   Medium-Priority: ${opportunities.filter(o => o.gap_percent <= 25).length}`);
  
  if (opportunities.length > 0) {
    console.log(`\n   Top 5 Opportunities:`);
    for (const opp of opportunities.slice(0, 5)) {
      console.log(`\n   📍 ${opp.area}`);
      console.log(`      Gap: ${opp.gap_percent.toFixed(0)}%`);
      console.log(`      Low: ${opp.lowest.competitor} @ R${opp.lowest.price.toFixed(2)}`);
      console.log(`      High: ${opp.highest.competitor} @ R${opp.highest.price.toFixed(2)}`);
      console.log(`      ${opp.recommendation}`);
    }
  }
  
  return { project, opportunities, generated_at: new Date().toISOString() };
}

async function generateWeeklyReport(project: string): Promise<any> {
  const fs = require('fs');
  const path = require('path');
  
  const reportsDir = path.join(DB_PATH, 'projects', project, 'reports');
  const weeklyReports: any[] = [];
  
  // Get last 7 daily reports
  if (fs.existsSync(reportsDir)) {
    const files = fs.readdirSync(reportsDir)
      .filter(f => f.startsWith('daily_'))
      .sort()
      .reverse()
      .slice(0, 7);
    
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(reportsDir, file), 'utf8'));
      weeklyReports.push(data);
    }
  }
  
  // Aggregate stats
  const totalRoutes = weeklyReports.reduce((sum, r) => sum + r.route_stats.total_tracked, 0);
  const totalInsights = weeklyReports.reduce((sum, r) => sum + r.insight_stats.new_insights, 0);
  const totalAlerts = weeklyReports.reduce((sum, r) => sum + r.competitor_stats.price_alerts, 0);
  
  console.log(`\n📊 Weekly Strategic Report - ${project}`);
  console.log(`\n   📈 Weekly Summary:`);
  console.log(`      Routes tracked: ${totalRoutes}`);
  console.log(`      Insights captured: ${totalInsights}`);
  console.log(`      Price alerts: ${totalAlerts}`);
  
  console.log(`\n   📅 Daily Breakdown:`);
  for (const report of weeklyReports) {
    console.log(`      ${report.date}: ${report.route_stats.total_tracked} routes, ${report.insight_stats.new_insights} insights`);
  }
  
  return { project, weekly_reports: weeklyReports, total_routes: totalRoutes, total_insights: totalInsights };
}

// CLI
const args = process.argv.slice(2);
const type = args[0];
const projectIndex = args.indexOf('--project');

if (args.length < 2 || projectIndex === -1) {
  console.log(`
Usage:
  bun report.ts daily --project <name>
  bun report.ts weekly --project <name>
  bun report.ts opportunity --project <name> [--team <team-name>]
`);
  process.exit(1);
}

const project = args[projectIndex + 1];

async function main() {
  switch (type) {
    case 'daily': {
      await generateDailyReport(project);
      break;
    }
    
    case 'weekly': {
      await generateWeeklyReport(project);
      break;
    }
    
    case 'opportunity': {
      const teamIdx = args.indexOf('--team');
      await generateOpportunityReport(project, teamIdx !== -1 ? args[teamIdx + 1] : undefined);
      break;
    }
    
    default:
      console.error(`Unknown report type: ${type}`);
      process.exit(1);
  }
}

main();
