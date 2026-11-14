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