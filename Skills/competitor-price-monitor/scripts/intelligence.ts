import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const REPORTS_DIR = join(process.cwd(), "reports");

interface QueryResult {
  query: string;
  result: string;
  confidence: "high" | "medium" | "low";
  sources: string[];
  timestamp: string;
}

interface ParsedReport {
  date: string;
  markets: {
    delivery: {
      competitors: string[];
      insights: string[];
      opportunities: string[];
    };
    taxi: {
      competitors: string[];
      insights: string[];
      opportunities: string[];
    };
  };
  alerts: { competitor: string; change: string; market: string; impact: string }[];
}

const QUERIES: { [key: string]: { description: string; handler: () => Promise<string> } } = {
  "cheapest-delivery": {
    description: "Who has the lowest delivery fees?",
    handler: async () => {
      const reports = loadLatestReports(7);
      const fees: { [competitor: string]: number[] } = {};
      
      for (const report of reports) {
        for (const insight of report.markets.delivery.insights) {
          const match = insight.match(/\[([^\]]+)\].*?fees?[:\s]+R?(\d+)/i);
          if (match) {
            const competitor = match[1];
            if (!fees[competitor]) fees[competitor] = [];
            fees[competitor].push(parseInt(match[2]));
          }
        }
      }
      
      const averages = Object.entries(fees).map(([name, amounts]) => ({
        name,
        avgFee: amounts.reduce((a, b) => a + b, 0) / amounts.length
      }));
      
      const sorted = averages.sort((a, b) => a.avgFee - b.avgFee);
      
      return sorted.length > 0 
        ? `${sorted[0].name} has the lowest average delivery fee at R${sorted[0].avgFee.toFixed(0)}. Full ranking: ${sorted.map(s => `${s.name} (R${s.avgFee.toFixed(0)})`).join(", ")}`
        : "No delivery fee data found in recent reports";
    }
  },
  
  "surge-patterns": {
    description: "When do competitors surge?",
    handler: async () => {
      const reports = loadLatestReports(30);
      const patterns: string[] = [];
      
      for (const report of reports) {
        for (const insight of report.markets.delivery.insights) {
          if (insight.toLowerCase().includes("surge") || insight.toLowerCase().includes("peak")) {
            patterns.push(`[${report.date}] ${insight}`);
          }
        }
      }
      
      return patterns.length > 0 
        ? `Surge patterns observed:\n${patterns.slice(0, 5).join("\n")}`
        : "No surge patterns found in recent reports";
    }
  },
  
  "active-promotions": {
    description: "What promotions are active?",
    handler: async () => {
      const reports = loadLatestReports(7);
      const promos: { [competitor: string]: string[] } = {};
      
      for (const report of reports) {
        for (const insight of report.markets.delivery.insights) {
          if (insight.toLowerCase().includes("promo") || insight.toLowerCase().includes("discount")) {
            const competitor = insight.match(/\[([^\]]+)\]/)?.[1] || "Unknown";
            if (!promos[competitor]) promos[competitor] = [];
            promos[competitor].push(insight);
          }
        }
      }
      
      const summary = Object.entries(promos)
        .map(([competitor, items]) => `${competitor}: ${[...new Set(items)].slice(0, 2).join("; ")}`)
        .join("\n");
      
      return summary || "No active promotions found";
    }
  },
  
  "market-gaps": {
    description: "What market gaps exist?",
    handler: async () => {
      const reports = loadLatestReports(7);
      const gaps: string[] = [];
      
      for (const report of reports) {
        gaps.push(...report.markets.delivery.opportunities);
        gaps.push(...report.markets.taxi.opportunities);
      }
      
      const unique = [...new Set(gaps)];
      return unique.length > 0 
        ? `Market gaps:\n${unique.slice(0, 5).join("\n")}`
        : "No significant market gaps identified";
    }
  },
  
  "ihhashi-opportunities": {
    description: "Strategic opportunities for iHhashi",
    handler: async () => {
      const reports = loadLatestReports(7);
      const opportunities: string[] = [];
      
      for (const report of reports) {
        opportunities.push(...report.markets.delivery.opportunities);
        for (const alert of report.alerts) {
          if (alert.market === "delivery" && alert.impact === "high") {
            opportunities.push(`${alert.competitor}: ${alert.change}`);
          }
        }
      }
      
      const unique = [...new Set(opportunities)];
      return unique.length > 0 
        ? `Opportunities:\n${unique.slice(0, 5).join("\n")}`
        : "No specific opportunities found for iHhashi";
    }
  },
  
  "boober-opportunities": {
    description: "Strategic opportunities for Boober",
    handler: async () => {
      const reports = loadLatestReports(7);
      const opportunities: string[] = [];
      
      for (const report of reports) {
        opportunities.push(...report.markets.taxi.opportunities);
        for (const alert of report.alerts) {
          if (alert.market === "taxi" && alert.impact === "high") {
            opportunities.push(`${alert.competitor}: ${alert.change}`);
          }
        }
      }
      
      const unique = [...new Set(opportunities)];
      return unique.length > 0 
        ? `Opportunities:\n${unique.slice(0, 5).join("\n")}`
        : "No specific opportunities found for Boober";
    }
  },
  
  "price-trends": {
    description: "How have prices changed over time?",
    handler: async () => {
      const reports = loadLatestReports(30);
      if (reports.length < 2) {
        return "Need more reports for trend analysis (minimum 2)";
      }
      
      const trends: string[] = [];
      const priceHistory: { [competitor: string]: { date: string; prices: number[] }[] } = {};
      
      for (const report of reports) {
        const content = readFileSync(join(REPORTS_DIR, `report-${report.date}.md`), "utf-8");
        const priceMatch = content.match(/\[([^\]]+)\].*?R(\d+)/g);
        if (priceMatch) {
          for (const match of priceMatch) {
            const competitor = match.match(/\[([^\]]+)\]/)?.[1] || "Unknown";
            const price = parseInt(match.match(/R(\d+)/)?.[1] || "0");
            if (!priceHistory[competitor]) priceHistory[competitor] = [];
            priceHistory[competitor].push({ date: report.date, prices: [price] });
          }
        }
      }
      
      for (const [competitor, history] of Object.entries(priceHistory)) {
        if (history.length >= 2) {
          trends.push(`${competitor}: ${history.length} price observations over ${reports.length} reports`);
        }
      }
      
      return trends.length > 0 
        ? `Trends:\n${trends.join("\n")}`
        : "No significant price trends detected";
    }
  },
  
  "competitor-activity": {
    description: "Recent competitor activity summary",
    handler: async () => {
      const reports = loadLatestReports(7);
      const activity: { [competitor: string]: string[] } = {};
      
      for (const report of reports) {
        for (const alert of report.alerts) {
          if (!activity[alert.competitor]) activity[alert.competitor] = [];
          activity[alert.competitor].push(alert.change);
        }
      }
      
      const summary = Object.entries(activity)
        .map(([competitor, items]) => `${competitor}:\n  ${[...new Set(items)].join(", ")}`)
        .join("\n\n");
      
      return summary || "No significant competitor activity in the past week";
    }
  }
};

