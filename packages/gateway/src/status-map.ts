// OTOMIX §9.3 · Mother Add. §1–§2

export type GrpcStatus =
  | 'INVALID_ARGUMENT'
  | 'UNAUTHENTICATED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'ABORTED'
  | 'ALREADY_EXISTS'
  | 'RESOURCE_EXHAUSTED'
  | 'DEADLINE_EXCEEDED'
  | 'UNAVAILABLE'
  | 'INTERNAL';

const statusMap: Record<string, number> = {
  INVALID_ARGUMENT: 400,
  UNAUTHENTICATED: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  ABORTED: 409,
  ALREADY_EXISTS: 409,
  RESOURCE_EXHAUSTED: 429,
  DEADLINE_EXCEEDED: 504,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

export function mapStatus(code: string): number {
  return statusMap[code] ?? 500;
}
