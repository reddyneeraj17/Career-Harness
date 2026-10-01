# UPGRADE_PLAYBOOK.md — full-sync upgrade between kit versions

> **PROPRIETARY — Career Harness © 2026 Neeraj Reddy.** Licensed customers only.

This is the complete, ordered procedure a customer's Muse follows to move an
installed harness-kit from one version to another. Every step matters: skip
the artifact rebuild and the dashboard silently runs old code; skip the
migrations and new actions fail at runtime. **An upgrade is not complete
until the doctor is green.**

## 0. Before you start

- Confirm the target version with the customer (e.g. `1.3.2`).
- Confirm you have EITHER the customer's read-only token (`HARNESS_TOKEN`
  in the Secure store — the same token as the install; it stays valid
  across releases until it expires or is revoked) OR the release tarball
  `harness-kit-<version>.tar.gz` + its `.sha256`.
- Never invent the kit contents. If you cannot fetch the real kit, stop and
  say so — do not stamp the version marker.

## 1. Fetch the new kit

**Path A — git (private repo, per-customer token over HTTPS):**
```bash
export HARNESS_TOKEN   # read from the Secure store; never from a file or chat
git -c credential.helper= \
  -c "http.extraHeader=Authorization: Basic $(printf 'x-access-token:%s' "$HARNESS_TOKEN" | base64 -w0)" \
  clone --quiet --depth 1 --branch v<version> \
  https://github.com/reddyneeraj17/Career-Harness.git /tmp/harness-kit-<version>
unset HARNESS_TOKEN
```
The token is used for this fetch only and never lands in `.git/config`
(`credential.helper=` disables caching; the header keeps it out of the
process list). A rejected token means the license expired or was revoked —
STOP and tell the maintainer; do not work around it.

**Path B — tarball:**
```bash
sha256sum -c harness-kit-<version>.tar.gz.sha256
tar xzf harness-kit-<version>.tar.gz -C /tmp
```
The tarball extracts to `/tmp/harness-kit-<version>/`.

## 2. Refresh code (idempotent)

Run the kit's upgrade script against the fetched kit:
```bash
/tmp/harness-kit-<version>/install/upgrade.sh <version>
```
This refreshes `~/workspace/skills/` and `~/workspace/templates/` from the
new kit (re-locked read-only afterwards) and compares the installed version
marker. It does NOT yet touch the database or the dashboard — those are
agent steps below.

## 3. Run pending migrations (in order)

For each NEW file in `<kit>/harness-core/drizzle/*.sql` (filename order)
that is not yet applied to the live database: apply it through the
artifact's migration path, then verify with `snapshot()`.

- Migrations are additive and ordered (17 files as of v1.3.2 — apply every
  file in `harness-core/drizzle/` in filename order). Never skip one.
- After the last migration, confirm the new tables/columns exist
  (e.g. `posting_verdicts`, `applications.status_reason`).

## 4. Refresh reference seeds

For each seed CSV in `<kit>/seed/`, upload it to a fetchable URL and call
the matching import action with `{"csv_url": ...}`:

- `companies_import` ← `seed/companies_seed.csv`
- `h1b_import` ← `seed/h1b_employer_hub.csv`
- `prime_vendors_import` ← `seed/prime_vendors.csv`

Imports are idempotent upserts (insert new rows, update changed ones, never
duplicate), so re-running them over the customer's existing data is safe.
Run them AFTER the migrations in step 3 — the tables must exist first —
then verify the row counts with `snapshot()`. Without this step the customer
keeps their old seed data and never receives refreshed datasets.

## 5. Rebuild and redeploy the dashboard app

The upgrade script does not touch the running dashboard. Rebuild the
`harness-core` artifact from `<kit>/harness-core/` source (client + server)
and redeploy it over the existing app. This is what makes new UI (date
slicer, reason column, verdict details, prep viewer) and new actions
(`posting_verdict`, `talking_points_attach`, `file_open` kind `"prep"`)
actually live. The database is untouched by the rebuild — history survives.

## 6. Recompile schedules from the customer's profile

Run the `compile-schedules` skill against the customer's
`~/workspace/profile.yaml` (validated by `profile.schema.yaml`). This picks
up any new or changed campaign cadences in the release. The customer's
answers and data are never re-entered.

## 7. Doctor must be green

Run the `harness-doctor` skill. Require status green before closing the
upgrade. If the doctor reports anything amber or red, fix it — a half-
upgraded install is worse than no upgrade.

## 8. Sync verification checklist

- [ ] `VERSION.installed` matches the target version.
- [ ] `install.sh --check` passes with 0 failures on the fetched kit.
- [ ] All pending migrations applied; `snapshot()` reads clean.
- [ ] Reference seeds re-imported; `snapshot()` row counts match the new
      kit's datasets (companies / h1b_sponsors / prime_vendors).
- [ ] Dashboard rebuilt from the new source; new UI/actions present
      (open the Applications tab, confirm the Reason line; open a run,
      confirm posting verdicts).
- [ ] Schedules recompiled; `schedules_manifest.json` current.
- [ ] Doctor green.

## Rollback

Run this playbook again with the older version. Migrations are additive, so
rolling back code never deletes data — new columns/tables simply go unused
by the older code.
