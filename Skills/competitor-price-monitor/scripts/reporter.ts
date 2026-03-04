import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const REPORTS_DIR = join(process.cwd(), "reports");

interface ReportSummary {
  date: string;
  delivery: {
    competitors: string[];
    keyInsights: string[];
    alerts: string[];
  };
  taxi: {
    competitors: string[];
    keyInsights: string[];
    alerts: string[];
  };
  opportunities: string[];
}

function loadLatestReports(days: number): { date: string; content: string }[] {
  const files = readdirSync(REPORTS_DIR)
    .filter(f => f.startsWith("report-") && f.endsWith(".md"))
    .sort()
    .reverse()
    .slice(0, days);
  
  return files.map(file => {
    const dateMatch = file.match(/report-(\d{4}-\d{2}-\d{2})/);
    return {
      date: dateMatch ? dateMatch[1] : "unknown",
      content: readFileSync(join(REPORTS_DIR, file), "utf-8")
    };
  });
}

function extractSection(content: string, sectionStart: string, sectionEnd: string): string {
  const start = content.indexOf(sectionStart);
  const end = content.indexOf(sectionEnd, start);
  if (start === -1) return "";
  return content.slice(start, end === -1 ? undefined : end);
}

function extractList(content: string, heading: string): string[] {
  const regex = new RegExp(`### ${heading}\\s*([\\s\\S]*?)(?=###|$)`, "i");
  const match = content.match(regex);
  if (!match) return [];
  return match[1].split("\n")
    .map((l: string) => l.replace(/^- /, "").trim())
    .filter((l: string) => l.length > 0);
}

function extractCompetitors(content: string): string[] {
  const matches = content.matchAll(/\*\*\[([^\]]+)\]/g);
  return [...new Set([...matches].map(m => m[1]))];
}

function generateDailySummary(): ReportSummary | null {
  const reports = loadLatestReports(1);
  if (reports.length === 0) return null;
  
  const latest = reports[0];
  const deliverySection = extractSection(latest.content, "## Delivery Market", "## Taxi Market");
  const taxiSection = extractSection(latest.content, "## Taxi Market", "## Alerts");
  const alertsSection = extractSection(latest.content, "## Alerts", "");
  
  return {
    date: latest.date,
    delivery: {
      competitors: extractCompetitors(deliverySection),
      keyInsights: extractList(deliverySection, "Key Insights").slice(0, 3),
      alerts: extractList(alertsSection, "").filter((l: string) => l.includes("Delivery"))
    },
    taxi: {
      competitors: extractCompetitors(taxiSection),
      keyInsights: extractList(taxiSection, "Key Insights").slice(0, 3),
      alerts: extractList(alertsSection, "").filter((l: string) => l.includes("Taxi"))
    },
    opportunities: [
      ...extractList(deliverySection, "Opportunities"),
      ...extractList(taxiSection, "Opportunities")
    ].slice(0, 3)
  };
}

function generateWeeklySummary(): string {
  const reports = loadLatestReports(7);
  if (reports.length === 0) return "No reports available for weekly summary";
  
  const allCompetitors = new Set<string>();
  const allDeliveryInsights: string[] = [];
  const allTaxiInsights: string[] = [];
  const allAlerts: string[] = [];
  const allOpportunities: string[] = [];
  
  for (const report of reports) {
    const deliverySection = extractSection(report.content, "## Delivery Market", "## Taxi Market");
    const taxiSection = extractSection(report.content, "## Taxi Market", "## Alerts");
    const alertsSection = extractSection(report.content, "## Alerts", "");
    
    extractCompetitors(deliverySection).forEach(c => allCompetitors.add(c));
    extractCompetitors(taxiSection).forEach(c => allCompetitors.add(c));
    allDeliveryInsights.push(...extractList(deliverySection, "Key Insights"));
    allTaxiInsights.push(...extractList(taxiSection, "Key Insights"));
    allAlerts.push(...extractList(alertsSection, ""));
    allOpportunities.push(...extractList(deliverySection, "Opportunities"));
    allOpportunities.push(...extractList(taxiSection, "Opportunities"));
  }
  
  const uniqueDeliveryInsights = [...new Set(allDeliveryInsights)].slice(0, 5);
  const uniqueTaxiInsights = [...new Set(allTaxiInsights)].slice(0, 5);
  const uniqueAlerts = [...new Set(allAlerts)].slice(0, 5);
  const uniqueOpportunities = [...new Set(allOpportunities)].slice(0, 5);
  
  return `# Weekly Competitor Summary
*Generated ${new Date().toISOString().split('T')[0]}*

## Overview
- **Reports analyzed**: ${reports.length} days
- **Competitors tracked**: ${allCompetitors.size} (${[...allCompetitors].slice(0, 5).join(", ")}${allCompetitors.size > 5 ? "..." : ""})

## Delivery Market (iHhashi)
${uniqueDeliveryInsights.length > 0 
  ? uniqueDeliveryInsights.map(i => `- ${i}`).join("\n")
  : "- No significant insights this week"}

## Taxi Market (Boober)
${uniqueTaxiInsights.length > 0 
  ? uniqueTaxiInsights.map(i => `- ${i}`).join("\n")
  : "- No significant insights this week"}

## Key Alerts This Week
${uniqueAlerts.length > 0 
  ? uniqueAlerts.map(a => `- ${a}`).join("\n")
  : "- No critical alerts"}

## Top Opportunities
${uniqueOpportunities.length > 0 
  ? uniqueOpportunities.map(o => `- ${o}`).join("\n")
  : "- No opportunities identified"}

---
*Last 7 days: ${reports.map(r => r.date).join(", ")}*
`;
}

