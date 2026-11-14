# فاز 7 - ورود محلی و مدیریت فایل‌های خطرناک

فاز 7 درخور: هر فایل صوتی که وارد OTOMIX می‌شود باید از یک سنجنده فرمت، یک محدوده حجم/مدت، یک بررسی محدوده دایرکتوری، یک دکدربناینگ کارگر، یک محافظ استاتیک ورود، یک طبقه‌بندی کننده کانتینر نامناسب و یک استخراج‌کننده برچسب‌ها که اطلاعات حساس (PII) را شناسایی می‌کند، عبور کند. در پایان P07-T02 همه این مراحل در حالی که در جایگاه هستند. P07-T03 (تکراری + نقطه انتها)، P07-T04 (DLQ) و P07-T05 (تعریف منبع) همچنان در حال انجام هستند.

## GAP-014 - نصب دوگانه

برای GAP-014 هر میکرو-وظیفه مرتبط دو پیاده‌سازی تولید می‌شود و همچنین یک هسته پیوسته مشترک:

- منطق پیوسته در `packages/core/src/ingest/*` و `packages/core/src/audio/normalize.ts`,
- ورگر در کلود در `packages/gateway/src/ingest/*` (Node, `logger.log`, `worker_threads`),
- ورگر در محل در `packages/adapter/src/ingest/*` (browser, `WarnSink`, `Worker`).

`sniffForGateway` / `sniffForLocal`, `createSizeLimitMiddleware` / `checkLimitsForLocal`, `confineForGateway` / `confineForLocal`, `extractTagsForGateway` / `extract_ TagsForLocal` همه یک پیش‌نیاز پیوسته در `core` را به اشتراک می‌گذارند و در بقیه مقصوداً متفاوت می‌شوند.

`core/src/ingest/sniff.ts` به طور خودکار FLAC (`fLaC`), WAV (`RIFF`+`WAVE`), MP3 (`ID3` یا MPEG frame sync) را تشخیص می‌دهد، هرگونه از `path.extname`. در اینجا GAP-017 کشف شد: ورگر کلود اولیه از `logger.warn(...)` استفاده می‌کرد، در حالی که واقعیت `Logger` اینترفیس فقط ` .log(record)` را ارائه می‌دهد. تصحیح (`b45-9e`) ورگر را به `logger.log({ level: 'warn', trace_id, span_id, ... })` تغییر می‌دهد و یک آزمون مسیر تولیدی اضافه می‌کند.

`core/src/ingest/limits.ts` `DEFAULT_LIMITS` (500 MB, 4 h) و `checkLimits` را انتقال می‌دهد. واسطه دروازه قبل از خواندن بدن، `Content-Length` را بررسی می‌کند و درخواست‌های چکیده را با تعداد بایتی شمارش می‌کند و با `req.destroy()` متوقف می‌شود.

`core/src/ingest/confine.ts` با استفاده از عملیات رشته‌ای، `isWithinRoot(candidateRealPath, rootRealPath)` را اجرا می‌کند. `confineForGateway` هر دو را با `fs.realpathSync` حل می‌کند؛ `confineForLocal` یک `HandleLike` را می‌پذیرد که فقط یک دستگاه ورودی فایل کاربر انتخابی می‌تواند آن را برآورده کند. تهدید بین `realpathSync` و باز کردن می‌باشد، بر اساس مدل تهدید 5.3 (محتویات در یک ساند بک تحلیل و تفسیر می‌شوند).

`packages/workers/src/decode.ts` `decodeAll(bytes, format, trace_id, span_id)` را اجرا می‌کند. WAV درونی پردازش می‌شود. MP3 با `mpg123-decoder` و FLAC با `@wasm-audio-decoders/flac` استفاده می‌شود. `normalizeChannels` در `core/src/audio/normalize.ts` به صورت مونو تبدیل می‌شود و به 44.1 kHz بازسازی می‌شود. SHA-256 بر روی PCM استاندارد محاسبه می‌شود. `STREAMINFO.total_samples` معتبر است: `decodeFlac` پاداش را حذف می‌کند وقتی دیکد بیشتر بازگردانده و صفر می‌گذارد وقتی کمتر بازگردانده می‌شود.

## P07-T02 - تأثیر فایل خطرناک

