export type Tier = 1 | 2;

export interface AccessTokenClaims {
  sub: string;
  tenant_id: string;
  scopes: string[];
  tier: Tier;
  jti: string;
  iat: number;
  exp: number;
}

export interface AccessTokenIssueInput {
  sub: string;
  tenantId: string;
  scopes: string[];
  tier: Tier;
}

export interface IssuedAccessToken {
  token: string;
  claims: AccessTokenClaims;
  kid: string;
}

export interface VaultClient {
  getCurrentKid(): Promise<string>;
  getSigningKey(kid: string): Promise<unknown>;
}

export class TokenIssuanceError extends Error {
  readonly code = 'TOKEN_ISSUANCE_ERROR' as const;
  constructor(message: string) {
    super(message);
    this.name = 'TokenIssuanceError';
  }
}
// ===== P06-T01-S01-M02: refresh token types =====

export type RefreshTokenStatus = 'active' | 'consumed';

export interface RefreshTokenClaims {
  sub: string;
  tenant_id: string;
  tier: Tier;
  familyId: string;
  jti: string;
  iat: number;
  exp: number;
  status: RefreshTokenStatus;
}

export interface RefreshTokenIssueInput {
  sub: string;
  tenantId: string;
  tier: Tier;
}

export interface IssuedRefreshToken {
  token: string;
  claims: RefreshTokenClaims;
}

export class RefreshTokenReuseError extends Error {
  readonly code = 'REFRESH_TOKEN_REUSE' as const;
  constructor(message: string) {
    super(message);
    this.name = 'RefreshTokenReuseError';
  }
}

export class RefreshTokenRevokedError extends Error {
  readonly code = 'REFRESH_TOKEN_REVOKED' as const;
  constructor(message: string) {
    super(message);
    this.name = 'RefreshTokenRevokedError';
  }
}

export class RefreshTokenNotFoundError extends Error {
  readonly code = 'REFRESH_TOKEN_NOT_FOUND' as const;
  constructor(message: string) {
    super(message);
    this.name = 'RefreshTokenNotFoundError';
  }
}