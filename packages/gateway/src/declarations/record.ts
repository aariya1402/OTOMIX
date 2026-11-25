// OTOMIX 6.2 - Mother 1 - GAP-017
// Records a source declaration row (ingest/publish/export).
// Cloud-only; adapter has no DB (see GAP-014).

import { createLogger } from '@otomix/core';
import type { Logger } from '@otomix/core';
import type { PoolClient } from 'pg';

export type DeclarationScope = 'ingest' | 'publish' | 'export';

export interface DeclarationInput {
  tenantId: string;
  userId: string;
  scope: DeclarationScope;
  termsVersion: string;
  declaredAt: Date;
}

export interface RecordDeps {
  logger?: Logger;
}

export async function recordDeclaration(
  client: PoolClient,
  input: DeclarationInput,
  deps: RecordDeps = {}
): Promise<string> {
  const logger = deps.logger ?? createLogger({ service: 'gateway-declarations' });

  const result = await client.query(
    `INSERT INTO source_declarations
       (declaration_id, tenant_id, user_id, scope, terms_version, declared_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
     RETURNING declaration_id`,
    [input.tenantId, input.userId, input.scope, input.termsVersion, input.declaredAt.toISOString()]
  );

  const declarationId = result.rows[0].declaration_id as string;

  logger.log({
    level: 'info',
    trace_id: 'declaration',
    span_id: 'record',
    event: 'source.declaration_recorded',
    outcome: 'success',
    durationMs: 0,
    scope: input.scope,
    terms_version: input.termsVersion,
    declaration_id: declarationId,
  });

  return declarationId;
}