`P07-T02-S01-M01` `no-decoder-on-main` را با استفاده از dependency-cruiser اجرا می‌کند. فایل `.dependency-cruiser.cjs` بلوک می‌کند که `packages/(gateway|ui)/src` از `packages/workers/src/decode*`، `mpg123-decoder` یا `@wasm-audio-decoders/*` دریافت کند. ورودی‌های اجرایی (`decode-worker.ts`) تحت تأثیر قرار نمی‌گیرند - این‌ها از `require.resolve` / URL Worker استفاده می‌کنند که dependency-cruiser به صورت استاتیک نمی‌تواند آنها را ببیند. فایل `tools/test/no-decoder-main.spec.ts` گراف واقعی (0 تخلف) و یک فایل مجازی موقت در `packages/gateway/src` را که `decode` را وارد می‌کند (>=1 تخلف) اجرا می‌کند تا اثبات کند که قانون در حال اجرا است. شمارنده تخلف‌ها در `modules[].dependencies[]` می‌گردد تا `valid === false` با `rules` غیر خالی را پیدا کند، زیرا در نسخه v16 depcruise `summary.violations` به عنوان یک عدد ساده نمایش داده نمی‌شود.

`P07-T02-S01-M02` کلاس‌های مالی‌سازی شده را به عنوان غیرقابل تکرار می‌شناسد. `core/src/ingest/reject.ts` (پریوریت) `classifyDecodeFailure(format, bytes, errorMessage?)` با بازگشت `{ ok: false, error: 'INVALID_ARGUMENT', reason, retryable: false }` با دلایل `TRUNCATED_HEADER` / `INVALID_FRAME_SYNC` / `BAD_STREAMINFO` / `UNKNOWN_PARSE_FAILURE` می‌شود. `core/src/resilience/retry.ts` یک `isRetryable?: (err) => boolean` جدید اضافه کرد - پیش‌فرض `undefined` رفتار قبلی `idempotent` را حفظ می‌کند، و آزمون جدید نشان می‌دهد که 1 تلاش در صورت `isRetryable: () => false` انجام می‌شود. `gateway/src/ingest/reject.ts` در سطح `warn` `ingest.rejected` را می‌نویسد. DLQ (P07-T04) گروه `RejectReason` را می‌خواند.

`P07-T02-S01-M03` برای تگ‌های درونی، نشانه‌های نمایش غیرقابل اعتماد می‌گیرد. `core/src/ingest/tags.ts` فرمت‌های WAV LIST-INFO (IDهای بلوک دقیقاً 4 بایت - IKEY نه ICKEY)، MP3 ID3v2 (TIT2/TPE1/TALB/TBPM/TKEY) + پیش‌فرض ID3v1 و FLAC Vorbis comments (TITLE/ARTIST/ALBUM/COMMENT/BPM/KEY) را می‌پردازد. `DisplayMetadata` یک نوع مجزا از `RegistryFields` است. آزمون دریافتی در دروازه نشان می‌دهد رفتار امنیتی دریافتی است: تگ BPM=999 در `BPM.parse` (بیرون از [60, 200]) می‌فراشته، تگ key=99Z در `CamelotKey.parse` می‌فراشته؛ تحلیل BPM=128 و key=8A هر دو موفق می‌شود. اگر ی

## GAP-018 - pool.ts @ts-nocheck

`packages/workers/src/pool.ts` (افزوده شده در P06) سه خطا مربوط به متغیرهای غیراستفاده شده داشت که در اولین `pnpm -F @otomix/workers build` ظاهر شدند. یک `// @ts-nocheck` موقت، ساخت را بازگویی میکند؛ ترمیم مناسب به طور موقت به یک وظیفه بعدی تفویض شده است.

`Docs/ArchitectureBook/sync-and-translate.ps1` به `git push origin P04` ختم میشود که یک کپی-پیست از فاز P04 است. هر فراخوانی از یک فرامل دیگر، به جای فرامل فعلی، فرامل محلی P04 را ارسال میکند. راه حل: پس از هر فراخوانی، به طور صریح `git push origin <branch>` را اجرا کنید. رفع اصلی تأخیر دارد.

`P08` دارای ۱۸ وظیفه UI است که هر کدام به طور مستقل تصمیم می‌گیرند که چگونه یک عضو UI را به داده‌ها بندی کند. `X-P05-P08` و `X-P07-P-08` شکل داده را تأیید می‌کنند اما مربوطیت UI به فیلد را تأیید نمی‌کنند. حل: فایل `Docs/FEATURES/OTOMIX_UI_Bindings.md` باید در شروع `P08-T01` نوشته شود با ستون‌های عضو UI / قطعه Redux / فیلد کاتالوگ / فیلد ثبت ویژگی. به عنوان یک هشدار برنامه در `P08-T01-S01-M01` ثبت می‌شود.

