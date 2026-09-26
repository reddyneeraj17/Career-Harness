# GOAL: job_board — Job-board search

## Contract
- **Does:** searches job boards with the query builder (from profile targeting),
  ranks results, screens each posting through the judge skills, picks and tailors
  a resume variant, holds it at the resume-reviewer gate, then applies via the
  board apply path — or redirects into the portal-navigator playbook for the
  destination ATS — and verifies the submission.
- **Caps:** per_run={{profile.caps.per_run}}, per_day={{profile.caps.per_day}},
  max concurrent appliers={{profile.caps.appliers}} (from profile.yaml —
  enforced in SQL by app_claim, not by prompt).
- **Skill chain:** job-board-search → eligibility-judge + h1b-judge + fit-judge
  → resume-picker → resume-tailor → resume-reviewer → screening-answerer →
  portal-navigator (board or per-ATS playbook) → verify.

## Schedule
- One compiled cron body (nightly 23:20 CT, America/Chicago).
- **The cron body is compiled by the compile-schedules skill — never hand-edit it.**
  To change behavior: edit profile.yaml, re-run compile-schedules, verify via
  cron.view + schedules_manifest.json.

## Directories
- `files/` — documents the customer asked for (Goals tab).
- `hidden_files/<run>/` — run scratch: tailored PDFs, JD snapshots, screenshots,
  spillover.jsonl. Evidence only — never state.

## Applies to this campaign
- All writes go through harness-core actions. Intent before submit.
- CAPTCHA/SMS → park with checkpoint, never bypass.
