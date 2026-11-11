# فاز 8 - معماری MixPlan، UI و Redux

## آنچه P08 ارائه می دهد

P08 **محصول رو به روی کاربر** است: یک برنامه React 19 + Redux Toolkit که در آن کاربران مجموعه های DJ را می سازند، پیش نمایش می دهند و صادر می کنند.

| لایه | Technology | Purpose |
|-------|------------|---------|
| **جلو ** | React 19, TypeScript, Vite | Waveform canvas, timeline, track library, transition preview. |
| **ایالت** | Redux Toolkit + RTK Query | Normalized cache: tracks, features, mix plans, user prefs. Optimistic updates. |
| **توصیه** | Content-based (MAEST cosine) + Collaborative (implicit MF) | "Next track" suggestions with harmonic compatibility (Camelot wheel), energy flow, groove match. |
| **MixPlan** | DSL → JSON | Ordered track list + transition overrides (rung, crossfade duration, EQ snapshots). |
| **پیش نمایش** | Web Audio API → P04 DSP Port | Real-time preview of any transition in the plan. |

**ورودی**: کاتالوگ (از P05/P07) + هدف کاربر (کشیدن، رها کردن، دکمه "مخلوط هوشمند").
**خروجی**: `MixPlan` (JSON) + پیش نمایش درخواست های صوتی → P04.

**کارهای مسدود شده (2)**:
- OQ-09: توصیه شروع سرد - کاربر جدید بدون سابقه.
- OQ-24: نسخه سازی MixPlan DSL — سازگاری رو به جلو/عقب.

**مجموع وظایف P08: همه TODO، 2 مسدود شده است.**