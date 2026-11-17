# P07-REG-M02: Google OAuth 2.0 - Implementation Plan

## Executive Summary
Implement Google OAuth 2.0 authentication in the gateway for user registration/login. Two public routes: `/auth/google/start` (initiates OAuth flow) and `/auth/google/callback` (handles Google redirect, verifies ID token, upserts user).

---

## 1. Architecture Decisions

### 1.1 Library Selection
| Need | Choice | Rationale |
|------|--------|-----------|
| OAuth flow initiation (redirect URL building) | **Raw `fetch` + URLSearchParams** | No Fastify framework; native `http` module used throughout gateway. Minimal deps. |
| Token exchange (code → tokens) | **Raw `fetch` to `https://oauth2.googleapis.com/token`** | Standard OAuth2 endpoint; no library needed. |
| ID token verification | **`google-auth-library` (`OAuth2Client`)** | Google's official library; handles JWKS fetching, signature verification, audience/expiry checks. Already uses `jose` in `@otomix/access` - consistent ecosystem. |
| Redis client | **`ioredis` (existing)** | Already in `gateway/package.json`; used by idempotency store. |

**Dependencies to add to `packages/gateway/package.json`:**
```json
"dependencies": {
  "google-auth-library": "^9.0.0"
}
```

### 1.2 Route Placement
- **File:** `packages/gateway/src/routes/auth.ts` (new)
- **Exports:** `createGoogleOAuthRoutes(deps)` returning route handlers map
- **Registration:** Add to `ROUTE_SCOPES` in `scopes.ts` as **public** (no scope required)
- **Mounting:** In gateway server setup (where ingest-local is mounted), register both routes

### 1.3 State Token Storage (Redis)
- **Key format:** `otomix:oauth:state:{stateToken}`
- **Value:** JSON `{ "redirectUri": string, "createdAt": number }` (for audit/tracing)
- **TTL:** 300 seconds (5 minutes) — per spec
- **Generation:** `crypto.randomBytes(32).toString('base64url')` (256-bit entropy)
- **Verification:** Atomic `GETDEL` (get + delete) to prevent replay

### 1.4 User Upsert Logic (Transaction)
```sql
-- Priority order:
-- 1. Match by google_id (sub claim)
-- 2. Match by email (email claim)
-- 3. Insert new
```
- **Transaction:** Use `withTenant(pool, 'otomix', async (client) => { ... })`
- **RLS:** The `users` table has RLS enabled (migration 002). Since callback is unauthenticated, we use the **system tenant** `'otomix'` with a **service role** that bypasses RLS via `SET LOCAL app.tenant_id = 'otomix'` (already done by `withTenant`).
- **Columns to set/update:** `google_id`, `email`, `display_name` (from `name` claim), `terms_version` = `'v1.0'`, `terms_accepted_at` = `now()`

### 1.5 Environment Variables
| Variable | Required | Source |
|----------|----------|--------|
| `GOOGLE_CLIENT_ID` | Yes | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | Yes | Must match Authorized redirect URI in Google Cloud: `https://<api>/auth/google/callback` |

Loaded via `process.env` (existing pattern in gateway).

---

## 2. Files to Create / Modify

### 2.1 New Files
| Path | Purpose |
|------|---------|
| `packages/gateway/src/routes/auth.ts` | OAuth route handlers (`start`, `callback`) |
| `packages/gateway/src/oauth/google.ts` | Google OAuth helpers (URL build, token exchange, ID token verify) |
| `packages/gateway/src/oauth/state-store.ts` | Redis state token store (get/set/delete) |
| `packages/gateway/src/repository/user-repository.ts` | User upsert by google_id/email |
| `packages/gateway/test/auth.google.spec.ts` | Integration tests (testcontainers: Postgres + Redis) |

### 2.2 Modified Files
| Path | Change |
|------|--------|
| `packages/gateway/package.json` | Add `google-auth-library` dependency |
| `packages/gateway/src/scopes.ts` | Add two public routes to `ROUTE_SCOPES` (no scopes) |
| `packages/gateway/src/index.ts` | Export new route creators and types |
| `packages/gateway/src/db/tenant.ts` | Ensure `withTenant` works for system tenant (already does) |

---

## 3. Route Specifications

### 3.1 `GET /auth/google/start`
**Query params:** `redirect_uri` (optional, defaults to `GOOGLE_REDIRECT_URI`)
**Response:** `302 Found` → `https://accounts.google.com/o/oauth2/v2/auth?...`
**Scopes requested:** `openid email profile`
**State:** Generated, stored in Redis (TTL 5 min), passed to Google
**No authentication required** (public route)

### 3.2 `GET /auth/google/callback`
**Query params:** `code`, `state` (from Google)
**Flow:**
1. Validate `state` exists in Redis (atomic GETDEL) → fail 400 if missing/expired
2. Exchange `code` for tokens at `https://oauth2.googleapis.com/token`
3. Verify ID token using `google-auth-library` (audience = `GOOGLE_CLIENT_ID`, expiry, signature)
4. Extract claims: `sub` (google_id), `email`, `email_verified`, `name`, `picture`
5. **Require** `email_verified === true` (security)
6. Upsert user in DB (transaction, system tenant)
7. Issue OTOMIX access token + refresh token (reuse `@otomix/access` token issuance)
8. **Response:** `302 Found` → frontend app URL with tokens in fragment (or set secure cookies)
   - *Decision needed: token delivery mechanism (fragment vs cookies). Plan assumes fragment for SPA.*

