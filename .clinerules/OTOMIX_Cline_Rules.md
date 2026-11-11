# OTOMIX Cline Rules

1. Language: All explanations must be in English. All code and code comments must be in English.
2. Prompt ID: Every report you generate must include the current Prompt Number/ID at the top.
3. Source of Truth: The TODO file (`Docs/OtoMix Todo-Plan/OTOMIX_MicroTask_Plan.md`) and Architecture Spec (`Docs/OTOMIX_Architecture_Spec.md`) are the absolute reference at all times. You must not go beyond the defined tasks.
4. Plan First: Always provide a plan before taking action.
5. No Summarization: Summarization is strictly forbidden. If a task is too long, break it into shorter, manageable steps.
6. Master Dump: Create a "Master Dump" file/process. After every change, take a dump of the entire project that includes all changes. Every dump file must have an ID number and date in its name so we can track which file changed at which stage.

### SKILL USAGE (MANDATORY — RULE 20)
1. You MUST actually invoke and USE every skill listed in the `/system skill activate` line at the top of this prompt.
2. Do NOT just acknowledge them — apply their methodologies to your inspection and plan.
3. In your final report, add a section called `## SKILLS USED` listing each activated skill with one line: what it contributed to this task.
4. If you cannot use a skill (e.g., it doesn't apply to this task), state why explicitly: `SKIPPED: <skill-name> — reason`.
5. Failure to include `## SKILLS USED` in the report = incomplete report, rejected by orchestrator.
## Rule 20 — Skill Usage & Reporting (MANDATORY)

When a prompt contains a `/system skill activate ...` line, you MUST:

1. Actually apply every activated skill to the task. Do not merely list it.
2. In the final report, add a dedicated section titled `## SKILLS USED`.
3. Under this section, list each skill and one line explaining its contribution.
4. If a skill was activated but not applicable, write: `SKIPPED: <skill-name> — <reason>`.
5. A report without the `## SKILLS USED` section is incomplete and must be rejected by the orchestrator.
6. Do not activate forbidden skills from Section 9.9.


## Rule 21 — Skill Registry & Auto-Detection (MANDATORY)

Before starting ANY task (reading files, planning, or coding):

1. Read the task description and classify its domain.
2. Select 3–8 relevant skills from the authoritative registry in Section 19 (9.1–9.9).
3. Always include the three core skills:
   - otomix-agent
   - code-reviewer-auditor
   - token-optimization-specialist
4. Activate the selected skills at the top of your response:
   `/system skill activate <skill-a> <skill-b> ...`
5. Use the skills during inspection, planning, and implementation.
6. In the final report, include the `## SKILLS USED` section required by Rule 20.
7. Never activate skills listed in Section 9.9 (Forbidden Skills).
8. If the task domain changes mid-task, re-evaluate and activate additional relevant skills.
## Section 19 — Skill Registry (9.1–9.10)

---

## Rule 25 — Mixability-First Architecture (CORE MISSION)

**The primary mission of OTOMIX is SET BUILDING, not mixing.**
From a library of hundreds of tracks, the Set Builder selects a subset
that is mutually mixable and orders them into a set. Mixing happens ONLY
after selection.

### The Mixability Parameter (first-class, alongside BPM / Energy / Grid / Camelot)

Every track receives a `mixability_score` ∈ [0, 1]. A track's mixability
score is computed from (at minimum):

1. **BPM stability** — histogram variance over the analysis window. A track
   with varying BPM has low stability.
2. **Kick-grid lock accuracy** — fraction of beats where the detected kick
   aligns to the grid within tolerance. Drifting kicks reduce this score.
3. **Audio quality / clarity** — bit depth, sample rate, presence of
   artifacts, dynamic range, clipping.
4. **Camelot key compatibility** — match against the current set endpoint.
5. **Energy profile fit** — match against the set's energy target.
6. **Vocal presence alignment** — match against the set's vocal profile.

Additional factors can be added later. The list above is a baseline, not
an exhaustive set.

### The Red Line

**If a track scores LOW on mixability, it MUST NOT enter the set.**
The system does not attempt to "fix" a low-mixability track to force it
into a set. There is no drift compensation, no tempo warping, no kick
realignment, no quality repair for a track that failed mixability.

**The owner's stated priority:**
> "It is better to reject 270 tracks from a 300-track library than to
>  compromise the architecture for 1 broken track."

### Consequence for the Pipeline

- **P05 (Feature Extraction)** MUST produce, for every analyzed track:
  - `bpm_stability` (histogram variance or equivalent)
  - `kick_lock_accuracy` (fraction of beats within grid tolerance)
  - `audio_quality_score` (bit depth / sample rate / artifacts / clipping)
  - `grid_type` (ATTACK_DOMINANT / BODY_DOMINANT, per §6 of AI Agent.MD)
  These values feed the `mixability_score` computation.

- **P08 (Set Builder / MixPlan)** is the CORE mission, not a UI phase.
  It computes `mixability_score` for every candidate track and filters out
  any track below the threshold BEFORE any transition is planned.
  Recommendation scoring MUST include mixability as a first-class term,
  with a weight no lower than the weights of energy / grid / camelot.

- **P04 (DSP Port)** assumes every incoming track that reaches the mixer
  has ALREADY been vetted by the Set Builder. P04 does NOT attempt to
  repair a broken grid — if a broken track somehow reaches P04, the
  correct behavior is to emit `RUNG_STANDARD_CROSSFADE` (plain 4-bar
  fade) and warn, not to compensate.

### If the user manually forces a low-mixability track into the set

The system MUST:
1. Show a prominent warning with the specific mixability factors that failed.
2. For the affected transition, fall back to `RUNG_STANDARD_CROSSFADE`.
3. NOT engage micro-chopping, drift compensation, or any repair on that
   track.

### Enforcement

1. This rule cannot be relaxed without explicit written owner approval.
2. Any code, test, or plan that assumes "we will fix a broken track" is a
   RED LINE VIOLATION and must be corrected.
3. Every Cline prompt that touches P05 or P08 MUST include this rule in
   its CONTEXT block.

---

## Rule 26 — Beat-Index Absolute (RED LINE, non-negotiable)

This rule is an ABSOLUTE RED LINE. It cannot be relaxed, bypassed, or
deferred without explicit written owner approval.

### The Rule

In OTOMIX, the ONLY unit of musical time is the BEAT (and its subdivisions).
There is NO such thing as "seconds" inside the musical domain. Seconds exist
ONLY at two boundaries:

1. **Web Audio API boundary**
   - AudioContext.currentTime
   - AudioParam.setValueAtTime / linearRampToValueAtTime
   - setTimeout
   - sampleRate, buffer sizes (number of samples)
   - AudioBufferSourceNode.start(when, offset, duration) — the when, offset,
     and duration parameters are seconds at this API call.

2. **File I/O boundary**
   - File metadata duration (ffprobe / HTMLAudioElement.duration)
   - File seek positions

### Forbidden

- Any identifier ending in _MS, _S, _ms, _s in packages/core/src/
  (except the explicitly allowlisted Web Audio boundary constants:
  LOOKAHEAD_MS, SCHED_ACCURACY_MS, STARVATION_FRAME_MS,
  PORT_LATENCY_MS, ANALYSIS_TIMEOUT_MS, EXTRACTION_ALERT_MS,
  OBSERVER_CYCLE_MS, DEFAULT_BASE_MS, DEFAULT_CAP_MS).
- Any identifier named *Seconds (camelCase) except the explicitly
  documented bridge functions.
- Any function parameter or return value in seconds that flows through
  internal musical logic — drift, realignment, tempo, grid, transition
  planning, crossfade, chopping, groove.
- Any variable or local named driftSeconds, beatPeriodSeconds,
  swingDeltaSeconds, crossfadeMs, deltaPhiMs, or similar.
- Any internal computation of the form beats * (60 / bpm) to obtain
  seconds — that conversion is ONLY allowed inside tOfI or at the
  DSP Port output boundary.

### Allowed Bridges (the only functions that know about seconds)

- tOfI(beatIndex, T0, bpm, deltaQuanta) — beat index to absolute timestamp
  in seconds. This is the sole beat-to-seconds conversion function in the
  codebase. Its return value is consumed ONLY at the DSP Port output or in
  file-position contexts.
- quantumSeconds(bpm) — returns (60 / bpm) / QUANTUM_DIVISOR. The
  seconds-per-quantum helper. Used only inside bridge functions.
- T0 (in TrackGridParams, TransitionPlan.tInSeconds/tOutSeconds/
  alignToSeconds) — represents a FILE POSITION in seconds. It is
  BOUNDARY_IO, not a musical quantity. It is never used in any internal
  beat/quanta arithmetic — only passed to tOfI or to the DSP Port.
- AudioBufferSourceNode.start(when, offset, duration) parameters at the
  DSP Port output — the final conversion point.

### Rule of Thumb

If you are inside any of grid/, transition/, observer/, groove/,
anchor/, timing/, dsp/, glide/, resilience/, telemetry/,
constants/, types/ — and you write the word seconds, sec, ms,
or millisecond in a variable name, function parameter, return type, or
internal computation — you are violating this rule.

The only places the word seconds is allowed are:
- Function parameters that are explicitly BOUNDARY_WEB_AUDIO (e.g.
  contextTimeSeconds in computeDrift).
- Function parameters or return values that are explicitly BOUNDARY_IO
  file positions (e.g. T0).
- Doc comments describing a bridge function.

### Owner's statement

> "Except for the Web API boundary (AudioContext, AudioParam, sampleRate,
>  buffer sizes, setTimeout), there is NOTHING in the project called seconds.
>  Everything is in beats. If a track's kick cannot be locked to a beat, we
>  REJECT it from the set — we do NOT try to fix the track or compensate
>  with drift."

### Enforcement

1. Every micro-task touching packages/core/src/ MUST be verified against
   this rule before commit.
2. Any Cline analysis, prompt, or plan that introduces a new _MS / _S /
   *Seconds identifier in internal musical logic is a RED LINE VIOLATION.
3. Any violation found in code review requires a fix in the SAME commit or
   a dedicated follow-up commit — never deferred without owner approval.
4. Violations of this rule cannot be closed without explicit written owner
   approval.