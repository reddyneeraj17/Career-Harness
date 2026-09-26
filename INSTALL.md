# INSTALL.md — Job-Apply Harness installer runbook

Installs the harness into one customer's Muse environment. One customer = one
environment = one `harness-core`. **Re-running the installer is always safe**
(every step is idempotent: scaffold, copy, migrate, seed, compile, verify).

## Pre-reqs
- The kit directory (this one), including `skills/`, `templates/`,
  `goal-skeletons/`, `harness-core/` source, and `seeds/`.
- The customer completes the dashboard's guided setup wizard on first run
  (step 5) — no intake interview, no hand-filled YAML.

---

## The 9 steps

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
The dashboard tabs (Overview, Applications, Resumes, Runs, Schedules, Replies,
Profile) call
`snapshot()` as same-artifact actions — no cross-artifact calls.

### 4. Seed data
- `h1b_import`: load `seed/h1b_employer_hub.csv` (USCIS Employer Data Hub)
  + the LCA summary into `h1b_sponsors`.
- `companies_import`: load `seed/companies_seed.csv` into `companies`.
- Tag the resume variants in `user/files/` (role family, industry tags, years
  matrix) into `resume_variants`.

### 5. Onboard the customer's info — Excel upload (primary path)
After `git clone`, the customer's information enters through the **Client
Onboarding Form**, not through chat interviews or hand-filled YAML:

1. The customer takes the blank form at
   `templates/Client_Onboarding_Form_v2.xlsx` and fills all 12 sheets —
   Start Here, Lists (dropdown sources), 1 About You, 2 Work Authorization,
   3 Resumes, 4 Experience Matrix, 5 Target Roles, 6 Preferences,
   7 Screening Answers, 8 Accounts & Connections, 9 Automation Settings,
   10 Sign-off — and attaches the resume PDFs named in the Resumes tab.
   Yellow cells are required; the Start Here tracker shows completion live.
   **Never a password, code, or payment detail in the form — the converter
   refuses prompt-style secret fields.**
2. The filled form is dropped into `~/workspace/profiles/inbox/`
   (the upload drop folder).
3. The operator runs the `client-onboarding` skill: it converts the form to
   `~/workspace/profiles/<client_id>.yaml`, validates it against
   `client-persona.schema.yaml`, registers each resume row as a hash-verified
   variant via `resume_register`, and moves the processed form to
   `~/workspace/profiles/inbox/done/`.
4. Every warning is a real gap — resolve it with the customer and re-run the
   converter. A half-persona never ships.

> Alternative: for operator-self setup, the dashboard's guided setup wizard
> (identity → work auth → employment types → targeting/titles → screening
> answers → caps) writes `~/workspace/profile.yaml` via `profile_save`
> instead. The wizard reuses the Profile tab's sections and validation; a
> missing or placeholder value fails loudly — this is by design.

### 6. Connect accounts (account-connector skill)
Right after intake, run the `account-connector` skill **with the customer in
the Muse client** (the Muse app or web chat). It walks the account checklist —
LinkedIn, Dice, Indeed, ZipRecruiter, Glassdoor via Secure Vault login cards,
plus the Outlook/Gmail connector links — collecting each login once so
campaigns never stall mid-run on a login wall.

**Why the chat, not the terminal:** secure login cards render only in the
Muse client, never in a raw terminal. The terminal install hands off here:
the agent opens this step in chat, the customer submits each card, and the
skill verifies every saved login reappears in `credentials.list` before the
install continues. Skipped accounts are honored — but every campaign's
run-start login gate will hold (not stall) when a login it needs is missing.

**Hard rule, no exceptions:** credentials go ONLY into the Secure Vault or
the connector's own flow. Never into a file, the persona YAML, the DB, or
the terminal transcript.

### 7. Compile schedules → manifest → verify
Run the compile-schedules skill: render every `templates/*.body.md` with the
profile values, `cron.update` (or `cron.add` on first install), then read each
saved body back with `cron.view`, sha256 it, and write `schedules_manifest.json`
(job id, campaign, cadence, body hash, skill versions, profile_hash,
compiled_at). Push the manifest via `event_log`.

> Later profile edits made on the dashboard's Profile tab are recompiled
> automatically by the profile-watch schedule within ~15 minutes — step 7 is
> only manual on first install.

### 8. Smoke tests
- **Doctor green:** run the harness-doctor skill once; status must be `green`.
- **Dry-run scout:** invoke the scout skill chain with `gates: review_all`
  and **zero submits**. It must produce **≥ 5 `discovered` rows** — proving
  scouts, judges, and `app_claim` work end-to-end without applying anywhere.
- Confirm the dashboard tabs render real rows from `snapshot()`.

### 9. Declare live
Live only when steps 1–8 all pass. Then run the shadow week: everything
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
