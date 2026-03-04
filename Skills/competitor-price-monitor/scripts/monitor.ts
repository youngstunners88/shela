#!/usr/bin/env bun
/**
 * Competitor Price Monitor
 * Autonomous monitoring for iHhashi (delivery) and Boober (taxi) markets
 * Integrates with Nduna bot and opportunity team for strategic leverage
 */

import { spawn } from "child_process";
import * as fs from "fs";

const COMPETITORS_FILE = "/home/workspace/Skills/competitor-price-monitor/references/competitors.json";
const INTELLIGENCE_DIR = "/home/workspace/Boober/competitor-intelligence";
const TINYFISH_API_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

interface Competitor {
  name: string;
  urls: string[];
  monitor: string[];
}

interface Market {
  south_africa: Competitor[];
}

interface CompetitorConfig {
  delivery: Market;
  taxi: Market;
}

interface PriceAlert {
  type: "price_increase" | "price_decrease" | "promotion" | "surge_change" | "market_entry";
  competitor: string;
  market: "delivery" | "taxi";
  change: string;
  impact: "low" | "medium" | "high";
  opportunity: string;
  timestamp: string;
}

interface IntelligenceReport {
  date: string;
  markets: {
    delivery: {
      competitors: Competitor[];
      insights: string[];
      opportunities: string[];
    };
    taxi: {
      competitors: Competitor[];
      insights: string[];
      opportunities: string[];
    };
  };
  alerts: PriceAlert[];
  summary: string;
}

// Ensure directories exist
fs.mkdirSync(INTELLIGENCE_DIR, { recursive: true });

function loadConfig(): CompetitorConfig {
  if (!fs.existsSync(COMPETITORS_FILE)) {
    return getDefaultConfig();
  }
  return JSON.parse(fs.readFileSync(COMPETITORS_FILE, "utf-8"));
}

function getDefaultConfig(): CompetitorConfig {
  return {
    delivery: {
      south_africa: [
        { name: "Uber Eats", urls: ["https://www.ubereats.com/za"], monitor: ["pricing", "promotions", "delivery_fees"] },
        { name: "Bolt Food", urls: ["https://food.bolt.eu/za"], monitor: ["pricing", "surge_patterns"] },
        { name: "Mr D", urls: ["https://www.mrdelivery.co.za"], monitor: ["pricing", "promotions"] },
        { name: "Checkers Sixty60", urls: ["https://www.checkers.co.za/sixty60"], monitor: ["pricing", "delivery_time"] }
      ]
    },
    taxi: {
      south_africa: [
        { name: "Uber", urls: ["https://www.uber.com/za"], monitor: ["pricing", "surge", "features"] },
        { name: "Bolt", urls: ["https://www.bolt.com/za"], monitor: ["pricing", "surge"] },
        { name: "inDriver", urls: ["https://indriver.com/za"], monitor: ["pricing_model", "features"] }
      ]
    }
  };
}

async function scanCompetitor(competitor: Competitor, market: "delivery" | "taxi"): Promise<{ insights: string[]; alerts: PriceAlert[] }> {
  const insights: string[] = [];
  const alerts: PriceAlert[] = [];
  
  const prompt = `Analyze ${competitor.name} (${market} market in South Africa).

URLs to check: ${competitor.urls.join(", ")}
Monitor: ${competitor.monitor.join(", ")}

For each competitor, extract:
1. Current base pricing (delivery fees, base fares)
2. Active promotions and offers
3. Surge pricing patterns (if applicable)
4. Recent feature launches
5. Any notable changes from last check

Output format:
- INSIGHT: [key finding]
- ALERT: [if significant change detected]

Focus on actionable intelligence for iHhashi (delivery) or Boober (taxi).
Be specific about pricing (in Rands), promotions, and competitive positioning.`;

  try {
    const result = await callZoAgent(prompt);
    const lines = result.split("\n").filter(l => l.trim());
    
    for (const line of lines) {
      if (line.includes("INSIGHT:")) {
        insights.push(line.replace("INSIGHT:", "").trim());
      } else if (line.includes("ALERT:")) {
        const alertText = line.replace("ALERT:", "").trim();
        alerts.push({
          type: detectAlertType(alertText),
          competitor: competitor.name,
          market,
          change: alertText,
          impact: assessImpact(alertText),
          opportunity: generateOpportunity(competitor.name, alertText, market),
          timestamp: new Date().toISOString()
        });
      } else if (line.trim()) {
        insights.push(line.trim());
      }
    }
  } catch (error) {
    console.error(`Error scanning ${competitor.name}:`, error);
    insights.push(`Failed to scan ${competitor.name} - API error`);
  }
  
  return { insights, alerts };
}

