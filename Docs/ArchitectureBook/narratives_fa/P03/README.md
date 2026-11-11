# فاز 3 - شبکه دوگانه و ناظر

## دو شبکه، یک جدول زمانی

P03 بر روی شبکه قفل مطلق P02 ساخته شده است تا **دو نمای ریتمیک مکمل** را از صدا استخراج کند، سپس آنها را در یک **ضمانت گذار جهانی** ترکیب می کند - طرح انتقالی که *هرگز لغو نمی شود*.

## شبکه حمله: شروع های گذرا

«extractAttackGrid()» در «packages/core/src/grid/attack.ts:13»:
- پنجره همینگ 2048 نمونه، 50% پرش (1024 نمونه).
- FFT → شار طیفی (دیفرانسیل مثبت قدر بالای 200 هرتز).
- میانه + 1.5× آستانه MAD، اوج گیری با حداقل جداسازی 1 پرش.
- شاخص های نمونه شروع حمله را برمی گرداند.

**چرا شار طیفی؟** *هر* شروع تیز (لگد، تله، هی-هت، صامت صوتی) را بدون توجه به زیر و بمی تشخیص می دهد. قطع 200 هرتز صدای زیر باس را که گذرا نیست نادیده می گیرد.

## شبکه بدنه: پیک انرژی زیر باس

«extractBodyGrid()» در «packages/core/src/grid/body.ts:14»:
- گذر پایین باترورث مرتبه چهارم در 80 هرتز («BODY_CUTOFF_HZ»، «BODY_FILTER_ORDER» از «constants/grid.ts:57–58»).
- پنجره کشویی RMS (5 میلی‌ثانیه، «BODY_RMS_WINDOW_MS»).
- پنجره جستجو (50 میلی‌ثانیه، «BODY_SEARCH_WINDOW_MS») در شروع حمله لنگر انداخته است.
- ** جبران تاخیر گروهی ** (`BODY_GROUP_DELAY_MS = 7.3` از `constants/grid.ts:63`) - پیک فیلتر شده *قبلتر* 7.3 میلی ثانیه جابجا می شود تا موقعیت اوج واقعی بدن گزارش شود.
- شاخص نمونه اصلاح شده حداکثر RMS زیر باند را برمی‌گرداند.

**چرا بادی گرید؟** درام های ضربه ای یک *حمله* گذرا (کلیک کنید) و به دنبال آن یک *بادی* فرعی* (بوم) دارند. بدن 10 تا 20 میلی‌ثانیه از حمله عقب می‌افتد (Δφ). شبکه حمله کلیک را پیدا می کند. Body Grid رونق را پیدا می کند. افست Δφ مسئله تراز فاز است.

## فاز آفست Δφ و هم ترازی کسینوس

"phaseOffset()" در "grid/phase-offset.ts:15": "Δφ = T_body_peak - T_attack_onset". مثبت = بدن پس از حمله (معمولی).

«cosineRealign()» در «grid/realign-cosine.ts:18»: درون یابی کسینوس 4 نواری (16 بیتی):
```
correction(n) = Δφ × (1 − cos(π × n / 16)) / 2
```
- "n = 0" → 0 ms تصحیح (شروع تنظیم مجدد).
- `n = 16` → Δφ ms تصحیح (پایان، کاملاً تراز شده).
- یکنواخت، صاف، شیب متوسط ​​≈ 1 میلی‌ثانیه بر ضرب وقتی Δφ = 16 میلی‌ثانیه است.

راه‌انداز: «shouldTriggerRealign()» در «grid/realign-trigger.ts:14» — وقتی RMS زیر باند خروجی <BODY_REALIGN_DBFS» (-40 dBFS) فعال می‌شود. تماس گیرنده **باید ** مطمئن شود که crossfade ابتدا کامل شده است.

## Runtime Observer: Drift، Degrade،Realign Log

