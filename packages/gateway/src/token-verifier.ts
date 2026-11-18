import { createTokenVerifier } from '@otomix/access';
import type { VaultClient } from '@otomix/access';
import type { TokenVerifier, TokenClaims } from './interceptor.js';

export async function createGatewayTokenVerifier(vaultClient: VaultClient): Promise<TokenVerifier> {
  const verifier = await createTokenVerifier(vaultClient);
  return {
    async verify(token: string): Promise<TokenClaims> {
      const result = await verifier.verify(token);
      return {
        sub: result.claims.sub,
        tenant_id: result.claims.tenant_id,
        jti: result.claims.jti,
        iat: result.claims.iat,
        exp: result.claims.exp,
      };
    },
  };
}