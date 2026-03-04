#!/usr/bin/env bun
/**
 * Capture Route Intelligence Data
 */

const DB_PATH = process.env.ROUTE_INTEL_DB || "/home/workspace/.route-intelligence";

interface RouteTimeData {
  driver_id: string;
  route_id: string;
  segment_id?: string;
  expected_seconds: number;
  actual_seconds: number;
  time_of_day?: number;
  day_of_week?: number;
  weather?: string;
}

interface DriverInsight {
  driver_id: string;
  type: 'shortcut' | 'avoid' | 'slow_zone' | 'good_alternative' | 'road_work' | 'unsafe';
  lat: number;
  lng: number;
  note: string;
  saves_minutes?: number;
  applicable_hours?: { start: number; end: number };
}

interface CompetitorPrice {
  competitor: string;
  area: string;
  service_type: string;
  base_fee: number;
  per_km?: number;
  surge_multiplier?: number;
  min_order?: number;
  timestamp: string;
}

async function captureRouteTime(project: string, data: RouteTimeData) {
  const fs = require('fs');
  const path = require('path');
  
  const record = {
    id: `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...data,
    time_of_day: data.time_of_day ?? new Date().getHours(),
    day_of_week: data.day_of_week ?? new Date().getDay(),
    weather: data.weather ?? 'clear',
    created_at: new Date().toISOString(),
  };
  
  const filePath = path.join(DB_PATH, 'projects', project, 'routes', `${record.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  
  console.log(`✓ Route time captured: ${record.id}`);
  console.log(`  Expected: ${data.expected_seconds}s, Actual: ${data.actual_seconds}s`);
  console.log(`  Difference: ${data.actual_seconds - data.expected_seconds}s (${((data.actual_seconds / data.expected_seconds - 1) * 100).toFixed(1)}%)`);
  
  return record;
}

async function captureDriverInsight(project: string, data: DriverInsight) {
  const fs = require('fs');
  const path = require('path');
  
  const record = {
    id: `di_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...data,
    upvotes: 0,
    downvotes: 0,
    verified: false,
    created_at: new Date().toISOString(),
  };
  
  const filePath = path.join(DB_PATH, 'projects', project, 'insights', `${record.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  
  console.log(`✓ Driver insight captured: ${record.id}`);
  console.log(`  Type: ${data.type}`);
  console.log(`  Location: ${data.lat}, ${data.lng}`);
  console.log(`  Note: ${data.note}`);
  
  return record;
}

async function captureCompetitorPrice(project: string, data: CompetitorPrice) {
  const fs = require('fs');
  const path = require('path');
  
  const record = {
    id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  };
  
  const filePath = path.join(DB_PATH, 'projects', project, 'competitors', `${record.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  
  console.log(`✓ Competitor price captured: ${record.id}`);
  console.log(`  Competitor: ${data.competitor}`);
  console.log(`  Area: ${data.area}`);
  console.log(`  Base Fee: R${data.base_fee}`);
  if (data.surge_multiplier) console.log(`  Surge: ${data.surge_multiplier}x`);
  
  return record;
}

// CLI
const args = process.argv.slice(2);
const typeIndex = 0;
const projectIndex = args.indexOf('--project');

if (args.length < 2 || projectIndex === -1) {
  console.log(`
Usage:
  bun capture.ts route-times --project <name> --driver <id> --route <id> --expected <sec> --actual <sec>
  bun capture.ts driver-insight --project <name> --driver <id> --type <type> --lat <lat> --lng <lng> --note <note>
  bun capture.ts competitor-price --project <name> --competitor <name> --area <area> --fee <amount>
`);
  process.exit(1);
}

const type = args[typeIndex];
const project = args[projectIndex + 1];

async function main() {
  switch (type) {
    case 'route-times': {
      const driverIdx = args.indexOf('--driver');
      const routeIdx = args.indexOf('--route');
      const expectedIdx = args.indexOf('--expected');
      const actualIdx = args.indexOf('--actual');
      
      if (driverIdx === -1 || routeIdx === -1 || expectedIdx === -1 || actualIdx === -1) {
        console.error('Missing required fields for route-times');
        process.exit(1);
      }
      
      await captureRouteTime(project, {
        driver_id: args[driverIdx + 1],
        route_id: args[routeIdx + 1],
        expected_seconds: parseInt(args[expectedIdx + 1]),
        actual_seconds: parseInt(args[actualIdx + 1]),
      });
      break;
    }
    
    case 'driver-insight': {
      const driverIdx = args.indexOf('--driver');
      const typeIdx = args.indexOf('--type');
      const latIdx = args.indexOf('--lat');
      const lngIdx = args.indexOf('--lng');
      const noteIdx = args.indexOf('--note');
      
      if (driverIdx === -1 || typeIdx === -1 || latIdx === -1 || lngIdx === -1 || noteIdx === -1) {
        console.error('Missing required fields for driver-insight');
        process.exit(1);
      }
      
      await captureDriverInsight(project, {
        driver_id: args[driverIdx + 1],
        type: args[typeIdx + 1] as DriverInsight['type'],
        lat: parseFloat(args[latIdx + 1]),
        lng: parseFloat(args[lngIdx + 1]),
        note: args[noteIdx + 1],
      });
      break;
    }
    
    case 'competitor-price': {
      const competitorIdx = args.indexOf('--competitor');
      const areaIdx = args.indexOf('--area');
      const feeIdx = args.indexOf('--fee');
      
      if (competitorIdx === -1 || areaIdx === -1 || feeIdx === -1) {
        console.error('Missing required fields for competitor-price');
        process.exit(1);
      }
      
      const serviceIdx = args.indexOf('--service');
      const surgeIdx = args.indexOf('--surge');
      
      await captureCompetitorPrice(project, {
        competitor: args[competitorIdx + 1],
        area: args[areaIdx + 1],
        service_type: serviceIdx !== -1 ? args[serviceIdx + 1] : 'food-delivery',
        base_fee: parseFloat(args[feeIdx + 1]),
        surge_multiplier: surgeIdx !== -1 ? parseFloat(args[surgeIdx + 1]) : undefined,
      });
      break;
    }
    
    default:
      console.error(`Unknown capture type: ${type}`);
      process.exit(1);
  }
}

main();
