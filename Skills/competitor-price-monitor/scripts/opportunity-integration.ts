#!/usr/bin/env bun
/**
 * Opportunity Team Integration
 * Feeds competitor intelligence to the opportunity team for strategic leverage
 * 
 * This module connects competitor monitoring with the multi-agent opportunity analysis
 * system, enabling strategic responses to market changes.
 */

import * as fs from "fs";
import { spawn } from "child_process";

const INTELLIGENCE_DIR = "/home/workspace/Boober/competitor-intelligence";
const OPPORTUNITY_DIR = "/home/workspace/Boober/opportunity-reports";

interface CompetitorAlert {
  type: "price_increase" | "price_decrease" | "promotion" | "surge_change" | "market_entry";
  competitor: string;
  market: "delivery" | "taxi";
  change: string;
  impact: "low" | "medium" | "high";
  opportunity: string;
  timestamp: string;
}

interface StrategicOpportunity {
  id: string;
  title: string;
  description: string;
  market: "delivery" | "taxi";
  competitor: string;
  recommendedActions: string[];
  priority: "low" | "medium" | "high" | "urgent";
  timeframe: "immediate" | "short-term" | "long-term";
  expectedImpact: string;
  status: "identified" | "analyzing" | "ready" | "executing" | "completed";
}

/**
 * Analyze competitor intelligence and generate strategic opportunities
 */
export async function analyzeAndGenerateOpportunities(): Promise<StrategicOpportunity[]> {
  // Get latest intelligence reports
  const reports = getLatestReports();
  if (reports.length === 0) {
    console.log("No intelligence reports found. Run competitor scan first.");
    return [];
  }
  
  const latestReport = reports[0];
  const content = fs.readFileSync(latestReport, "utf-8");
  
  // Parse alerts from report
  const alerts = parseAlertsFromReport(content);
  
  // Generate strategic opportunities from alerts
  const opportunities: StrategicOpportunity[] = [];
  
  for (const alert of alerts) {
    const opportunity = await generateStrategicOpportunity(alert);
    if (opportunity) {
      opportunities.push(opportunity);
    }
  }
  
  // Save opportunities for opportunity team
  if (opportunities.length > 0) {
    await saveOpportunities(opportunities);
    await notifyOpportunityTeam(opportunities);
  }
  
  return opportunities;
}

/**
 * Run full opportunity team analysis on competitor intelligence
 */
export async function runFullAnalysis(): Promise<void> {
  console.log("\n🎯 Running Full Opportunity Analysis...\n");
  
  // First, ensure we have fresh intelligence
  console.log("  1. Gathering competitor intelligence...");
  const { runScan } = await import("./monitor.ts");
  const report = await runScan();
  
  console.log("  2. Analyzing strategic opportunities...");
  const opportunities = await analyzeAndGenerateOpportunities();
  
  console.log("  3. Sending to opportunity team agents...");
  await sendToOpportunityAgents(report, opportunities);
  
  console.log("\n✅ Full analysis complete!\n");
}

/**
 * Get opportunities for specific market
 */
export function getOpportunitiesForMarket(market: "delivery" | "taxi"): StrategicOpportunity[] {
  const opportunitiesFile = `${OPPORTUNITY_DIR}/active-opportunities.json`;
  
  if (!fs.existsSync(opportunitiesFile)) {
    return [];
  }
  
  const all = JSON.parse(fs.readFileSync(opportunitiesFile, "utf-8"));
  return all.filter((o: StrategicOpportunity) => o.market === market);
}

/**
 * Update opportunity status
 */
export function updateOpportunityStatus(
  id: string, 
  status: StrategicOpportunity["status"]
): void {
  const opportunitiesFile = `${OPPORTUNITY_DIR}/active-opportunities.json`;
  
  if (!fs.existsSync(opportunitiesFile)) {
    return;
  }
  
  const opportunities: StrategicOpportunity[] = JSON.parse(
    fs.readFileSync(opportunitiesFile, "utf-8")
  );
  
  const opportunity = opportunities.find(o => o.id === id);
  if (opportunity) {
    opportunity.status = status;
    fs.writeFileSync(opportunitiesFile, JSON.stringify(opportunities, null, 2));
  }
}

// Internal functions

function getLatestReports(): string[] {
  if (!fs.existsSync(INTELLIGENCE_DIR)) {
    fs.mkdirSync(INTELLIGENCE_DIR, { recursive: true });
    return [];
  }
  
  return fs.readdirSync(INTELLIGENCE_DIR)
    .filter(f => f.startsWith("report-") && f.endsWith(".md"))
    .map(f => `${INTELLIGENCE_DIR}/${f}`)
    .sort()
    .reverse();
}

