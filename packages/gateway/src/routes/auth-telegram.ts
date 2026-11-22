import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHmac } from 'node:crypto';
import type Redis from 'ioredis';
import type { Pool } from 'pg';
import { issueAccessToken, type VaultClient } from '@otomix/access';
import { upsertTelegramUser } from '../repository/user-repository.js';
import { sendInvalidArgument } from './auth-response.js';

export interface AuthTelegramDeps {
  pool: Pool;
  redis: Redis;
  botToken: string;
  vault: VaultClient;
}

function verifyTelegramAuth(data: Record<string, string>, botToken: string): boolean {
  const hash = data.hash;
  const checkData = Object.fromEntries(
    Object.entries(data).filter(([key]) => key !== 'hash' && key !== 'terms_version'),
  );
  const dataCheckString = Object.keys(checkData)
    .sort()
    .map(k => `${k}=${checkData[k]}`)
    .join('\n');
  
  const secretKey = createHmac('sha256', botToken).update('WebAppData').digest();
  const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  if (calculatedHash !== hash) return false;
  
  const authDateStr = checkData.auth_date;
  if (!authDateStr) return false;
  const authDate = parseInt(authDateStr, 10);
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) return false; // 24 hours
  
  return true;
}

export function createAuthTelegramRoutes(deps: AuthTelegramDeps) {
  return {
    '/auth/telegram/verify': async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST') return false;
      
      let body = '';
      for await (const chunk of req) body += chunk;
      
      let data: Record<string, string>;
      try {
        data = JSON.parse(body);
      } catch {
        res.writeHead(400); res.end('Invalid JSON'); return true;
      }

      const termsVersion = data.terms_version?.trim();
      if (!termsVersion) {
        sendInvalidArgument(res, 'terms_version required'); return true;
      }
      
      if (!verifyTelegramAuth(data, deps.botToken)) {
        res.writeHead(401); res.end('Invalid Telegram auth'); return true;
      }
      
      const telegramId = data.id;
      if (!telegramId) {
        res.writeHead(400); res.end('Missing telegram id'); return true;
      }
      
      try {
        const user = await upsertTelegramUser(deps.pool, {
          telegramId,
          firstName: data.first_name,
          lastName: data.last_name,
          username: data.username,
          photoUrl: data.photo_url,
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