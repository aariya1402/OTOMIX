import { IncomingMessage, ServerResponse } from 'node:http';
import { OAuth2Client } from 'google-auth-library';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { issueAccessToken } from '@otomix/access';
import { upsertGoogleUser } from '../repository/user-repository.js';

export interface AuthGoogleDeps {
  pool: Pool;
  redis: Redis;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  oauthClient: OAuth2Client;
}

export function createAuthGoogleRoutes(deps: AuthGoogleDeps) {
  return {
    '/auth/google/start': async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'GET') return false;
      const state = crypto.randomUUID();
      await deps.redis.setex(`otomix:oauth:state:${state}`, 300, '1');
      
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
      
      const stateValid = await deps.redis.getdel(`otomix:oauth:state:${state}`);
      if (!stateValid) {
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

        const userId = await upsertGoogleUser(deps.pool, {
          googleId: payload.sub,
          email: payload.email || '',
          displayName: payload.name,
        });

        const token = issueAccessToken({ sub: userId, tenant_id: 'otomix', scopes: [], tier: 1 });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user_id: userId, access_token: token }));
        return true;
      } catch (err: any) {
        res.writeHead(500); res.end(err.message); return true;
      }
    }
  };
}