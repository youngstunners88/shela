#!/usr/bin/env bun
/**
 * Nduna Integration - Competitor Intelligence for Nduna Bot
 * 
 * This module provides competitor intelligence directly to Nduna,
 * enabling the bot to respond with market-aware context.
 */

import * as fs from "fs";

const INTELLIGENCE_DIR = "/home/workspace/Boober/competitor-intelligence";
const CACHE_FILE = `${INTELLIGENCE_DIR}/nduna-cache.json`;

interface CompetitorInsight {
  competitor: string;
  market: "delivery" | "taxi";
  insight: string;
  impact: "low" | "medium" | "high";
  opportunity: string;
  timestamp: string;
}

interface NdunaCache {
  lastUpdate: string;
  insights: CompetitorInsight[];
  opportunities: string[];
  alerts: string[];
}

/**
 * Get the latest competitor intelligence for Nduna context
 */
export async function getCompetitorContext(): Promise<string> {
  const cache = loadCache();
  
  if (!cache || isStale(cache.lastUpdate)) {
    await refreshCache();
    return getCompetitorContext();
  }
  
  // Build context string for Nduna
  let context = "## Competitor Intelligence\n\n";
  
  // Group by market
  const delivery = cache.insights.filter(i => i.market === "delivery");
  const taxi = cache.insights.filter(i => i.market === "taxi");
  
  if (delivery.length > 0) {
    context += "### Delivery Market (iHhashi)\n";
    for (const i of delivery.slice(0, 5)) {
      context += `- **${i.competitor}**: ${i.insight}\n`;
    }
    context += "\n";
  }
  
  if (taxi.length > 0) {
    context += "### Taxi Market (Boober)\n";
    for (const i of taxi.slice(0, 5)) {
      context += `- **${i.competitor}**: ${i.insight}\n`;
    }
    context += "\n";
  }
  
  if (cache.opportunities.length > 0) {
    context += "### Active Opportunities\n";
    for (const o of cache.opportunities.slice(0, 3)) {
      context += `- ${o}\n`;
    }
  }
  
  return context;
}

/**
 * Get actionable opportunities for marketing responses
 */
export function getOpportunities(): string[] {
  const cache = loadCache();
  return cache?.opportunities || [];
}

/**
 * Get high-impact alerts that need immediate attention
 */
export function getHighImpactAlerts(): CompetitorInsight[] {
  const cache = loadCache();
  if (!cache) return [];
  
  return cache.insights.filter(i => i.impact === "high");
}

/**
 * Check if a competitor has a promotion we should counter
 */
export function hasActivePromotion(competitor: string): { hasPromo: boolean; details?: string } {
  const cache = loadCache();
  if (!cache) return { hasPromo: false };
  
  const promo = cache.insights.find(
    i => i.competitor.toLowerCase() === competitor.toLowerCase() && 
         i.insight.toLowerCase().includes("promo")
  );
  
  if (promo) {
    return { hasPromo: true, details: promo.insight };
  }
  
  return { hasPromo: false };
}

/**
 * Get competitive pricing advantage messages for marketing
 */
export function getPricingAdvantages(): { delivery: string[]; taxi: string[] } {
  const cache = loadCache();
  if (!cache) return { delivery: [], taxi: [] };
  
  const advantages = {
    delivery: [] as string[],
    taxi: [] as string[]
  };
  
  for (const insight of cache.insights) {
    if (insight.insight.toLowerCase().includes("fee increase") || 
        insight.insight.toLowerCase().includes("raised prices")) {
      advantages[insight.market].push(
        `${insight.competitor} increased prices - highlight our competitive pricing`
      );
    }
    
    if (insight.insight.toLowerCase().includes("surge") && 
        insight.market === "taxi") {
      advantages.taxi.push(
        `${insight.competitor} surge pricing detected - market predictable pricing`
      );
    }
  }
  
  return advantages;
}

/**
 * Generate marketing talking points based on competitor intelligence
 */
