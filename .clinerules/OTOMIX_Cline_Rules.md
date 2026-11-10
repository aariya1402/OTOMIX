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
