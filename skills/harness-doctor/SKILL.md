<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: harness-doctor
version: "1.2.0"
description: Hourly health check over schedules, intents, approvals, runs, and disk; verifies, and finalizes orphaned run rows (never application state) via run_finalize_stale.
---

# harness-doctor

> Changelog 1.2.0: Orphan-run finalization — unclosed runs past 3h are force-closed via the new `run_finalize_stale` action (sets `ended`, status `failed`, diagnostic blocker, exit event). Application rows are never touched by the finalizer: discovered/screened rows stay retryable for the backlog sweep, stuck `applying` rows still go through the verify-only flow.

## Inputs

```json
{}
```

No inputs. The doctor reads only `harness-core` (via `snapshot`) and the scheduler. It runs hourly.

## Actions called

- `snapshot` — read-only: `health` view (drift, stale intents, aged approvals, unclosed runs, parked companies, H-1B data age, disk usage) and `overview` for fleet status. The health view returns real telemetry for every check below: `parked_companies` rows (park_count >= 3 with skip flag/reason), `h1b_refresh` (employer count, newest/oldest refresh timestamps and age in days), and `disk` (`available: true` with bytes_total/folder_count/over_2gb/prune_candidates from the confined `hiddenFilesDiskUsage` contract; `available: false` with an explicit message only when telemetry fails — never silently omitted).
- `event_log` — one exit row with the verdict and the full findings list (required of every skill).
- Verify-only browser tasks — Muse platform primitives (not harness-core actions), spawned only for stuck `applying` rows: check the portal's applied-jobs list or the confirmation email, then transition to `submitted` or back to `reviewed`. Never click submit.
- `run_finalize_stale` — force-close runs left open past `max_age_hours` (default 3): sets `ended`, status `failed`, `blocker="orphaned: …"`, writes a `run_finalized_stale` event. Never touches application rows.

## Hourly checks

| Check | Trigger | Doctor action |
|---|---|---|
| Cron body-hash drift | saved body hash != `schedules_manifest.json` | report; never auto-recompile |
| Stuck intents | application in `applying` > 90 min | spawn verify-only task; transition on evidence; never re-submit |
| Aged approvals | approval unresolved > 24h | report in findings; include in next batch |
| Unclosed runs | run without `run_close` > 3h | call `run_finalize_stale` (max_age_hours=3); report finalized ids |
| Repeat parks | company `park_count` >= 3 | set skip flag + reason; enqueue operator review |
| H-1B data age | `h1b_sponsors` last refresh > 120 days | report; enqueue refresh run |
| Disk usage | `hidden_files` > 2 GB | report oldest run folders as prune candidates; never auto-delete |
| Store liveness | `snapshot()` fails | workers fall back to `spillover.jsonl`; report as red |

## Output

```json
{"skill":"harness-doctor","version":"1.0.0","verdict":"pass|hold|reject","score":0-100,
 "reasons":["1 stuck intent verified","body drift: nightly-job-applications"],
 "evidence":{"status":"green|amber|red","findings":[{"check":"stuck_intents","detail":"...","action":"verify-only task spawned"}]},
 "tokens":1234}
```

- `status: green` -> verdict `pass`, and the doctor stays silent (green -> silent).
- `amber` -> verdict `hold`: one message with the fired rows.
- `red` -> verdict `reject`: store unreachable, unresolved stuck intent, or body drift on a live campaign — one message with the fired rows and required operator action.

## Hard limits

- Never re-submit an application. Verification only; an unresolved intent is verified, never clicked again.
- Never edit cron bodies. Never auto-recompile schedules. Drift is reported, not fixed.
- Never delete files. Prune candidates are reported; the operator prunes.
- Never mark a stuck `applying` row `submitted` without confirmation evidence (screenshot string or confirmation email).
- The doctor reads; it does not tune, optimize, or "improve" the harness. The one repair it may perform is finalizing orphaned *run rows* via `run_finalize_stale` — never application rows, never a submit.
- No personal data in this file.
- Append one `event_log` row on exit, always.

## Changelog

- 1.2.0: orphan-run finalization — unclosed runs past 3h are force-closed via `run_finalize_stale` (sets `ended`, status `failed`, diagnostic blocker, exit event); application rows never touched.
- 1.1.0 (2026-09-29): health view now returns real parked-company rows, H-1B refresh min/max/age, and confined hidden_files disk usage (with explicit unavailable state on failure) — the checks this skill promised are backed by data.
