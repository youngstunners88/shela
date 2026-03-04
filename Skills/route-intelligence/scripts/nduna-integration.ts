#!/usr/bin/env bun
/**
 * Nduna Bot Integration for Route Intelligence
 * 
 * This module provides functions that Nduna can call to:
 * - Get route intelligence before dispatching drivers
 * - Submit driver feedback after deliveries
 * - Check competitor pricing in delivery areas
 * - Get strategic insights for decision making
 */

const DB_PATH = process.env.ROUTE_INTEL_DB || "/home/workspace/.route-intelligence";

export interface RouteIntel {
  eta_adjustment: number;
  confidence: number;
  nearby_insights: DriverInsight[];
  recommended_actions: string[];
}

export interface DriverInsight {
  type: string;
  note: string;
  lat: number;
  lng: number;
  verified: boolean;
}

export interface CompetitorSnapshot {
  competitor: string;
  area: string;
  base_fee: number;
  surge_multiplier: number;
  timestamp: string;
}

/**
 * Get route intelligence for a delivery
 * Call this before dispatching a driver
 */
export async function getRouteIntel(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  timeOfDay?: number
): Promise<RouteIntel> {
  const fs = require('fs');
  const path = require('path');
  
  const project = 'ihhashi';
  const routesDir = path.join(DB_PATH, 'projects', project, 'routes');
  const insightsDir = path.join(DB_PATH, 'projects', project, 'insights');
  
  // Load route data
  const routes: any[] = [];
  if (fs.existsSync(routesDir)) {
    for (const file of fs.readdirSync(routesDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(routesDir, file), 'utf8'));
      routes.push(data);
    }
  }
  
  // Calculate ETA adjustment
  let totalExpected = 0;
  let totalActual = 0;
  let relevantRoutes = 0;
  
  const hour = timeOfDay ?? new Date().getHours();
  
  for (const route of routes) {
    // Weight routes by time-of-day similarity
    const hourDiff = Math.abs(route.time_of_day - hour);
    const weight = 1 / (1 + hourDiff);
    
    totalExpected += route.expected_seconds * weight;
    totalActual += route.actual_seconds * weight;
    relevantRoutes += weight;
  }
  
  const etaAdjustment = relevantRoutes > 0 ? totalActual / totalExpected : 1;
  const confidence = Math.min(relevantRoutes / 5, 1);
  
  // Get nearby insights
  const insights: DriverInsight[] = [];
  if (fs.existsSync(insightsDir)) {
    for (const file of fs.readdirSync(insightsDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(insightsDir, file), 'utf8'));
      
      // Check if insight is near route
      const dFrom = Math.sqrt(
        Math.pow(data.lat - fromLat, 2) + Math.pow(data.lng - fromLng, 2)
      );
      const dTo = Math.sqrt(
        Math.pow(data.lat - toLat, 2) + Math.pow(data.lng - toLng, 2)
      );
      
      if (dFrom < 0.02 || dTo < 0.02) { // Within ~2km
        insights.push({
          type: data.type,
          note: data.note,
          lat: data.lat,
          lng: data.lng,
          verified: data.verified,
        });
      }
    }
  }
  
  // Generate recommendations
  const recommendedActions: string[] = [];
  
  if (etaAdjustment > 1.2) {
    recommendedActions.push(`Expect ${(etaAdjustment * 100 - 100).toFixed(0)}% longer travel time`);
  }
  
  const avoidInsights = insights.filter(i => i.type === 'avoid' || i.type === 'unsafe');
  if (avoidInsights.length > 0) {
    recommendedActions.push(`Avoid areas: ${avoidInsights.map(i => i.note).join(', ')}`);
  }
  
  const shortcutInsights = insights.filter(i => i.type === 'shortcut');
  if (shortcutInsights.length > 0) {
    recommendedActions.push(`Possible shortcut: ${shortcutInsights[0].note}`);
  }
  
  return {
    eta_adjustment: etaAdjustment,
    confidence,
    nearby_insights: insights.slice(0, 5),
    recommended_actions: recommendedActions,
  };
}

/**
 * Submit driver feedback after a delivery
 * Call this when driver completes a route
 */
