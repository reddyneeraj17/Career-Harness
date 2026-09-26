---
name: fit-judge
version: "1.2.0"
description: Scores job-description fit against targeting and the years matrix; below threshold it rejects. Emits the structured stack tags the tailor consumes.
---

# Fit Judge

> Changelog 1.1.0: `years_matrix` null/absent → verdict `hold` ("years_matrix absent from profile — cannot score fairly"); never score against an empty matrix.

Scores how well a job description matches the customer's targeting (seniority, industry, must-have skills vs. the years matrix). This is a verdict-only skill: it judges, the coordinator transitions.

## Inputs

```json
{
  "jd_text": "full normalized job description text",
  "targeting": {
    "seniority": ["senior", "staff"],
    "industries": ["fintech", "healthcare"],
    "must_haves": ["python", "spark", "aws"]
  },
  "years_matrix": {"python": 6, "spark": 4, "aws": 5},
  "threshold": 60
}
```

`threshold` defaults to 60 when omitted. `years_matrix` is the source of truth for experience — it comes from the profile, never from inference. It may be null/absent when the profile has no years matrix.

## Actions called

- `event_log` — one row on exit with the verdict, score breakdown, and token count. Nothing else. This skill never writes to `applications` or any other table.

## Output

Return ONLY the verdict envelope JSON:

```json
{"skill":"fit-judge","version":"1.2.0","verdict":"pass|reject|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"seniority_match":true,"industry_match":true,"skill_gaps":["kubernetes"],"threshold":60,
  "required_stack":["spark","delta lake","python"],
  "nice_to_have":["kubernetes"],
  "seniority_signals":["staff","tech lead"]},"tokens":1234}
```

- `score >= threshold` → `pass`.
- `score < threshold` → `reject`; `reasons` must name the failing dimensions.
- JD text missing or too thin to score → `hold`, never a guess.
- `years_matrix` null/absent entirely → `hold` with reason "years_matrix absent from profile — cannot score fairly". Do NOT score against an empty matrix (that would turn every must-have into a gap and mass-reject).

## Hard limits

- Never invent years of experience. Skill coverage is checked against `years_matrix` only; a must-have skill absent from the matrix counts as a gap, not as zero-with-a-guess.
- If `years_matrix` is null/absent entirely, return `hold` — never substitute an empty matrix, and never fabricate per-skill years to fill it.
- Score is decomposable: seniority match, industry match, must-have coverage. Put the breakdown in `evidence` so a rejection is explainable.
- Do not lower the threshold to pass a row — the threshold comes from Inputs; borderline rows are `hold` with reasons, not quiet passes.
- `required_stack`, `nice_to_have`, and `seniority_signals` are derived from `jd_text` only — never enriched from knowledge of the company. Quote the JD phrasing each tag came from when ambiguous. The coordinator passes `required_stack` to `resume-tailor`.
- No personal data lives in this file; all customer facts arrive via Inputs.
- Append exactly one `event_log` row on exit. No state transitions — the coordinator owns them.