export function generateTalkingPoints(market: "delivery" | "taxi"): string[] {
  const cache = loadCache();
  const points: string[] = [];
  
  if (!cache) return points;
  
  const marketInsights = cache.insights.filter(i => i.market === market);
  const appName = market === "delivery" ? "iHhashi" : "Boober";
  
  for (const insight of marketInsights) {
    if (insight.insight.toLowerCase().includes("increase")) {
      points.push(`${appName} offers better value than ${insight.competitor}`);
    }
    
    if (insight.insight.toLowerCase().includes("surge")) {
      points.push(`${appName} has predictable, fair pricing`);
    }
    
    if (insight.insight.toLowerCase().includes("fee")) {
      points.push(`${appName} has transparent pricing with no hidden fees`);
    }
  }
  
  // Add opportunities as talking points
  points.push(...cache.opportunities.slice(0, 2));
  
  return [...new Set(points)]; // Remove duplicates
}

// Internal functions

function loadCache(): NdunaCache | null {
  if (!fs.existsSync(CACHE_FILE)) return null;
  
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function isStale(lastUpdate: string): boolean {
  const last = new Date(lastUpdate);
  const now = new Date();
  const hours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  return hours > 1; // Stale after 1 hour
}

async function refreshCache(): Promise<void> {
  // Run the monitor scan
  const { runScan } = await import("./monitor.ts");
  const report = await runScan();
  
  const insights: CompetitorInsight[] = [];
  const opportunities: string[] = [];
  const alerts: string[] = [];
  
  // Convert report to cache format
  for (const insight of report.markets.delivery.insights) {
    const match = insight.match(/\[(.*?)\]\s*(.*)/);
    if (match) {
      insights.push({
        competitor: match[1],
        market: "delivery",
        insight: match[2],
        impact: "medium",
        opportunity: "",
        timestamp: new Date().toISOString()
      });
    }
  }
  
  for (const insight of report.markets.taxi.insights) {
    const match = insight.match(/\[(.*?)\]\s*(.*)/);
    if (match) {
      insights.push({
        competitor: match[1],
        market: "taxi",
        insight: match[2],
        impact: "medium",
        opportunity: "",
        timestamp: new Date().toISOString()
      });
    }
  }
  
  for (const alert of report.alerts) {
    alerts.push(`[${alert.competitor}] ${alert.change}`);
    opportunities.push(alert.opportunity);
  }
  
  const cache: NdunaCache = {
    lastUpdate: new Date().toISOString(),
    insights,
    opportunities,
    alerts
  };
  
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case "context":
      console.log(await getCompetitorContext());
      break;
    
    case "opportunities":
      console.log(getOpportunities().join("\n"));
      break;
    
    case "alerts":
      const alerts = getHighImpactAlerts();
      console.log(JSON.stringify(alerts, null, 2));
      break;
    
    case "advantages":
      const advantages = getPricingAdvantages();
      console.log("Delivery:", advantages.delivery);
      console.log("Taxi:", advantages.taxi);
      break;
    
    case "talking-points":
      const market = (args[1] || "delivery") as "delivery" | "taxi";
      const points = generateTalkingPoints(market);
      console.log(points.join("\n"));
      break;
    
    case "refresh":
      await refreshCache();
      console.log("✅ Cache refreshed");
      break;
    
    default:
      console.log(`
Nduna Competitor Integration

Commands:
  context         Get full competitor context for Nduna
  opportunities   List active opportunities
  alerts          Get high-impact alerts
  advantages      Get pricing advantages for marketing
  talking-points  Generate marketing talking points
  refresh         Force refresh the cache

Usage:
  bun nduna-integration.ts context
  bun nduna-integration.ts talking-points delivery
  bun nduna-integration.ts refresh
`);
  }
}

export {
  getCompetitorContext,
  getOpportunities,
  getHighImpactAlerts,
  hasActivePromotion,
  getPricingAdvantages,
  generateTalkingPoints
};
