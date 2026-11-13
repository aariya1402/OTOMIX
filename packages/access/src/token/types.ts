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