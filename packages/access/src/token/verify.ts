import { jwtVerify } from 'jose';
import { VaultClient, TokenIssuanceError } from './types';

const keyCache = new Map<string, CryptoKey>();

async function getKey(vaultClient: VaultClient, kid: string): Promise<CryptoKey> {
  if (keyCache.has(kid)) return keyCache.get(kid)!;
  
  const jwks = await vaultClient.getJwks();
  const key = jwks.keys.find(k => k.kid === kid);
  if (!key) throw new TokenIssuanceError(`Key not found: ${kid}`);
  
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    key,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  keyCache.set(kid, cryptoKey);
  return cryptoKey;
}

export async function createTokenVerifier(vaultClient: VaultClient) {
  return {
    async verify(token: string): Promise<{ claims: { sub: string; tenant_id: string; jti: string; iat: number; exp: number }; kid: string }> {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) throw new TokenIssuanceError('Invalid token format');
        
        const headerB64 = parts[0];
        if (!headerB64) throw new TokenIssuanceError('Missing token header');
        
        const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
        const kid = header.kid;
        if (!kid) throw new TokenIssuanceError('Token missing kid');

        const key = await getKey(vaultClient, kid);
        
        const { payload, protectedHeader } = await jwtVerify(token, key, {
          algorithms: ['RS256'],
          issuer: 'otomix',
          audience: 'otomix-api',
        });

        return {
          claims: {
            sub: payload.sub as string,
            tenant_id: payload.tenant_id as string,
            jti: payload.jti as string,
            iat: payload.iat as number,
            exp: payload.exp as number,
          },
          kid: protectedHeader.kid as string,
        };
      } catch (err: any) {
        throw new TokenIssuanceError(`Token verification failed: ${err.message}`);
      }
    },
  };
}