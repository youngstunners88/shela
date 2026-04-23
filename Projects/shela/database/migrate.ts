import { Database } from 'duckdb-async';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Shela Database Migration Script
// DuckDB setup with full schema

async function migrate() {
  const dbPath = process.env.SHELA_DB_PATH || './.db/shela.duckdb';
  
  console.log('📦 Shela Database Migration');
  console.log(`📁 Database: ${dbPath}\n`);
  
  // Ensure directory exists
  const { mkdirSync } = await import('fs');
  const dbDir = dirname(dbPath);
  try {
    mkdirSync(dbDir, { recursive: true });
  } catch {}
  
  // Connect to database
  const db = await Database.create(dbPath);
  
  // Read and execute schema
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  
  // Split by semicolons and execute each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  console.log(`📋 Executing ${statements.length} schema statements...\n`);
  
  for (const statement of statements) {
    try {
      await db.all(statement + ';');
      const firstLine = statement.split('\n')[0].trim();
      if (firstLine.startsWith('CREATE TABLE')) {
        const tableName = firstLine.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
        console.log(`  ✅ ${tableName}`);
      } else if (firstLine.startsWith('CREATE INDEX')) {
        const indexName = firstLine.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1];
        console.log(`  📇 ${indexName}`);
      }
    } catch (err) {
      console.error(`  ❌ Failed: ${err}`);
      throw err;
    }
  }
  
  // Seed initial data
  console.log('\n🌱 Seeding initial data...');
  
  // Insert sample tier configurations
  await db.all(`
    INSERT OR IGNORE INTO users (id, public_key, status, reputation_score) 
    VALUES 
      ('system', '11111111111111111111111111111111111111111111', 'system', 0)
  `);
  
  // Verify tables
  const tables = await db.all(`
    SELECT name FROM sqlite_master 
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);
  
  console.log(`\n📊 ${tables.length} tables created:`);
  for (const table of tables) {
    const count = await db.all(`SELECT COUNT(*) as count FROM ${table.name}`);
    console.log(`   • ${table.name}: ${count[0].count} rows`);
  }
  
  await db.close();
  console.log('\n✅ Migration complete!');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