function detectAlertType(text: string): PriceAlert["type"] {
  const lower = text.toLowerCase();
  if (lower.includes("increased") || lower.includes("raised")) return "price_increase";
  if (lower.includes("decreased") || lower.includes("lowered")) return "price_decrease";
  if (lower.includes("promo") || lower.includes("offer") || lower.includes("discount")) return "promotion";
  if (lower.includes("surge")) return "surge_change";
  return "market_entry";
}

function assessImpact(text: string): "low" | "medium" | "high" {
  const lower = text.toLowerCase();
  if (lower.includes("major") || lower.includes("significant") || lower.includes("first time")) return "high";
  if (lower.includes("minor") || lower.includes("slight")) return "low";
  return "medium";
}

function generateOpportunity(competitor: string, change: string, market: "delivery" | "taxi"): string {
  const ourApp = market === "delivery" ? "iHhashi" : "Boober";
  const lower = change.toLowerCase();
  
  if (lower.includes("increased") || lower.includes("raised")) {
    return `${ourApp} can highlight competitive pricing or free delivery offer`;
  }
  if (lower.includes("promotion") || lower.includes("offer")) {
    return `Counter-promotion or differentiate ${ourApp}'s unique value`;
  }
  if (lower.includes("surge")) {
    return `${ourApp} can market predictable pricing`;
  }
  return `Monitor for strategic response opportunity`;
}

