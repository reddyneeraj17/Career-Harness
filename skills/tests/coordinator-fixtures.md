# Coordinator sweep — test fixtures (§2)

Fixtures for the run-coordinator backlog sweep (skill 1.16.0). Each fixture
gives a run-start situation; the coordinator's sweep decisions are the
expected output. C1 and C2 are validated live against the real skill.

## C1 — orphan recovery routing

Runs: `run_old` status `failed`; `run_cur` status `running` (this run).
Snapshot applications ledger:

| app_id | state    | run_id  | resume_path | resume_hash |
|--------|----------|---------|-------------|-------------|
| app_1  | applying | run_old | goals/c/h/f/run_old/screenshots/app_1.pdf | abc123 |
| app_2  | applying | run_old | null | null |
| app_3  | applying | run_cur | goals/c/h/f/run_cur/screenshots/app_3.pdf | def456 |

Expected:
- app_1 → `app_transition(applying → reviewed)`, reason starts
  `recovered from run_old (failed)` and notes the tailored resume on file.
- app_2 → `app_transition(applying → screened)`, reason starts
  `recovered from run_old (failed)` and notes never tailored.
- app_3 → untouched (its run is still `running`).
- One `event_log` row `orphan_recovery` naming app_1 and app_2.

## C2 — oldest-first sweep under a shared ceiling

`cap_per_run` = 10. Resume sweep already routed 2 `reviewed` rows to APPLY
(8 of ceiling remaining). Backlog (`created_at` ascending):

| app_id | state      | created_at |
|--------|------------|------------|
| b_1    | discovered | 2026-09-28T10:00Z |
| b_2    | screened   | 2026-09-28T11:00Z |
| b_3    | discovered | 2026-09-29T10:00Z |
| b_4    | parked     | 2026-09-27T10:00Z |
| b_5    | screened   | 2026-09-29T12:00Z |

Expected: sweep takes b_1, b_2, b_3, b_5 (oldest first; b_4 excluded —
parked is operator-owned). b_1, b_3 enter at JD-FETCH → SCREEN; b_2, b_5
enter at PICK (no re-screen). 4 of 8 remaining ceiling consumed → SCOUT may
claim at most 4 new postings. One `event_log` row `backlog_sweep` with the
4 app ids and `scout_budget_remaining: 4`.

## C3 — screened rows are never re-screened (regression)

A `screened` row swept from the backlog enters the pipeline at PICK. The
coordinator must not invoke eligibility-judge or fit-judge on it again; its
prior `selected_lane` (including a `defaulted to <lane>` reason) stands.

## C4 — attention states are operator-owned (regression)

Rows in `parked`, `blocked`, or `needs_me` are never swept, re-routed, or
claimed over, no matter how old. Only the customer (or `app_resume`) moves
them.