export async function submitDriverFeedback(
  driverId: string,
  routeId: string,
  expectedSeconds: number,
  actualSeconds: number,
  feedback?: {
    type?: 'smooth' | 'ok' | 'delayed';
    delayReason?: string;
    shortcut?: string;
  }
): Promise<{ success: boolean; message: string }> {
  const { captureRouteTime, captureDriverInsight } = require('./capture');
  
  try {
    // Submit time data
    await captureRouteTime('ihhashi', {
      driver_id: driverId,
      route_id: routeId,
      expected_seconds: expectedSeconds,
      actual_seconds: actualSeconds,
    });
    
    // Submit feedback if provided
    if (feedback?.shortcut) {
      await captureDriverInsight('ihhashi', {
        driver_id: driverId,
        type: 'shortcut',
        lat: 0, // Would be populated with actual location
        lng: 0,
        note: feedback.shortcut,
      });
    }
    
    const timeDiff = actualSeconds - expectedSeconds;
    const percentDiff = ((actualSeconds / expectedSeconds - 1) * 100).toFixed(1);
    
    return {
      success: true,
      message: `Feedback recorded. Time difference: ${timeDiff > 0 ? '+' : ''}${(timeDiff / 60).toFixed(1)} min (${percentDiff}%)`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

/**
 * Get competitor pricing for an area
 * Call this for pricing decisions
 */
export async function getCompetitorPricing(area: string): Promise<CompetitorSnapshot[]> {
  const fs = require('fs');
  const path = require('path');
  
  const project = 'ihhashi';
  const competitorsDir = path.join(DB_PATH, 'projects', project, 'competitors');
  
  const snapshots: CompetitorSnapshot[] = [];
  
  if (fs.existsSync(competitorsDir)) {
    for (const file of fs.readdirSync(competitorsDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(competitorsDir, file), 'utf8'));
      if (data.area.toLowerCase() === area.toLowerCase()) {
        snapshots.push({
          competitor: data.competitor,
          area: data.area,
          base_fee: data.base_fee,
          surge_multiplier: data.surge_multiplier || 1,
          timestamp: data.timestamp,
        });
      }
    }
  }
  
  // Sort by timestamp (most recent first)
  snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  // Get most recent for each competitor
  const byCompetitor = new Map<string, CompetitorSnapshot>();
  for (const snap of snapshots) {
    if (!byCompetitor.has(snap.competitor)) {
      byCompetitor.set(snap.competitor, snap);
    }
  }
  
  return Array.from(byCompetitor.values());
}

/**
 * Get market intelligence summary
 * Call this for strategic decisions
 */
export async function getMarketIntel(area?: string): Promise<{
  avg_delivery_time_minutes: number;
  competitor_count: number;
  price_range: { min: number; max: number };
  insights_today: number;
}> {
  const fs = require('fs');
  const path = require('path');
  
  const project = 'ihhashi';
  const routesDir = path.join(DB_PATH, 'projects', project, 'routes');
  const competitorsDir = path.join(DB_PATH, 'projects', project, 'competitors');
  const insightsDir = path.join(DB_PATH, 'projects', project, 'insights');
  
  // Calculate average delivery time
  let totalTime = 0;
  let routeCount = 0;
  
  if (fs.existsSync(routesDir)) {
    for (const file of fs.readdirSync(routesDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(routesDir, file), 'utf8'));
      totalTime += data.actual_seconds;
      routeCount++;
    }
  }
  
  // Get price range
  let minPrice = Infinity;
  let maxPrice = 0;
  const competitors = new Set<string>();
  
  if (fs.existsSync(competitorsDir)) {
    for (const file of fs.readdirSync(competitorsDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(competitorsDir, file), 'utf8'));
      if (!area || data.area.toLowerCase() === area.toLowerCase()) {
        competitors.add(data.competitor);
        minPrice = Math.min(minPrice, data.base_fee);
        maxPrice = Math.max(maxPrice, data.base_fee);
      }
    }
  }
  
  // Count today's insights
  const today = new Date().toISOString().split('T')[0];
  let insightsToday = 0;
  
  if (fs.existsSync(insightsDir)) {
    for (const file of fs.readdirSync(insightsDir)) {
      const data = JSON.parse(fs.readFileSync(path.join(insightsDir, file), 'utf8'));
      if (data.created_at?.startsWith(today)) {
        insightsToday++;
      }
    }
  }
  
  return {
    avg_delivery_time_minutes: routeCount > 0 ? totalTime / routeCount / 60 : 0,
    competitor_count: competitors.size,
    price_range: {
      min: minPrice === Infinity ? 0 : minPrice,
      max: maxPrice,
    },
    insights_today: insightsToday,
  };
}

// CLI for testing
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  async function test() {
    switch (command) {
      case 'route': {
        const intel = await getRouteIntel(-26.2041, 28.0473, -26.1951, 28.0553);
        console.log('Route Intelligence:', JSON.stringify(intel, null, 2));
        break;
      }
      
      case 'competitors': {
        const pricing = await getCompetitorPricing('sandton');
        console.log('Competitor Pricing:', JSON.stringify(pricing, null, 2));
        break;
      }
      
      case 'market': {
        const intel = await getMarketIntel();
        console.log('Market Intel:', JSON.stringify(intel, null, 2));
        break;
      }
      
      default:
        console.log(`
Usage:
  bun nduna-integration.ts route - Get route intelligence
  bun nduna-integration.ts competitors - Get competitor pricing
  bun nduna-integration.ts market - Get market intelligence
`);
    }
  }
  
  test();
}
