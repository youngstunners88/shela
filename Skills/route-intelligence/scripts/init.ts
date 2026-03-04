#!/usr/bin/env bun
/**
 * Initialize Route Intelligence System for a project
 */

const DB_PATH = process.env.ROUTE_INTEL_DB || "/home/workspace/.route-intelligence";

interface InitConfig {
  project: string;
  competitors?: string[];
  areas?: string[];
}

async function initRouteIntelligence(config: InitConfig) {
  const fs = require('fs');
  const path = require('path');
  
  // Create data directories
  const dirs = [
    DB_PATH,
    path.join(DB_PATH, 'projects'),
    path.join(DB_PATH, 'projects', config.project),
    path.join(DB_PATH, 'projects', config.project, 'routes'),
    path.join(DB_PATH, 'projects', config.project, 'competitors'),
    path.join(DB_PATH, 'projects', config.project, 'insights'),
    path.join(DB_PATH, 'projects', config.project, 'alerts'),
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  // Initialize project config
  const projectConfig = {
    name: config.project,
    created: new Date().toISOString(),
    competitors: config.competitors || [],
    areas: config.areas || [],
    stats: {
      routes_tracked: 0,
      insights_captured: 0,
      competitor_checks: 0,
    },
  };
  
  fs.writeFileSync(
    path.join(DB_PATH, 'projects', config.project, 'config.json'),
    JSON.stringify(projectConfig, null, 2)
  );
  
  console.log(`✓ Route Intelligence initialized for ${config.project}`);
  console.log(`  Data path: ${path.join(DB_PATH, 'projects', config.project)}`);
  
  return projectConfig;
}

// CLI
const args = process.argv.slice(2);
const projectIndex = args.indexOf('--project');
const competitorsIndex = args.indexOf('--competitors');
const areasIndex = args.indexOf('--areas');

if (projectIndex === -1) {
  console.log('Usage: bun init.ts --project <name> [--competitors "c1,c2"] [--areas "a1,a2"]');
  process.exit(1);
}

const config: InitConfig = {
  project: args[projectIndex + 1],
  competitors: competitorsIndex !== -1 ? args[competitorsIndex + 1]?.split(',') : undefined,
  areas: areasIndex !== -1 ? args[areasIndex + 1]?.split(',') : undefined,
};

initRouteIntelligence(config);
