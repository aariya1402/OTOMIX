// GAP-015, RBAC-M02
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Client } from 'pg';

const SEEDS_DIR = resolve(__dirname, '..', 'seeds');

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    process.stderr.write('DATABASE_URL is not set\n');
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const files = readdirSync(SEEDS_DIR)
      .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
      .sort();
    for (const file of files) {
      const sql = readFileSync(join(SEEDS_DIR, file), 'utf8');
      process.stdout.write('applying seed: ' + file + '\n');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    process.stdout.write('all seeds applied\n');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  process.stderr.write(String(err) + '\n');
  process.exit(1);
});