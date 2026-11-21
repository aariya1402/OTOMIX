import { Pool } from 'pg';
import { withTenant } from '@otomix/db';
import { randomUUID } from 'node:crypto';

export interface GoogleUserData {
  googleId: string;
  email: string;
  displayName?: string | undefined;
}

export async function upsertGoogleUser(pool: Pool, data: GoogleUserData): Promise<string> {
  return withTenant(pool, 'otomix', async (client) => {
    let res = await client.query('SELECT user_id FROM users WHERE google_id = $1', [data.googleId]);
    if (res.rows.length > 0) return res.rows[0].user_id;

    if (data.email) {
      res = await client.query('SELECT user_id FROM users WHERE email = $1', [data.email]);
      if (res.rows.length > 0) {
        const userId = res.rows[0].user_id;
        await client.query('UPDATE users SET google_id = $1 WHERE user_id = $2', [data.googleId, userId]);
        return userId;
      }
    }

    const newId = randomUUID();
    await client.query(
      `INSERT INTO users (user_id, tenant_id, role, tier, google_id, email, display_name)
         VALUES ($1, 'otomix', 'end_user', 1, $2, $3, $4)`,
      [newId, data.googleId, data.email || null, data.displayName || null]
    );
    return newId;
  });
}

export interface TelegramUserData {
  telegramId: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  username?: string | undefined;
  photoUrl?: string | undefined;
}

export async function upsertTelegramUser(pool: Pool, data: TelegramUserData): Promise<string> {
  return withTenant(pool, 'otomix', async (client) => {
    let res = await client.query('SELECT user_id FROM users WHERE telegram_id = $1', [data.telegramId]);
    if (res.rows.length > 0) return res.rows[0].user_id;
    
    const newId = randomUUID();
    await client.query(
      `INSERT INTO users (user_id, tenant_id, role, tier, telegram_id, display_name)
         VALUES ($1, 'otomix', 'end_user', 1, $2, $3)`,
      [newId, data.telegramId, data.firstName || data.username || 'Telegram User']
    );
    return newId;
  });
}

export interface PhoneUserData {
  phoneE164: string;
}

export async function upsertPhoneUser(pool: Pool, data: PhoneUserData): Promise<string> {
  return withTenant(pool, 'otomix', async (client) => {
    let res = await client.query('SELECT user_id FROM users WHERE phone_e164 = $1', [data.phoneE164]);
    if (res.rows.length > 0) return res.rows[0].user_id;
    
    const newId = randomUUID();
    await client.query(
      `INSERT INTO users (user_id, tenant_id, role, tier, phone_e164)
         VALUES ($1, 'otomix', 'end_user', 1, $2)`,
      [newId, data.phoneE164]
    );
    return newId;
  });
}

export interface EmailUserData {
  email: string;
}

export async function upsertEmailUser(pool: Pool, data: EmailUserData): Promise<string> {
  return withTenant(pool, 'otomix', async (client) => {
    let res = await client.query('SELECT user_id FROM users WHERE email = $1', [data.email]);
    if (res.rows.length > 0) return res.rows[0].user_id;
    
    const newId = randomUUID();
    await client.query(
      `INSERT INTO users (user_id, tenant_id, role, tier, email)
         VALUES ($1, 'otomix', 'end_user', 1, $2)`,
      [newId, data.email]
    );
    return newId;
  });
}