`packages/core/dist/index.js` از ESM است اما ورودی‌های مربوطه آن بدون گسترش `.js` (مثلاً `from './config/analysis'`) است. حلک‌کننده ESM خود نود این ورودی‌ها را رد می‌کند؛ vitest، tsx و Vite آنها را حل می‌کنند. سیستم فیزیکی اولیه با استفاده از `worker_threads` و حد 512 مگابایت حافظه، به دلیل این موضوع با خطا `ERR_MODULE_NOT_FOUND` مواجه شد؛ حالا به صورت مستقیم اجرا می‌شود. راه حل صحیح (معلق): یا گسترش `.js` به تمام ورودی‌های مربوطه در `packages/core/src/**/*.ts` اضافه شود یا `rewriteRelativeImportExtensions: true` در `core/tsconfig.json` تنظیم شود. قانون مشابه برای هر کدی در آینده که از `@otomix/core` در ESM نود خام استفاده می‌کند، می‌باشد.

## چیست بعد از این

`P07-T03-S01-M01` (برای مهاجرت) شروع پایین‌سازی برای ورود داده‌ها: جدول `tracks` با محدودیت‌های CHECK، RLS و یک منحصر به فرد `(tenant_id, owner_id, content_sha256)`. تکرار داده‌ها (`P07-T03-S02-M01`)، پایین‌سازی `POST /api/v1/ingest/local` (`P07-T03-S0-2-M02`)، تایید تراکنشی (`P07-T03-S02-M03`) و محدود کردن سرعت (`P07-T03-S02-M04`) به ترتیب می‌آیند. دیلیوری (DLQ) (`P07-T04`) و تعریف منابع (`P07-T05`) فاز را بسته می‌کنند.

### P07-T03-S01-M01
**مهاجرت tracks**

- **شناسه وظیفه**: `P07-T03-S01-M01`
- **فایل‌های تغییر یافته**: `packages/db/test/tracks.migration.spec.ts`
- **نکته معماری**: فایل مهاجرت با نام `007_tracks_source_declarations.sql` ایجاد شد، نه `003_tracks.sql` به دلیل تعارض پیشوند. این موضوع در پیوست ثبت شده است. فایل تست بازسازی شد تا بتواند `users` را با امنیت مونت کند، از درخواست‌های پارامتری استفاده کند و `bytea` را با `Buffer.from()` مدیریت کند.
- **تست‌های موفق**: `Tests 9 passed (9)`
- **نتیجه مورد انتظار**: ایجاد جدول `tracks` با محدودیت‌های CHECK، RLS (امنیت سطح ردیف) و یک محدودیت منحصر به فرد برای `(tenant_id, owner_id, content_sha256)`.
- **نقطه بررسی**: جداول `tracks` و `source_declarations` وجود دارند، محدودیت‌ها رعایت می‌شوند و با RLS امنیت یافته‌اند.


### P07-T03-S02-M01  
**تکرار کاهش با استفاده از اجرای مجدد**

- **شناسه وظیفه**: `P07-T03-S02-M01`
- **فایل‌های تغییر یافته**: `packages/gateway/src/ingest/dedup.ts`, `packages/gateway/test/dedup.spec.ts`
- **نکته معماری**: `upsertTrackDedup` از `INSERT ... ON CONFLICT (tenant_id, owner_id, content_sha25-56) DO NOTHING RETURNING track_id` استفاده می‌کند و سپس بر روی تعارض جستجو می‌کند. `checkDedup` برای مخاطبانی که فقط نیاز به دانستن وجود دارند، خواندنی می‌ماند. کمک‌دهنده تغییری در شروع یا پایان تراکنش اعمال نمی‌کند - تراکنش توسط مخاطب مالک است.
- **تست‌های موفق**: 5 تست موفق (5)
- **نتیجه مورد انتظار**: تکرار کاهش تراکت‌ها بر اساس SHA-256 از PCM متعادل شده.
- **نقطه بررسی**: `isNew` به درستی مسیر نوشتن اولیه را از مسیر تعارض نشان می‌دهد.

### P07-T03-S02-M02
**POST /api/v1/ingest/local + local twin**

