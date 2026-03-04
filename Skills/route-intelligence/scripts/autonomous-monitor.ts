#!/usr/bin/env bun
/**
 * Autonomous Route Intelligence Monitor
 * 
 * Runs automatically to:
 * - Check competitor prices
 * - Analyze market opportunities
 * - Generate daily reports
 * - Alert on significant changes
 * 
 * Can be scheduled as an agent or run manually.
 */

const DB_PATH = process.env.ROUTE_INTEL_DB || "/home/workspace/.route-intelligence";

interface MonitorResult {
  timestamp: string;
  price_alerts: number;
  opportunities_found: number;
  insights_generated: number;
  actions_taken: string[];
}

async function runAutonomousMonitor(project: string): Promise<MonitorResult> {
  const result: MonitorResult = {
    timestamp: new Date().toISOString(),
    price_alerts: 0,
    opportunities_found: 0,
    insights_generated: 0,
    actions_taken: [],
  };
  
  console.log(`\n🤖 Autonomous Route Intelligence Monitor`);
  console.log(`   Project: ${project}`);
  console.log(`   Time: ${result.timestamp}`);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  // 1. Run competitor price check
  console.log(`\n📊 Step 1: Competitor Price Check`);
  const { runPriceCheck } = require('./monitor');
  await runPriceCheck(project);
  result.actions_taken.push('Completed competitor price check');
  
  // 2. Find opportunities
  console.log(`\n🎯 Step 2: Market Opportunity Analysis`);
  const { findOpportunities } = require('./opportunity-integration');
  const opportunities = await findOpportunities(project);
  result.opportunities_found = opportunities.length;
  console.log(`   Found ${opportunities.length} opportunities`);
  
  const highPriority = opportunities.filter(o => o.priority === 'high');
  if (highPriority.length > 0) {
    console.log(`\n   ⚠️ HIGH PRIORITY OPPORTUNITIES:`);
    for (const opp of highPriority) {
      console.log(`     - ${opp.area}: ${opp.details.recommendation}`);
    }
    result.actions_taken.push(`Identified ${highPriority.length} high-priority opportunities`);
  }
  
  // 3. Generate strategic insights
  console.log(`\n💡 Step 3: Strategic Insight Generation`);
  const { generateStrategicInsights } = require('./opportunity-integration');
  const insights = await generateStrategicInsights(project);
  result.insights_generated = insights.length;
  console.log(`   Generated ${insights.length} insights`);
  
  const actionable = insights.filter(i => i.actionable);
  if (actionable.length > 0) {
    console.log(`\n   📌 ACTIONABLE INSIGHTS:`);
    for (const insight of actionable.slice(0, 3)) {
      console.log(`     - ${insight.insight}`);
      if (insight.suggested_action) {
        console.log(`       Action: ${insight.suggested_action}`);
      }
    }
    result.actions_taken.push(`Generated ${actionable.length} actionable insights`);
  }
  
  // 4. Generate daily report
  console.log(`\n📈 Step 4: Daily Report Generation`);
  const { generateDailyReport } = require('./report');
  await generateDailyReport(project);
  result.actions_taken.push('Generated daily intelligence report');
  
  // 5. Summary
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n✅ Autonomous Monitor Complete`);
  console.log(`\n   Summary:`);
  console.log(`   - Opportunities: ${result.opportunities_found}`);
  console.log(`   - Insights: ${result.insights_generated}`);
  console.log(`   - Actions: ${result.actions_taken.length}`);
  
  // 6. Alert if significant findings
  if (highPriority.length > 0 || actionable.length > 0) {
    console.log(`\n🔔 ALERT: Significant findings require attention!`);
    console.log(`   Run: bun opportunity-integration.ts briefing --project ${project}`);
  }
  
  return result;
}

// CLI
const args = process.argv.slice(2);
const projectIndex = args.indexOf('--project');
const project = projectIndex !== -1 ? args[projectIndex + 1] : 'ihhashi';

// Check if this is being run as a scheduled agent
const isAgent = args.includes('--agent');

if (isAgent) {
  // When run as an agent, output is sent via email/telegram
  console.log(`Starting autonomous monitoring for ${project}...`);
}

runAutonomousMonitor(project)
  .then(result => {
    if (isAgent) {
      // For agents, we might want to send results somewhere
      console.log(JSON.stringify(result, null, 2));
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Monitor failed:', err);
    process.exit(1);
  });
