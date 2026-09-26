# GOAL: email_scan — Email inbox triage

## Contract
- **Does:** scans the mailbox since the `conversations` watermark, classifies each
  inbound message, routes it by reply tier (auto_send / draft_for_review / never),
  and acts: one `replies` row per action (sent / auto_sent / held / skipped),
  citing the rule id (R1–R8). Rejections and interview invites matched to an
  application set `applications.outcome`.
- **Caps:** reply tiers from profile.yaml; watermark advances ONLY after the
  reply row is written.
- **Skill chain:** email-replier → (approval-judge on the 2h sweep for held items).

## Schedule
- One compiled cron body (hourly weekdays, America/Chicago).
- **The cron body is compiled by the compile-schedules skill — never hand-edit it.**
  To change behavior: edit profile.yaml, re-run compile-schedules, verify via
  cron.view + schedules_manifest.json.

## Directories
- `files/` — documents the customer asked for (Goals tab).
- `hidden_files/` — held draft files, pending-application trackers.
  Evidence only — never state.

## Applies to this campaign
- HOLD regardless of tier: salary numbers, specific call times, exclusivity,
  documents beyond the resume, sensitive-data asks, scam signals, anything
  outside R1–R8. Never send from a do-not-email contact.
- Every auto-sent reply cites its rule id — the approval judge audits citations.
