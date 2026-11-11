# فاز 2 - موتور Beat-Index

## ضربان قلب OTOMIX

«GridModel» («packages/core/src/grid/model.ts:14») ضربان قلب OTOMIX است. صدای خام را به یک خط زمانی بی‌نقص** تبدیل می‌کند - شبکه قفل‌شده مطلق. هر فاز پایین‌دستی (P03، P04، P08) «GridModel.t(i)» را مصرف می‌کند تا بداند «ضربه *i* در ثانیه‌های مطلق کجاست؟»

## اجزای اصلی

| جزء | File | Purpose |
|-----------|------|---------|
| **GridModel** | `grid/model.ts:14` | Piecewise grid: segments of `(startBeat, bpmSeed, T0, delta)`. Binary search lookup (`findSegment`), state machine (`LOCKED` ↔ `RECOVERY`). |
| **توفی** | `grid/t-of-i.ts:28` | The bridge: `t(i) = T0 + n × (60 / bpmSeed) + delta`. Clamps `delta` to `±DRIFT_MAX_S` (±0.05 s) and increments `deltaClampedCount` counter. |
| **همگام سازی لنگر** | `grid/anchor-sync.ts:5` | `ANCHOR_SYNC_INTERVAL_BEATS = 64` (16 bars × 4 beats). `getSyncedDrift(beat, driftPerBeat)` computes piecewise drift: linear before first sync, held at measured error between syncs, clamped to `±DRIFT_MAX_S`. |
| **حدود دوره** | `grid/period.ts:13` | `boundPeriod(measured, seedPeriod)` constrains to `[PERIOD_MIN, PERIOD_MAX] × seedPeriod` = `[0.95, 1.05] × seedPeriod` (inclusive). |
| **محاسبات ساختاری** | `timing/structure.ts:8` | Zero-RAM: `floorMod`, `beatInBar`, `barIndex`, `blockPosition`, `isBlockBoundary`. All O(1), no allocation. |
| **زمان بندی کوانتومی** | `timing/quantum.ts:12` | `quantumSeconds(bpm) = (60/bpm)/24`, `quantumIndex(beatFloat) = round(beatFloat × 24)`. 1/24-beat resolution. |
| **نقشه قبل از ضربه** | `grid/prekick-map.ts:8` | Negative indices (i ≤ -1) map to pre-kick audio via piecewise segments. Binary search + backward walk. Beat 0 is explicitly rejected (§3.10). |

## متغیر بحرانی

**`t(i)` در کل آهنگ کاملاً یکنواخت است.**
برای هر «i < j»: «t(i) < t(j)». این به این دلیل است که:
- «دوره = 60 / bpmSeed > 0» (BPM ∈ [60, 200] از طریق «BPM.parse»).
- «دلتا» به «0.05±» ثانیه بسته می‌شود، اما «دوره ≥ 0.3» ثانیه (در 200 BPM)، بنابراین «دوره > 2 × DRIFT_MAX_S».
- همگام‌سازی لنگر، رانش را به خطای *اندازه‌گیری شده* بازنشانی می‌کند و هرگز فراتر از «DRIFT_MAX_S» نمی‌رود.

## اثبات تست

| مجموعه تست | Count | What It Proves |
|------------|-------|----------------|
| P02-IT | 15 | `tOfI` clamp + counter, `boundPeriod` edges, anchor sync at beats 64/128/192, structural arithmetic table, quantum math, pre-kick map binary search, GridModel recovery transition. |
| X-P02-P03 | 6 | GridModel output feeds Dual Grid, phase offset, transition planner. |

**مجموع وظایف P02: 17/18 کامل، 1 مسدود شده (OQ-07).** کار مسدود شده (`P02-T05-S01-M02`) مربوط به یک مورد لبه در بازیابی شبکه غیرفعال است که نیاز به تصمیم گیری مشخصات دارد.