# فاز 1 - پایه و اساس

## چرا P01 وجود دارد

قبل از اینکه OTOMIX بتواند یک ضرب را تجزیه و تحلیل کند، به یک **بنیاد قابل اعتماد** نیاز دارد: یک مونورپو با گیت های با کیفیت سخت، انواعی که حالت های نامعتبر را غیرقابل نمایش می کند، آن نسخه را منقبض می کند و هر ساختار داده را تایید می کند، الگوهای انعطاف پذیری که خرابی های گذرا از دائمی را تشخیص می دهد، تله متری که هر خط گزارشی را در سراسر مرزهای سرویس primiliscript به هم مرتبط می کند، و زمان بندی آن.

P01 همه اینها را در **23 ریز وظیفه** ارائه می دهد که هر یک کامل است.

## سه نوع مارک دار: محافظ های زمان کامپایل، هزینه زمان اجرا صفر

OTOMIX از **نوع های مارک دار تایپ اسکریپت ** (تایپ اسمی از طریق "نماد منحصر به فرد") برای سه دامنه اولیه استفاده می کند. آنها در زمان اجرا "تعداد" یا "رشته" معمولی هستند اما در زمان کامپایل انواع متمایز هستند. مقادیر نامعتبر را نمی توان بدون عبور از اعتبارسنجی «parse()» ساخت.

| تایپ کنید | File | Validator | Constraint |
|------|------|-----------|------------|
| "BPM". | `packages/core/src/types/bpm.ts:10` | `BPM.parse(n)` | Finite, 60.0–200.0 |
| "CamelotKey". | `packages/core/src/types/camelot.ts:12` | `CamelotKey.parse(s)` | Regex `^(1[0-2]\|[1-9])[AB]$` (1A–12B) |
| «بیت ایندکس». | `packages/core/src/types/beat-index.ts:10` | `BeatIndex.parse(i)` | Safe integer, ≠ 0 (beat 0 is not assigned per §3.10) |

هر کدام یک اتحادیه تفکیک شده «{ ok: true; مقدار: T } | { ok: false; خطا: 'INVALID_ARGUMENT'؛ پیام: رشته }`. تماس گیرندگان **باید** شاخه "ok: false" را مدیریت کنند - سیستم نوع آن را اجرا می کند. سربار زمان اجرا صفر؛ نام تجاری به "تعداد"/"رشته" در JS منتشر شده پاک می شود.

## قراردادها: Semver Gate + Feature Registry Validation

**Semver Gate** (`packages/contracts/src/semver-gate.ts:10`): هر رجیستری ویژگی دارای یک نسخه طرحواره (`major.minor.patch`) است. `validateSchemaVersion()` اعمال می کند:
- قالب: دقیقاً سه جزء عددی، بدون صفرهای ابتدایی.
- عمده > 1 ← «PURGE_AND_REANALYZE» (تغییر قطعی، تجزیه و تحلیل مجدد کامل لازم است).
- عمده < 1 → «رد کردن».
- Major = 1، Minor = 2 → "ACCEPT" (فقط 1.2.x پشتیبانی می شود).
- عمده = 1، جزئی ≠ 2 → «رد کردن».

این گیت **قبل از** هر فاز دیگری که رجیستری را لمس کند اجرا می شود. این اولین خط دفاعی در برابر رانش طرحواره است.

**تأیید رجیستری ویژگی** (`packages/contracts/src/validate.ts:21`): از AJV با طرحواره JSON کامپایل شده (`packages/contracts/schemas/feature-registry-1.2.json`) استفاده می کند. فرمت «uid» سفارشی (RFC 4122) را ثبت می کند. همان شکل اتحادیه تبعیض‌آمیز انواع مارک‌دار را برمی‌گرداند.

## انعطاف پذیری: دو لایه، دو نگرانی

| لایه | File | Purpose |
|-------|------|---------|
| **تلاش مجدد** | `packages/core/src/resilience/retry.ts:31` | Bounded exponential backoff for **transient** failures (network blips, temporary lock contention). Configurable max attempts, base delay, jitter. |
| **حالت تخریب شده** | `packages/core/src/resilience/degraded.ts:55` | **Permanent** degradation controller. When a subsystem (e.g., feature extraction) exceeds its error budget, the controller flips a global `degraded` flag. Consumers read the flag and switch to fallback behavior (e.g., skip MAEST embeddings, use cached features only). One-way: no auto-recovery; requires operator intervention. |

دوباره امتحان کنید دسته‌های "تعداد دوباره" دستگیره های تخریب شده "دست از تلاش بردارید، کار را کاهش دهید."

## تله متری: ساختار یافته + زمینه ردیابی

** ثبت‌کننده ساختاریافته** (`packages/core/src/telemetry/logger.ts:105`): خطوط JSON با سطح، مهر زمان، پیام، و یک شیء` زمینه. **تغییر خودکار** کلیدهای حساس («token»، «رمز عبور»، «مخفی»، «مجوز مجوز»، «cookie»، «set-cookie») — مقادیر جایگزین شده با «[REDACTED]»» قبل از سریال‌سازی. هر خط گزارش شامل «trace_id» و «span_id» در صورت وجود هدر «traceparent» W3C است.

