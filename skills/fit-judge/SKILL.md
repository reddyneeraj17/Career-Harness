<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: fit-judge
version: "1.4.0"
description: Scores job-description fit against targeting and the years matrix; below threshold it rejects. Emits the structured stack tags the tailor consumes.
---

# Fit Judge

> Changelog 1.4.0: At-threshold with no flag advances — `score >= threshold` and no other flag → `pass` (no more operator-review holds on bare at-threshold scores). Holds are reserved for flag situations only: at/above threshold with a flag, or below threshold with a flag worth a human look. Every `hold` carries its retry/advance path in `reasons` (`retry_path: ...`).
> Changelog 1.1.0: `years_matrix` null/absent → verdict `hold` ("years_matrix absent from profile — cannot score fairly"); never score against an empty matrix.
> Changelog 1.3.0: requirement-tier heuristics (must-have vs nice-to-have), `evidence.keyword_frequency`, `evidence.fit_band` labels, `evidence.red_flags` lexicon (flag, never auto-reject).

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

## Requirement classification

Before scoring, classify each extracted requirement as **must-have** or
**nice-to-have** using these heuristics (document the call in
`evidence.requirement_tier` per tag):

- **Language cues.** "Must have", "Required", "Essential", "Non-negotiable"
  → must-have. "Nice to have", "Bonus", "A plus", "Preferred",
  "Familiarity with" → nice-to-have.
- **Mention frequency.** A skill or tool mentioned 3+ times across the JD
  is treated as must-have regardless of hedging language.
- **Unmarked requirements** in a "Requirements"/"Qualifications" section
  default to must-have; items under "Preferred"/"Bonus" default to
  nice-to-have.

## Keyword frequency

Build `evidence.keyword_frequency`: a map of skill/tool keyword → count of
mentions in `jd_text` (e.g. `{"sql": 5, "spark": 3, "dbt": 1}`). Count
case-insensitively, whole-word. This is a prioritization input for
`resume-tailor` (high-frequency JD keywords get placement priority) — not a
score component on its own.

## Fit bands

Emit `evidence.fit_band` alongside the numeric score:

- `>= 75` → `excellent`
- `60–74` → `good`
- `50–59` → `stretch`
- `< 50` → `under`

Bands are labels only — the `pass`/`reject` decision still follows
`score >= threshold` (default 60). The coordinator may prioritize
`excellent`-band postings within a run, but never uses the band to pass a
row below threshold.

## Red-flag lexicon

Scan `jd_text` for these phrases and emit `evidence.red_flags` as
`[{phrase, category}]`. Red flags are surfaced in the posting verdict for
the operator — they **never** auto-reject a posting.

- **Workload:** "wear many hats", "hit the ground running", "fast-paced
  environment" (combined with understaffing signals), "do more with less",
  "nights and weekends", "always on".
- **Culture:** "rockstar", "ninja", "guru", "like a family", "we work hard
  and play hard", "no 9-to-5".
- **Compensation:** "competitive salary" with no range given,
  "equity-heavy", "unpaid" outside an internship lane, "commission-only".

Quote the exact phrase found; one entry per distinct phrase.

## Output

Return ONLY the verdict envelope JSON:

```json
{"skill":"fit-judge","version":"1.4.0","verdict":"pass|reject|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"seniority_match":true,"industry_match":true,"skill_gaps":["kubernetes"],"threshold":60,
  "required_stack":["spark","delta lake","python"],
  "nice_to_have":["kubernetes"],
  "requirement_tier":{"spark":"must-have","kubernetes":"nice-to-have"},
  "keyword_frequency":{"sql":5,"spark":3,"dbt":1},
  "fit_band":"good",
  "red_flags":[{"phrase":"wear many hats","category":"workload"}],
  "seniority_signals":["staff","tech lead"]},"tokens":1234}
```

- `score >= threshold` **and no other flag** → `pass`. An at-threshold score (e.g. exactly 60) with no flag advances — never held for operator review on the number alone.
- `score >= threshold` **with a flag** (red flag, seniority doubt, thin JD section, or any other concern) → `hold`; `reasons` names the flag and carries `retry_path: operator may advance if the flag is acceptable`.
- `score < threshold` **and no flag** → `reject`; `reasons` must name the failing dimensions.
- `score < threshold` **with a flag** worth a human look → `hold` (not a silent reject); `reasons` names the flag and the failing dimensions and carries `retry_path: operator may advance if the flag is acceptable, else reject`.
- JD text missing or too thin to score → `hold`, never a guess; `reasons` carries `retry_path: re-run after jd-fetch recovers usable text`.
- `years_matrix` null/absent entirely → `hold` with reason "years_matrix absent from profile — cannot score fairly" and `retry_path: repopulate years_matrix in the profile, then re-screen`. Do NOT score against an empty matrix (that would turn every must-have into a gap and mass-reject).
- **Every `hold` must carry its retry/advance path.** A hold with no path is a silent drop — encode the path in `reasons` as `retry_path: ...`.

## Hard limits

- Never invent years of experience. Skill coverage is checked against `years_matrix` only; a must-have skill absent from the matrix counts as a gap, not as zero-with-a-guess.
- If `years_matrix` is null/absent entirely, return `hold` — never substitute an empty matrix, and never fabricate per-skill years to fill it.
- Score is decomposable: seniority match, industry match, must-have coverage. Put the breakdown in `evidence` so a rejection is explainable.
- Do not lower the threshold to pass a row — the threshold comes from Inputs. A row exactly at threshold with no flag passes per the Output rules above; a row at threshold with a flag is `hold` with reasons and its retry path, not a quiet pass.
- `required_stack`, `nice_to_have`, and `seniority_signals` are derived from `jd_text` only — never enriched from knowledge of the company. Quote the JD phrasing each tag came from when ambiguous. The coordinator passes `required_stack` to `resume-tailor`.
- No personal data lives in this file; all customer facts arrive via Inputs.
- Append exactly one `event_log` row on exit. No state transitions — the coordinator owns them.
