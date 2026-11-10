// OTOMIX §8.4 · Mother §9.1; Add. §7
// Structured JSON logger with PII masking at the edge.
import { Writable } from 'node:stream';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogOutcome = 'success' | 'failure' | 'partial';

export interface LogRecord {
  level: LogLevel;
  /** Optional at call-site; factory provides the default. */
  service?: string;
  /** Optional at call-site; factory provides the default. */
  tenant_id?: string;
  trace_id: string;
  span_id: string;
  event: string;
  outcome: LogOutcome;
  /** Optional at call-site; invalid values are dropped. */
  country?: string;
  duration_ms: number;

  // PII fields (masked or dropped)
  ip?: string;
  email?: string;
  lat?: number;
  long?: number;
  latitude?: number;
  longitude?: number;

  // Additional arbitrary fields pass through
  [key: string]: unknown;
}

export interface LoggerOptions {
  service: string;
  tenantId?: string;
  writable?: Writable;
}

export interface Logger {
  log(record: LogRecord): void;
}

const COUNTRY_REGEX = /^[A-Z]{2}$/;

const PII_FIELDS = {
  ip: { mask: '***.***.***.***' },
  email: { mask: '***@***' },
  lat: { drop: true },
  long: { drop: true },
  latitude: { drop: true },
  longitude: { drop: true },
} as const;

function sanitizeRecord(record: LogRecord): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  out.ts = new Date().toISOString();

  for (const [key, value] of Object.entries(record)) {
    if (key in PII_FIELDS) {
      const pii = PII_FIELDS[key as keyof typeof PII_FIELDS];
      if ('mask' in pii) {
        out[key] = pii.mask;
      }
      // if 'drop', skip entirely
      continue;
    }
    if (key === 'country') {
      if (typeof value === 'string' && COUNTRY_REGEX.test(value)) {
        out.country = value;
      }
      // else drop silently
      continue;
    }
    out[key] = value;
  }
  return out;
}

function validateRequired(record: LogRecord): void {
  // Fields that MUST be provided at call-time (or by factory merge).
  // `country`, `service`, `tenant_id` are excluded because they are optional
  // (country) or factory-provided (service, tenant_id).
  const required: (keyof LogRecord)[] = [
    'level',
    'trace_id',
    'span_id',
    'event',
    'outcome',
    'duration_ms',
  ];

  for (const field of required) {
    if (record[field] === undefined || record[field] === null) {
      throw new Error(`Logger: missing required field '${field}'`);
    }
  }

  const validOutcomes: LogOutcome[] = ['success', 'failure', 'partial'];
  if (!validOutcomes.includes(record.outcome as LogOutcome)) {
    throw new Error(`Logger: invalid outcome '${String(record.outcome)}'`);
  }
}

export function createLogger(options: LoggerOptions): Logger {
  const { service, tenantId = 'otomix', writable = process.stdout } = options;

  if (!service || typeof service !== 'string') {
    throw new Error('Logger: service name is required');
  }

  return {
    log(record: LogRecord): void {
      const merged: LogRecord = {
        service,
        tenant_id: tenantId,
        ...record,
      };
      validateRequired(merged);
      const sanitized = sanitizeRecord(merged);
      writable.write(JSON.stringify(sanitized) + '\n');
    },
  };
}