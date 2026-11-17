/**
 * Executes a callback within a transaction where `app.tenant_id` is set
 * to the provided tenantId. The setting is transaction-local (is_local=true),
 * so it automatically resets on COMMIT or ROLLBACK.
 */
export async function withTenant(pool, tenantId, fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Set transaction-local tenant_id (is_local=true = 3rd arg true)
        await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release(); // Critical: return to pool even on error
    }
}
//# sourceMappingURL=with-tenant.js.map