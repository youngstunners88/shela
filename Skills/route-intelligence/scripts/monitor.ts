#!/usr/bin/env bun
/**
 * Competitor Price Monitoring
 */

const DB_PATH = process.env.ROUTE_INTEL_DB || "/home/workspace/.route-intelligence";
const MONITOR_INTERVAL = parseInt(process.env.COMPETITOR_MONITOR_INTERVAL_HOURS || '6');
const PRICE_THRESHOLD = parseFloat(process.env.PRICE_CHANGE_THRESHOLD || '10');

interface MonitorConfig {
  id: string;
  project: string;
  competitor: string;
  areas: string[];
  active: boolean;
  last_check: string | null;
  check_count: number;
  created_at: string;
}

interface PriceAlert {
  id: string;
  type: string;
  competitor: string;
  area: string;
  old_value: number;
  new_value: number;
  change_percent: number;
  created_at: string;
}

async function startMonitor(project: string, competitor: string, areas: string[]): Promise<MonitorConfig> {
  const fs = require('fs');
  const path = require('path');
  
  const monitorsDir = path.join(DB_PATH, 'projects', project, 'alerts');
  if (!fs.existsSync(monitorsDir)) {
    fs.mkdirSync(monitorsDir, { recursive: true });
  }
  
  const config: MonitorConfig = {
    id: `mon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    project,
    competitor,
    areas,
    active: true,
    last_check: null,
    check_count: 0,
    created_at: new Date().toISOString(),
  };
  
  const filePath = path.join(monitorsDir, `${config.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  
  console.log(`✓ Monitor started for ${competitor}`);
  console.log(`  ID: ${config.id}`);
  console.log(`  Areas: ${areas.join(', ')}`);
  console.log(`  Check interval: ${MONITOR_INTERVAL} hours`);
  
  return config;
}

async function stopMonitor(project: string, monitorId: string) {
  const fs = require('fs');
  const path = require('path');
  
  const monitorPath = path.join(DB_PATH, 'projects', project, 'alerts', `${monitorId}.json`);
  
  if (!fs.existsSync(monitorPath)) {
    console.error(`Monitor not found: ${monitorId}`);
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(monitorPath, 'utf8'));
  config.active = false;
  fs.writeFileSync(monitorPath, JSON.stringify(config, null, 2));
  
  console.log(`✓ Monitor stopped: ${monitorId}`);
}

async function checkMonitorStatus(project: string) {
  const fs = require('fs');
  const path = require('path');
  
  const alertsDir = path.join(DB_PATH, 'projects', project, 'alerts');
  const monitors: MonitorConfig[] = [];
  
  if (fs.existsSync(alertsDir)) {
    for (const file of fs.readdirSync(alertsDir)) {
      if (file.startsWith('mon_')) {
        const data = JSON.parse(fs.readFileSync(path.join(alertsDir, file), 'utf8'));
        monitors.push(data);
      }
    }
  }
  
  console.log(`\n📊 Monitor Status for ${project}`);
  console.log(`   Active Monitors: ${monitors.filter(m => m.active).length}`);
  console.log(`   Total Monitors: ${monitors.length}`);
  
  for (const monitor of monitors) {
    console.log(`\n   ${monitor.active ? '✅' : '⏸️'} ${monitor.competitor}`);
    console.log(`      ID: ${monitor.id}`);
    console.log(`      Areas: ${monitor.areas.join(', ')}`);
    console.log(`      Checks: ${monitor.check_count}`);
    console.log(`      Last Check: ${monitor.last_check || 'Never'}`);
  }
  
  return monitors;
}

async function setAlert(project: string, condition: string, webhook?: string) {
  const fs = require('fs');
  const path = require('path');
  
  const alertsDir = path.join(DB_PATH, 'projects', project, 'alerts');
  if (!fs.existsSync(alertsDir)) {
    fs.mkdirSync(alertsDir, { recursive: true });
  }
  
  const alert = {
    id: `alert_${Date.now()}`,
    condition,
    webhook: webhook || 'nduna',
    active: true,
    created_at: new Date().toISOString(),
    trigger_count: 0,
  };
  
  const filePath = path.join(alertsDir, `${alert.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(alert, null, 2));
  
  console.log(`✓ Alert configured`);
  console.log(`  Condition: ${condition}`);
  console.log(`  Webhook: ${alert.webhook}`);
  
  return alert;
}

async function runPriceCheck(project: string) {
  const fs = require('fs');
  const path = require('path');
  
  const monitorsDir = path.join(DB_PATH, 'projects', project, 'alerts');
  const competitorsDir = path.join(DB_PATH, 'projects', project, 'competitors');
  
  if (!fs.existsSync(monitorsDir)) {
    console.log('No active monitors');
    return;
  }
  
  // Get all active monitors
  const monitors: MonitorConfig[] = [];
  for (const file of fs.readdirSync(monitorsDir)) {
    if (file.startsWith('mon_')) {
      const data = JSON.parse(fs.readFileSync(path.join(monitorsDir, file), 'utf8'));
      if (data.active) monitors.push(data);
    }
  }
  
  console.log(`\n🔍 Running price check for ${monitors.length} monitors...`);
  
  for (const monitor of monitors) {
    console.log(`\n   Checking ${monitor.competitor}...`);
    
    // Simulate price check (in production, would scrape actual competitor data)
    for (const area of monitor.areas) {
      // Get historical prices
      const historicalPrices: number[] = [];
      if (fs.existsSync(competitorsDir)) {
        for (const file of fs.readdirSync(competitorsDir)) {
          const data = JSON.parse(fs.readFileSync(path.join(competitorsDir, file), 'utf8'));
          if (data.competitor === monitor.competitor && data.area === area) {
            historicalPrices.push(data.base_fee);
          }
        }
      }
      
      // Simulated new price (in production, this would be scraped)
      const basePrice = historicalPrices.length > 0
        ? historicalPrices[historicalPrices.length - 1]
        : 25 + Math.random() * 10;
      
      const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
      const newPrice = basePrice * (1 + variation);
      
      const changePercent = ((newPrice / basePrice - 1) * 100);
      
      if (Math.abs(changePercent) > PRICE_THRESHOLD) {
        console.log(`   ⚠️ PRICE ALERT: ${area}`);
        console.log(`     Change: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`);
        console.log(`     Old: R${basePrice.toFixed(2)} → New: R${newPrice.toFixed(2)}`);
        
        // Save alert
        const alert: PriceAlert = {
          id: `pa_${Date.now()}`,
          type: 'price_change',
          competitor: monitor.competitor,
          area,
          old_value: basePrice,
          new_value: newPrice,
          change_percent: changePercent,
          created_at: new Date().toISOString(),
        };
        
        fs.writeFileSync(
          path.join(monitorsDir, `${alert.id}.json`),
          JSON.stringify(alert, null, 2)
        );
      } else {
        console.log(`   ✓ ${area}: R${newPrice.toFixed(2)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`);
      }
    }
    
    // Update monitor
    monitor.last_check = new Date().toISOString();
    monitor.check_count++;
    fs.writeFileSync(
      path.join(monitorsDir, `${monitor.id}.json`),
      JSON.stringify(monitor, null, 2)
    );
  }
}

// CLI
const args = process.argv.slice(2);
const action = args[0];
const projectIndex = args.indexOf('--project');

if (args.length < 2 || projectIndex === -1) {
  console.log(`
Usage:
  bun monitor.ts start --project <name> --competitor <name> --areas "area1,area2"
  bun monitor.ts stop --project <name> --id <monitor-id>
  bun monitor.ts status --project <name>
  bun monitor.ts alert --project <name> --condition <condition> [--webhook <name>]
  bun monitor.ts check --project <name>
`);
  process.exit(1);
}

const project = args[projectIndex + 1];

async function main() {
  switch (action) {
    case 'start': {
      const competitorIdx = args.indexOf('--competitor');
      const areasIdx = args.indexOf('--areas');
      
      if (competitorIdx === -1 || areasIdx === -1) {
        console.error('Missing --competitor or --areas');
        process.exit(1);
      }
      
      await startMonitor(project, args[competitorIdx + 1], args[areasIdx + 1].split(','));
      break;
    }
    
    case 'stop': {
      const idIdx = args.indexOf('--id');
      if (idIdx === -1) {
        console.error('Missing --id');
        process.exit(1);
      }
      await stopMonitor(project, args[idIdx + 1]);
      break;
    }
    
    case 'status': {
      await checkMonitorStatus(project);
      break;
    }
    
    case 'alert': {
      const conditionIdx = args.indexOf('--condition');
      const webhookIdx = args.indexOf('--webhook');
      
      if (conditionIdx === -1) {
        console.error('Missing --condition');
        process.exit(1);
      }
      
      await setAlert(project, args[conditionIdx + 1], webhookIdx !== -1 ? args[webhookIdx + 1] : undefined);
      break;
    }
    
    case 'check': {
      await runPriceCheck(project);
      break;
    }
    
    default:
      // If action looks like a flag, show help
      if (action?.startsWith('--')) {
        console.log(`
Usage:
  bun monitor.ts start --project <name> --competitor <name> --areas "area1,area2"
  bun monitor.ts stop --project <name> --id <monitor-id>
  bun monitor.ts status --project <name>
  bun monitor.ts alert --project <name> --condition <condition> [--webhook <name>]
  bun monitor.ts check --project <name>
`);
        process.exit(0);
      }
      console.error(`Unknown action: ${action}`);
      process.exit(1);
  }
}

main();
