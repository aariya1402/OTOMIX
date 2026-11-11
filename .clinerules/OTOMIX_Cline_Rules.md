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