- **ID وظیفه**: `P07-T03-S02-M02`
- **فایل‌های تغییر یافته**: `packages/gateway/src/routes/ingest-local.ts`, `packages/gateway/src/ingest/commit.ts` (stub), `packages/adapter/src/ingest/ingest-local.ts`, `packages/gateway/test/ing-than-local.spec.ts`, `packages/adapter/test/ingest-local.spec.ts`
- **نکته معماری**: لایه مسیر ابری: `verifyRequest` (interceptor) -> `validateIdempotencyKey` -> `idempotencyStore.withIdempotency(job_id, fp, handler)` -> sniff -> decode worker -> tags -> `commitIngestTransaction` درون `BEGIN`/`setTenantId`/`COMMIT`. 201 جدید، 200 بازگشت، 409 تعارض، 500 موقت. local twin یک تابع مواجهه‌ای با وابستگی‌های وارد شده، بدون HTTP، بدون دیتابیس (GAP-014).
- **تست‌های موفق**: 4 تست موفق (4) [gateway]; 3 تست موفق (3) [adapter]
- **نتیجه مورد انتظار**: پایه‌ای با محدودیت دامنه و پیاده‌سازی یک پایه ورودی ایدمپوتنت با دو نسخه ابری و محلی.
- **نقطه بررسی**: محتوای بازگشت برابر محتوای اولیه است؛ stub `commitIngestTransaction` فقط داده‌ای با نام `CommitIngestData` را دریافت می‌کند.

### P07-T03-S02-M03  
**commit تراک+ویژه‌یی+outbox در یک تراکنش واحد**

- **ID وظیفه**: `P07-T03-S02-M03`
- **فایل‌های تغییر یافته**: `packages/gateway/src/ingest/commit.ts`, `packages/gateway/test/ingest-commit.spec.ts`, تصحیح بازگشتی در `packages/gateway/test/ingest-local.spec.ts`
- **نکته معماری**: `commitIngestTransaction` اکنون یک تراکنش را برای ورود تراک (با استفاده از `upsertTrackDedup`)، ویژه‌های (مقدار موقت بر اساس `[GAP-023]`) و یک ردیف outbox ایجاد می‌کند. در صورت `isNew=false`، ورود ویژه‌ها اجتناب شده تا از شرط منحصر به فرد `(tenant_id, track_id, schema_version)` جلوگیری شود؛ هرگز یک رویداد outbox نوشته می‌شود. ویژه‌ی `{ failAfterTrackInsert }` به صورت اختیاری، اتمیت را اثبات می‌کند.
- **تست‌های موفق**: 3 تست موفق (3)
- **نتیجه مورد انتظار**: ورود تراک، ردیف ویژه‌ی سیستم و رویداد outbox به صورت اتمی اجرا می‌شود.
- **نقطه بررسی**: خطا قوی باعث می‌شود که در همه سه جدول 0 ردیف باقی بماند؛ همچنین در صورت تکرار ورودی، رویداد outbox همچنان نوشته می‌شود.

### P07-T03-S02-M04  
**میانواحی محدودکننده سرعت براساس سیستم چاه بارانی**

- **شناسه وظیفه**: `P07-T03-S02-M04`
- **فایل‌های تغییر یافته**: `packages/gateway/src/ingest/ratelimit.ts`, `packages/gateway/test/ratelimit.spec.ts`
- **نکته معماری**: `createRateLimitMiddleware({ capacity, drainPerSec, clock, keyOf })` بازگشت `(req, res, next) => void`. بازه کاربری بر اساس `sub` در JWT. مقدار پیش‌فرض `capacity=10`، `drainPerSec=1` برای `[GAP-024]`. در صورت پر شدن: 429 + `Retry-After` ثانیه‌های صحیح. مجموعه درونی Map؛ ممکن است در مرحله P10 به Redis تغییر کند. هنوز به مسیر متصل نشده است (آزمون M04 فقط واحد است؛ ترکیب بخشی از ساخت سرور است).
- **آزمون‌های موفق**: 3 آزمون موفق (3)
- **نتیجه مورد انتظار**: محدودکننده سرعت چاه بارانی در صورت فراخوانی بیش از حد، 429 با `Retry-After` را بازگرداند.
- **نقطه بررسی**: برش 2 برابر ظرفیت: موفقیت ظرفیت + 429 برای ظرفیت؛ پس از یک بازه خروجی، درخواست‌ها موفق می‌شوند؛ `Retry-After` عدد صحیح.

### P07-T04-S01-M01  
**وظیفه‌های شکسته در otomix.dlq**

