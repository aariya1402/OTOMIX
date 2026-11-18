import { IncomingMessage, ServerResponse } from 'node:http';
import { createHmac } from 'node:crypto';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { issueAccessToken, type VaultClient } from '@otomix/access';
import { upsertTelegramUser } from '../repository/user-repository.js';

export interface AuthTelegramDeps {
  pool: Pool;
  redis: Redis;
  botToken: string;
  vault: VaultClient;
}

function verifyTelegramAuth(data: Record<string, string>, botToken: string): boolean {
  const { hash, ...checkData } = data;
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
      
      if (!verifyTelegramAuth(data, deps.botToken)) {
        res.writeHead(401); res.end('Invalid Telegram auth'); return true;
      }
      
      const telegramId = data.id;
      if (!telegramId) {
        res.writeHead(400); res.end('Missing telegram id'); return true;
      }
      
      try {
        const userData: Record<string, string> = { telegramId };
        if (data.first_name) userData.firstName = data.first_name;
        if (data.last_name) userData.lastName = data.last_name;
        if (data.username) userData.username = data.username;
        if (data.photo_url) userData.photoUrl = data.photo_url;
        
        const userId = await upsertTelegramUser(deps.pool, userData as any);
        
        const token = await issueAccessToken({ sub: userId, tenantId: 'otomix' }, deps.vault);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ user_id: userId, access_token: token.token }));
        return true;
      } catch (err: any) {
        res.writeHead(500); res.end(err.message); return true;
      }
    }
  };
}