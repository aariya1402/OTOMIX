# OTOMIX — گزارش ممیزی جامع (فاز ۱ تا ۷ → ورود به فاز ۸)

**زمان آماده‌سازی:** 2026-11-19 05:19 UTC
**تهیه‌کننده:** Claude · **روش:** ممیزی مستندمحور (Plan-mode) با رویکرد verify-before-asserting
**ورودی‌ها:** Master Dump, MicroTask_Plan, Architecture_Spec, Plan_Addendum, Plan_Supplement
**چکپوینت‌ها:** `OTOMIX_Checkpoint_01_*.md`, `OTOMIX_Checkpoint_02_*.md`

---

## ۰. محدودیت‌های شواهد (حتماً بخوانید)

| مورد | وضعیت |
|---|---|
| دسترسی به ریپوی GitHub | ❌ ندارم (ROBOTS_DISALLOWED) |
| کد منبع، خروجی تست، `tasks.json`، `OTOMIX_Audit_Report.md` | ❌ آپلود نشده‌اند |
| تحلیل انجام‌شده | ✅ تطبیق ۵ سند با هم + پارس برنامه‌نویسی‌شدهٔ ۲۵۶ تسک پلن (وضعیت، پیش‌نیاز، فایل خروجی، نوع تست) |
| اجرای کد/تست | ❌ هیچ چیزی اجرا نشد |

**قاعدهٔ برچسب‌گذاری یافته‌ها:** `[مستند]` = از ≥۲ سند هم‌نظر · `[تک‌منبع]` = فقط یک سند · `[تناقض]` = اسناد با هم نمی‌خوانند · `[نیازمند تأیید]` = فقط با اجرای دستور محلی قابل اثبات است (بخش ۱۲).

**هشدار دربارهٔ Master Dump:** Dump در چند مورد با Plan/Supplement نمی‌خواند (جدول ۹.۳). آن را «منبع حقیقت» ندانید.

---

## ۱. خلاصهٔ اجرایی

| پرسش | پاسخ |
|---|---|
| آیا «تا فاز ۷ انجام شده» درست است؟ | **جزئاً.** P01–P04 ≈ کامل. P05 ≈ ۶۴–۸۰٪. P06 فقط شاخهٔ RBAC/JWT کامل است. P07 کد دارد ولی در Plan هنوز ۵٪ و تأییدنشده است. |
| آمادگی ورود به P08 | **۴۶٪ (شرطی).** طبق Entry Criteria خود Plan: ❌ برآورده نشده. |
| مانع اصلی | داده‌ی واقعی تحلیل وارد سیستم نمی‌شود؛ تراک‌ها با مقادیر جایگزین (placeholder) ثبت می‌شوند. |
| تصمیم‌های مالک معلق | ۵ مورد (بخش ۸) |
| انطباق معماری | **۵۲٪** (۴۶ چک مستند؛ بخش ۶) |
| پیشرفت کل پروژه | ≈ **۴۸–۵۵٪ بر اساس تعداد تسک** · ≈ **۴۰–۴۵٪ با وزن زحمت** (برآورد قضاوتی، چون P08–P11 سنگین‌ترند) |

**حکم:** 🟡 **GO مشروط.** ورود به P08 فقط پس از «Gate-0» (۱۶ میکروتسک بحرانی از ۲۱ تسک Gate-0 در فایل متمم) توصیه می‌شود. تا آن زمان، فقط دو تسک P08 بدون وابستگی‌اند (`P08-T04-S02-M01`, `P08-T04-S02-M02`).

---

## ۲. وضعیت فازها

شمارش از ۲۵۶ شناسهٔ یکتا (۲۳۸ اعلام‌شده + ۱۲ RBAC + ۶ REG). تسک‌های CANCELLED/SUPERSEDED از مخرج حذف شده‌اند.