| ناظر | File | Purpose |
|----------|------|---------|
| **دریفت** | `observer/drift.ts:15` | `computeDrift(gridTime, contextTime) = (context − grid) × 1000` → ms. Positive = context fast. Unit conversion (×1000) happens exactly once here. |
| **مقیاس** | `observer/scale.ts:10` | PI controller: `desiredRate = 1.0 − sign(drift) × GAIN × excess`. `GAIN = (0.02 × 1000) / (50 − 4) ≈ 0.435`. Rate clamped to `[RATE_MIN, RATE_MAX]` = `[0.98, 1.02]`. Slew limited to `RATE_SLEW_PER_S = 0.005` per second. |
| **تحقیر** | `observer/degrade.ts:14` | One-way buffer expansion: if `frameTimeMs > STARVATION_FRAME_MS (10)` → `BUFFER_DEGRADED (4096)`, emit `system.thread.starvation`. No auto-shrink. |
| **تراز مجدد گزارش** | `observer/realign-log.ts:7` | Logarithmic curve: `logRealign(n, Δφ) = Δφ × log1p(k × n/N) / log1p(k)` with `k = LOG_REALIGN_K = 3`, `N = 64` beats. Slower start, faster finish than cosine. |

## طبقه بندی کننده شیار

«classifyGroove()» در «groove/classify.ts:8» — 16 مقدار انحراف (یکی در هر نت 16 در یک حلقه 4 نواری):
1. **مستقیم**: همه `|dev| < STRAIGHT_VAR (0.02)».
2. **سه گانه**: موقعیت های فرد متناوب "±(1/3 − 1/4) = ±0.08333…"؛ حتی موقعیت های کوچک
3. **نوسان **: همه موقعیت‌های فرد مثبت، میانگین یکسان در «[SWING_MIN (0.05)، SWING_MAX (0.33)]». حتی موقعیت های کوچک
4. **نامنظم**: برگشتی.

حالت «{، اطمینان: 1.0، تغییر مکان؟ }`. توسط موتور خردکن P04 برای جابجایی مرزهای برش غیرضروری استفاده می شود.

## گارانتی انتقال جهانی: 7 پله + توری ایمنی

«TransitionRung» در «transition/types.ts:4» (7 مقدار):
```
RUNG_NONE                  // Normal: both tracks have kicks, grids lock
RUNG_STATIC_120_GRID       // Incoming kick-less → map to 120 BPM static grid
RUNG_SILENT_LOOP           // Outgoing too short (< 64 beats) → pad with silence
RUNG_FOUR_BAR_CROSSFADE    // Safety net: grid-independent 4-bar volume crossfade
RUNG_WSOLA_LEGACY          // Legacy WSOLA fallback (phase-coherence predicate fail)
RUNG_GROOVE_SHIFT          // Groove-aware slice boundary adjustment
RUNG_CHOP_SHED             // Load shedding: widen chop grid from 1/32 → 1/8
```

«planTransition()» در مسیرهای «transition/planner.ts:57»:
1. کوتاه خروجی (< 64 ضربه) → «RUNG_SILENT_LOOP» (خط 12).
2. در غیر این صورت، لنگرها را محاسبه کنید ← در صورت ورود بدون ضربه ← «RUNG_STATIC_120_GRID» (خط 69)، در غیر این صورت «RUNG_NONE» (خط 69).
3. **Catch-all**: هر پرتاب → `planSafetyNetCrossfade()` (خط 41) — **هرگز پرتاب نمی کند، همیشه طرح معتبر را برمی گرداند**.
4. **نگهبان نهایی**: اگر «alignToSeconds» یا «mappedBpm» غیر محدود → شبکه ایمنی (خط 88).

«TRANSITION_WINDOW_BEATS = 64» (از «constants/grid.ts:99»، برگرفته از «TRANSITION_WINDOW_BARS = 16 × BEATS_PER_BAR = 4»). «SAFETY_XFADE_BEATS = 16» (از «constants/grid.ts:101»، «SAFETY_XFADE_BARS = 4 × 4»).

## اثبات تست

| مجموعه تست | Count | What It Proves |
|------------|-------|----------------|
| P03-IT | 8 | Dual Grid extraction, Δφ cosine realignment, groove classifier, transition planner rung routing, safety net catch, observer drift/scale/degrade. |
| اموال | 10,000 pairings | `transition.property.spec.ts` — random track pairs, every planner output satisfies: `alignToSeconds` finite, `mappedBpm` ∈ [60, 200], rung ∈ 7 values, safety net never reached for valid inputs. |

**مجموع وظایف P03: 21/24 کامل، 3 مسدود شده (OQ-17، OQ-01، OQ-04).** کارهای مسدود شده مربوط به گزاره بازگشتی WSOLA، ریاضی مرز شیار تغییر، و کالیبراسیون آستانه ریزش است - همه به تصمیمات مربوط به مشخصات نیاز دارند.