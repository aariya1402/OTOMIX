# فاز 5 - خط لوله استخراج و تحلیل ویژگی

## آنچه P05 ارائه می دهد

P05 صدای رمزگشایی شده ("Float32Array" + "content_sha256" از P07) را به یک **ردیف رجیستری ویژگی** تبدیل می‌کند - یک سند ساختاریافته و نسخه‌شده که به توصیه (P08)، ترکیب هارمونیک، و پروفایل انرژی کمک می‌کند.

| استخراج کننده | Technology | Output |
|-----------|------------|--------|
| **طیفی/زمانی** | Essentia.js (WASM) | 200+ descriptors: spectral centroid, rolloff, flux, MFCC, chroma, rhythm patterns, loudness (EBU R128). |
| **صدا/ساز** | TensorFlow.js model | Binary mask + separated stems (optional). Threshold: `VOCAL_THRESHOLD = 0.65` (from `constants/scoring.ts:8`). |
| **جاسازی ها** | MAEST (Music Audio Embedding with Self-Supervised Training) | 512-d vector for similarity search. |
| **فراداده جهانی** | Aggregation | `content_sha256` (dedup key), duration, average BPM, key (Camelot), energy profile, vocal presence, groove mode. |

**کلید حافظه پنهان**: «content_sha256» — محتوای صوتی یکسان ⇒ ویژگی های یکسان (قطعی). تجزیه و تحلیل مجدد فقط در نسخه طرحواره دست انداز (P01 semver gate).

**ورودی**: «Float32Array» با فرکانس 44.1 کیلوهرتز («SAMPLE_RATE» از «constants/grid.ts:75»)، مونو یا استریو (برای تجزیه و تحلیل به مونو میکس شده) رمزگشایی شده است.

**خروجی**: ردیف «FeatureRegistryV1_2» (تأیید شده توسط «packages/contracts/src/validate.ts:21» در برابر «feature-registry-1.2.json»).

**کارهای مسدود شده (3)**:
- OQ-20: Essentia.js اندازه پشته WASM (محدودیت 512 مگابایت از «constants/scoring.ts» «WASM_HEAP_MB»).
- OQ-21: کوانتیزاسیون مدل TF.js (int8 در مقابل float32).
- OQ-22: پین کردن نسخه جاسازی MAEST (که برای فروشنده منتشر می شود).

**مجموع وظایف P05: همه TODO، 3 مسدود شده است.**