| فاز | Plan-MD (خام) | بازمبنا‌شده* | کد در Dump** | توضیح |
|---|---|---|---|---|
| P01 | ۲۳/۲۳ = ۱۰۰٪ | ۱۰۰٪ | ۴/۱۳ یافت‌شده | Dump فهرست کامل ندارد؛ «یافت‌نشد» ≠ «نیست» |
| P02 | ۱۸/۱۸ = ۱۰۰٪ | ۱۰۰٪ | ۱۰/۱۳ | |
| P03 | ۲۳/۲۳ = ۱۰۰٪ | ۱۰۰٪ | ۱۲/۱۴ | ۱ لغو، ۲ حل‌شده |
| P04 | ۲۲/۲۳ = ۹۶٪ | ۱۰۰٪ | ۱۳/۱۸ | `P04-T01-S02-M01` تأییدشده ولی TODO مانده (CONFLICT-008) |
| P05 | ۱۴/۲۲ = ۶۴٪ | ۸۰٪ | ۸/۱۳ + ۳ فایلِ «TODO» موجود | بخش ۳.۱ |
| P06 | ۱۸/۳۸ = ۴۷٪ | ۵۹٪ | ۴/۶ + ۵ فایلِ «TODO» موجود | RBAC کامل؛ سخت‌سازی نه |
| P07 | ۱/۲۲ = ۵٪ | ۵٪ | **۱۰/۱۲ فایل موجود** | Plan کهنه؛ `tasks.json` را ندیدم |
| P08 | ۰/۱۸ | ۰٪ | ۱/۱۶ | `catalog-features.ts` پیش از موعد وجود دارد |
| P09–P11 | ۰٪ | ۰٪ | ≈۰ | |

\* بازمبنا = اعمال تصمیم‌های ثبت‌شده در Supplement (فهرست در بخش ۸.۲).
\*\* تطبیق نام فایل خروجی هر تسک با نام‌های ذکرشده در Dump (فقط وجود فایل، نه درستی آن).

**یافتهٔ ساختاری:** سرصفحهٔ Plan می‌گوید «هیچ تسکی DONE نیست»، ولی بدنه صدها `[x]` دارد (CONFLICT-003، هنوز open). `[تناقض]`

---

## ۳. صحت و سلامت کد نسبت به فازها

### ۳.۱ P01–P04 (بنیان، گرید، DSP) — سلامت بالا
- `tOfI` فرمول خالص، clamp روی `deltaQuanta`، قاعدهٔ اندیس منفی (§3.10). `[مستند]`
- `GridModel` تغییرناپذیر + جست‌وجوی دودویی؛ DualGrid با bodyGrid موازی. `[مستند]`
- DSP: SPSC، smoother، denormal، بدون allocation. `[تک‌منبع: Dump]`
- ⚠️ `tOfI` «خالص» توصیف شده ولی شمارندهٔ `deltaClampedCount` را تغییر می‌دهد. برای اثبات determinism در P11 باید ثابت شود که روی خروجی اثر ندارد. `[نیازمند تأیید]`
- ⚠️ `dsp/encoder.ts` (WAV/MP3 آفلاین) کنار کدهای real-time در یک پوشه است. `[تک‌منبع]`
- ⚠️ ادغام Realign با Observer تست یکپارچه ندارد (اعتراف خود Dump).

### ۳.۲ P05 (استخراج ویژگی و امتیازدهی) — هستهٔ مشکل
| مورد | وضعیت | شواهد |
|---|---|---|
| `AnalysisConfig` (D9) | ✅ | Addendum T01-S01 |
| Mixability = Preference (D3) | ✅ در کد | `mixability.ts` |
| Camelot تنها Hard Gate | ✅ | `camelot-gate.ts` |
| Energy | 🟡 **اسکلت** | Addendum: «Skeleton-first»؛ `P05-T02-S02-M01` هنوز TODO |
| `extract()` | 🟡 فایل هست، تسک TODO | `pipeline/extract.ts` |
| صف Enrichment + پاسخ فوری | ❌ TODO | Supplement `P05-ADD-T06-S03-M01` (Addendum همین را `[x]` زده → `[تناقض]`) |
| نگاشت ۳۱ ویژگی Essentia | 🟡 | Addendum `[x]` ولی Dump «PENDING» می‌گوید `[تناقض]` |
| V_map fallback (TensorFlow) | ❌ DEFERRED | `P05-T03-S01-M03` |
| Benchmark مرجع | ❌ DEFERRED | GAP-029 (باید پیش از P11 حل شود) |

