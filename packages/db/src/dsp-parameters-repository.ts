import { createHmac, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { withTenant, TenantId } from './with-tenant';

export interface EnqueueDspPropagationInput {
  tenantId: TenantId;
  chopGrid: string;
  crossfadeBeats: number;
  before: { chopGrid: string; crossfadeBeats: number } | null;
  actorId: string;
  hmacSecret: string;
}

export interface EnqueueDspPropagationResult {
  sequence: number;
  messageId: string;
}

function canonicalJson(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).sort();
  return JSON.stringify(obj, keys);
}

export async function enqueueDspPropagation(
  pool: Pool,
  input: EnqueueDspPropagationInput,
): Promise<EnqueueDspPropagationResult> {
  return withTenant(pool, input.tenantId, async (client) => {
    const seqRes = await client.query(
      'UPDATE tenant_sequences SET sequence = sequence + 1 WHERE tenant_id = $1 RETURNING sequence',
      [input.tenantId],
    );
    const sequence = Number(seqRes.rows[0].sequence);

    await client.query(
      'INSERT INTO dsp_parameters (tenant_id, chop_grid, crossfade_beats, updated_at) VALUES ($1, $2, $3, now()) ' +
      'ON CONFLICT (tenant_id) DO UPDATE SET chop_grid = EXCLUDED.chop_grid, crossfade_beats = EXCLUDED.crossfade_beats, updated_at = now()',
      [input.tenantId, input.chopGrid, input.crossfadeBeats],
    );

    const messageId = randomUUID();
    const timestamp = new Date().toISOString();
    const signedBody: Record<string, unknown> = {
      type: 'dsp.parameters.update',
      sequence,
      chopGrid: input.chopGrid,
      crossfadeBeats: input.crossfadeBeats,
      before: input.before,
      actorId: input.actorId,
      tenantId: input.tenantId,
      timestamp,
    };
    const bodyWithId = { ...signedBody, messageId };
    const signature = createHmac('sha256', input.hmacSecret).update(canonicalJson(bodyWithId)).digest('hex');
    const storedPayload = { ...bodyWithId, signature };
    await client.query(
      'INSERT INTO outbox (message_id, tenant_id, topic, payload) VALUES ($1, $2, $3, $4::jsonb)',
      [messageId, input.tenantId, 'dsp.parameters.update', JSON.stringify(storedPayload)],
    );

    return { sequence, messageId };
  });
}