import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import * as fs from "node:fs";
import * as path from "node:path";

const MIG = path.resolve(__dirname, "..", "migrations");
const SEED = path.resolve(__dirname, "..", "seeds");
let c: any; let db: Pool;
async function mig(name: string) {
  const raw = fs.readFileSync(path.join(MIG, name), "utf8");
  const i = raw.indexOf("-- Down");
  await db.query(i < 0 ? raw : raw.slice(0, i));
}
function seedAll() {
  for (const f of fs.readdirSync(SEED).filter((x: string) => x.endsWith(".sql") && !x.endsWith(".down.sql")).sort()) {
    db.query(fs.readFileSync(path.join(SEED, f), "utf8"));
  }
}
async function seedAllAsync() {
  for (const f of fs.readdirSync(SEED).filter((x: string) => x.endsWith(".sql") && !x.endsWith(".down.sql")).sort()) {
    await db.query(fs.readFileSync(path.join(SEED, f), "utf8"));
  }
}
beforeAll(async () => {
  c = await new PostgreSqlContainer("postgres:16-alpine").start();
  db = new Pool({ connectionString: c.getConnectionUri() });
  await mig("001_core.sql"); await mig("002_rls.sql");
  await mig("003_global_features_jsonb.sql"); await mig("004_rbac.sql");
  await seedAllAsync();
});
afterAll(async () => { await db?.end(); await c?.stop(); });
describe("RBAC-M03 base roles seed", () => {
  it("has 18 roles (9 x 2 tenants)", async () => {
    const r = await db.query("SELECT COUNT(*)::int AS n FROM roles");
    expect(r.rows[0].n).toBe(18);
  });
  it("super_admin has 118 role_permissions (59 x 2 tenants)", async () => {
    const r = await db.query("SELECT COUNT(*)::int AS n FROM role_permissions rp JOIN roles r ON rp.role_id = r.role_id WHERE r.role_name = 'super_admin'");
    expect(r.rows[0].n).toBe(118);
  });
  it("deputy_admin has 116 role_permissions (58 x 2), no admin:super_admin_only", async () => {
    const r = await db.query("SELECT COUNT(*)::int AS n FROM role_permissions rp JOIN roles r ON rp.role_id = r.role_id WHERE r.role_name = 'deputy_admin'");
    expect(r.rows[0].n).toBe(116);
    const s = await db.query("SELECT COUNT(*)::int AS n FROM role_permissions rp JOIN roles r ON rp.role_id = r.role_id WHERE r.role_name = 'deputy_admin' AND rp.permission_key = 'admin:super_admin_only'");
    expect(s.rows[0].n).toBe(0);
  });
  it("idempotent: rerun seed, still 18 roles and 118 super_admin", async () => {
    await seedAllAsync();
    const r = await db.query("SELECT COUNT(*)::int AS n FROM roles");
    expect(r.rows[0].n).toBe(18);
    const sa = await db.query("SELECT COUNT(*)::int AS n FROM role_permissions rp JOIN roles r ON rp.role_id = r.role_id WHERE r.role_name = 'super_admin'");
    expect(sa.rows[0].n).toBe(118);
  });
  it("all 9 roles is_system=true", async () => {
    const r = await db.query("SELECT COUNT(*)::int AS n FROM roles WHERE is_system = false");
    expect(r.rows[0].n).toBe(0);
  });
  it("regular_user has 0 admin/sys/users/billing keys", async () => {
    const r = await db.query("SELECT COUNT(*)::int AS n FROM role_permissions rp JOIN roles r ON rp.role_id = r.role_id WHERE r.role_name = 'regular_user' AND (rp.permission_key LIKE 'admin:%' OR rp.permission_key LIKE 'sys:%' OR rp.permission_key LIKE 'users:%' OR rp.permission_key LIKE 'billing:%')");
    expect(r.rows[0].n).toBe(0);
  });
});
