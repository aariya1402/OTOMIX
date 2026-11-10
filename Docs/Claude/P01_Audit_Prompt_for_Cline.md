# OTOMIX — P01 Independent Audit (برای Cline)

> این پرامپت رو کامل به Cline بده. هدف: **راستی‌آزمایی مستقل** فاز P01، نه تأیید گزارش خودت.

---

## 0. نقش و قوانین (غیرقابل مذاکره)

تو الان **ممیز مستقل** هستی، نه سازنده. گزارش تکمیل فاز (`P01 Completion Report`) رو **باور نکن**؛ هر ادعا باید با خروجی واقعی دستور یا خوندن کد اثبات بشه.

1. **Read-only**: در فاز ممیزی هیچ فایل سورس/تستی رو تغییر نده. تنها استثناها: (الف) پر کردن بلاک `ADAPTERS` در `tools/test/p01-phase.spec.ts` (فقط بدنه توابع، نه assertionها)، (ب) نوشتن گزارش در `docs/audits/P01_AUDIT_REPORT.md`، (ج) فایل‌های موقت در `.audit-tmp/` (آخرش پاک کن). اصلاح باگ‌ها **فقط بعد از تأیید من**.
2. **Evidence-first**: برای هر ردیف چک‌لیست، دستور اجراشده + خلاصه خروجی (یا مسیر فایل:خط) بنویس. «به نظر درسته» یعنی FAIL.
3. **سه وضعیت**: `PASS` (با شواهد) / `FAIL` (با شواهد) / `UNVERIFIED` (نتونستی چک کنی؛ دلیل بنویس). حدس نزن.
4. **مرجع حقیقت** = `OTOMIX_MicroTask_Plan.md` (بخش P01) و `OTOMIX_Architecture_Spec.md`. نه گزارش، نه تست‌های خودت.
5. اگه چیزی در پلن مبهمه، اون رو جدا زیر «Ambiguities» لیست کن؛ خودت تفسیر نکن و FAIL نده.
6. محیط Windows/PowerShell رو در نظر بگیر (منشأ احتمالی BOM و فاصله‌ی دوتایی بعد از `:` در JSON همینه). دستورات رو با `pnpm`/`node`/`git` بزن که cross-platform باشن.

## 1. اسکیل‌ها (Skills)

قبل از شروع هر بخش، اسکیل مربوطه رو اجرا/بخون و چک‌لیستش رو روی کد اعمال کن. اگه اسکیلی نصب نیست بنویس `SKILL NOT AVAILABLE: <name>` و چک‌لیست رو دستی انجام بده.

| بخش ممیزی | اسکیل |
|---|---|
| کیفیت تست‌ها (همه) | `testing-with-discernment` |
| SQL/RLS/migrations (T05) | `review-migration`, `migration-safety`, `data-modeling-discipline` |
| Tenant isolation / نقش DB | `auth-and-authorization`, `security-discipline` |
| Idempotency, dedup, outbox (T06) | `idempotency-and-side-effects` |
| Retry / degraded (T07) | `backend-resilience` (`backend-engineering:`) |
| خطاها و status map (T04-S02, T03) | `error-handling-as-design`, `error-handling-and-result-modeling` |
| Logger/Trace (T08) | `observability-by-default`, `opentelemetry-instrumentation` |
| قرارداد proto/schema | `api-contract-testing` |
| هر شکست غیرمنتظره | `debugging-discipline` |
| بررسی نهایی هر diff | `security-discipline` |

## 2. فاز A — Baseline محیط (بدون تغییر)

اجرا کن و خروجی رو در گزارش بچسبون:

```
git status --porcelain            # باید خالی باشه
git log --oneline -n 12           # HEAD باید 09d9189 باشه؛ تعداد کامیت‌ها = ادعا (9)؟
node -v ; pnpm -v
pnpm install --frozen-lockfile    # باید بدون تغییر lockfile تموم بشه
pnpm -r build                     # exit 0 برای هر 9 پکیج
pnpm -r exec tsc --noEmit
pnpm -r exec madge --circular --extensions ts src      # 0 cycle (دستور مرجع پلن)
pnpm -r lint ; pnpm exec prettier --check .
pnpm -r test                      # تعداد واقعی tests/files/skips رو ثبت کن
pnpm vitest run --coverage        # آستانه core branches=90، access branches=100
pnpm vitest run --project p01-integration   # دستور P01-IT پلن؛ اگه project وجود نداره => FAIL
```

مقایسه کن: گزارش می‌گه **142 تست / 22 فایل / 110 unit + 32 integration / 0 skip**. عدد واقعی چیه؟ هر اختلاف = یافته.

## 3. فاز B — ممیزی هر Micro-task (23 مورد)

