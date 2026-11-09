import { Pool, PoolClient } from 'pg';
import { withTenant, TenantId } from '@otomix/db';

/**
 * Abstract base class that FORCES all repository methods to run inside withTenant.
 */
export abstract class BaseRepository {
  constructor(private readonly pool: Pool) {}

  protected async withTenant<T>(
    tenantId: TenantId,
    fn: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    return withTenant(this.pool, tenantId, fn);
  }
}