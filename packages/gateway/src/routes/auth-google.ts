import type { IncomingMessage, ServerResponse } from 'node:http';
import type { OAuth2Client } from 'google-auth-library';
import type Redis from 'ioredis';
import type { Pool } from 'pg';
import { issueAccessToken, type VaultClient } from '@otomix/access';
import { upsertGoogleUser } from '../repository/user-repository.js';
import { sendInvalidArgument } from './auth-response.js';

export interface AuthGoogleDeps {
  pool: Pool;
  redis: Redis;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  oauthClient: OAuth2Client;
  vault: VaultClient;
}

export function createAuthGoogleRoutes(deps: AuthGoogleDeps) {
  return {
    '/auth/google/start': async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'GET') return false;
      const requestUrl = new URL(req.url || '', `http://${req.headers.host}`);
      const termsVersion = requestUrl.searchParams.get('terms_version')?.trim();
      if (!termsVersion) {
        sendInvalidArgument(res, 'terms_version required'); return true;
      }

      const state = crypto.randomUUID();
      await deps.redis.setex(`otomix:oauth:state:${state}`, 300, termsVersion);
      
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('client_id', deps.clientId);
      url.searchParams.set('redirect_uri', deps.redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'openid email profile');
      url.searchParams.set('state', state);
      
      res.writeHead(302, { Location: url.toString() });
      res.end();
      return true;
    },

    '/auth/google/callback': async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'GET') return false;
      
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      
      if (!code || !state) {
        res.writeHead(400); res.end('Missing code or state'); return true;
      }
      
      const termsVersion = await deps.redis.getdel(`otomix:oauth:state:${state}`);
      if (!termsVersion) {
        res.writeHead(400); res.end('Invalid or expired state'); return true;
      }

      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: deps.clientId,
            client_secret: deps.clientSecret,
            redirect_uri: deps.redirectUri,
            grant_type: 'authorization_code',
          }).toString(),
        });
        
        if (!tokenRes.ok) throw new Error('Token exchange failed');
        const tokens = await tokenRes.json() as { id_token: string };
        
        const ticket = await deps.oauthClient.verifyIdToken({
          idToken: tokens.id_token,
          audience: deps.clientId,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.sub) throw new Error('Invalid payload');

        const user = await upsertGoogleUser(deps.pool, {
          googleId: payload.sub,
          email: payload.email || '',
          displayName: payload.name,
          termsVersion,
        });

        const token = await issueAccessToken({ sub: user.userId, tenantId: 'otomix' }, deps.vault);
        
        res.writeHead(user.created ? 201 : 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user_id: user.userId, access_token: token.token }));
        return true;
      } catch (err: any) {
        res.writeHead(500); res.end(err.message); return true;
      }
    }
  };
}