#!/usr/bin/env bun
/**
 * Narrative Intelligence CLI
 * Loads the MNLMS framework (Mamet/Nolan/Malkovich/Lee/Singleton)
 * Usage: bun narrative.ts <command>
 */

import { readFileSync } from 'fs';

const SOUL_PATH = '/home/workspace/Skills/narrative-intelligence/SOUL.md';

function loadFramework() {
  try {
    const content = readFileSync(SOUL_PATH, 'utf-8');
    console.log('🎭 MNLMS Framework Loaded\n');
    console.log(content);
  } catch (err) {
    console.error('❌ Failed to load narrative framework:', err.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Narrative Intelligence CLI

Commands:
  load              Load full MNLMS framework into context
  check             Verify framework is available
  help              Show this help

Usage:
  bun narrative.ts load    # Load framework for creative writing session
`);
}

const command = process.argv[2] || 'help';

switch (command) {
  case 'load':
    loadFramework();
    break;
  case 'check':
    try {
      readFileSync(SOUL_PATH, 'utf-8');
      console.log('✅ MNLMS framework available');
    } catch {
      console.log('❌ MNLMS framework not found');
      process.exit(1);
    }
    break;
  default:
    showHelp();
}