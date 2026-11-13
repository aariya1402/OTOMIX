// OTOMIX §7.11; §7.1

export const OTOMIX_ISSUABLE_SCOPES = Object.freeze([
  'dsp:*',
  'audio:tuning',
  'mastering:*',
  'catalog:*',
  'sys:*',
  'users:*',
  'billing:*',
  'user:read',
  'local:process',
] as const);

export class ScopeNotIssuableError extends Error {
  readonly code = 'INVALID_ARGUMENT' as const;
  constructor(message: string) {
    super(message);
    this.name = 'ScopeNotIssuableError';
  }
}

export function isIssuable(scope: string, tenantId: string): boolean {
  if (tenantId !== 'otomix') return false;
  return (OTOMIX_ISSUABLE_SCOPES as readonly string[]).includes(scope);
}

export function assertIssuable(scopes: string[], tenantId: string): void {
  if (tenantId !== 'otomix') return;
  for (const scope of scopes) {
    if (!isIssuable(scope, tenantId)) {
      throw new ScopeNotIssuableError(
        "scope '" + scope + "' is not issuable for tenant '" + tenantId + "'"
      );
    }
  }
}