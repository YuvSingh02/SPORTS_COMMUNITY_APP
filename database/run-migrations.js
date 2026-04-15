/**
 * Migration runner — reads all .sql files in /migrations in order
 * and executes them against Supabase via the JS client.
 *
 * Usage: node run-migrations.js
 *
 * NOTE: Supabase does not support running raw SQL via the JS client directly.
 * Use one of these methods:
 *
 * Option A (recommended): Supabase CLI
 *   supabase db push
 *
 * Option B: Paste each migration file into Supabase Dashboard > SQL Editor
 *   Run 001 → 002 → ... in order.
 *
 * Option C: This script via Supabase Management API (requires personal access token)
 */

const fs   = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const listMigrations = () =>
  fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ name: f, path: path.join(MIGRATIONS_DIR, f) }));

const run = () => {
  const migrations = listMigrations();

  console.log('─────────────────────────────────────────');
  console.log('PitchStock — Migration Files');
  console.log('─────────────────────────────────────────');
  migrations.forEach(({ name }) => console.log(`  ✓ ${name}`));
  console.log('');
  console.log('Run these files in order in Supabase SQL Editor,');
  console.log('or use: supabase db push (requires supabase CLI)');
  console.log('─────────────────────────────────────────');
};

run();