برای هر مورد: **(1)** کد رو بخون و با ستون «Expected Outcome» پلن مقایسه کن، **(2)** تست مستقل پلن رو اجرا کن، **(3)** Review Checkpoint پلن رو **عملاً** انجام بده، **(4)** یک **Mutation probe** بزن: کد رو موقتاً خراب کن (با `git stash`/`git checkout -- .` برگردون) و ثابت کن تست مربوطه **fail می‌شه**. تستی که با کد خراب سبز می‌مونه = `FAIL (vacuous test)`.

### T01 — Repository & Quality Gates
- **S01-M01**: `pnpm-workspace.yaml` شامل `packages/*`؛ ۹ پکیج؛ هر `tsconfig` با `strict:true` (حتی از طریق extends؛ override محلی `strict:false` نباشه)؛ ESLint+Prettier کانفیگ شده. **BOM**: `Get-ChildItem -Recurse -Include *.json,*.ts,*.yaml,*.sql,*.proto | % { $b=[IO.File]::ReadAllBytes($_.FullName)[0..2]; if($b[0]-eq 0xEF -and $b[1]-eq 0xBB -and $b[2]-eq 0xBF){$_.FullName} }` → باید خالی باشه. بررسی کن `stripBom` در `workspace.spec.ts` باعث **نادیده‌گرفتن** BOM در آینده می‌شه یا نه (باید یک assertion صریح بایتی وجود داشته باشه).
- **S02-M01**: `vitest.config.ts` آستانه‌ها **per-package** (نه global): core=90، access=100 branches. Probe: یک branch رو در access بدون تست بذار → coverage باید fail کنه.
- **S02-M02**: `scripts/cvss-gate.ts`: fixture با 6.9 → exit 0، 7.0 → exit 1، **7.1 و 10 و fixture خالی/خراب** رو هم امتحان کن (خراب نباید exit 0 بده؛ fail-closed). **CI workflow** (`.github/workflows/*`) باید وجود داشته باشه و job دیپلوی `needs:` job گیت رو داشته باشه و گیت `continue-on-error` نداشته باشه. (گزارش اصلاً به CI اشاره نکرده — مشکوک.)

### T02 — Constants
- مقادیر هر ۳ فایل (+ `access/src/constants.ts`) رو **خط‌به‌خط** با پلن و Spec §3.13/§4.3–§4.9/§7.4 مقایسه کن (نه با تست خودت). تعداد: timing=11، grid=22، scoring=**16** (پلن می‌گه 15 ولی 16 مورد لیست کرده — در Ambiguities بنویس).
- `Object.isFrozen` عمیق (آرایه‌ها هم). هر ثابت کامنت §.
- `grep -rn "0.65"`, `grep -rn "86400"`, `grep -rn "5000"` در src → فقط در فایل‌های constants (تعریف تکراری ممنوع).
- هر ثابت دقیقاً در **یک** فایل تعریف شده (core یا access)، نه هر دو.

### T03 — Types & Schema
- `BPM.parse`: 59.999 / 60 / 200 / 200.001 / NaN / ±Infinity / `'120'` / null. خطا باید **typed INVALID_ARGUMENT result** باشه، نه `throw new Error`.
- `CamelotKey.parse`: ۲۴ کلید معتبر؛ `'13A','0B','5C','a5','1A\n',' 1A'` رد. regex کد = regex CHECK در `001_core.sql`.
- `BeatIndex.parse`: `0` و `-0` و `1.5` و `MAX_SAFE_INTEGER+1` رد؛ منفی‌ها قبول.
- Schema: **diff کامل** `feature-registry-1.2.json` با Spec §9.6؛ آرایه‌های `required` دست‌نخورده؛ Draft-07؛ `vocal_map.threshold=0.6` رد. یک fixture معتبر بساز و هر فیلد required رو یکی‌یکی حذف کن → همه باید invalid بشن.
- SemVer gate: `1.2.0/1.2.7` ACCEPT، `1.3.0/1.1.9/0.9.0` REJECT، `2.0.0/10.0.0` PURGE_AND_REANALYZE؛ ورودی‌های `'abc','','1.2','v1.2.0',null` نباید ACCEPT بشن.

### T04 — Proto & Status
- `buf lint` و `buf breaking --against <baseline>` (baseline واقعاً وجود داره؟ یا breaking در عمل بی‌اثره؟). فیلد `AnalyzeAudioRequest.idempotency_key=6`، `DspParameterUpdate.sequence=6`. diff نام/شماره فیلدها با Spec §9.2؛ شماره استفاده‌مجدد نشده. stubها با `pnpm -F proto gen` **دوباره تولید** بشن و `git diff` خالی بمونه (stale نباشن).
- `mapStatus`: ۹ کد پلن **+ `ALREADY_EXISTS → 409`** (Review Checkpoint پلن). گزارش فقط «9 codes» گفته → احتمالاً جا افتاده. کد ناشناخته باید fail-closed باشه (۴xx/۵xx، نه ۲xx، بدون throw).

