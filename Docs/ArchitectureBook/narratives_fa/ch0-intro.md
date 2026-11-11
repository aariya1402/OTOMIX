# OTOMIX چیست؟

**OTOMIX یک موتور میکس خودکار DJ مبتنی بر ضرب است.** دو یا چند تراک صوتی را می گیرد، ساختار ریتمیک آنها را تا ضرب آهنگ فردی تجزیه و تحلیل می کند، یک طرح انتقال تضمین شده ریاضی را محاسبه می کند و خروجی ترکیبی را ارائه می دهد - همه اینها بدون لغو یک انتقال پس از شروع.

## مشکل

میکس خودکار دی جی واقعا سخت است. یک دی جی انسانی ضربات را با گوش مطابقت می دهد، سرعت را به تدریج تنظیم می کند، عبارات را تراز می کند و می داند که چه زمانی باید برش یا ترکیب شود. نرم افزاری که سعی می کند این را تکرار کند با چهار مشکل درهم تنیده روبرو می شود:

- **پیوستگی ضربان** — اگر آهنگ خروجی 50 میلی ثانیه روی 32 ضربه تغییر کند، مسیر ورودی باید جبران کند یا ترکیب "شعله" شود (دبل ضربه شنیدنی).
- ** عدم تطابق سرعت ** - آهنگ های 124 BPM و 126 BPM را نمی توان به سادگی متقاطع کرد. یکی باید سرعت داشته باشد تا با دیگری روبرو شود.
- ** دریفت زیر و بم ** - تاب سرعت بدون تصحیح گام، کلید موسیقی را تغییر می دهد و ناهماهنگی ایجاد می کند.
- ** تراز فاز ** - حتی در سرعت منطبق، طبل ضربه ممکن است با کسری از ضربان جبران شود ("عقب بدن" در پشت گذرا). این افست باید *در طول* انتقال اصلاح شود، نه بعد از آن.

یک انتقال اشتباه شب را خراب می کند. OTOMIX وجود دارد تا این عدم امکان را تضمین کند: **هر انتقال کامل می شود.**

## The Insight: Beat-First

رشته معماری واحدی که باعث می شود OTOMIX کار کند **بیت اول** است. هر تصمیمی - ساخت شبکه، تصحیح دریفت، زمان بندی متقاطع، مرزهای برش - بر روی یک مرز ضربتی قرار می گیرد، هرگز در یک ثانیه ساعت دیواری.

زمان ساعت دیواری الاستیک است (نرخ‌های نمونه تغییر می‌کند، بافرها کم می‌شوند، مکث GC). زمان ضرب مطلق است. OTOMIX با لنگر انداختن تمام محاسبات به **شبکه قفل مطلق** (یک نگاشت یکنواخت "t(i)" از شاخص ضرب "i" تا ثانیه مطلق)، OTOMIX قصد موسیقی را از تأخیر سیستم جدا می کند. پنجره انتقال همیشه 64 ضربان است (16 میله در 4/4). کراس فید ایمنی همیشه 16 ضربه است. همگام سازی لنگر هر 64 ضربه شلیک می شود. این اعداد ثابت هستند، نه پیکربندی.

## تور یک خطی 11 فاز

| فاز | Purpose |
|-------|---------|
| **بنیاد P01** | Monorepo, quality gates, branded types (`BPM`, `CamelotKey`, `BeatIndex`), contracts (semver gate, feature registry), resilience (retry + degraded mode), telemetry (structured logging + W3C trace context), timing primitives (high-res clock, 50 ms lookahead scheduler). |
| **موتور Beat-Index P02** | The Absolute Locked Grid: `t(i)` mapping with drift clamp (±0.05 s), period bounds (±5%), hard anchor sync every 64 beats, pre-kick mapping for negative indices, zero-RAM structural arithmetic (`floorMod`, `beatInBar`, `barIndex`, `blockPosition`, `isBlockBoundary`, `quantumSeconds`, `quantumIndex`). |
| **P03 شبکه دوگانه و مشاهده گر** | Attack Grid (spectral flux onset detection) + Body Grid (sub-band RMS peak with group-delay compensation). Phase offset Δφ drives a 4-bar cosine realignment. Runtime Observer watches drift, degrades buffer size one-way, and emits realignment logs. Groove classifier (Straight/Triplet/Swing/Irregular). Universal Transition Guarantee planner with 7 rungs + safety net. |
| ** پورت DSP P04 و ایمنی در زمان واقعی ** | Executes P03 plans: tempo glide via `AudioParam`, Transition Window Chopping Engine (1/8–1/32 slicing with cosine crossfades, groove-aware boundary shift), RT-safe AudioWorklet (zero alloc, lock-free SPSC ring buffer, per-sample smoothing, denormal flush), EQ/Mastering/Export chain with mock driver. |
| ** استخراج ویژگی P05 ** | Essentia.js spectral/temporal features, TF voice/instrumental separation, MAEST embeddings, global track metadata cache keyed by `content_sha256`. |
| **P06 Security & RBAC** | JWT + scopes + tier grants + Row-Level Security on every tenant table. Audit log to P10. |
| ** مصرف محلی P07 ** | Worker decoders (MP3/WAV/FLAC), deduplication by `content_sha256`, copyright declaration UI. Outputs decoded `Float32Array` + hash to P05. |
| **P08 MixPlan & UI** | React 19 + Redux Toolkit frontend, waveform overlays, recommendation engine, MixPlan generation. Input: catalog + user intent. Output: MixPlan + preview requests to P04. |
| **فروشگاه صادرات و ست P09** | XML exporters (Serato, Traktor, Rekordbox), encrypted archives, marketplace listing. Input: completed set from P08. Output: signed download + purchase record. |
| **قابلیت مشاهده و استقرار P10** | OpenTelemetry traces + metrics, Datadog monitors-as-code, K8s Blue/Green, Helm charts, CI hardening. SLO dashboard + runbooks. |
| ** سخت شدن و پذیرش P11** | 10,000-pairing determinism matrix, zero-RAM heap proof, NFR verification, final evidence bundle for sign-off. |

## آنچه این کتاب به شما می دهد

این دایره المعارف زنده **از منبع تولید شده** است - هر مسیر فایل، شماره خط، مقدار ثابت و وضعیت وظیفه مستقیماً از پایگاه کد و اسناد برنامه معتبر می آید. به طور همزمان به دو مخاطب خدمت می کند:

- **غیر متخصص** (محصول، طراحی، استخدام های جدید): فصل های روایت (CH0، CH1، P01–P11) را برای «چرا» و مدل های ذهنی بخوانید. ابتدا تشابهات، ارجاع کد اختیاری است.
- **کارشناسان** (مهندسان، حسابرسان): هر کاری را برای مشاهده توضیحات دقیق، فایل آزمایشی، مرجع مشخصات، ایست بازرسی و نمادهای منبعی که لمس می کند، بررسی کنید. «TRANSITION_WINDOW_BEATS» را جستجو کنید و روی «packages/core/src/constants/grid.ts:99» قرار بگیرید. روی پیوند «vscode://» کلیک کنید و خط دقیق آن را در ویرایشگر خود باز کنید.

این کتاب به طور خودکار پس از انجام هر وظیفه ریز از طریق «build-book.ps1» بازسازی می شود. همیشه جاری است.