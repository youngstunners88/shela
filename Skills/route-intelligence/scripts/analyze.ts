#!/usr/bin/env bun
/**
 * Analyze Route Intelligence Data
 */

const DB_PATH = process.env.ROUTE_INTEL_DB || "/home/workspace/.route-intelligence";

interface RouteIntelligence {
  segments: any[];
  insights: any[];
  eta_adjustment: number;
  confidence: number;
}

interface CompetitorAnalysis {
  competitors: { [key: string]: any[] };
  price_comparison: { [area: string]: { [competitor: string]: number } };
  opportunities: string[];
}

async function analyzeRoutes(project: string, from: string, to: string): Promise<RouteIntelligence> {
  const fs = require('fs');
  const path = require('path');
  
  const routesDir = path.join(DB_PATH, 'projects', project, 'routes');
  const insightsDir = path.join(DB_PATH, 'projects', project, 'insights');
  
  // Load all route records
  const routes: any[] = [];
  if (fs.existsSync(routesDir)) {
    for (const file of fs.readdirSync(routesDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(routesDir, file), 'utf8'));
      routes.push(data);
    }
  }
  
  // Load all insights
  const insights: any[] = [];
  if (fs.existsSync(insightsDir)) {
    for (const file of fs.readdirSync(insightsDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(insightsDir, file), 'utf8'));
      insights.push(data);
    }
  }
  
  // Calculate ETA adjustment factor
  let totalExpected = 0;
  let totalActual = 0;
  let count = 0;
  
  for (const route of routes) {
    totalExpected += route.expected_seconds;
    totalActual += route.actual_seconds;
    count++;
  }
  
  const etaAdjustment = count > 0 ? totalActual / totalExpected : 1;
  const confidence = Math.min(count / 10, 1); // Max confidence at 10+ samples
  
  // Filter insights near the route
  const [fromLat, fromLng] = from.split(',').map(parseFloat);
  const [toLat, toLng] = to.split(',').map(parseFloat);
  
  const nearbyInsights = insights.filter(insight => {
    const dFrom = Math.sqrt(
      Math.pow(insight.lat - fromLat, 2) + Math.pow(insight.lng - fromLng, 2)
    );
    const dTo = Math.sqrt(
      Math.pow(insight.lat - toLat, 2) + Math.pow(insight.lng - toLng, 2)
    );
    return dFrom < 0.05 || dTo < 0.05; // Within ~5km
  });
  
  const result: RouteIntelligence = {
    segments: routes.slice(-10),
    insights: nearbyInsights,
    eta_adjustment: etaAdjustment,
    confidence,
  };
  
  console.log(`\n📊 Route Intelligence Analysis`);
  console.log(`   Project: ${project}`);
  console.log(`   From: ${from}`);
  console.log(`   To: ${to}`);
  console.log(`\n   ETA Adjustment Factor: ${etaAdjustment.toFixed(2)}x`);
  console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`);
  console.log(`   Sample Size: ${count} routes`);
  console.log(`   Nearby Insights: ${nearbyInsights.length}`);
  
  if (nearbyInsights.length > 0) {
    console.log(`\n   Recent Insights:`);
    for (const insight of nearbyInsights.slice(0, 5)) {
      console.log(`   - [${insight.type}] ${insight.note}`);
    }
  }
  
  return result;
}

async function analyzeCompetitors(project: string, area?: string): Promise<CompetitorAnalysis> {
  const fs = require('fs');
  const path = require('path');
  
  const competitorsDir = path.join(DB_PATH, 'projects', project, 'competitors');
  
  // Load all competitor records
  const records: any[] = [];
  if (fs.existsSync(competitorsDir)) {
    for (const file of fs.readdirSync(competitorsDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(competitorsDir, file), 'utf8'));
      if (!area || data.area === area) {
        records.push(data);
      }
    }
  }
  
  // Group by competitor
  const byCompetitor: { [key: string]: any[] } = {};
  for (const record of records) {
    if (!byCompetitor[record.competitor]) {
      byCompetitor[record.competitor] = [];
    }
    byCompetitor[record.competitor].push(record);
  }
  
  // Calculate average prices by area
  const priceByArea: { [area: string]: { [competitor: string]: number } } = {};
  for (const record of records) {
    if (!priceByArea[record.area]) {
      priceByArea[record.area] = {};
    }
    if (!priceByArea[record.area][record.competitor]) {
      priceByArea[record.area][record.competitor] = [];
    }
    priceByArea[record.area][record.competitor].push(record.base_fee);
  }
  
  // Average the prices
  for (const areaKey of Object.keys(priceByArea)) {
    for (const comp of Object.keys(priceByArea[areaKey])) {
      const prices = priceByArea[areaKey][comp];
      priceByArea[areaKey][comp] = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
    }
  }
  
  // Identify opportunities
  const opportunities: string[] = [];
  for (const [areaKey, prices] of Object.entries(priceByArea)) {
    const competitors = Object.keys(prices);
    if (competitors.length >= 2) {
      const minPrice = Math.min(...Object.values(prices) as number[]);
      const maxPrice = Math.max(...Object.values(prices) as number[]);
      const gap = (maxPrice - minPrice) / minPrice * 100;
      
      if (gap > 15) {
        opportunities.push(`${areaKey}: ${gap.toFixed(0)}% price gap (${competitors.join(' vs ')})`);
      }
    }
  }
  
  console.log(`\n📊 Competitor Analysis`);
  console.log(`   Project: ${project}`);
  if (area) console.log(`   Area: ${area}`);
  console.log(`\n   Competitors Tracked: ${Object.keys(byCompetitor).length}`);
  console.log(`   Total Records: ${records.length}`);
  
  console.log(`\n   Average Prices by Area:`);
  for (const [areaKey, prices] of Object.entries(priceByArea)) {
    console.log(`   ${areaKey}:`);
    for (const [comp, price] of Object.entries(prices)) {
      console.log(`     - ${comp}: R${(price as number).toFixed(2)}`);
    }
  }
  
  if (opportunities.length > 0) {
    console.log(`\n   🎯 Opportunities Identified:`);
    for (const opp of opportunities) {
      console.log(`     - ${opp}`);
    }
  }
  
  return {
    competitors: byCompetitor,
    price_comparison: priceByArea,
    opportunities,
  };
}

async function analyzeOpportunities(project: string, region?: string) {
  const competitorAnalysis = await analyzeCompetitors(project);
  
  console.log(`\n🎯 Strategic Opportunities for ${project}`);
  console.log(`\n   Pricing Gaps:`);
  for (const opp of competitorAnalysis.opportunities) {
    console.log(`   - ${opp}`);
  }
  
  console.log(`\n   Recommendations:`);
  console.log(`   - Focus on areas with >15% price gaps`);
  console.log(`   - Consider competitive pricing in high-gap areas`);
  console.log(`   - Monitor competitor surge patterns`);
  
  return competitorAnalysis;
}

// CLI
const args = process.argv.slice(2);
const type = args[0];
const projectIndex = args.indexOf('--project');

if (args.length < 2 || projectIndex === -1) {
  console.log(`
Usage:
  bun analyze.ts routes --project <name> --from <lat,lng> --to <lat,lng>
  bun analyze.ts competitors --project <name> [--area <area>]
  bun analyze.ts opportunities --project <name> [--region <region>]
`);
  process.exit(1);
}

const project = args[projectIndex + 1];

async function main() {
  switch (type) {
    case 'routes': {
      const fromIdx = args.indexOf('--from');
      const toIdx = args.indexOf('--to');
      
      if (fromIdx === -1 || toIdx === -1) {
        console.error('Missing --from or --to for routes analysis');
        process.exit(1);
      }
      
      await analyzeRoutes(project, args[fromIdx + 1], args[toIdx + 1]);
      break;
    }
    
    case 'competitors': {
      const areaIdx = args.indexOf('--area');
      await analyzeCompetitors(project, areaIdx !== -1 ? args[areaIdx + 1] : undefined);
      break;
    }
    
    case 'opportunities': {
      await analyzeOpportunities(project);
      break;
    }
    
    default:
      console.error(`Unknown analysis type: ${type}`);
      process.exit(1);
  }
}

main();