- **شناسه وظیفه**: `P07-T04-S01-M01`
- **فایل‌های ویرایش شده**: `packages/gateway/src/dlq/types.ts`, `packages/gateway/src/dlq/park.ts`, `packages/gateway/test/dl-ql-park.spec.ts`
- **نکته معماری**: `parkToDlq(redis, input, deps)` به Redis Stream `otomix.dlq` اضافه می‌کند با job_id، reason، trace_id، attempts، parked_at و payload. DLQ یک مفهوم متمایز از outbox (متن 5.8 دیاگرام متوالی) است. تنها در محیط علایق؛ آداپتور دارای نسخه‌ای نیست. `[GAP-025]` می‌نویسد که Redis Streams به عنوان انتخاب صف است.
- **تست‌های موفق**: 3 تست موفق (3)
- **نتیجه مورد انتظار**: پس از 1 تلاش و حداکثر 3 تلاش، یک وظیفه در otomix.dlq قرار داده شود، با ثبت دلیل شکست و شناسه trace.
- **نقطه بررسی**: 4 تلاش -> یک ورودی در DLQ با دلیل + شناسه trace 32-هکس؛ ورودی‌های متوالی به ترتیب اضافه می‌شوند.

### P07-T04-S01-M02  
**بازبینی دیلیوی دلیتی با استفاده از job_id**

- **شناسه وظیفه**: `P07-T04-S01-M02`
- **فایل‌های تغییر یافته**: `packages/gateway/src/dlq/replay.ts`, `packages/gateway/src/dlq/index.ts`, `scripts/dlq-replay.ts`, `packages/gateway/test/dl-queue-replay.spec.ts`
- **نکته معماری**: `replayDlq(redis, jobId, handler, deps)` از طریق `XRANGE` دیلیوی را می‌خواند، `withIdempotency(jobId, sha256(payload), handler)` را اجرا می‌کند، و فقط برای نسخه جدید `XDEL` اعمال می‌شود؛ دومین بازبینی `replay` را بدون `XDEL` بازمی‌گرداند؛ در صورت عدم تطابق پیکلود، `conflict` بازمی‌گرداند. در صورت عدم یافتن `XRANGE`، آن بررسی می‌کند `getResponse(jobId)`، بنابراین بازبینی پس از `XDEL` همچنان `replay` می‌شود، نه `not_found`. اجرای خط فرمان `scripts/dlq-replay.ts` مطابق الگوی cvss-gate است (`require.main === module`). `[GAP-026]` ثبت رجیستری دستورالعمل به تأخیر در P10.
- **تست‌های موفق**: 3 تست موفق (3)
- **نتیجه مورد انتظار**: با استفاده از دستورالعمل، پیام‌های دیلیوی با استفاده از شناسه job به صورت یکسان بازبینی می‌شوند.
- **نقطه بررسی**: بازبینی دوم بدون عملیات (no-op)؛ تعارض پیکلود باعث ایجاد می‌شود؛ کد خروجی خط فرمان 0/1/2.

### P07-T05-S01-M01  
**تعریف منابع در فرآیند ورود**

- **شناسه وظیفه**: `P07-T05-S01-M01`
- **فایل‌های تغییر یافته**: `packages/gateway/src/declarations/record.ts`, `packages/gateway/src/routes/ingest-local.ts`, `packages/gateway/test/source-declarations.spec.ts`, اصلاح ناهنجاری در `packages/gateway/test/ingest-local.spec.ts`
- **نکته معماری**: OQ-11 حل شد 2026-11-14: تعریف منبع الزامی است؛ سایت مسئولیت قانونی از این موضوع ندارد؛ نسخه `terms_version` v1.0 از تاریخ 2026-11-14 می‌باشد. `recordDeclaration(client, { tenantId, userId, scope, termsVersion, declaredAt })` به `source_declarations` وارد می‌شود (declared_at به صورت ISO UTC). درون تراکنش `ingest-local` وصل شده است؛ در صورت خطا، بازگشت انجام می‌شود. `[GAP-028]` نشان می‌دهد فیلد برنامه `action` است اما ستون DDL `scope` است.
- **آزمون‌های موفق**: 3 آزمون موفق (3)
- **نتیجه مورد انتظار**: ثبت تعریف منابع کاربر (ورود، انتشار، خروج) با نسخه قوانین و زمان استاندارد UTC.
- **نقطه بررسی**: ردیف تعریف ورود با v1.0 + UTC؛ محدودیت مربوط به محدوده رد شده؛ ثبت انتشار و خروج انجام شده است.