### ۳.۳ P06 (امنیت) — دو نیمه
- ✅ RBAC پویا: `RBAC-M01..M12` همه DONE (Supplement، ۲۰۲۶-۱۱-۱۳)؛ JWT با rotation و denylist. Dump برعکس می‌گوید «شروع نشده» → Dump **کهنه/غلط** است. `[تناقض]`
- ❌ هنوز TODO در Plan: CSP، سقف ۵۱۲MB WASM، ایزولاسیون worker، Vault واقعی (CONFLICT-005: فقط stub)، Snyk، سخت‌سازی pod، 404 برای مسیرهای حقوقی.
- ⚠️ فایل‌های `dek.ts`, `rotate.ts`, `namespaced-clients.ts`, `audit.ts`, `dsp-parameters.ts` در Dump هستند ولی تسکشان TODO است (کد جلوتر از Plan).
- ⚠️ `workers/src/pool.ts` (bulkhead امنیتیِ per-tenant) با `// @ts-nocheck` رد شده (GAP-018).
- ⚠️ OQ-10/OQ-14 با GAP-015 منسوخ شده‌اند، ولی `P09-T03-S01-M01` هنوز «BLOCKED OQ-10» است. `[تناقض]`

### ۳.۴ P07 (ورود فایل) — کد هست، اثبات نیست
- ✅ فایل‌ها: `sniff, limits, confine, reject, tags, dedup, commit, ratelimit, ingest-local, dlq/park, dlq/replay`.
- ❌ Plan: ۱۵ تسک TODO. Dump می‌گوید در JSON همه DONE‌اند ← `tasks.json` را باید دید.
- ⚠️ **پیش‌نیاز نقض‌شده:** Decode (`P07-T01-S03-M01`) به `P06-T05-S01-M02` (سقف حافظهٔ WASM) وابسته است که TODO است. دفاع در برابر فایل خصمانه بدون سقف حافظه ناقص است.
- ⚠️ Fuzz harness داخل vitest اجرا می‌شود، نه در sandbox واقعی `worker_threads` (GAP-021). یعنی ایزولاسیون واقعی آزموده نشده.
- ⚠️ **ترتیب پایپ‌لاین** در Dump سه‌گونه آمده (§3.6، §6.2، §8) و در یکی `decode` قبل از `sniff` است. اگر در کد هم چنین باشد، دیکودر بایت‌های اعتبارسنجی‌نشده را می‌خواند. Rate-limit هم باید پیش از خواندن بدنه باشد. `[نیازمند تأیید — اولویت ۱]`
- ⚠️ ثبت‌نام: مسیرهای Dump (`/auth/google`, `/auth/otp/request`, `/auth/telegram/request`, `/auth/email-otp/request`) با GAP-027 (`/auth/google/start`, `/auth/otp/send`, `/auth/telegram/verify`) و پیشوند `/api/v1` نمی‌خوانند؛ Email OTP اصلاً در محدودهٔ GAP-027 نیست. `P07-REG-M01..M06` در Plan هنوز TODO‌اند.

---

## ۴. صحت تست‌ها

**نکته:** هیچ تستی اجرا نشد؛ این بخش کیفیتِ طراحی تست و ریسک‌های شناخته‌شده را می‌سنجد.

| نوع (طبق Plan) | تعداد |
|---|---|
| unit | ۱۴۹ |
| integration (Testcontainers/supertest) | ۵۷ |
| contract / benchmark / component / e2e / load / property | ۳ / ۴ / ۳ / ۲ / ۱ / ۱ |
| بدون تعریف تست (خرد RBAC/REG) | ۱۸ |
| `[blocked]` | ۱۸ |

**یافته‌ها**
1. **P08 (مأموریت اصلی) تقریباً بدون تست UI**: فقط ۱ e2e و ۳ component.
2. **property-based**: فقط ۱ مورد، در حالی که `tOfI`/`GridModel`/حدود Mixability نمونهٔ کلاسیک آن‌اند (خود Dump هم می‌گوید).
3. **Mock پنهان‌کنندهٔ باگ:** GAP-017 — `logger.warn` در mock وجود داشت ولی در production نه → `TypeError`. الگو در هر Mock تکرارپذیر است ← **Contract test برای هر Mock**.
4. **تست‌های flaky ثبت‌شده:** `heap-proof.spec.ts` (GOTCHA-002)، Pact «bad port» (GOTCHA-004)، موازی‌سازی Testcontainers (GAP-022، حل‌شده).
5. **تست یکپارچهٔ کامل پایپ‌لاین** (upload→decode→extract→commit→enrich) وجود ندارد (اعتراف Dump) و در حالت فعلی چون enrichment وصل نیست، نمی‌تواند هم ساخته شود.
6. **Audit خودکار:** ۲۸۷/۳۰۲ pass (۹۵٪)؛ ۱۵ شکست همگی ساختاری‌اند (عدم‌تطابق پیش‌نیاز، MD↔JSON، شناسهٔ تکراری، باگ `forceMono`) — نه شکست رفتاری.
7. **تست وزن‌ها:** تستی که `Σ weights = 1` را بسنجد گزارش نشده (بخش ۹، B-01).
8. تست‌های Addendum برای UI (`mixplan.score.spec.ts`, `reorder.score.spec.ts`) — با توجه به «UI حداقلی» در Dump، وجود واقعی آن‌ها مشکوک است.