### T05 — Persistence (با DB واقعی)
Testcontainers یا docker: یک PG تمیز بالا بیار و دستی:
```
pnpm -F db migrate           # up
psql -c "\d+ features"       # CHECKها = Spec §9.5 (bpm 60..200، camelot، tenant)
psql -c "\d+ admin_audit"    # PARTITION BY RANGE (ماهانه)
pnpm -F db migrate:down ; pnpm -F db migrate    # برگشت‌پذیری + اجرای دوباره
psql -c "SELECT rolname,rolbypassrls,rolsuper FROM pg_roles WHERE rolname=<app_role>"   # false,false
psql -c "SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname IN ('features','users','tier_grants','admin_audit','outbox')"  # همه t,t
psql -c "SELECT tablename,policyname,cmd,qual,with_check FROM pg_policies"
psql -c "SELECT tablename,tableowner FROM pg_tables WHERE schemaname='public'"   # owner != app role
```
- با نقش اپ: tenant `otomix`/`otodj`/unset → شمارش 1/1/0. **تست نشت**: INSERT با `tenant_id` متفاوت از `app.tenant_id` باید با WITH CHECK رد بشه. روی **partitionهای** `admin_audit` هم RLS اعمال می‌شه؟ (یکی از رایج‌ترین حفره‌ها.)
- `withTenant`: `set_config('app.tenant_id',$1,true)` پارامتری. یک tenantId مخرب (`x'; DROP TABLE users;--`) بده → نباید اجرا بشه. بعد از commit/rollback روی **همون connection** مقدار خالیه. تو pool: دو درخواست هم‌زمان با tenantهای متفاوت نشت نکنن.
- Review پلن: **«repository layer در gateway باید withTenant رو الزامی کنه»** — repository layer اصلاً وجود داره؟ `grep` برای هر `.query(` که از `withTenant` عبور نکنه. (`@otomix/gateway` حتی dependency روی `@otomix/db` نداره — مشکوک.)

### T06 — Idempotency & Dedup
- validate: GET/HEAD معاف؛ POST/PUT/PATCH/DELETE بدون هدر → 400؛ UUIDv1 → 400؛ v4 → pass؛ حروف بزرگ، UUID با فضای خالی، `nil UUID` رو هم امتحان کن.
- store با Redis واقعی (نه mock): handler یک‌بار اجرا؛ replay = پاسخ اول؛ بدنه متفاوت → ABORTED/409؛ `TTL otomix:idem:<key>` = 86400±5؛ prefix درسته؛ **درخواست‌های هم‌زمان (race)** با یک کلید → handler دقیقاً یک‌بار؛ crash وسط پردازش (in-progress marker) چه می‌شه؟ marker TTL داره یا کلید برای همیشه قفل می‌مونه؟
- receiver-dedup: امضا **قبل از** نوشتن dedup (ترتیب کد)؛ مقایسه‌ی HMAC با `timingSafeEqual`؛ امضای خراب → هیچ رکورد dedup ننویسه؛ sequence 5 قبل از 4؛ TTL ≥ 24h؛ replay بعد از expiry.

### T07 — Resilience
- retry: ۴ تلاش کل (۱+۳)؛ تاخیرها `0 ≤ d_n ≤ min(5000, 200·2^n)`؛ RNG **تزریقی**؛ غیر-idempotent (و پیش‌فرض بدون گزینه) فقط ۱ تلاش؛ خطای آخر برگردونده می‌شه؛ مقادیر از constants.
- DegradedModeController: ورود با POOL_EXHAUSTED/WORKER_FAILED، خروج فقط با RECOVERED؛ **گیج `core.degraded_mode.active` واقعاً صادر می‌شه** (1→0)؛ هیچ مسیری برای خروج بدون RECOVERED (`grep` روی هر مقداردهی به false).

### T08 — Telemetry
- logger: ۱۰ فیلد الزامی (`ts, level, service, tenant_id, trace_id, span_id, event, outcome, country, duration_ms`). **گزارش می‌گه `country` اختیاریه؛ پلن اون رو در لیست فیلدهای الزامی آورده** — با Spec §8.4 تطبیق بده و نتیجه رو گزارش کن. fixture بساز، خروجی رو `grep` کن: IP خام، ایمیل، lat/long = 0 hit؛ IPv6؛ فیلد تودرتو؛ IP داخل پیام آزاد (message string).
- traceparent: فرمت `00-<32hex>-<16hex>-<2hex>`؛ trace_id ثابت، span_id جدید، parent=span قبلی؛ ورودی نامعتبر (version `ff`، همه‌صفر، حروف بزرگ) رد بشه؛ envelope فیلد string `traceparent` داره نه global.

