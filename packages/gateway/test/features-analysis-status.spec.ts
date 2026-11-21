import { describe, expect, it, vi } from 'vitest';
import type { Pool, PoolClient } from 'pg';
import { extractOne } from '../../core/src/pipeline/extract.js';
import { FeaturesRepository } from '../src/repository/features-repository.js';

describe('FeaturesRepository analysis status', () => {
  it('limits catalog queries to complete analysis rows', async () => {
    const statements: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        statements.push(sql);
        return { rows: [] };
      }),
      release: vi.fn(),
    } as unknown as PoolClient;
    const pool = {
      connect: vi.fn(async () => client),
    } as unknown as Pool;
    const repository = new FeaturesRepository(pool);

    await repository.findAll('otomix');
    await repository.findPaginated('otomix', null, 25);

    const catalogQueries = statements.filter((sql) => /SELECT[\s\S]*FROM features/i.test(sql));
    expect(catalogQueries).toHaveLength(2);
    expect(catalogQueries.every((sql) => /analysis_status\s*=\s*'complete'/i.test(sql))).toBe(true);
  });

  it('promotes an existing feature row to complete with extracted values', async () => {
    const persist = vi.fn(async () => ({ featureId: 'feature-1', messageId: 'message-1' }));

    const result = await extractOne({
      trackId: 'track-1',
      contentSha256: 'hash-1',
      schemaVersion: '1.2.0',
      rawAnalysis: {},
    }, {
      persistence: { persist },
      tenantId: 'otomix',
      adapter: async () => ({
        bpm: 128,
        camelotKey: '2A',
        energyScalar: 0.8,
        energyStars: 4,
        mixability: 0.7,
        grooveMode: 'straight',
        registryJson: { bpm: 128 },
      }),
      validator: () => ({ valid: true }),
    });

    expect(result.ok).toBe(true);
    expect(result.featureId).toBe('feature-1');
    expect(persist).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'otomix',
      trackId: 'track-1',
      schemaVersion: '1.2.0',
      features: expect.objectContaining({ bpm: 128, camelotKey: '2A' }),
    }));
  });
});
