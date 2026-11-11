# فاز 7 - مصرف محلی و مدیریت پرونده خصمانه

## آنچه P07 ارائه می دهد

P07 قفل هوایی ** است - هر فایل بارگذاری شده توسط کاربر قبل از لمس خط لوله تجزیه و تحلیل از اینجا عبور می کند.

| جزء | Technology | Responsibility |
|-----------|------------|----------------|
| **رمزگشا** | Worker threads (off main thread) | MP3 (libmpg123/WASM), WAV (PCM), FLAC (libflac/WASM). Output: `Float32Array` at 44.1 kHz mono. |
| **دوباره برداری** | `content_sha256` (Web Crypto API) | Stream hash during decode. If hash exists in catalog → reject duplicate, return existing track ID. |
| ** رسیدگی به پرونده خصمانه ** | Size limits, timeout, sandbox | Max 500 MB / 10 min. Decode timeout 30 s. Worker terminated on OOM or hang. |
| **اعلامیه کپی رایت** | UI modal + signed attestation | User must declare rights before ingestion completes. Stored as metadata on track. |

**ورودی**: «فایل» / «بلوب» بارگذاری شده توسط کاربر.
**خروجی**: "Float32Array" + "content_sha256" → P05 Feature Extraction رمزگشایی شده است.

**کار مسدود شده (1)**:
- OQ-11: بیانیه حق نسخه برداری جریان UX - صفحه مودال در مقابل صفحه جداگانه، نسخه قانونی متن.

**مجموع وظایف P07: همه TODO، 1 مسدود شده است.**