** Trace Propagation** (`packages/core/src/telemetry/propagation.ts:97`): سرصفحه های "traceparent" و "tracestate" را بر اساس مشخصات W3C Trace Context استخراج/تزریق می کند. «exttractTraceContext(headers)» → «{ traceId، parentId، traceFlags، traceState }». "injectTraceContext(ctx، هدرها)" سرصفحه ها را تغییر می دهد. این امکان ردیابی توزیع شده سرتاسر از مصرف (P07) از طریق استخراج (P05) تا مخلوط کردن (P04) تا صادرات (P09) را فراهم می‌کند.

## زمان بندی اولیه: بنیاد زیر میلی ثانیه

**ساعت با وضوح بالا** (`packages/core/src/timing/clock.ts:8`): «performance.now()» را با محافظ یکنواخت می‌پیچد. میلی ثانیه را به عنوان «عدد» برمی گرداند. توسط هر مؤلفه ای که به "اکنون" نیاز دارد استفاده می شود.

**Lookahead Scheduler** (`packages/core/src/timing/scheduler.ts:19`): **تنها** راه برای رسیدن به اهداف فرعی در جاوا اسکریپت. به‌جای زمان‌بندی کار *در* ضرب‌الاجل‌اش، صف‌های زمان‌بندی **50 میلی‌ثانیه زودتر کار می‌کنند** («LOOKAHEAD_MS = 50» از «constants/timing.ts:2») و آن را با دقت **2 میلی‌ثانیه** اجرا می‌کند («SCHED_ACCURACY_MS = 2` از «constants.ts: 3»). پنجره 50 میلی‌ثانیه مکث‌های GC، اختلاف موضوع اصلی و شلی تایمر را جذب می‌کند. دقت 2 میلی‌ثانیه قرارداد است: اگر زمان‌بند با تاخیر بیش از 2 میلی‌ثانیه شلیک کند، یک رویداد تله‌متری «scheduler.late» منتشر می‌کند.

## نتیجه آزمون

| مجموعه تست | Count | Scope |
|------------|-------|-------|
| P01-IT | 2 | Cross-phase integration: monorepo workspace resolution, coverage thresholds, CVSS gate. |
| X-P01-P02 | 3 | Branded types flow into GridModel construction. |
| X-P01-P05 | 2 | Semver gate blocks incompatible registry before extraction. |
| X-P01-P06 | 1 | Trace context propagates through retry/degraded boundaries. |

**مجموع وظایف P01: 23/23 کامل شد.** هر ثابت ثابت است ('Object.freeze'). هر اعتبارسنجی یک اتحادیه تبعیض آمیز را برمی گرداند. هر سیاست تاب آوری آزمایش می شود. هر زمینه تله متری مستند شده است.