function loadLatestReports(days: number): ParsedReport[] {
  const files = readdirSync(REPORTS_DIR)
    .filter(f => f.startsWith("report-") && f.endsWith(".md"))
    .sort()
    .reverse()
    .slice(0, days);
  
  const reports: ParsedReport[] = [];
  
  for (const file of files) {
    const dateMatch = file.match(/report-(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    
    const content = readFileSync(join(REPORTS_DIR, file), "utf-8");
    reports.push({
      date: dateMatch[1],
      markets: {
        delivery: {
          competitors: extractCompetitors(content, "Delivery"),
          insights: extractInsights(content, "Delivery"),
          opportunities: extractOpportunities(content, "Delivery")
        },
        taxi: {
          competitors: extractCompetitors(content, "Taxi"),
          insights: extractInsights(content, "Taxi"),
          opportunities: extractOpportunities(content, "Taxi")
        }
      },
      alerts: extractAlerts(content)
    });
  }
  
  return reports;
}

function extractCompetitors(content: string, market: string): string[] {
  const section = content.split(`## ${market} Market`)[1]?.split("##")[0] || "";
  const competitors: string[] = [];
  const matches = section.matchAll(/\*\*\[([^\]]+)\]/g);
  for (const match of matches) {
    competitors.push(match[1]);
  }
  return [...new Set(competitors)];
}

function extractInsights(content: string, market: string): string[] {
  const section = content.split(`## ${market} Market`)[1]?.split("##")[0] || "";
  const insightsMatch = section.match(/### Key Insights\s*([\s\S]*?)(?=###|$)/);
  if (insightsMatch) {
    return insightsMatch[1].split("\n")
      .map(l => l.replace(/^- /, "").trim())
      .filter(l => l.length > 0);
  }
  return [];
}

function extractOpportunities(content: string, market: string): string[] {
  const section = content.split(`## ${market} Market`)[1]?.split("##")[0] || "";
  const oppsMatch = section.match(/### Opportunities\s*([\s\S]*?)(?=###|$)/);
  if (oppsMatch) {
    return oppsMatch[1].split("\n")
      .map(l => l.replace(/^- /, "").trim())
      .filter(l => l.length > 0);
  }
  return [];
}

function extractAlerts(content: string): { competitor: string; change: string; market: string; impact: string }[] {
  const alertsMatch = content.match(/## Alerts\s*([\s\S]*?)$/);
  if (!alertsMatch) return [];
  
  const alerts: { competitor: string; change: string; market: string; impact: string }[] = [];
  const lines = alertsMatch[1].split("\n");
  
  for (const line of lines) {
    if (line.includes("**[")) {
      const match = line.match(/\*\*\[([^\]]+)\]\*\*\s*(.+)/);
      if (match) {
        alerts.push({
          competitor: match[1],
          change: match[2].trim(),
          market: line.toLowerCase().includes("delivery") ? "delivery" : "taxi",
          impact: line.includes("HIGH") ? "high" : line.includes("MEDIUM") ? "medium" : "low"
        });
      }
    }
  }
  return alerts;
}

async function runQuery(queryName: string): Promise<QueryResult> {
  if (!QUERIES[queryName]) {
    return {
      query: queryName,
      result: `Unknown query: ${queryName}. Available queries: ${Object.keys(QUERIES).join(", ")}`,
      confidence: "low",
      sources: [],
      timestamp: new Date().toISOString()
    };
  }
  
  const reports = loadLatestReports(30);
  const result = await QUERIES[queryName].handler();
  
  return {
    query: queryName,
    result,
    confidence: reports.length >= 3 ? "high" : reports.length >= 1 ? "medium" : "low",
    sources: reports.map(r => `report-${r.date}.md`),
    timestamp: new Date().toISOString()
  };
}

function showHelp() {
  console.log(`
📊 Intelligence Queries - Competitor Price Monitor

Usage:
  bun intelligence.ts <query-name>
  bun intelligence.ts list
  bun intelligence.ts all

Available Queries:
${Object.entries(QUERIES).map(([name, q]) => `  ${name.padEnd(20)} ${q.description}`).join("\n")}
`);
}

async function main() {
  const command = process.argv[2];
  
  if (!command || command === "help" || command === "--help") {
    showHelp();
    return;
  }
  
  if (command === "list") {
    console.log("\n📊 Available Queries:");
    for (const [name, q] of Object.entries(QUERIES)) {
      console.log(`  ${name.padEnd(20)} ${q.description}`);
    }
    return;
  }
  
  if (command === "all") {
    console.log("\n📊 Running all queries...\n");
    for (const [name, q] of Object.entries(QUERIES)) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`Query: ${name}`);
      console.log(`Description: ${q.description}`);
      console.log(`${"=".repeat(60)}\n`);
      
      const result = await runQuery(name);
      console.log(result.result);
      console.log(`\nConfidence: ${result.confidence}`);
      console.log(`Sources: ${result.sources.join(", ")}`);
    }
    console.log("\n✅ Complete");
    return;
  }
  
  // Run specific query
  console.log(`\n📊 Query: ${command}\n`);
  const result = await runQuery(command);
  console.log(`${"─".repeat(60)}`);
  console.log(result.result);
  console.log(`${"=".repeat(60)}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Sources: ${result.sources.join(", ") || "none"}`);
  console.log(`Timestamp: ${result.timestamp}\n`);
}

main().catch(console.error);
