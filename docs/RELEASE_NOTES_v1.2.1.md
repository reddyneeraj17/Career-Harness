# Release v1.2.1 — 2026-09-26

Patch release that completes the v1.2.0 feature set and fixes the upgrade path.

## Fixed

- **v1.2.0 feature completion.** The 1.2.0 skills called dashboard actions
  that were never implemented in the kit. This release adds the missing
  implementation:
  - Migration `0007_verdicts_reasons_prep.sql`: new `posting_verdicts`
    table (one row per posting per stage `scout`/`screen` per run),
    `applications.status_reason`, `applications.talking_points_path`.
  - New actions: `posting_verdict`, `talking_points_attach`, optional
    `reason` on every `app_transition`, `file_open` kind `"prep"`.
  - Snapshot: `reason`, `talking_points_path`, `prep_exists` on the
    applications ledger; `verdicts` per run on the runs view.
  - Dashboard: Reason line + Talking points cell on application rows,
    posting-verdict details on run rows.
- **Full-sync upgrade playbook.** `upgrade.sh` never rebuilt the dashboard,
  so new UI and actions stayed dead after an upgrade. It now prints the
  dashboard rebuild as a required agent step, and the new
  `docs/UPGRADE_PLAYBOOK.md` documents the complete order: fetch kit →
  refresh code → migrations in order → rebuild/redeploy dashboard →
  recompile schedules → doctor green, with verification checklist and
  rollback notes.

## Upgrade

Customers on 1.2.0: follow `docs/UPGRADE_PLAYBOOK.md` to move to 1.2.1.
Customer data (profile, applications, history) is untouched; no
re-entry required.
