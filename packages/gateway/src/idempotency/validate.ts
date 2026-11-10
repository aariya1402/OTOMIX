// OTOMIX §9.3 · Mother Add. §1–§2
import { IncomingMessage, ServerResponse } from 'node:http';
import { mapStatus } from '../status-map';

const STATE_MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// UUIDv4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y in [89ab]
const UUIDV4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateIdempotencyKey(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: Error) => void
): void {
  // Only validate state-mutating methods; GET/HEAD/etc. pass through
  if (!STATE_MUTATING_METHODS.has(req.method ?? '')) {
    next();
    return;
  }

  const key = req.headers['idempotency-key'];

  // Missing header
  if (typeof key !== 'string' || key.length === 0) {
    const status = mapStatus('INVALID_ARGUMENT');
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'INVALID_ARGUMENT', message: 'Missing Idempotency-Key header' }));
    return;
  }

  // Malformed (not UUIDv4)
  if (!UUIDV4_RE.test(key)) {
    const status = mapStatus('INVALID_ARGUMENT');
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'INVALID_ARGUMENT', message: 'Invalid Idempotency-Key: must be UUIDv4' }));
    return;
  }

  // Valid — pass through
  next();
}