---

## ۵. معماری، اتصال‌ها، پیش‌نیازها و وابستگی‌ها

### ۵.۱ گراف پیش‌نیاز (برنامه‌ریزی‌شده)
- شناسهٔ معلق (dangling): ۰ ✅ · چرخه: ۰ ✅ · نقض گراف فاز: ۰ ✅
- **۶ تسک DONE با پیش‌نیاز ناتمام:**

| تسک DONE | پیش‌نیاز | وضعیت پیش‌نیاز |
|---|---|---|
| `P04-T03-S01-M05` | `P04-T03-S01-M04` | CANCELLED |
| `P04-T04-S01-M01` | `P04-T01-S02-M01` | TODO (کهنه؛ تأییدشده) |
| `P05-T02-S02-M02` | `P05-T02-S02-M01` | TODO |
| `P05-T02-S02-M04` | `P05-T02-S02-M03` | BLOCKED (تصمیم ثبت شده) |
| `P05-T04-S01-M02` | `P05-T04-S01-M01` | TODO |
| `P06-T02-S02-M01` | `P06-T02-S01-M03` | TODO (SUPERSEDED عملاً) |

به‌علاوه Addendum: `ADD-T03-S01-M01` و `ADD-T06-S03-M01` (هر دو `[x]`) به `P05-T04-S01-M01` (TODO) وابسته‌اند.

### ۵.۲ اتصال‌های بین‌بسته‌ای (از جدول Dump)
| مشکل | شدت |
|---|---|
| `contracts` به `gateway`, `core`, `db`, `access` وابسته است (باید برگ باشد؛ احتمال چرخه با gateway) | 🔴 |
| `core` به `db` وابسته و `core/repository/global-features.ts` مستقیماً `pg` را import می‌کند (GAP-016) | 🔴 |
| `confine` در ۳ بسته، `decode-worker` در ۲ بسته (Plan: `workers/src/decode.ts`)، `normalize` در ۲ بسته (`core/audio` و `adapter`) | 🔴 |
| Admin endpoint ثبت/حذف Worker (Addendum T06-S01-M01) در فهرست مسیرهای gateway دیده نمی‌شود | 🟠 |
| پیش‌نیاز اعلام‌نشدهٔ P08: `P07-REG-M06` (UI احراز هویت) | 🟠 |
| Gate-ی که در Plan مسدودکنندهٔ P08 است ولی در گراف نیست: GAP-020 (`OTOMIX_UI_Bindings.md`) | 🟠 |

### ۵.۳ پیش‌نیازهای معلقِ P08 (بازمبنا‌شده)
فقط ۳ تسک بالادستی باقی می‌ماند و ۱۶ از ۱۸ تسک P08 به هر سه وابسته‌اند:

| تسک | وضعیت | چرا حیاتی است |
|---|---|---|
| `P05-T02-S02-M01` | TODO (اسکلت) | Energy واقعی برای ستارهٔ انرژی و Energy Progression |
| `P05-T03-S01-M03` | DEFERRED | `V_map` پیش‌فرض ۰ + پرچم `vocal_map_assumed_zero` برای Vocal Gate و overlay |
| `P05-T04-S01-M01` | TODO (فایل موجود) | `extract()` معتبر و متصل به ingest |

---

## ۶. درصد انطباق با مسیر معماری

**روش:** ۴۶ چک مستند در ۵ دسته؛ امتیاز: ✅ کامل = ۱، 🟡 جزئی = ۰٫۵، ❌ ناقض = ۰. شفاف و قابل بازتولید است، ولی **برآوردی مبتنی بر سند** است (±۱۰٪).

| دسته | ✅ | 🟡 | ❌ | انطباق |
|---|---|---|---|---|
| A. هستهٔ موتور (Grid/Observer/DSP) | ۵ | ۳ | ۰ | **۸۱٪** |
| B. امتیازدهی و ویژگی‌ها | ۲ | ۵ | ۵ | **۳۸٪** |
| C. امنیت | ۳ | ۴ | ۲ | **۵۶٪** |
| D. ورود فایل | ۴ | ۴ | ۱ | **۶۷٪** |
| E. ساختار/فرایند | ۰ | ۴ | ۴ | **۲۵٪** |
| **جمع** | **۱۴** | **۲۰** | **۱۲** | **۵۲٪** |

