import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(join(__dirname, '../migrations/001_core.sql'), 'utf-8');
const parts = sql.split('-- Down');
const up = parts[0];
const down = parts[1] || '';

const direction = process.argv[2] === 'down' ? 'down' : 'up';
const migrationSql = direction === 'up' ? up : down;

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(migrationSql);
    await client.query('COMMIT');
    console.log(`Migration ${direction} completed successfully`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`Migration ${direction} failed:`, e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
