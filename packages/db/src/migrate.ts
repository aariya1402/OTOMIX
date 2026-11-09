import { Client } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const MIGRATIONS_DIR = join(__dirname, '../migrations');

interface Migration {
  version: string;
  name: string;
  up: string;
  down: string;
}

function loadMigrations(): Migration[] {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files.map((file) => {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    const parts = sql.split('-- Down');
    const version = file.match(/^(\d+)/)?.[1] ?? basename(file, '.sql');
    return { version, name: basename(file, '.sql'), up: parts[0] ?? '', down: parts[1] ?? '' };
  });
}

async function ensureSchemaMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz DEFAULT now()
    )
  `);
}

async function getAppliedVersions(client: Client): Promise<Set<string>> {
  const result = await client.query('SELECT version FROM schema_migrations');
  return new Set(result.rows.map((r: { version: string }) => r.version));
}

async function runMigrations(
  client: Client,
  migrations: Migration[],
  direction: 'up' | 'down',
): Promise<void> {
  const applied = await getAppliedVersions(client);
  const ordered = direction === 'up' ? migrations : [...migrations].reverse();
  for (const m of ordered) {
    const sql = direction === 'up' ? m.up : m.down;
    const isApplied = applied.has(m.version);
    if (direction === 'up') {
      if (isApplied) { console.log(`Migration ${m.version} (${m.name}) already applied, skipping`); continue; }
      console.log(`Applying migration ${m.version} (${m.name})...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [m.version]);
        await client.query('COMMIT');
        console.log(`Migration ${m.version} applied`);
      } catch (e) { await client.query('ROLLBACK'); throw e; }
    } else {
      if (!isApplied) { console.log(`Migration ${m.version} (${m.name}) not applied, skipping down`); continue; }
      console.log(`Reverting migration ${m.version} (${m.name})...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('DELETE FROM schema_migrations WHERE version = $1', [m.version]);
        await client.query('COMMIT');
        console.log(`Migration ${m.version} reverted`);
      } catch (e) { await client.query('ROLLBACK'); throw e; }
    }
  }
}

async function run(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const migrations = loadMigrations();
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await ensureSchemaMigrationsTable(client);
    await runMigrations(client, migrations, direction);
    console.log(`All migrations ${direction} completed successfully`);
  } catch (e) {
    console.error(`Migration ${direction} failed:`, e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('Unhandled error in migration runner:', err);
  process.exit(1);
});