**چک‌های ❌ (۱۲ مورد):** B3 (معنای Mixability در اسناد)، B4 (جمع وزن‌ها ۱٫۲)، B6 (فرمول توصیه‌گر)، B8 (داده‌ی جایگزین)، B12 (mono/stereo)، C3 (Vault واقعی)، C6 (sandbox WASM)، D9 (ماژول تکراری)، E1 (لایه‌بندی)، E4 (منبع حقیقتِ وضعیت)، E5 (استقرار دوگانه)، E8 (زیرساخت UI).

**معنا:** موتور (قلب محاسباتی) سالم است؛ مشکل در «چسب» بین اجزا، سازگاری اسناد و داده‌ی واقعی است.

---

## ۷. ریسک‌ها و گلوگاه‌ها

| # | ریسک | احتمال | اثر | کاهش |
|---|---|---|---|---|
| R-01 | P08 روی داده‌ی جعلی ساخته شود (bpm=۱۲۰، کلید 1A، M=۰٫۵ برای همه‌ی تراک‌ها) | بالا | بحرانی | Gate-0: وصل کردن `runEnrichment()`، ستون وضعیت تحلیل |
| R-02 | سه فرمول توصیه‌گر → بازنویسی P08 | بالا | بحرانی | تصمیم مالک + یک ثابت واحد |
| R-03 | آسیب‌پذیری فایل خصمانه (بدون سقف ۵۱۲MB، ترتیب نامطمئن، fuzz بیرون sandbox) | متوسط | بالا | P06-T05 پیش از ادعای P07 |
| R-04 | کار دوباره به‌خاطر ماژول‌های تکراری و لایه‌بندی | بالا | بالا | تصمیم «محل واحد» و حذف کپی‌ها |
| R-05 | استقرار دوگانه (GAP-014) حجم P05/P07/P10/P11 را تقریباً دو برابر می‌کند | بالا | بالا | تسک خواهر برای هر تسک؛ برنامه‌ریزی صریح |
| R-06 | Vault و K8s فقط stub/TODO → بلاک P10 و ورود به تولید | متوسط | بالا | تصمیم زودهنگام زیرساخت |
| R-07 | تأخیر تصمیم‌های مالک (OQ-09, OQ-24, OQ-12, OQ-13, ...) | بالا | بالا | «بستهٔ تصمیم» یک‌جا (بخش ۸) |
| R-08 | commit آلوده در نشست‌های موازی (GOTCHA-HIST-002) | متوسط | متوسط | `git diff --cached --name-only` اجباری، branch جدا به ازای هر ایجنت |
| R-09 | شکنندگی ابزار ویندوز/PowerShell (GOTCHA-006/007/008، GAP-019 با `git push origin P04`) | متوسط | متوسط | اصلاح `sync-and-translate.ps1` به `HEAD` |
| R-10 | وابستگی تست به Docker/Testcontainers (flaky) | متوسط | متوسط | Timeout/موازی‌سازی ثبت‌شده؛ CI کش |
| R-11 | Benchmark مرجع AWS M5 (GAP-029) زیرساخت می‌خواهد و مانع P11 است | متوسط | متوسط | زودتر تدارک ببینید |
| R-12 | Rate-limit درون‌حافظه‌ای؛ با چند replica بی‌اثر | متوسط | متوسط | Redis-backed در P10 |
| R-13 | جمع وزن‌های Mixability = ۱٫۲ → اشباع امتیاز | بالا | متوسط | نرمال‌سازی + تست |

**گلوگاه‌های جریان کار:** (۱) تصمیم مالک، (۲) یک مسیر بحرانی باریک P05→P08، (۳) هم‌زمانی چند ایجنت روی یک ریپو، (۴) همگام‌سازی سه منبع وضعیت (MD، JSON، Supplement).

---

## ۸. بلاکرها و تداخل‌ها

