# فاز 7 - ورود محلی و مدیریت فایل‌های خطرناک

فاز 7 درخور است: هر فایل صوتی که وارد OTOMIX می‌شود باید از یک سیستم تشخیص فرمت، یک محدودیت حجم و مدت زمان، یک بررسی محدوده دایرکتوری، یک دکدربیت کارگر، یک محافظه کاری در برابر ورود ساکت، یک طبقه‌بندی کننده فایل‌های نامعتبر و یک استخراج برچسب که PII را شناسایی می‌کند، عبور کند. در پایان P07-T02 تمام این مراحل در صورتی که درست است. P07-T03 (تکرار و پایان‌یابی)، P0-T04 (DLQ) و P07-T05 (تعریف منبع) همچنان در حال انجام است.

## GAP-014 - دوگانه نصب

بر اساس GAP-014، هر میکرو-وظیفه مرتبط دو نسخه و یک هسته خالص مشترک تولید می‌کند:

- منطق خالص در `packages/core/src/ingest/*` و `packages/core/src/audio/normalize.ts`،
- پیوند مربوط به علایق در `packages/gateway/src/ingest/*` (نود، `logger.log`، `worker_threads`)،
- پیوند مربوط به محل در `packages/adapter/src/ingest/*` (مرورگر، `WarnSink`، `Worker`)。

`sniffForGateway` / `sniffForLocal`، `createSizeLimitMiddleware` / `checkLimitsForLocal`، `confineForGateway` / `confineForLocal`، `extractTagsForGateway` / `extractTagsForLocal` همه یک پیش‌نیاز خالص در `core` را به اشتراک می‌گذارند و در بقیه مقصوداً متفاوت می‌شوند.

## P07-T01 - sniff، محدودیت‌ها، محدود کردن، تفسیر

`core/src/ingest/sniff.ts` مقدار FLAC (`fLaC`)، WAV (`RIFF`+`WAVE`)، MP3 (`ID3` یا سینک MPEG) را تشخیص می‌دهد، هرگونه از `path.extname`. در اینجا GAP-017 کشف شد: گوشه ابری اولیه از `logger.warn(...)` استفاده می‌کرد، در حالی که واقعیت `Logger` از `log(record)` استفاده می‌کند. تصحیح (`b45-9e`) گوشه را به `logger.log({ level: 'warn', trace_id, span_id, ... })` تغییر می‌دهد و یک تست مسیر تولیدی اضافه می‌کند.

`core/src/ingest/limits.ts` مقدار `DEFAULT_LIMITS` (500 مگابایت، 4 ساعت) و `checkLimits` را انتقال می‌دهد. واسط درگاه قبل از خواندن بدن، `Content-Length` را بررسی می‌کند و درخواست‌های برشته‌ای را با تعداد بایت‌ها شمارش می‌کند و با `req.destroy()` متوقف می‌شود.

`core/src/ingest/confine.ts` مقدار `isWithinRoot(candidateRealPath, rootRealPath)` را با استفاده از عملیات رشته‌ای ایجاد می‌کند. `confineForGateway` هر دو را با `fs.realpathSync` حل می‌کند؛ `confineForLocal` یک `HandleLike` را می‌پذیرد که فقط یک دستگاه ورودی فایل کاربر انتخابی می‌تواند آن را پذیرفته باشد. تفاوت بین `realpathSync` و باز کردن در مدل تهدید 5.3 (محتویات در یک ساند بک تفسیر و تحلیل می‌شود) مورد قبول است.

`packages/workers/src/decode.ts` مقدار `decodeAll(bytes, format, trace_id, span_id)` را اجرا می‌کند. WAV درونی تفسیر می‌شود. MP3 از `mpg123-decoder` استفاده می‌کند؛ FLAC از `@wasm-audio-decoders/flac` استفاده می‌کند. `normalizeChannels` در `core/src/audio/normalize.ts` به صورت مونو و بازسازی به 44.1 kHz انجام می‌شود. SHA-256 بر روی PCM استاندارد محاسبه می‌شود. `STREAMINFO.total_samples` معتبر است: `decodeFlac` زمانی که دیکد بیشتر بازگردانده، پاداگری را حذف می‌کند و زمانی که کمتر بازگردانده، با صفر پر می‌کند.

