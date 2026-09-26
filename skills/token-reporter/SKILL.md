<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: token-reporter
version: "1.0.0"
description: Read-only token bookkeeping report — verifies every closed run has a measured token row, flags gaps and budget breaches, never writes or backfills.
---

# token-reporter

## Why this exists

Token numbers are measured once, by `run-coordinator`, via
`token_record` at run close (platform metering — never estimated). An older
cron body summed per-skill `event_log` counts and "backfilled" missing rows:
two writers, two methods, and the backfill was exactly the fabrication the
coordinator forbids. This skill is the single reader: it verifies and
reports. It writes nothing.

## Inputs

```json
{
  "run_id": "run-2026-09-26-001",
  "since": "2026-09-26T00:00:00-05:00",
  "soft_stop_budgets": {"morning_run": 1000000, "job_board": 2000000}
}
```

`soft_stop_budgets` are per-campaign token soft-stops from the profile; a
breach is reported, never enforced here.

## Procedure

1. **Gather (read only).** Via `snapshot()`: `runs` rows closed since
   `since`, their `token_usage` rows, and per-skill `event_log` token counts
   for cross-checking.
2. **Verify.** Every closed run should have exactly one `token_usage` row
   with `usage_reported=true`, or an explicit unreported row
   (`usage_reported=false`, shown as "—"). Flag: closed runs with no token
   row at all; rows whose totals disagree wildly with the summed skill
   events (possible double-count); duplicate rows for one run.
3. **Budget check.** Sum measured tokens per campaign since `since`;
   report any campaign past 90% of its soft-stop budget.
4. **Report.** Findings go in the output envelope and the report rule below.
   This skill never calls `token_record`, never touches the jsonl bridge,
   never backfills.

## Actions called

- `snapshot` — read-only reconciliation views.
- `event_log` — one row on exit with the verdict envelope and token count.

## Output

```json
{"skill":"token-reporter","version":"1.0.0","verdict":"pass|hold",
 "score":0-100,"reasons":["..."],
 "evidence":{"runs_checked":14,"runs_missing_rows":["run-…"],"budget_breaches":[]},
 "tokens":1234}
```

- `pass` → every closed run accounted for, no breaches.
- `hold` → missing rows or a budget breach — surfaced to the operator, who
  decides whether a re-measure is warranted. The reporter itself changes
  nothing.

## Hard limits

- **Read-only.** No `token_record`, no bridge writes, no backfill — a missing
  number is reported, never invented or reconstructed from event sums.
- **One writer exists** (`run-coordinator` → `token_record`); this skill is
  not a second one.
- **Unreported is honest.** A run marked `usage_reported=false` is complete
  bookkeeping — do not flag it as an error, only list it.