### ۸.۱ بلاکرهای واقعی (نیازمند تصمیم مالک)
| ID | موضوع | بلاک می‌کند |
|---|---|---|
| OQ-09 | فرمول Camelot proximity / tempo-delta / energy-progression | `P08-T04-S01-M01` → کل توصیه‌گر |
| OQ-24 | معنی «strictly limits tempo deltas <1%» (فیلتر، ترتیب یا هر دو) | `P08-T04-S01-M03` |
| D-NEW-1 | Mixability: Gate (Spec) یا Preference (D3)؟ | سند Spec، ثابت‌ها، P08-T01-S01-M02 |
| D-NEW-2 | یک فرمول توصیه‌گر (۰٫۶/۰٫۳/۰٫۱ یا ۰٫۴/۰٫۳/۰٫۲/۰٫۱) | R-02 |
| D-NEW-3 | نرمال‌سازی ورودی: mono یا stereo پیش‌فرض | P05/P07 |
| OQ-12, OQ-13 | Serato و درگاه پرداخت | P09 |

### ۸.۲ بلاکرهای کهنه (باید در Plan بسته شوند)
`OQ-10`, `OQ-14` (منسوخ با GAP-015) · `OQ-11` (حل‌شده ۱۱-۱۴) · `OQ-20` (تصمیم: `bpmDynamicThresholdBpm = 2.0`) · `OQ-21` (تصمیم: `loudness_range < 3.0`) · `CONFLICT-006/003/004` (هنوز `open` با اینکه برنده مشخص است) · `P04-T01-S02-M01`.

### ۸.۳ ماتریس تداخل اسناد
| موضوع | Spec | Plan | Addendum/Supplement | کد (Dump) |
|---|---|---|---|---|
| Mixability | Gate (`M<0.4`) | Gate (P08-T01-S01-M02، P01 `UNMIXABLE_BELOW`) | **Preference** | Preference |
| توصیه‌گر | ۰٫۶/۰٫۳/۰٫۱ | P01: ۰٫۶/۰٫۳/۰٫۱ · P08: ۰٫۴/۰٫۳/۰٫۲/۰٫۱ | Compat با ۷ ورودی | ۰٫۴/۰٫۳/۰٫۲/۰٫۱ |
| فرمول Mixability | ۴ جمله | ۴ جمله | ۶ عامل (SUPERSEDED-006) | ۶ عامل (جمع ۱٫۲) |
| نرمال‌سازی | mono | mono | stereo | `forceMono=true` (باگ) |
| RBAC | scope ثابت | scope ثابت | **پویا (GAP-015)** | پویا + Dump «شروع‌نشده» |
| نام Config | — | — | `AnalysisConfig` vs `AdminTuningConfig` (CONFLICT-002) | — |
| شماره Migration | — | `003_tracks`, `005_store` | `007_tracks_source_declarations` | `003_global_features_jsonb`, `005_admin_audit...` |

**توصیه:** Spec را پس از تصمیم مالک اصلاح کنید؛ در غیر این صورت هر ایجنت جدید «Gate» را دوباره وارد کد می‌کند.

---

## ۹. باگ‌ها و ایرادات پرریسک