async function callZoAgent(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("curl", [
      "-s", "-X", "POST",
      "https://api.zo.computer/zo/ask",
      "-H", `authorization: ${process.env.ZO_CLIENT_IDENTITY_TOKEN}`,
      "-H", "content-type: application/json",
      "-d", JSON.stringify({
        input: prompt,
        model_name: "openrouter:z-ai/glm-5"
      })
    ]);

    let output = "";
    proc.stdout.on("data", (data) => { output += data.toString(); });
    proc.stderr.on("data", (data) => console.error(`Error: ${data}`));
    proc.on("close", (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result.output || "No output");
        } catch {
          resolve(output || "No output");
        }
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

async function runScan(market?: "delivery" | "taxi"): Promise<IntelligenceReport> {
  console.log("\n🔍 COMPETITOR PRICE MONITOR\n");
  console.log("=" .repeat(60) + "\n");
  
  const config = loadConfig();
  const alerts: PriceAlert[] = [];
  const deliveryInsights: string[] = [];
  const taxiInsights: string[] = [];
  
  const marketsToScan = market 
    ? [market] 
    : ["delivery", "taxi"] as const;
  
  for (const m of marketsToScan) {
    const competitors = config[m].south_africa;
    console.log(`\n📊 Scanning ${m.toUpperCase()} market...`);
    console.log(`   Competitors: ${competitors.map(c => c.name).join(", ")}\n`);
    
    for (const competitor of competitors) {
      console.log(`   🔄 ${competitor.name}...`);
      const { insights, alerts: compAlerts } = await scanCompetitor(competitor, m);
      
      if (m === "delivery") {
        deliveryInsights.push(...insights.map(i => `[${competitor.name}] ${i}`));
      } else {
        taxiInsights.push(...insights.map(i => `[${competitor.name}] ${i}`));
      }
      alerts.push(...compAlerts);
      
      console.log(`      ✓ ${insights.length} insights, ${compAlerts.length} alerts`);
    }
  }
  
  const report: IntelligenceReport = {
    date: new Date().toISOString().split("T")[0],
    markets: {
      delivery: { competitors: config.delivery.south_africa, insights: deliveryInsights, opportunities: [] },
      taxi: { competitors: config.taxi.south_africa, insights: taxiInsights, opportunities: [] }
    },
    alerts,
    summary: generateSummary(deliveryInsights, taxiInsights, alerts)
  };
  
  // Extract opportunities from alerts
  for (const alert of alerts) {
    const marketKey = alert.market as "delivery" | "taxi";
    report.markets[marketKey].opportunities.push(alert.opportunity);
  }
  
  return report;
}

function generateSummary(delivery: string[], taxi: string[], alerts: PriceAlert[]): string {
  const highImpact = alerts.filter(a => a.impact === "high").length;
  const mediumImpact = alerts.filter(a => a.impact === "medium").length;
  
  let summary = `Scanned ${delivery.length + taxi.length} insights across delivery and taxi markets. `;
  summary += `${alerts.length} alerts generated (${highImpact} high impact, ${mediumImpact} medium impact). `;
  
  if (highImpact > 0) {
    summary += `Immediate attention recommended for high-impact changes.`;
  }
  
  return summary;
}

function saveReport(report: IntelligenceReport): string {
  const filename = `${INTELLIGENCE_DIR}/report-${report.date}.md`;
  
  let content = `# Competitor Intelligence Report\n`;
  content += `**Generated**: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}\n`;
  content += `**Summary**: ${report.summary}\n\n---\n\n`;
  
  content += `## Delivery Market (iHhashi)\n\n`;
  content += `### Competitors\n`;
  for (const c of report.markets.delivery.competitors) {
    content += `- **${c.name}**: Monitoring ${c.monitor.join(", ")}\n`;
  }
  content += `\n### Insights\n`;
  for (const i of report.markets.delivery.insights) {
    content += `- ${i}\n`;
  }
  content += `\n### Opportunities\n`;
  for (const o of report.markets.delivery.opportunities) {
    content += `- ${o}\n`;
  }
  
  content += `\n## Taxi Market (Boober)\n\n`;
  content += `### Competitors\n`;
  for (const c of report.markets.taxi.competitors) {
    content += `- **${c.name}**: Monitoring ${c.monitor.join(", ")}\n`;
  }
  content += `\n### Insights\n`;
  for (const i of report.markets.taxi.insights) {
    content += `- ${i}\n`;
  }
  content += `\n### Opportunities\n`;
  for (const o of report.markets.taxi.opportunities) {
    content += `- ${o}\n`;
  }
  
  if (report.alerts.length > 0) {
    content += `\n## Alerts\n\n`;
    for (const a of report.alerts) {
      const icon = a.impact === "high" ? "🔴" : a.impact === "medium" ? "🟡" : "🟢";
      content += `${icon} **[${a.competitor}]** ${a.change}\n`;
      content += `   → ${a.opportunity}\n\n`;
    }
  }
  
  fs.writeFileSync(filename, content);
  return filename;
}

async function sendToOpportunityTeam(report: IntelligenceReport): Promise<void> {
  console.log("\n📤 Sending to Opportunity Team...\n");
  
  // Use the opportunity-team script from clawrouter-leadership
  const opportunityPrompt = `Competitor Intelligence Report for ${report.date}

${report.summary}

## Key Insights

### Delivery Market (iHhashi)${report.markets.delivery.insights.map(i => `\n- ${i}`).join("")}

### Taxi Market (Boober)${report.markets.taxi.insights.map(i => `\n- ${i}`).join("")}

## Opportunities
${[...report.markets.delivery.opportunities, ...report.markets.taxi.opportunities].map(o => `- ${o}`).join("\n")}

Analyze these findings and recommend strategic actions for iHhashi and Boober.`;

  // Store for opportunity team to pick up
  const opportunityFile = `${INTELLIGENCE_DIR}/opportunity-${Date.now()}.json`;
  fs.writeFileSync(opportunityFile, JSON.stringify({
    prompt: opportunityPrompt,
    report,
    created: new Date().toISOString()
  }, null, 2));
  
  console.log(`   ✓ Stored at: ${opportunityFile}`);
}

function showHelp(): void {
  console.log(`
📊 Competitor Price Monitor

Usage:
  bun monitor.ts <command> [options]

Commands:
  scan              Scan all competitors for pricing intelligence
    --market        Limit to specific market (delivery | taxi)
    --quick         Quick scan (top competitors only)
  
  report            Generate formatted report
  
  watch             Continuous monitoring (daemon mode)
    --interval N    Check every N minutes (default: 60)
  
  intelligence      Get current intelligence summary
  
  opportunity       Send findings to opportunity team
  
  vault             Store insights in vault for long-term memory
  
  status            Show monitor status and last scan time

Examples:
  bun monitor.ts scan
  bun monitor.ts scan --market delivery
  bun monitor.ts watch --interval 30
  bun monitor.ts report
  bun monitor.ts opportunity
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case "scan": {
      const market = args.includes("--market") 
        ? args[args.indexOf("--market") + 1] as "delivery" | "taxi"
        : undefined;
      const report = await runScan(market);
      const savedPath = saveReport(report);
      console.log(`\n✅ Report saved: ${savedPath}\n`);
      break;
    }
    
    case "report": {
      const report = await runScan();
      const savedPath = saveReport(report);
      console.log(`\n✅ Report saved: ${savedPath}\n`);
      console.log(report.summary);
      break;
    }
    
    case "watch": {
      const intervalArg = args.indexOf("--interval");
      const interval = intervalArg >= 0 
        ? parseInt(args[intervalArg + 1]) 
        : 60;
      
      console.log(`\n👀 Starting continuous monitoring (every ${interval} minutes)...\n`);
      console.log("Press Ctrl+C to stop\n");
      
      const run = async () => {
        const report = await runScan();
        saveReport(report);
        if (report.alerts.some(a => a.impact === "high")) {
          await sendToOpportunityTeam(report);
        }
      };
      
      await run();
      setInterval(run, interval * 60 * 1000);
      break;
    }
    
    case "intelligence": {
      const files = fs.readdirSync(INTELLIGENCE_DIR)
        .filter(f => f.startsWith("report-"))
        .sort()
        .reverse();
      
      if (files.length === 0) {
        console.log("\nNo intelligence reports found. Run 'scan' first.\n");
        return;
      }
      
      const latest = fs.readFileSync(`${INTELLIGENCE_DIR}/${files[0]}`, "utf-8");
      console.log(`\n📊 Latest Intelligence (${files[0]})\n`);
      console.log(latest);
      break;
    }
    
    case "opportunity": {
      const report = await runScan();
      await sendToOpportunityTeam(report);
      break;
    }
    
    case "vault": {
      const report = await runScan();
      const vaultNote = `Competitor Intelligence ${report.date}

${report.summary}

Delivery insights: ${report.markets.delivery.insights.join("; ")}
Taxi insights: ${report.markets.taxi.insights.join("; ")}
Alerts: ${report.alerts.length} (${report.alerts.filter(a => a.impact === "high").length} high impact)`;
      
      // Call vault-commands to store
      const vaultProc = spawn("bun", [
        "/home/workspace/Skills/vault-commands/scripts/agent.ts",
        "note",
        "--topic", "competitor-intelligence",
        "--content", vaultNote
      ]);
      
      vaultProc.stdout.on("data", (data) => console.log(data.toString()));
      vaultProc.on("close", () => console.log("\n✅ Stored in vault\n"));
      break;
    }
    
    case "status": {
      const files = fs.readdirSync(INTELLIGENCE_DIR)
        .filter(f => f.startsWith("report-"));
      
      console.log("\n📊 Competitor Monitor Status\n");
      console.log(`   Reports: ${files.length}`);
      
      if (files.length > 0) {
        const latest = files.sort().reverse()[0];
        const stats = fs.statSync(`${INTELLIGENCE_DIR}/${latest}`);
        console.log(`   Last scan: ${stats.mtime.toISOString()}`);
      }
      console.log("");
      break;
    }
    
    case "help":
    default:
      showHelp();
  }
}

main().catch(console.error);