## P07-T02 - تأثیر فایل خطرناک

`P07-T02-S01-M01` با استفاده از dependency-cruiser، قوانین `no-decoder-on-main` را اجرا می‌کند. فایل `.dependency-cruiser.cjs` بلوک می‌کند که `packages/(gateway|ui)/src` از `packages/workers/src/decode*`، `mpg123-decoder` یا `@wasm-audio-decoders/*` وارد شود. ورگرایه‌های اجرا (`decode-worker.ts`) تحت تأثیر قرار نمی‌گیرند — اینها از `require.resolve` یا URL Worker استفاده می‌کنند که dependency-cruiser به صورت ساکت نمی‌تواند آنها را دیده باشد. فایل `tools/test/no-decoder-main.spec.ts` گراف واقعی (0 تخلف) و یک فایل مصنوعی در `packages/gateway/src` را که از `decode` وارد می‌شود (>=1 تخلف) اجرا می‌کند تا اثبات کند که قانون در حال اجرا است. شمارنده تخلف‌ها در `modules[].dependencies[]` می‌گردد تا `valid === false` با `rules` ناخالص را پیدا کند، زیرا در نسخه v16 depcruise `summary.violations` به صورت عددی بیشتر نمی‌باشد.

`P07-T02-S01-M02` موارد نامعتبر را به عنوان غیرقابل تکرار دسته‌بندی می‌کند. `core/src/ingest/reject.ts` (پریم) `classifyDecodeFailure(format, bytes, errorMessage?)` به صورت `{ ok: false, error: 'INVALID_ARGUMENT', reason, retryable: false }` با دلایل `TRUNCATED_HEADER` / `INVALID_FRAME_SYNC` / `BAD_STREAMINFO` / `UNKNOWN_PARSE_FAILURE` با می‌گرداند. `core/src/resilience/retry.ts` یک پارامتر اختیاری `isRetryable?: (err) => boolean` اضافه کرده است — پیش‌فرض `undefined` رفتار قبلی `idempotent` را حفظ می‌کند، و آزمون جدید نشان می‌دهد که یک تلاش در صورت `isRetryable: () => false` انجام می‌شود. `gateway/src/ingest/reject.ts` یک گزارش `ingest.rejected` در سطح `warn` می‌نویسد. DLQ (P07-T04) محتوای `RejectReason` را می‌گیرد.

`P07-T02-S01-M03` برای تگ‌های درونی، نشانه‌های نمایش غیرقابل اعتماد می‌گیرد. `core/src/ingest/tags.ts` فرمت‌های WAV LIST-INFO (IDهای بلوک دقیقاً 4 بایت - IKEY نه ICKEY)، MP3 ID3v2 (TIT2/TPE1/TALB/TBPM/TKEY) + پیش‌فرض ID3v1 و FLAC Vorbis comments (TITLE/ARTIST/ALBUM/COMMENT/BPM/KEY) را تحلیل می‌کند. `DisplayMetadata` یک نوع مجزا از `RegistryFields` است. آزمون در دروازه اثبات می‌کند که رفتار امنیتی دریافتی در مجموعه است: تگ BPM=999 در `BPM.parse` (بیرون از [60, 200]) می‌فشکند؛ تگ key=99Z در `CamelotKey.parse` می‌فشکند؛ تحلیل BPM=128 و key=8A هر دو موفق می‌شوند. اگر یک مخاطب آینده `displayMetadata` را به مجموعه اضافه کند، اعتبارسنجی آن را رد می‌کند. ورگرایه‌ها یک گزارش `ingest.tags_stripped` در سطح `warn` می‌نویسند وقتی `hasPii` (موجود بودن artist/album/comment).

