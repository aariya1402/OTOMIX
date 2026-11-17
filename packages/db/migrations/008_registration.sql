-- 008_registration.sql
-- GAP-027: Registration methods (Google OAuth, Telegram, Phone OTP) + terms + display name.
-- All new columns are nullable so existing seeded users remain valid.
-- RLS is unchanged (users RLS policy is already enforced by 002_rls.sql).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_id         text,
  ADD COLUMN IF NOT EXISTS telegram_id       text,
  ADD COLUMN IF NOT EXISTS phone_e164        text,
  ADD COLUMN IF NOT EXISTS email             text,
  ADD COLUMN IF NOT EXISTS display_name      text,
  ADD COLUMN IF NOT EXISTS terms_version     text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- Per GAP-027: google_id, telegram_id, phone_e164, email are each UNIQUE.
-- PostgreSQL UNIQUE indexes allow multiple NULLs, so existing seeded users
-- (which have none of these set) are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_key   ON users (google_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_key ON users (telegram_id);
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_e164_key  ON users (phone_e164);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key       ON users (email);

-- Down
DROP INDEX IF EXISTS users_email_key;
DROP INDEX IF EXISTS users_phone_e164_key;
DROP INDEX IF EXISTS users_telegram_id_key;
DROP INDEX IF EXISTS users_google_id_key;

ALTER TABLE users
  DROP COLUMN IF EXISTS terms_accepted_at,
  DROP COLUMN IF EXISTS terms_version,
  DROP COLUMN IF EXISTS display_name,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone_e164,
  DROP COLUMN IF EXISTS telegram_id,
  DROP COLUMN IF EXISTS google_id;