### ۹.۱ فهرست (به‌ترتیب اولویت)
| ID | شدت | شرح | شواهد | اقدام |
|---|---|---|---|---|
| B-01 | 🔴 | داده‌ی جایگزین (bpm=۱۲۰، `1A`، E=۰٫۵، M=۰٫۵، stars=۳) از داده‌ی واقعی قابل تشخیص نیست؛ فقط `registry_json='{}'` | GAP-023 | ستون `analysis_status` یا `placeholder=true`؛ کاتالوگ/توصیه‌گر آن‌ها را نبیند |
| B-02 | 🔴 | ترتیب پایپ‌لاین ingest نامطمئن؛ احتمال decode پیش از sniff، rate-limit بعد از کار سنگین | Dump §3.6/§6.2/§8 | بررسی `ingest-local.ts`؛ ترتیب: rate-limit → sniff → limits → confine → decode |
| B-03 | 🔴 | جمع وزن‌های Mixability = ۱٫۲۰؛ امتیاز اشباع می‌شود | Dump §4.6 | نرمال‌سازی یا مستندسازی عمدی + تست `Σ=1` |
| B-04 | 🔴 | `forceMono` پیش‌فرض `true` در `core/audio/normalize.ts` | Audit (Dump §2.5) | بعد از تصمیم D-NEW-3 اصلاح |
| B-05 | 🟠 | `users.role CHECK IN (4 نقش)` و `users.tier IN (1,2)` در `001_core.sql` با RBAC پویا و `tier_N` ناسازگارند؛ ایجاد نقش/tier جدید fail می‌شود | Dump §5.2، GAP-015 | بررسی اینکه 004/008 این CHECKها را حذف کرده‌اند؛ وگرنه migration جدید |
| B-06 | 🟠 | `isBpmDynamic` با `|| 2.0`؛ مقدار ۰ هم به ۲٫۰ تبدیل می‌شود و ثابت از Config نمی‌آید (نقض D9) | Supplement P05-T02-S01-M02 | `??` + انتقال به `analysis-config.json` |
| B-07 | 🟠 | Rate-limit درون‌حافظه‌ای + فقط ingest؛ OTP brute-force/bombing بی‌حفاظ مگر REG-M04 پیاده شده باشد | GAP-024، GAP-027 | Redis-backed؛ ۳ درخواست/۱۰ دقیقه برای OTP |
| B-08 | 🟠 | `@ts-nocheck` روی `workers/src/pool.ts` | GAP-018 | رفع unused و حذف pragma |
| B-09 | 🟠 | اگر Redis یا LISTEN/NOTIFY قطع شود، رفتار cache مجوزها (باید fail-closed باشد، TTL ≈ ۶۰ ثانیه تا اعمال لغو) | GAP-015 | تست خرابی؛ لغو فوری با invalidation |
| B-10 | 🟡 | `energy_stars CHECK 0..5` در DB ولی `computeStars` ۱..۵ | Dump §4.5/§5.2 | همسان‌سازی |
| B-11 | 🟡 | شمارندهٔ تلمتری در تابع «خالص» `tOfI` | Dump §4.1 | جداسازی از مسیر محاسبه |
| B-12 | 🟡 | `core/dist` ESM: رفع شد (GAP-021)؛ ولی fuzz هنوز inline | GAP-021 | بازگرداندن fuzz به worker_threads |
| B-13 | 🟡 | Mermaid نامعتبر در Dump (`tOfI[tOfI(i,...)]` بدون کوتیشن) | Dump §8.2 | اصلاح در مستندات |

### ۹.۲ ایرادات فرایندی
- سرصفحهٔ Plan غلط؛ شناسهٔ تکراری `P05-ADD-T01-S03-M01` در Addendum (دو بار)؛ تسک‌های UI در Addendum `[x]` با «UI حداقلی».
- `P07-REG-M02` عنوان `[x]` ولی `Status: TODO`.
- تسک‌های RBAC/REG فقط خرد هستند و تست مستقل ندارند.

### ۹.۳ خطاهای Dump (برای جلوگیری از انتشار)
| در Dump | واقعیت |
|---|---|
| RBAC-M01..M12 شروع نشده | همه DONE (Supplement) |
| OQ-10 هنوز P06/P09 را بلاک می‌کند | با GAP-015 منسوخ شده |
| `P05-ADD-T04-S01-M01` = extract() | = منطق Redux برای Starter Track |
| `P05-ADD-T03-S01-M01` = bpmSeed | = `lock-rule.ts` |
| `P07-T01-S02-M01` = Confine | = `limits.ts` (Confine = `...-M02`) |
| GAP-022 = Dual-grid intent | = flake شدن Testcontainers |
| «Enrichment ✅» | صف و پاسخ فوری TODO |
| Rule 25 = Mixability gate | برنده: Preference (CONFLICT-006) |

---

## ۱۰. آمادگی برای ورود به P08 و تکمیل پروژه

### ۱۰.۱ شاخص آمادگی P08 (وزن‌ها قضاوتی)
| گیت | وزن | امتیاز | یادداشت |
|---|---|---|---|
| G1 پایه P01–P04 | ۱۰ | ۱۰ | |
| G2 داده‌ی واقعی (extract وصل، بدون placeholder) | ۲۰ | ۵ | فایل هست، اتصال نیست |
| G3 امتیازدهی P05 کامل | ۱۵ | ۷٫۵ | Energy اسکلت، V_map fallback نیست |
| G4 AuthZ برای catalog/mixplan | ۱۰ | ۹ | RBAC کامل؛ تأیید اجرایی لازم |
| G5 ingest تولیدکنندهٔ داده | ۱۰ | ۶ | کد هست؛ تأیید نشده |
| G6 تصمیم‌های مالک | ۱۵ | ۳ | ۵ مورد معلق |
| G7 زیرساخت تست UI (Playwright، RTL، mock DSP) | ۵ | ۲ | `mock-driver.ts` هست |
| G8 یکپارچگی Plan/Docs (+GAP-020) | ۱۰ | ۳ | |
| G9 UI احراز هویت (REG-M06) | ۵ | ۰٫۵ | |
| **جمع** | **۱۰۰** | **۴۶** | پس از Gate-0 ≈ **۸۵** |

