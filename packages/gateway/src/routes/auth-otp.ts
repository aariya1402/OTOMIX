import { IncomingMessage, ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { issueAccessToken, type VaultClient } from '@otomix/access';
import { upsertPhoneUser } from '../repository/user-repository.js';

export interface SmsProvider {
  send(phoneE164: string, code: string): Promise<void>;
}

export class FakeSmsProvider implements SmsProvider {
  public sent: Array<{ phone: string; code: string }> = [];
  async send(phoneE164: string, code: string): Promise<void> {
    this.sent.push({ phone: phoneE164, code });
  }
}

export interface AuthOtpDeps {
  pool: Pool;
  redis: Redis;
  sms: SmsProvider;
  vault: VaultClient;
  rateLimitMax: number;
  rateLimitWindowSec: number;
}

const OTP_CODE_LENGTH = 6;
const OTP_TTL_SEC = 120;

function generateOtp(): string {
  return randomBytes(3).toString('hex').slice(0, OTP_CODE_LENGTH).toUpperCase();
}

export function createAuthOtpRoutes(deps: AuthOtpDeps) {
  return {
    '/auth/otp/send': async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST') return false;
      
      let body = '';
      for await (const chunk of req) body += chunk;
      
      let data: { phone_e164?: string; terms_version?: string };
      try {
        data = JSON.parse(body);
      } catch {
        res.writeHead(400); res.end('Invalid JSON'); return true;
      }
      
      const phoneE164 = data.phone_e164;
      if (!phoneE164 || !/^\+[1-9]\d{1,14}$/.test(phoneE164)) {
        res.writeHead(400); res.end('Invalid phone_e164 format (E.164 required)'); return true;
      }
      
      if (!data.terms_version) {
        res.writeHead(400); res.end('terms_version required'); return true;
      }
      
      const rlKey = `otomix:otp:ratelimit:${phoneE164}`;
      const current = await deps.redis.get(rlKey);
      const count = current ? parseInt(current, 10) : 0;
      if (count >= deps.rateLimitMax) {
        const ttl = await deps.redis.ttl(rlKey);
        res.writeHead(429, { 'Retry-After': String(ttl > 0 ? ttl : deps.rateLimitWindowSec) });
        res.end('Rate limit exceeded'); return true;
      }
      
      const code = generateOtp();
      await deps.redis.setex(`otomix:otp:code:${phoneE164}`, OTP_TTL_SEC, code);
      
      if (count === 0) {
        await deps.redis.setex(rlKey, deps.rateLimitWindowSec, '1');
      } else {
        await deps.redis.incr(rlKey);
      }
      
      try {
        await deps.sms.send(phoneE164, code);
      } catch {
        res.writeHead(500); res.end('SMS send failed'); return true;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sent: true, ttl_sec: OTP_TTL_SEC }));
      return true;
    },

    '/auth/otp/verify': async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST') return false;
      
      let body = '';
      for await (const chunk of req) body += chunk;
      
      let data: { phone_e164?: string; code?: string; terms_version?: string };
      try {
        data = JSON.parse(body);
      } catch {
        res.writeHead(400); res.end('Invalid JSON'); return true;
      }
      
      const phoneE164 = data.phone_e164;
      const code = data.code;
      
      if (!phoneE164 || !/^\+[1-9]\d{1,14}$/.test(phoneE164)) {
        res.writeHead(400); res.end('Invalid phone_e164 format (E.164 required)'); return true;
      }
      if (!code || code.length !== OTP_CODE_LENGTH) {
        res.writeHead(400); res.end('Invalid code'); return true;
      }
      if (!data.terms_version) {
        res.writeHead(400); res.end('terms_version required'); return true;
      }
      
      const stored = await deps.redis.getdel(`otomix:otp:code:${phoneE164}`);
      if (!stored || stored !== code.toUpperCase()) {
        res.writeHead(401); res.end('Invalid or expired code'); return true;
      }
      
      try {
        const userId = await upsertPhoneUser(deps.pool, { phoneE164 });
        
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

