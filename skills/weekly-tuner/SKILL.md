<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: weekly-tuner
version: "1.0.0"
description: Weekly read-only tuning review — gathers reply rates, caps, parks, and token efficiency from snapshots, and drafts tuning suggestions for the operator. Suggests, never applies.
---

# weekly-tuner

## Why this exists

The weekly-review cron body carried real procedure inline (gather metrics,
draft tuning suggestions), contradicting the kit's architecture where skills
are the logic layer and bodies are thin. This skill holds that logic; the
body just invokes it.

## Inputs

```json
{
  "run_id": "run-2026-09-26-001",
  "week_start": "2026-09-21",
  "token_target_ratio": 0.6
}
```

`token_target_ratio` is the efficiency target: ≤ 60% of v1 tokens per
submitted application (from the profile).

## Procedure

1. **Gather (read only).** Use `snapshot()` views: runs, applications,
   replies, resumes for the week.
   - Reply rate by source (campaign), by resume variant, by company tier.
   - Caps actually hit, parks by portal/ATS, judge override counts.
   - Token spend vs target (`token_target_ratio` × v1 baseline per
     submitted application).
2. **Tune (suggest, do not apply).** Draft tuning suggestions only:
   threshold nudges, cap changes, skill flags. 3 overrides on one judge
   rule → flag for the operator.
3. **Report.** One weekly tuning summary for the operator (see output).
   Corrections become profile.yaml edits, companies skip flags, or skill
   improvements via the learning loop — never silent notes in a log.

## Actions called

- `snapshot` — read-only reconciliation views.
- `event_log` — one row on exit with the verdict envelope and token count.

## Output

```json
{"skill":"weekly-tuner","version":"1.0.0","verdict":"pass",
 "score":0-100,"reasons":["..."],
 "evidence":{"week_start":"2026-09-21",
             "reply_rates":{"job_board":0.08,"career_portal":0.12},
             "caps_hit":["job_board:cap_per_day"],
             "parks_by_ats":{"workday":3},
             "token_efficiency":0.52,
             "suggestions":["Raise job_board cap_per_day 10→12; reply rate held steady."],
             "flags":[]},
 "tokens":1234}
```

## Hard limits

- **Read-only.** Never change profile.yaml, a cron body, or a skill.
  Suggestions are text; applying them is the operator's (or learning loop's)
  job.
- **Recommendations cite the snapshot() rows behind them** — every number in
  `evidence` traces to a row the skill read.
- **No invented baselines.** v1 token-per-application baselines come from
  measured history; if none exists yet, say so instead of estimating one.
