# INSTALL.md — Job-Apply Harness installer runbook

Installs the harness into one customer's Muse environment. One customer = one
environment = one `harness-core`. **Re-running the installer is always safe**
(every step is idempotent: scaffold, copy, migrate, seed, compile, verify).

## Pre-reqs
- The kit directory (this one), including `skills/`, `templates/`,
  `goal-skeletons/`, `harness-core/` source, and `seeds/`.
- The operator has the customer's `profile.yaml` answers from intake.

---

## The 8 steps

### 1. Scaffold goal directories from skeletons
Copy each `goal-skeletons/<campaign>/` to `~/workspace/goals/<campaign>/`,
creating `crons/`, `files/`, `hidden_files/`, `briefs/`, `agent_notes/`,
`references/` under each. Re-running never overwrites a customer's `files/`.

### 2. Install the skill catalog
Copy `skills/` (18 versioned skills + READMEs) to `~/workspace/skills/`.
Skills carry zero personal data — the same catalog installs for every customer.

### 3. Build harness-core and run migrations
Build the `harness-core` fullstack artifact from `harness-core/` source
(client + server + dashboard tabs). Apply Drizzle migrations **in order**
(`harness-core/drizzle/`); never skip, never hand-edit a migration.
The dashboard tabs (Overview, Applications, Resumes, Runs, Replies, Profile) call
`snapshot()` as same-artifact actions — no cross-artifact calls.

### 4. Seed data
- `h1b_import`: load `seed/h1b_employer_hub.csv` (USCIS Employer Data Hub)
  + the LCA summary into `h1b_sponsors`.
- `companies_import`: load `seed/companies_seed.csv` into `companies`.
- Tag the resume variants in `user/files/` (role family, industry tags, years
  matrix) into `resume_variants`.

### 5. Intake → profile.yaml → validate → profile_put
Fill every `[FILL IN]` in `~/workspace/profile.yaml` from intake.
Run the compile-schedules skill's validation step against
`~/workspace/templates/profile.schema.yaml`. **A missing value fails loudly —
this is by design.** Then `profile_put` syncs the validated profile into
harness-core. The DB and the bodies now render from the same facts.

### 6. Compile schedules → manifest → verify
Run the compile-schedules skill: render every `templates/*.body.md` with the
profile values, `cron.update` (or `cron.add` on first install), then read each
saved body back with `cron.view`, sha256 it, and write `schedules_manifest.json`
(job id, campaign, cadence, body hash, skill versions, profile_hash,
compiled_at). Push the manifest via `event_log`.

### 7. Smoke tests
- **Doctor green:** run the harness-doctor skill once; status must be `green`.
- **Dry-run scout:** invoke the scout skill chain with `gates: review_all`
  and **zero submits**. It must produce **≥ 5 `discovered` rows** — proving
  scouts, judges, and `app_claim` work end-to-end without applying anywhere.
- Confirm the dashboard tabs render real rows from `snapshot()`.

### 8. Declare live
Live only when steps 1–7 all pass. Then run the shadow week: everything
`draft_for_review`, cap 3/run, ≥ 20 reviewed rows, before the first real submit.

---

## Upgrade playbook (kit N → kit N+1)
1. **Backup** `schedules_manifest.json` and the customer's `profile.yaml`.
2. **Apply migrations** from the new kit's `harness-core/drizzle/` in order.
3. **Recompile** — run compile-schedules (new skill versions → new body hashes).
4. **Doctor green** — harness-doctor status must be `green` before declaring
   the upgrade complete.
5. The manifest records which kit/skill versions produced which bodies, so
   "why did Tuesday behave differently?" is answerable from the manifest.

No customer data is ever re-entered on upgrade.

---

## What to do when a step fails
- Validation fails (step 5): fix `profile.yaml`, never bypass the schema.
- Body drift (doctor reports hash ≠ manifest): run compile-schedules.
  **Never hand-edit a cron body.**
- Smoke test fails: fix the cause, re-run from the failing step. The installer
  is idempotent — safe to re-run end to end.