### ۱۰.۲ مسیر تا پایان (ترتیب پیشنهادی)
1. **Gate-0 (پیش از P08):** هم‌ترازی اسناد/وضعیت، ۵ تصمیم، وصل کردن extract/enrichment، Energy کامل، V_map fallback، سخت‌سازی P06-T05 برای P07.
2. **P08:** ابتدا `T04-S02-M01/M02` (آزاد) و `GAP-020`، سپس Library/Queue/Timeline، سپس توصیه‌گر، سپس overlay و Preview.
3. **P09:** XML (Rekordbox/Traktor/VirtualDJ؛ Serato منتظر OQ-12) + Set Shop (منتظر OQ-13) + مجوز با RBAC پویا.
4. **P10:** متریک/trace، Vault واقعی، K8s، Redis مشترک برای rate-limit، DR.
5. **P11:** اثبات determinism (۱۰٬۰۰۰ جفت)، heap، benchmark مرجع (GAP-029)، پذیرش.
- **ضرب‌کنندهٔ GAP-014:** هر تسک P05/P07/P10/P11 یک خواهر محلی/ابری می‌خواهد.
- برآورد زمان‌بندی تقویمی نمی‌دهم، چون دادهٔ سرعت واقعی تیم (تاریخ commitها/`tasks.json`) در دست نیست.

### ۱۰.۳ تغییر مسیر/تکمیل تودو
در فایل متمم (`OTOMIX_MicroTask_Plan_Supplement_Gate_P08_*.md`) ثبت شده است: تسک‌های میکرو با محل شروع دقیق نسبت به Plan/Supplement.

---

## ۱۱. توصیه‌های کلیدی (اولویت‌دار)
1. **امروز:** ۵ تصمیم مالک را در یک جلسه ببندید (بخش ۸.۱). بدون آن، P08 بازنویسی می‌شود.
2. اجرای «بستهٔ راستی‌آزمایی» (بخش ۱۲) و ارسال خروجی برای به‌روزرسانی همین گزارش به سطح «اثبات‌شده».
3. `tasks.json` را منبع حقیقتِ وضعیت اعلام کنید و MD را از آن تولید کنید (نه برعکس).
4. تا وقتی `runEnrichment()` وصل نیست، کاتالوگ را به P08 وصل نکنید.
5. هر Mock → یک Contract test.
6. ماژول‌های تکراری را به یک مالک واحد برسانید (`confine`, `decode`, `normalize`).

---

## ۱۲. بستهٔ راستی‌آزمایی (روی ماشین خودتان اجرا شود)

> ویندوز/PowerShell: از `exit` داخل اسکریپت استفاده نکنید (GOTCHA-006) و برای git از `-c core.quotePath=false` استفاده کنید.

```powershell
pnpm -r build
pnpm -r test
rg -n "UNMIXABLE_BELOW|MIX_WEIGHTS|RECO_WEIGHTS" packages --glob "!**/dist/**"
rg -n "forceMono" packages --glob "!**/dist/**"
rg -n "Seconds|_S\b|_MS\b" packages/core/src
rg -n "@ts-nocheck|@ts-ignore" packages --glob "!**/dist/**"
rg -n "@otomix/(gateway|contracts)" packages/core/src packages/contracts/src
rg -n "from 'pg'" packages/core/src
npx madge --circular --extensions ts packages/*/src
rg -n "bpm: ?120|'1A'" packages/gateway/src/ingest/commit.ts
rg -n "sniff|confine|decode|ratelimit" packages/gateway/src/routes/ingest-local.ts
rg -n "CHECK \(role|CHECK \(tier" packages/db/migrations
rg -n "weights" packages/core/src/config/analysis-config.json
git ls-files packages/ui/src
```

| اگر خروجی… | یعنی… |
|---|---|
| `commit.ts` شامل `bpm: 120` | B-01 تأیید |
| ترتیب `decode` پیش از `sniff` | B-02 تأیید (اولویت ۱) |
| جمع وزن‌ها ≠ ۱٫۰ | B-03 تأیید |
| `packages/ui/src/state/mixplan.ts` وجود ندارد | تسک‌های UI در Addendum false-done‌اند |

---

*پایان گزارش. این گزارش «مستندمحور» است؛ ادعاهای برچسب `[نیازمند تأیید]` را فقط پس از اجرای بخش ۱۲ قطعی بدانید.*