`P07-T02-S02-M01` مجموعه فووز دترمینیستی را اضافه می‌کند. `fuzz/generate-corpus.ts` از یک سیم‌بندی Mulberry32 با `0x07000001` استفاده می‌کند و 300 فایل در 4 کلاس × 75 × 3 فرمت (قطعی، بزرگ، بازگشتی، فضای خالی) انتقال می‌دهد. `fuzz/decoder.fuzz.spec.ts` مجموعه را با vitest (حل‌کننده Vite - ببینید GAP-021) اجرا می‌کند با محدودیت 5 ثانیه برای هر فایل، محدودیت 512 مگابایت برای تغییر حافظه، و عدم تایید هرگونه خطا یا نتیجه نامعتبر. `vitest.workspace.ts` یک پروژه `fuzz` اضافه می‌کند که از پیوند ریشه استفاده نمی‌کند — `extends` مجموعه `test.include` را به صورت عمیق ترکیب می‌کند و کل مخزن را به پروژه فووز منتقل می‌کند. `.github/workflows/fuzz.yml` در ساعت 02:00 UTC هر شب اجرا می‌شود و همچنین امکان انتقال دستی وجود دارد.

## GAP-018 - pool.ts @ts-nocheck

`packages/workers/src/pool.ts` (افزوده شده در P06) سه خطا مربوط به متغیرهای غیراستفاده شده داشت که در اولین `pnpm -F @otomix/workers build` ظاهر شدند. یک `// @ts-nocheck` موقت، ساخت را بازگویی میکند؛ تغییر ساخته مناسب به صورت موقتی به یک وظیفه بعدی تفویض شده است.

## GAP-019 - sync-and-translate.ps1 مقدار ثابت پیش‌رفت

`Docs/ArchitectureBook/sync-and-translate.ps1` به صورت پایانی با `git push origin P04` به کار می‌رود که یک کپی-پیست از فاز P04 است. هر باری که از یک فرمت دیگر استفاده می‌شود، مرجع محلی P04 به جای فرمت فعلی ارسال می‌شود. راه حل: پس از هر فراخوانی، به طور صریح `git push origin <branch>` را اجرا کنید. راه حل صحیح به تأخیر گذاشته شده است.

## GAP-020 - ماتریس بندی UI مركزي وجود ندارد

`P08` 18 وظیفه UI دارد که هر کدام به طور مستقل تصمیم می‌گیرند که چگونه یک عضو UI را به داده بندی کنند. `X-P05-P08` و `X-P07-P-08` شکل داده را تأیید می‌کنند اما ماتریس بندی UI به فیلد را تأیید نمی‌کنند. حل: فایل `Docs/FEATURES/OTOMIX_UI_Bindings.md` باید در شروع `P08-T01` نوشته شود با ستون‌های UI element / Redux slice / catalog field / Feature Registry field. به عنوان یک هشدار برنامه‌ریزی در `P08-T01-S01-M01` ثبت شده است.

## GAP-021 - core/dist با استفاده از ESM و ورودی‌های بدون پسوند است

`packages/core/dist/index.js` از ESM استفاده می‌کند اما ورودی‌های مربوطه آن بدون پسوند `.js` (مثلاً `from './config/analysis'`) است. حل‌کننده ESM داخلی نود این ورودی‌ها را رد می‌کند؛ در حالی که vitest، tsx و Vite آنها را حل می‌کنند. حلقه فیزیکی اولیه با استفاده از `worker_threads` و حد 512 مگابایت حافظه، به دلیل این موضوع با خطا `ERR_MODULE_NOT_FOUND` خاتم شد؛ حالا درونی اجرا می‌شود. راه حل صحیح (موقتی): یا پسوند `.js` را به تمام ورودی‌های مربوطه در `packages/core/src/**/*.ts` اضافه کنید یا `rewriteRelativeImportExtensions: true` را در `core/tsconfig.json` تنظیم کنید. قانون مشابهی برای هر کدی در آینده که از `@otomix/core` در ESM نود خالص بارگذاری می‌کند، می‌باشد.

## چه مواردی در ادامه وجود دارد

`P07-T03-S01-M01` (برای مسیریابی تغییرات) مجموعه ذخیره‌سازی برای ورود داده‌ها را شروع می‌کند: جدول `tracks` با محدودیت‌های `CHECK`، RLS و یک `UNIQUE` `(tenant_id, owner_id, content_sha256)`. تکرار داده‌ها (`P07-T03-S02-M01`)، پاینده `/api/v1/ingest/local` (`P07-T03-S02-M02`)، تأیید تراکنش (`P07-T-03-S02-M03`) و محدود کردن نرخ (`P07-T03-S02-M04`) به ترتیب می‌آیند. DLQ (`P07-T04`) و تعریف منابع (`P07-T05`) فاز را به پایان می‌رسانند.