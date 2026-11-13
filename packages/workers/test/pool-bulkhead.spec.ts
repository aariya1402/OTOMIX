import { describe, it, expect } from 'vitest';
import { createTenantPoolRegistry } from '../src/pool';

async function sleep(ticks: number): Promise<void> {
  for (let i = 0; i < ticks; i++) {
    await Promise.resolve();
  }
}

describe('tenant pool bulkhead (P06-T04-S02-M01)', () => {
  it('(a) pool creation: size 4, pending 0, not degraded', async () => {
    const reg = createTenantPoolRegistry({ sizePerTenant: 4 });
    const pool = reg.getPool('otomix');
    expect(pool.size()).toBe(4);
    expect(pool.pending()).toBe(0);
    expect(pool.isDegraded()).toBe(false);
    await reg.shutdown();
  });

  it('(b) single exec returns the value', async () => {
    const reg = createTenantPoolRegistry({ sizePerTenant: 4 });
    const pool = reg.getPool('otomix');
    const v = await pool.exec(async () => 42);
    expect(v).toBe(42);
    await reg.shutdown();
  });

  it('(c) bulkhead: saturating otomix does not starve otodj', async () => {
    const reg = createTenantPoolRegistry({ sizePerTenant: 2 });
    const poolA = reg.getPool('otomix');
    const poolB = reg.getPool('otodj');

    const slow = () => new Promise<number>((resolve) => {
      const start = Date.now();
      const tick = () => {
        if (Date.now() - start >= 40) return resolve(1);
        setImmediate(tick);
      };
      tick();
    });

    const jobsA: Promise<number>[] = [];
    for (let i = 0; i < 6; i++) { jobsA.push(poolA.exec(slow)); }

    const t0 = Date.now();
    const v = await poolB.exec(async () => 7);
    const elapsed = Date.now() - t0;

    expect(v).toBe(7);
    expect(elapsed).toBeLessThan(500);
    expect(poolA.pending()).toBeGreaterThan(0);
    expect(poolB.isDegraded()).toBe(false);

    await Promise.all(jobsA);
    await reg.shutdown();
  });

  it('(d) saturating otomix enters degraded on otomix only', async () => {
    const reg = createTenantPoolRegistry({ sizePerTenant: 1, saturationThreshold: 0.5 });
    const poolA = reg.getPool('otomix');
    const poolB = reg.getPool('otodj');

    const jobsA: Promise<number>[] = [];
    for (let i = 0; i < 4; i++) {
      jobsA.push(poolA.exec(() => new Promise<number>((resolve) => {
        const start = Date.now();
        const tick = () => {
          if (Date.now() - start >= 20) return resolve(1);
          setImmediate(tick);
        };
        tick();
      })));
    }

    await sleep(2);
    expect(poolA.isDegraded()).toBe(true);
    expect(poolB.isDegraded()).toBe(false);

    await Promise.all(jobsA);
    await reg.shutdown();
  });
});