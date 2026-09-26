# GOAL: career_portal — Career-portal sweep

## Contract
- **Does:** sweeps target companies (by tier/industry from the companies table)
  through their careers pages with ATS detection, screens each posting through
  the judge skills, picks and tailors a resume variant, holds it at the
  resume-reviewer gate, then applies via the per-ATS portal playbook
  (workday / greenhouse / lever / ashby / icims / generic) and verifies.
- **Caps:** per_run={{profile.caps.per_run}}, per_day={{profile.caps.per_day}},
  max concurrent appliers={{profile.caps.appliers}} (from profile.yaml —
  enforced in SQL by app_claim, not by prompt).
- **Skill chain:** career-portal-sweep → eligibility-judge + h1b-judge + fit-judge
  → resume-picker → resume-tailor → resume-reviewer → screening-answerer →
  portal-navigator (per-ATS playbook) → verify.

## Schedule
- One compiled cron body (daily 14:20 CT, America/Chicago).
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
- Skip-listed companies are never fetched; 3 parks on one company → skip flag.
