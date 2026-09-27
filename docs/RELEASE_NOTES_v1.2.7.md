# Release v1.2.7 — 2026-09-27

Fix release: upgrades now refresh the customer's reference seed data.

## Fixed

- **Seed refresh on upgrade.** `install/upgrade.sh` now includes a
  reference-seed step: after the pending migrations, the customer's agent
  uploads each seed CSV from the new kit and calls the matching import
  action with `{"csv_url": ...}` —
  `companies_import` ← `seed/companies_seed.csv`,
  `h1b_import` ← `seed/h1b_employer_hub.csv`,
  `prime_vendors_import` ← `seed/prime_vendors.csv`.
  The imports are idempotent upserts (insert new, update changed, no
  duplicates), so they are safe to re-run over existing data. Before this
  fix, upgrading (e.g. 1.2.4 → 1.2.6) left the database on the old seed
  data with no path to the refreshed full datasets.
- `docs/UPGRADE_PLAYBOOK.md` documents the new step 4 "Refresh reference
  seeds" (after migrations, before the dashboard rebuild) and adds seed
  row-count verification to the sync checklist.

## Upgrade notes

- Follow `docs/UPGRADE_PLAYBOOK.md` as usual. The new seed step runs
  between migrations and the dashboard rebuild.
- No migrations ship in this release; no blueprint PDF changes (packaging
  fix, no design change).
