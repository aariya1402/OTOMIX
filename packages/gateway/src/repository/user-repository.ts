import type { Pool, PoolClient } from 'pg';
import { withTenant } from '@otomix/db';
import { randomUUID } from 'node:crypto';
import { recordDeclaration } from '../declarations/record.js';

export interface UserUpsertResult {
  userId: string;
  created: boolean;
}

async function recordRegistrationAcceptance(
  client: PoolClient,
  userId: string,
  termsVersion: string,
): Promise<void> {
  const declaredAt = new Date();
  await client.query(
    `UPDATE users
     SET terms_version = $1, terms_accepted_at = $2
     WHERE user_id = $3`,
    [termsVersion, declaredAt, userId],
  );
  await recordDeclaration(client, {
    tenantId: 'otomix',
    userId,
    scope: 'register',
    termsVersion,
    declaredAt,
  });
}

export interface GoogleUserData {
  googleId: string;
  email: string;
  displayName?: string | undefined;
  termsVersion: string;
}

export async function upsertGoogleUser(pool: Pool, data: GoogleUserData): Promise<UserUpsertResult> {
  return withTenant(pool, 'otomix', async (client) => {
    const googleUser = await client.query<{ user_id: string }>(
      'SELECT user_id FROM users WHERE google_id = $1',
      [data.googleId],
    );
    const googleUserId = googleUser.rows[0]?.user_id;
    if (googleUserId) {
      return { userId: googleUserId, created: false };
    }

    if (data.email) {
      const emailUser = await client.query<{ user_id: string }>(
        'SELECT user_id FROM users WHERE email = $1',
        [data.email],
      );
      const emailUserId = emailUser.rows[0]?.user_id;
      if (emailUserId) {
        const userId = emailUserId;
        await client.query('UPDATE users SET google_id = $1 WHERE user_id = $2', [data.googleId, userId]);
        return { userId, created: false };
      }
    }

    const newId = randomUUID();
    await client.query(
      `INSERT INTO users (user_id, tenant_id, role, tier, google_id, email, display_name)
         VALUES ($1, 'otomix', 'end_user', 1, $2, $3, $4)`,
      [newId, data.googleId, data.email || null, data.displayName || null]
    );
    await recordRegistrationAcceptance(client, newId, data.termsVersion);
    return { userId: newId, created: true };
  });
}

export interface TelegramUserData {
  telegramId: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  username?: string | undefined;
  photoUrl?: string | undefined;
  termsVersion: string;
}

export async function upsertTelegramUser(pool: Pool, data: TelegramUserData): Promise<UserUpsertResult> {
  return withTenant(pool, 'otomix', async (client) => {
    const existing = await client.query<{ user_id: string }>(
      'SELECT user_id FROM users WHERE telegram_id = $1',
      [data.telegramId],
    );
    const existingUserId = existing.rows[0]?.user_id;
    if (existingUserId) {
      return { userId: existingUserId, created: false };
    }
    
    const newId = randomUUID();
    await client.query(
      `INSERT INTO users (user_id, tenant_id, role, tier, telegram_id, display_name)
         VALUES ($1, 'otomix', 'end_user', 1, $2, $3)`,
      [newId, data.telegramId, data.firstName || data.username || 'Telegram User']
    );
    await recordRegistrationAcceptance(client, newId, data.termsVersion);
    return { userId: newId, created: true };
  });
}

export interface PhoneUserData {
  phoneE164: string;
  termsVersion: string;
}

export async function upsertPhoneUser(pool: Pool, data: PhoneUserData): Promise<UserUpsertResult> {
  return withTenant(pool, 'otomix', async (client) => {
    const existing = await client.query<{ user_id: string }>(
      'SELECT user_id FROM users WHERE phone_e164 = $1',
      [data.phoneE164],
    );
    const existingUserId = existing.rows[0]?.user_id;
    if (existingUserId) {
      return { userId: existingUserId, created: false };
    }
    
    const newId = randomUUID();
    await client.query(
      `INSERT INTO users (user_id, tenant_id, role, tier, phone_e164)
         VALUES ($1, 'otomix', 'end_user', 1, $2)`,
      [newId, data.phoneE164]
    );
    await recordRegistrationAcceptance(client, newId, data.termsVersion);
    return { userId: newId, created: true };
  });
}

export interface EmailUserData {
  email: string;
}

export async function upsertEmailUser(pool: Pool, data: EmailUserData): Promise<string> {
  return withTenant(pool, 'otomix', async (client) => {
    const res = await client.query<{ user_id: string }>(
      'SELECT user_id FROM users WHERE email = $1',
      [data.email],
    );
    const existingUserId = res.rows[0]?.user_id;
    if (existingUserId) return existingUserId;
    
    const newId = randomUUID();
    await client.query(
      `INSERT INTO users (user_id, tenant_id, role, tier, email)
         VALUES ($1, 'otomix', 'end_user', 1, $2)`,
      [newId, data.email]
    );
    return newId;
  });
}