## 4. فاز C — معیارهای خروج فاز و تست‌های جامع پلن

1. Exit criteria پلن P01 رو یکی‌یکی چک کن (build/test سبز، proto و schema فریز و lint-clean، migrations forward/back، RLS، primitives منتشرشده).
2. **P01-IT** (`pnpm vitest run --project p01-integration`): وجود داره؟ سناریوی شکست: BPM نامعتبر → INVALID_ARGUMENT/HTTP 400 **و** replay با fingerprint متفاوت → ABORTED/HTTP 409؛ `0 skipped`.
3. **تست‌های cross-phase**: `X-P01-P05` (`packages/contracts/test/x-p01-p05.spec.ts`) و `X-P01-P06` (`x-p01-p06.spec.ts`) وجود دارن؟ (`X-P01-P02` به `tOfI` از P02 نیاز داره؛ فقط وضعیتش رو گزارش کن.) گزارش هیچ‌کدوم رو ذکر نکرده.
4. **Dependency hygiene**: هر import در src باید در `dependencies` همون پکیج باشه (pnpm strict). نمونه‌ی مشکوک: gateway و db از `@otomix/core` ثابت‌ها رو می‌گیرن ولی در package.json تعریف نشده؛ `pg` در db هم dependencies هم devDependencies هست. `publishConfig.access: public` روی پکیج‌های داخلی بدون `private:true` ریسک انتشار تصادفیه (فقط گزارش بده).
5. Secrets/Supply chain: `pnpm audit --prod`, `git grep -nE "(password|secret|api[_-]?key|token)\s*[:=]\s*['\"]"`.

## 5. فاز D — اجرای تست جامع Claude

فایل `tools/test/p01-phase.spec.ts` رو در مسیر دقیق بذار (دست نزن به assertionها).

1. بلاک `ADAPTERS` (logger + traceparent) رو با بدنه‌ی واقعی API پر کن؛ **هر تغییر رو در گزارش بنویس**.
2. اجرا: `pnpm vitest run tools/test/p01-phase.spec.ts --reporter=verbose`
3. برای **هر تست قرمز** دقیقاً مشخص کن: (الف) باگ واقعی کد، (ب) اختلاف API-shape با فرض تست (فقط adapter/نام‌ها)، (ج) ابهام پلن. **هرگز** تست رو شل نکن تا سبز بشه.
4. چون `workspace.spec.ts` با `stripBom` BOM رو نادیده می‌گیره، تست `A1` و `J3` من خط دفاع واقعی‌اند.

## 6. نکات مشکوک از پیش‌شناسایی‌شده (حتماً جداگانه تأیید/رد کن)

1. `ALREADY_EXISTS→409` در `mapStatus` (پلن Review Checkpoint).
2. گیج `core.degraded_mode.active` (پلن Expected) در گزارش نیست.
3. `country` در logger: الزامی (پلن) یا اختیاری (گزارش)؟
4. نبود P01-IT و X-P01-P05/P06 در گزارش.
5. workflow CI و ارتباط `needs:` گیت CVSS در گزارش نیست.
6. repository layer + `withTenant` در gateway (Review Checkpoint T05-M03).
7. dependencyهای جاافتاده (`@otomix/core` در gateway/db) و `pg` تکراری.
8. `stripBom` که BOM آینده رو پنهان می‌کنه؛ نبود `.editorconfig`/`.gitattributes` ضد-BOM.
9. گزارش «142/142» و «23/23» رو خودت بازتولید کن؛ P01-FINAL (build+madge+plan audit) هنوز اجرا نشده.
10. تعداد ثابت‌های scoring (16 نه 15).

## 7. خروجی نهایی (`docs/audits/P01_AUDIT_REPORT.md`)

```
# P01 Audit Report — <date> — HEAD <sha>
## Verdict: SEAL / DO NOT SEAL   (SEAL فقط اگر هیچ FAIL با شدت High/Critical نباشه)
## 1. Baseline (دستورها + خروجی خلاصه + عدد واقعی تست‌ها در برابر گزارش)
## 2. جدول 23 micro-task:  ID | وضعیت | شواهد (دستور/فایل:خط) | mutation probe نتیجه
## 3. یافته‌ها: شناسه | شدت (Critical/High/Medium/Low) | micro-task | شرح | شواهد | اصلاح پیشنهادی
## 4. نتیجه p01-phase.spec.ts (pass/fail هر تست + دسته‌بندی الف/ب/ج)
## 5. Ambiguities پلن
## 6. UNVERIFIED ها و دلیل
## 7. کارهای لازم قبل از P02 (به ترتیب اولویت)
```

بعد از ساخت گزارش **متوقف شو و منتظر تأیید من بمون**؛ هیچ اصلاحی بدون تأیید انجام نده.