function parseAlertsFromReport(content: string): CompetitorAlert[] {
  const alerts: CompetitorAlert[] = [];
  const lines = content.split("\n");
  
  let inAlertsSection = false;
  
  for (const line of lines) {
    if (line.includes("## Alerts")) {
      inAlertsSection = true;
      continue;
    }
    
    if (inAlertsSection && line.startsWith("##")) {
      break;
    }
    
    if (inAlertsSection && line.includes("**[")) {
      const match = line.match(/\*\*\[(.*?)\]\*\*\s*(.*?)(?:\n|$)/);
      if (match) {
        const fullLine = line;
        const nextLineIdx = lines.indexOf(line) + 1;
        const opportunityLine = lines[nextLineIdx] || "";
        
        alerts.push({
          type: detectAlertType(fullLine),
          competitor: match[1],
          market: fullLine.toLowerCase().includes("delivery") ? "delivery" : "taxi",
          change: match[2],
          impact: line.includes("🔴") ? "high" : line.includes("🟡") ? "medium" : "low",
          opportunity: opportunityLine.replace(/^\s*→\s*/, ""),
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  return alerts;
}

function detectAlertType(text: string): CompetitorAlert["type"] {
  const lower = text.toLowerCase();
  if (lower.includes("increased") || lower.includes("raised")) return "price_increase";
  if (lower.includes("decreased") || lower.includes("lowered")) return "price_decrease";
  if (lower.includes("promo") || lower.includes("offer")) return "promotion";
  if (lower.includes("surge")) return "surge_change";
  return "market_entry";
}

async function generateStrategicOpportunity(alert: CompetitorAlert): Promise<StrategicOpportunity | null> {
  const id = `${alert.competitor.toLowerCase().replace(/\s+/g, "-")}-${alert.type}-${Date.now()}`;
  const appName = alert.market === "delivery" ? "iHhashi" : "Boober";
  
  let title = "";
  let description = "";
  let recommendedActions: string[] = [];
  let priority: StrategicOpportunity["priority"] = "medium";
  let timeframe: StrategicOpportunity["timeframe"] = "short-term";
  
  switch (alert.type) {
    case "price_increase":
      title = `${appName} can capture ${alert.competitor} customers`;
      description = `${alert.competitor} has ${alert.change}. This creates a pricing advantage opportunity.`;
      recommendedActions = [
        `Launch targeted campaign highlighting ${appName}'s competitive pricing`,
        "Consider limited-time promotional offer to capture disgruntled users",
        "Update marketing messaging to emphasize value proposition",
        "Monitor competitor app ratings for user sentiment changes"
      ];
      priority = alert.impact === "high" ? "high" : "medium";
      timeframe = "immediate";
      break;
    
    case "promotion":
      title = `Counter ${alert.competitor} promotion strategically`;
      description = `${alert.competitor} has launched ${alert.change}. Consider counter-measures.`;
      recommendedActions = [
        "Analyze promotion mechanics and user reception",
        "Prepare counter-promotion or differentiate on other value props",
        "Consider wait-and-see if promotion is limited time",
        "Track promotion end date for potential capture campaign"
      ];
      priority = "medium";
      timeframe = "short-term";
      break;
    
    case "surge_change":
      title = `Market predictable pricing against ${alert.competitor}`;
      description = `${alert.competitor} surge pattern change detected: ${alert.change}`;
      recommendedActions = [
        "Highlight transparent, predictable pricing in marketing",
        "Target times when competitor surge is highest",
        "Consider flat-rate promotions during peak hours",
        "Message reliability and no hidden fees"
      ];
      priority = "medium";
      timeframe = "short-term";
      break;
    
    case "market_entry":
      title = `New competitor ${alert.competitor} in market`;
      description = `${alert.competitor} has entered the ${alert.market} market: ${alert.change}`;
      recommendedActions = [
        "Analyze new entrant's positioning and pricing",
        "Review competitive advantages",
        "Consider defensive marketing campaign",
        "Monitor early user reviews and ratings"
      ];
      priority = "high";
      timeframe = "long-term";
      break;
    
    default:
      return null;
  }
  
  return {
    id,
    title,
    description,
    market: alert.market,
    competitor: alert.competitor,
    recommendedActions,
    priority,
    timeframe,
    expectedImpact: alert.impact === "high" ? "Significant market share shift potential" : "Moderate competitive response needed",
    status: "identified"
  };
}

async function saveOpportunities(opportunities: StrategicOpportunity[]): Promise<void> {
  fs.mkdirSync(OPPORTUNITY_DIR, { recursive: true });
  
  const opportunitiesFile = `${OPPORTUNITY_DIR}/active-opportunities.json`;
  const active: StrategicOpportunity[] = fs.existsSync(opportunitiesFile)
    ? JSON.parse(fs.readFileSync(opportunitiesFile, "utf-8"))
    : [];
  
  // Add new opportunities, avoiding duplicates
  for (const opp of opportunities) {
    const existing = active.find(
      a => a.competitor === opp.competitor && 
           a.market === opp.market && 
           a.type === (a as any).type
    );
    
    if (!existing) {
      active.push(opp);
    }
  }
  
  // Remove completed opportunities older than 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filtered = active.filter(o => 
    o.status !== "completed" || 
    Date.now() - parseInt(o.id.split("-").pop() || "0") < weekAgo
  );
  
  fs.writeFileSync(opportunitiesFile, JSON.stringify(filtered, null, 2));
}

async function notifyOpportunityTeam(opportunities: StrategicOpportunity[]): Promise<void> {
  // Store notification for opportunity team to pick up
  const notificationFile = `${OPPORTUNITY_DIR}/notifications/${Date.now()}.json`;
  fs.mkdirSync(`${OPPORTUNITY_DIR}/notifications`, { recursive: true });
  
  fs.writeFileSync(notificationFile, JSON.stringify({
    type: "competitor_intelligence",
    opportunities: opportunities.map(o => ({
      id: o.id,
      title: o.title,
      market: o.market,
      priority: o.priority
    })),
    created: new Date().toISOString()
  }, null, 2));
  
  console.log(`  ✓ ${opportunities.length} opportunities stored for opportunity team`);
}

async function sendToOpportunityAgents(
  report: any, 
  opportunities: StrategicOpportunity[]
): Promise<void> {
  // Call the opportunity-team script
  const prompt = `Competitor Intelligence Analysis Required

${opportunities.length} strategic opportunities identified:

${opportunities.map(o => `- [${o.priority.toUpperCase()}] ${o.title}
  Market: ${o.market}
  Actions: ${o.recommendedActions.slice(0, 2).join(", ")}
  Timeframe: ${o.timeframe}`).join("\n\n")}

Analyze each opportunity and recommend:
1. Immediate actions for marketing
2. Resource allocation recommendations
3. Risk assessment
4. Expected ROI`;

  // Create analysis request for opportunity team
  const analysisFile = `${OPPORTUNITY_DIR}/pending-analysis-${Date.now()}.json`;
  fs.writeFileSync(analysisFile, JSON.stringify({
    prompt,
    opportunities,
    report,
    created: new Date().toISOString()
  }, null, 2));
  
  console.log(`  ✓ Analysis request created: ${analysisFile}`);
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case "analyze":
      const opportunities = await analyzeAndGenerateOpportunities();
      console.log("\n📊 Strategic Opportunities\n");
      for (const o of opportunities) {
        console.log(`[${o.priority.toUpperCase()}] ${o.title}`);
        console.log(`   Market: ${o.market}`);
        console.log(`   Actions: ${o.recommendedActions.join("; ")}`);
        console.log("");
      }
      break;
    
    case "full":
      await runFullAnalysis();
      break;
    
    case "get":
      const market = (args[1] || "delivery") as "delivery" | "taxi";
      const marketOpps = getOpportunitiesForMarket(market);
      console.log(JSON.stringify(marketOpps, null, 2));
      break;
    
    case "update":
      const id = args[1];
      const status = args[2] as StrategicOpportunity["status"];
      if (id && status) {
        updateOpportunityStatus(id, status);
        console.log(`✅ Updated ${id} to ${status}`);
      } else {
        console.log("Usage: bun opportunity-integration.ts update <id> <status>");
      }
      break;
    
    default:
      console.log(`
Opportunity Team Integration

Commands:
  analyze         Analyze latest intelligence and generate opportunities
  full            Run full analysis pipeline (scan + analyze + notify)
  get <market>    Get opportunities for specific market (delivery | taxi)
  update <id> <status>   Update opportunity status

Examples:
  bun opportunity-integration.ts analyze
  bun opportunity-integration.ts full
  bun opportunity-integration.ts get delivery
  bun opportunity-integration.ts update uber-price-increase executing
`);
  }
}

export {
  analyzeAndGenerateOpportunities,
  runFullAnalysis,
  getOpportunitiesForMarket,
  updateOpportunityStatus,
  type StrategicOpportunity,
  type CompetitorAlert
};