function formatDailySummary(summary: ReportSummary): string {
  return `# Daily Competitor Briefing
*${summary.date}*

## Delivery Market (iHhashi)
**Competitors**: ${summary.delivery.competitors.join(", ")}

Key Insights:
${summary.delivery.keyInsights.map(i => `- ${i}`).join("\n") || "- No major changes"}

${summary.delivery.alerts.length > 0 ? `Alerts:\n${summary.delivery.alerts.map(a => `⚠️ ${a}`).join("\n")}` : ""}

## Taxi Market (Boober)
**Competitors**: ${summary.taxi.competitors.join(", ")}

Key Insights:
${summary.taxi.keyInsights.map(i => `- ${i}`).join("\n") || "- No major changes"}

${summary.taxi.alerts.length > 0 ? `Alerts:\n${summary.taxi.alerts.map(a => `⚠️ ${a}`).join("\n")}` : ""}

## Opportunities
${summary.opportunities.map(o => `💡 ${o}`).join("\n") || "- No new opportunities today"}

---
*Quick briefing • Use \`bun intelligence.ts all\` for full analysis*
`;
}

function formatSlackDaily(summary: ReportSummary): string {
  const deliveryAlerts = summary.delivery.alerts.length > 0 
    ? `\n  ⚠️ ${summary.delivery.alerts.length} alert(s)`
    : "";
  const taxiAlerts = summary.taxi.alerts.length > 0 
    ? `\n  ⚠️ ${summary.taxi.alerts.length} alert(s)`
    : "";
  
  return `📊 *Daily Competitor Briefing - ${summary.date}*

*Delivery (iHhashi)*
• Tracked: ${summary.delivery.competitors.length} competitors${deliveryAlerts}
• ${summary.delivery.keyInsights[0] || "No major changes"}

*Taxi (Boober)*
• Tracked: ${summary.taxi.competitors.length} competitors${taxiAlerts}
• ${summary.taxi.keyInsights[0] || "No major changes"}

*Opportunities*: ${summary.opportunities.length > 0 ? summary.opportunities[0] : "None today"}

_Use \`bun reporter.ts full\` for detailed report_`;
}

async function main() {
  const command = process.argv[2] || "daily";
  
  if (command === "weekly" || command === "week") {
    const weekly = generateWeeklySummary();
    console.log(weekly);
    
    // Save to file
    const filename = `weekly-${new Date().toISOString().split('T')[0]}.md`;
    writeFileSync(join(REPORTS_DIR, filename), weekly);
    console.log(`\n✅ Saved to reports/${filename}`);
    return;
  }
  
  if (command === "slack") {
    const daily = generateDailySummary();
    if (!daily) {
      console.log("No reports available");
      return;
    }
    console.log(formatSlackDaily(daily));
    return;
  }
  
  if (command === "full") {
    const daily = generateDailySummary();
    if (!daily) {
      console.log("No reports available");
      return;
    }
    console.log(formatDailySummary(daily));
    return;
  }
  
  // Default: daily
  console.log(`
📊 Competitor Reporter

Usage:
  bun reporter.ts daily    Today's briefing (default)
  bun reporter.ts weekly   Weekly summary
  bun reporter.ts slack    Slack-formatted daily
  bun reporter.ts full     Full daily report

`);
  
  const daily = generateDailySummary();
  if (!daily) {
    console.log("No reports available. Run the monitor first: bun run-monitor.ts");
    return;
  }
  
  console.log(`📅 Daily Briefing for ${daily.date}\n`);
  console.log("Delivery:", daily.delivery.competitors.slice(0, 3).join(", ") || "No data");
  console.log("Taxi:", daily.taxi.competitors.slice(0, 3).join(", ") || "No data");
  console.log("\nTop insight:", daily.delivery.keyInsights[0] || daily.taxi.keyInsights[0] || "None");
  
  if (daily.opportunities.length > 0) {
    console.log("\n💡 Opportunity:", daily.opportunities[0]);
  }
  
  const totalAlerts = daily.delivery.alerts.length + daily.taxi.alerts.length;
  if (totalAlerts > 0) {
    console.log(`\n⚠️ ${totalAlerts} alert(s) require attention`);
  }
}

main().catch(console.error);
