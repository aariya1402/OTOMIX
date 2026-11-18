// OTOMIX 9.1 - GAP-001
import type { Pool } from 'pg';
import type { Request, Response, NextFunction } from 'express';
import { FeaturesRepository } from '../repository/features-repository.js';

export interface CatalogFeaturesDeps {
  pool: Pool;
  maxLimit?: number;
}

function encodeCursor(analyzed_at: Date | string, feature_id: string): string {
  return Buffer.from(JSON.stringify({ a: analyzed_at, i: feature_id })).toString('base64url');
}

function decodeCursor(cursor: string): { analyzed_at: string; feature_id: string } | null {
  try {
    const { a, i } = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    if (!a || !i) return null;
    return { analyzed_at: a, feature_id: i };
  } catch {
    return null;
  }
}

export function createCatalogFeaturesHandler(deps: CatalogFeaturesDeps) {
  const maxLimit = deps.maxLimit ?? 200;
  const repo = new FeaturesRepository(deps.pool);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.method !== 'GET') {
        res.status(405).json({ error: 'METHOD_NOT_ALLOWED' }); return; return;
      }

      const limitRaw = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      if (isNaN(limitRaw) || limitRaw < 1 || limitRaw > maxLimit) {
        return res.status(400).json({ error: 'INVALID_ARGUMENT', message: `limit must be between 1 and ${maxLimit}` }); return;
      }

      const cursorStr = req.query.cursor as string | undefined;
      let cursor = null;
      if (cursorStr) {
        cursor = decodeCursor(cursorStr);
        if (!cursor) {
          res.status(400).json({ error: 'INVALID_ARGUMENT', message: 'Invalid cursor' }); return; return;
        }
      }

      const tenantId = (req as any).claims?.tenant_id as string;
      if (!tenantId) {
        res.status(403).json({ error: 'PERMISSION_DENIED', message: 'No tenant context' }); return; return;
      }

      const { items, nextCursor } = await repo.findPaginated(tenantId as any, cursor, limitRaw);

      const next_cursor = nextCursor ? encodeCursor(nextCursor.analyzed_at, nextCursor.feature_id) : null;

      res.status(200).json({ items, next_cursor }); return; return;
    } catch (err) {
      next(err);
    }
  };
}