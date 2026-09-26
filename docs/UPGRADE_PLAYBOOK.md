# UPGRADE_PLAYBOOK.md — full-sync upgrade between kit versions

> **PROPRIETARY — Career Harness © 2026 Neeraj Reddy.** Licensed customers only.

This is the complete, ordered procedure a customer's Muse follows to move an
installed harness-kit from one version to another. Every step matters: skip
the artifact rebuild and the dashboard silently runs old code; skip the
migrations and new actions fail at runtime. **An upgrade is not complete
until the doctor is green.**

## 0. Before you start

- Confirm the target version with the customer (e.g. `1.2.1`).
- Confirm you have EITHER git access to the private repo (one-time deploy
  key, revoked after the install) OR the release tarball
  `harness-kit-<version>.tar.gz` + its `.sha256`.
- Never invent the kit contents. If you cannot fetch the real kit, stop and
  say so — do not stamp the version marker.

## 1. Fetch the new kit

**Path A — git (private repo, one-time deploy key):**
```bash
git clone --branch v<version> <repo-url> /tmp/harness-kit-<version>
```
Use the key only for this fetch. The key is revoked after the upgrade.

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

- Migrations are additive and ordered (`0001` → `0007` …). Never skip one.
- After the last migration, confirm the new tables/columns exist
  (e.g. `posting_verdicts`, `applications.status_reason`).

## 4. Rebuild and redeploy the dashboard app

The upgrade script does not touch the running dashboard. Rebuild the
`harness-core` artifact from `<kit>/harness-core/` source (client + server)
and redeploy it over the existing app. This is what makes new UI (date
slicer, reason column, verdict details, prep viewer) and new actions
(`posting_verdict`, `talking_points_attach`, `file_open` kind `"prep"`)
actually live. The database is untouched by the rebuild — history survives.

## 5. Recompile schedules from the customer's profile

Run the `compile-schedules` skill against the customer's
`~/workspace/profile.yaml` (validated by `profile.schema.yaml`). This picks
up any new or changed campaign cadences in the release. The customer's
answers and data are never re-entered.

## 6. Doctor must be green

Run the `harness-doctor` skill. Require status green before closing the
upgrade. If the doctor reports anything amber or red, fix it — a half-
upgraded install is worse than no upgrade.

## 7. Sync verification checklist

- [ ] `VERSION.installed` matches the target version.
- [ ] `install.sh --check` passes with 0 failures on the fetched kit.
- [ ] All pending migrations applied; `snapshot()` reads clean.
- [ ] Dashboard rebuilt from the new source; new UI/actions present
      (open the Applications tab, confirm the Reason line; open a run,
      confirm posting verdicts).
- [ ] Schedules recompiled; `schedules_manifest.json` current.
- [ ] Doctor green.

## Rollback

Run this playbook again with the older version. Migrations are additive, so
rolling back code never deletes data — new columns/tables simply go unused
by the older code.
