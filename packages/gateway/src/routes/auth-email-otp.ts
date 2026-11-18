import { IncomingMessage, ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { issueAccessToken, type VaultClient } from '@otomix/access';
import { upsertEmailUser } from '../repository/user-repository.js';

export interface EmailProvider {
  send(email: string, code: string): Promise<void>;
}

export class FakeEmailProvider implements EmailProvider {
  public sent: Array<{ email: string; code: string }> = [];
  async send(email: string, code: string): Promise<void> {
    this.sent.push({ email, code });
  }
}

export interface AuthEmailOtpDeps {
  pool: Pool;
  redis: Redis;
  email: EmailProvider;
  vault: VaultClient;
  rateLimitMax: number;
  rateLimitWindowSec: number;
}

const OTP_CODE_LENGTH = 6;
const OTP_TTL_SEC = 120;

function generateOtp(): string {
  return randomBytes(3).toString('hex').slice(0, OTP_CODE_LENGTH).toUpperCase();
}

export function createAuthEmailOtpRoutes(deps: AuthEmailOtpDeps) {
  return {
    '/auth/email/send': async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST') return false;
      
      let body = '';
      for await (const chunk of req) body += chunk;
      
      let data: { email?: string; terms_version?: string };
      try {
        data = JSON.parse(body);
      } catch {
        res.writeHead(400); res.end('Invalid JSON'); return true;
      }
      
      const email = data.email?.toLowerCase().trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.writeHead(400); res.end('Invalid email format'); return true;
      }
      
      if (!data.terms_version) {
        res.writeHead(400); res.end('terms_version required'); return true;
      }
      
      const rlKey = `otomix:emailotp:ratelimit:${email}`;
      const current = await deps.redis.get(rlKey);
      const count = current ? parseInt(current, 10) : 0;
      if (count >= deps.rateLimitMax) {
        const ttl = await deps.redis.ttl(rlKey);
        res.writeHead(429, { 'Retry-After': String(ttl > 0 ? ttl : deps.rateLimitWindowSec) });
        res.end('Rate limit exceeded'); return true;
      }
      
      const code = generateOtp();
      await deps.redis.setex(`otomix:emailotp:code:${email}`, OTP_TTL_SEC, code);
      
      if (count === 0) {
        await deps.redis.setex(rlKey, deps.rateLimitWindowSec, '1');
      } else {
        await deps.redis.incr(rlKey);
      }
      
      try {
        await deps.email.send(email, code);
      } catch {
        res.writeHead(500); res.end('Email send failed'); return true;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sent: true, ttl_sec: OTP_TTL_SEC }));
      return true;
    },

    '/auth/email/verify': async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST') return false;
      
      let body = '';
      for await (const chunk of req) body += chunk;
      
      let data: { email?: string; code?: string; terms_version?: string };
      try {
        data = JSON.parse(body);
      } catch {
        res.writeHead(400); res.end('Invalid JSON'); return true;
      }
      
      const email = data.email?.toLowerCase().trim();
      const code = data.code;
      
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.writeHead(400); res.end('Invalid email format'); return true;
      }
      if (!code || code.length !== OTP_CODE_LENGTH) {
        res.writeHead(400); res.end('Invalid code'); return true;
      }
      if (!data.terms_version) {
        res.writeHead(400); res.end('terms_version required'); return true;
      }
      
      const stored = await deps.redis.getdel(`otomix:emailotp:code:${email}`);
      if (!stored || stored !== code.toUpperCase()) {
        res.writeHead(401); res.end('Invalid or expired code'); return true;
      }
      
      try {
        const userId = await upsertEmailUser(deps.pool, { email });
        
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

