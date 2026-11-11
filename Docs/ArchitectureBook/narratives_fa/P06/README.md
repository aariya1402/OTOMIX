# فاز 6 - امنیت، RBAC و جداسازی مستاجر

## آنچه P06 ارائه می دهد

P06 **اعتماد صفر** را در هر لایه اعمال می‌کند: احراز هویت (JWT)، مجوز (محدوده‌ها + کمک‌های سطح)، جداسازی داده‌ها (امنیت در سطح ردیف)، و ثبت حسابرسی (تا P10).

| لایه | Mechanism |
|-------|-----------|
| **معتبر** | RS256 JWT, short TTL (`ACCESS_TTL_MIN = 15` from `constants/scoring.ts`), refresh rotation (`REFRESH_TTL_DAYS = 7`, `KEY_ROTATION_DAYS = 90`). |
| **محدوده** | Fine-grained: `tracks:read`, `tracks:write`, `mixes:create`, `admin:tenants`. Encoded in JWT `scope` claim. |
| ** کمک های مالی سطح ** | `free` / `pro` / `enterprise` — controls feature flags (e.g., MAEST embeddings, export formats, concurrent mixes). |
| **RLS** | PostgreSQL Row-Level Security on every tenant table. Policy: `tenant_id = current_setting('app.current_tenant')::uuid`. Set by middleware on every request. |
| ** گزارش حسابرسی ** | Every authorization decision (allow/deny) → structured log with `trace_id`, `user_id`, `tenant_id`, `resource`, `action`, `decision`. Shipped to P10 OpenTelemetry. |

**ورودی**: هویت کاربر (JWT) + زمینه درخواست (مستاجر، منبع، اقدام).
**خروجی**: مجاز/رد + رویداد حسابرسی.

**کار مسدود شده (1)**:
- OQ-10: ماتریس اعطای ردیف - کدام محدوده به کدام لایه ها ترسیم می شود؟ نیاز به تصمیم گیری محصول دارد.

**مجموع وظایف P06: همه TODO، 1 مسدود شده است.**