**Error handling:**
- Invalid/expired state → `400 { error: 'INVALID_STATE' }`
- Token exchange failed → `400 { error: 'TOKEN_EXCHANGE_FAILED' }`
- ID token verification failed → `401 { error: 'INVALID_ID_TOKEN' }`
- Email not verified → `403 { error: 'EMAIL_NOT_VERIFIED' }`
- DB error → `500 { error: 'INTERNAL_ERROR' }`

---

## 4. Data Structures

### 4.1 Google ID Token Claims (subset)
```typescript
interface GoogleIdTokenClaims {
  sub: string;           // google_id
  email: string;
  email_verified: boolean;
  name: string;          // display_name
  picture?: string;
  aud: string;           // must match GOOGLE_CLIENT_ID
  exp: number;
  iat: number;
}
```

### 4.2 User Upsert Input
```typescript
interface UpsertUserInput {
  googleId: string;
  email: string;
  displayName: string;
  termsVersion: 'v1.0';
}
```

### 4.3 User Upsert Result
```typescript
interface UpsertUserResult {
  userId: string;        // users.user_id (uuid)
  isNew: boolean;
}
```

---

## 5. Test Strategy

### 5.1 Unit Tests (Vitest, no containers)
- `google.ts`: URL building, token exchange request shape, ID token verification (mock `google-auth-library`)
- `state-store.ts`: Redis operations (mock `ioredis`)
- `user-repository.ts`: Upsert logic (mock `pg` PoolClient)

### 5.2 Integration Tests (testcontainers)
- **PostgreSQL:** Run migrations 001, 002, 008
- **Redis:** Real instance
- **Test cases:**
  1. `start` → returns 302 with valid Google URL containing state
  2. `callback` with valid code/state → upserts user, returns 302 with tokens
  3. `callback` with expired state → 400 INVALID_STATE
  4. `callback` with reused state → 400 INVALID_STATE (replay protection)
  5. `callback` with invalid code → 400 TOKEN_EXCHANGE_FAILED
  6. `callback` with unverified email → 403 EMAIL_NOT_VERIFIED
  7. Duplicate google_id → returns existing user (not new)
  8. Duplicate email (different google_id) → links to existing user (spec: fallback to email)
  9. New user → creates user with terms_version='v1.0', terms_accepted_at=now

---

## 6. Security Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **State token replay** | High | Atomic `GETDEL` in Redis; state deleted on first use |
| **State token leakage (referer)** | Medium | State in query param; use `SameSite=Strict` cookies for session if needed |
| **ID token substitution** | High | `google-auth-library` verifies signature via Google JWKS; audience check (`aud === GOOGLE_CLIENT_ID`) |
| **Email spoofing (unverified email)** | High | Require `email_verified === true` |
| **Redirect URI manipulation** | Medium | `GOOGLE_REDIRECT_URI` from env only; ignore `redirect_uri` query param in callback |
| **CSRF on callback** | Medium | State parameter binds request to session |
| **Token leakage in URL fragment** | Medium | Use short-lived access tokens; refresh tokens in httpOnly cookies (future) |
| **RLS bypass via system tenant** | Low | System tenant only used for registration callback; all other routes require authenticated tenant |
| **Database lock contention** | Low | Single-row upsert with `ON CONFLICT`; short transaction |

---

## 7. Architecture Risks

| Risk | Impact | Resolution |
|------|--------|------------|
| **No Fastify framework** | Must implement OAuth manually | Use raw `fetch` + `google-auth-library`; proven pattern |
| **System tenant for public route** | RLS requires tenant context | `withTenant(pool, 'otomix', ...)` sets `app.tenant_id` locally; correct |
| **Token issuance dependency** | Need `@otomix/access` in gateway | Gateway already depends on `@otomix/core`; add `@otomix/access` to deps |
| **Frontend token handling** | Fragment vs cookies | Document as `IMPL-PROPOSED`; owner to confirm |

---

## 8. Implementation Order

1. **Add dependency** → `packages/gateway/package.json`
2. **Create `google.ts`** → URL build, token exchange, ID token verify
3. **Create `state-store.ts`** → Redis state management
4. **Create `user-repository.ts`** → Upsert logic with `withTenant`
5. **Create `auth.ts`** → Route handlers wiring all pieces
6. **Update `scopes.ts`** → Add public routes
7. **Update `index.ts`** → Export new modules
8. **Write unit tests** → Mock external deps
9. **Write integration tests** → Testcontainers
10. **Verify build + test pass**

---

## 9. Open Questions (Require Owner Input)

1. **Token delivery:** Fragment (`#access_token=...&refresh_token=...`) vs httpOnly cookies?
2. **Frontend redirect URL:** Where does the 302 from callback go? (env var `FRONTEND_APP_URL`?)
3. **Scope for authenticated routes:** After OAuth, user gets JWT. What scopes granted to new users? (likely `user:read`, `local:process`)
4. **Terms acceptance:** Auto-accept `v1.0` on Google sign-up? (plan assumes yes)

---

## 10. HALT - Awaiting Execution Authorization

This plan is complete. No code written. Ready for agent to generate Match and Execute scripts.