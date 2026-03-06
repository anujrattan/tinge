#!/usr/bin/env node

/**
 * Migration Runner Script
 * 
 * This script helps run migrations against your Supabase database.
 * 
 * Usage:
 *   node db-migrations/run-migrations.js [migration-file]
 * 
 * If no file is specified, it will run all migrations in order.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = join(__dirname, '..');
const envPath = join(backendRoot, '.env');

// Load environment variables
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: '.env' });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
  },
});

async function runMigration(filePath) {
  const sql = readFileSync(filePath, 'utf-8');
  const fileName = filePath.split('/').pop();
  
  console.log(`\n📄 Running migration: ${fileName}`);
  console.log('─'.repeat(50));
  
  try {
    // Split SQL by semicolons and execute each statement
    // Note: Supabase doesn't support multi-statement queries directly
    // So we'll use the REST API or execute via psql
    // For now, we'll use a workaround with the REST API
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If RPC doesn't exist, try direct query (may not work for DDL)
      console.warn('⚠️  Direct execution may not work for DDL statements.');
      console.warn('   Please run migrations via Supabase Dashboard SQL Editor instead.');
      console.error('   Error:', error.message);
      return false;
    }
    
    console.log(`✅ Migration ${fileName} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Error running migration ${fileName}:`, error.message);
    return false;
  }
}

async function main() {
  const migrationFile = process.argv[2];
  const migrationsDir = join(__dirname);
  
  if (migrationFile) {
    // Run specific migration
    const filePath = join(migrationsDir, migrationFile);
    if (!existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      process.exit(1);
    }
    await runMigration(filePath);
  } else {
    // Run all migrations in order
    console.log('🚀 Running all migrations...\n');
    
    const migrations = [
      '001_create_categories_table.sql',
      '002_seed_categories.sql',
      '005_create_products_table.sql',
      '006_seed_products.sql',
      '007_add_sale_fields_to_products.sql',
    ];
    
    for (const migration of migrations) {
      const filePath = join(migrationsDir, migration);
      if (!existsSync(filePath)) {
        console.warn(`⚠️  Migration file not found: ${migration}`);
        continue;
      }
      
      const success = await runMigration(filePath);
      if (!success) {
        console.error(`\n❌ Migration failed: ${migration}`);
        console.log('\n💡 Tip: Run migrations via Supabase Dashboard SQL Editor for best results.');
        process.exit(1);
      }
    }
    
    console.log('\n✅ All migrations completed successfully!');
  }
}

main().catch(console.error);

