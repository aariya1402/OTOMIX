import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import * as fs from "node:fs";
import * as path from "node:path";
import { createGrantService, UnauthorizedGrantError, InvalidGrantInputError } from "../src/rbac/grant-service";

const MIG = path.resolve(__dirname, "..", "..", "db", "migrations");
const SEED = path.resolve(__dirname, "..", "..", "db", "seeds");
let c: any; let db: Pool;
const SUPER = "aaaaaaaa-0000-4000-8000-000000000001";
const DEP = "aaaaaaaa-0000-4000-8000-000000000002";
const REG = "aaaaaaaa-0000-4000-8000-000000000003";
const TGT = "aaaaaaaa-0000-4000-8000-000000000004";
const SYS = "00000000-0000-0000-0000-000000000001";
let webhookCalls: any[] = [];
async function mig(name: string) {
  const raw = fs.readFileSync(path.join(MIG, name), "utf8");
  const i = raw.indexOf("-- Down");
  await db.query(i < 0 ? raw : raw.slice(0, i));
}
beforeAll(async () => {
  c = await new PostgreSqlContainer("postgres:16-alpine").start();
  db = new Pool({ connectionString: c.getConnectionUri() });
  for (const f of ["001_core.sql","002_rls.sql","003_global_features_jsonb.sql","004_rbac.sql","005_admin_audit_default_partition.sql"]) await mig(f);
  for (const f of fs.readdirSync(SEED).filter((x: string) => x.endsWith(".sql") && !x.endsWith(".down.sql")).sort()) {
    await db.query(fs.readFileSync(path.join(SEED, f), "utf8"));
  }
  for (const u of [SUPER, DEP, REG, TGT]) {
    await db.query("INSERT INTO users (user_id, tenant_id, role, tier) VALUES ($1,$2,$3,1) ON CONFLICT DO NOTHING", [u, "otomix", "end_user"]);
  }
  const assigns: [string,string][] = [[SUPER,"super_admin"],[DEP,"deputy_admin"],[REG,"regular_user"],[TGT,"regular_user"]];
  for (const [uid, rname] of assigns) {
    await db.query("INSERT INTO user_roles (user_id, tenant_id, role_id, granted_at, granted_by) SELECT $1, $2, role_id, now(), $3 FROM roles WHERE role_name = $4 AND tenant_id = $2", [uid, "otomix", SYS, rname]);
  }
}, 180_000);
afterAll(async () => { await db?.end(); await c?.stop(); });
describe("grant-service (RBAC-M04)", () => {
  it("(a) super grants publisher:manage; audit + webhook", async () => {
    webhookCalls = [];
    const svc = createGrantService({ pg: db, webhookFn: (p: any) => { webhookCalls.push(p); return Promise.resolve(); } });
    const before = await db.query("SELECT COUNT(*)::int AS n FROM admin_audit");
    await svc.grantPermission({ actorUserId: SUPER, actorTenantId: "otomix" }, { userId: TGT, tenantId: "otomix", permissionKey: "publisher:manage", effect: "allow", expiresAt: new Date(Date.now() + 86400_000) });
    const row = await db.query("SELECT effect, expires_at FROM user_permissions WHERE user_id=$1 AND permission_key=$2", [TGT, "publisher:manage"]);
    expect(row.rows.length).toBe(1);
    expect(row.rows[0].expires_at).not.toBeNull();
    const after = await db.query("SELECT COUNT(*)::int AS n FROM admin_audit");
    expect(after.rows[0].n).toBe(before.rows[0].n + 1);
    expect(webhookCalls.length).toBe(1);
  });
  it("(b) regular user cannot grant", async () => {
    const svc = createGrantService({ pg: db });
    await expect(svc.grantPermission({ actorUserId: REG, actorTenantId: "otomix" }, { userId: TGT, tenantId: "otomix", permissionKey: "dsp:*", effect: "allow" })).rejects.toBeInstanceOf(UnauthorizedGrantError);
  });
  it("(c) revoke sets revoked_at", async () => {
    const svc = createGrantService({ pg: db });
    await svc.revokePermission({ actorUserId: SUPER, actorTenantId: "otomix" }, { userId: TGT, tenantId: "otomix", permissionKey: "publisher:manage" });
    const row = await db.query("SELECT revoked_at FROM user_permissions WHERE user_id=$1 AND permission_key=$2", [TGT, "publisher:manage"]);
    expect(row.rows[0].revoked_at).not.toBeNull();
  });
  it("(d) past expiresAt rejected", async () => {
    const svc = createGrantService({ pg: db });
    await expect(svc.grantPermission({ actorUserId: SUPER, actorTenantId: "otomix" }, { userId: TGT, tenantId: "otomix", permissionKey: "dsp:*", effect: "allow", expiresAt: new Date(Date.now() - 1000) })).rejects.toBeInstanceOf(InvalidGrantInputError);
  });
  it("(e) cross-tenant rejected", async () => {
    const svc = createGrantService({ pg: db });
    await expect(svc.grantPermission({ actorUserId: SUPER, actorTenantId: "otomix" }, { userId: TGT, tenantId: "otodj", permissionKey: "dsp:*", effect: "allow" })).rejects.toBeInstanceOf(UnauthorizedGrantError);
  });
  it("(f) deputy grants dsp_specialist", async () => {
    const svc = createGrantService({ pg: db });
    await svc.grantRole({ actorUserId: DEP, actorTenantId: "otomix" }, { userId: TGT, tenantId: "otomix", roleName: "dsp_specialist" });
    const row = await db.query("SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.role_id WHERE ur.user_id=$1 AND r.role_name=$2 AND ur.revoked_at IS NULL", [TGT, "dsp_specialist"]);
    expect(row.rows.length).toBe(1);
  });
  it("(g) deputy cannot grant super_admin", async () => {
    const svc = createGrantService({ pg: db });
    await expect(svc.grantRole({ actorUserId: DEP, actorTenantId: "otomix" }, { userId: TGT, tenantId: "otomix", roleName: "super_admin" })).rejects.toBeInstanceOf(UnauthorizedGrantError);
  });
  it("(h) re-grant after revoke clears revoked_at", async () => {
    const svc = createGrantService({ pg: db });
    await svc.grantPermission({ actorUserId: SUPER, actorTenantId: "otomix" }, { userId: TGT, tenantId: "otomix", permissionKey: "shop:buy", effect: "allow" });
    await svc.revokePermission({ actorUserId: SUPER, actorTenantId: "otomix" }, { userId: TGT, tenantId: "otomix", permissionKey: "shop:buy" });
    await svc.grantPermission({ actorUserId: SUPER, actorTenantId: "otomix" }, { userId: TGT, tenantId: "otomix", permissionKey: "shop:buy", effect: "allow" });
    const row = await db.query("SELECT revoked_at FROM user_permissions WHERE user_id=$1 AND permission_key=$2", [TGT, "shop:buy"]);
    expect(row.rows[0].revoked_at).toBeNull();
  });
});
