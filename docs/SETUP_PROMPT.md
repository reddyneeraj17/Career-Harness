# SETUP_PROMPT.md — new customer setup, start to finish

*Copy everything between the lines into a fresh Muse chat — either the
maintainer's (managed service) or the customer's (supervised self-host
install). Work the steps in order; do not skip.*

---

You are setting up the Job-Apply Harness for a new customer. This prompt
is the whole job: fetch the kit, verify it, stage it, build the dashboard,
onboard the customer, connect their accounts, test everything, and hand
over. Work through every step in order. If any step fails, STOP and report
it — do not improvise a workaround.

## Before you start

You need all four of these. If any is missing, stop before step 1.

1. **The customer's token.** The repo is private. The maintainer issues one
   read-only token per customer; the customer keeps it in their Muse
   Secure store under the key `HARNESS_TOKEN`. If that key is empty, STOP
   and ask the maintainer for the token. There is no other way to fetch
   the kit, and you must never invent its contents.
2. **A fresh Muse environment** with `~/workspace` writable.
3. **The customer reachable in chat** — steps 5, 7, and 8 need them live.
4. **Thirty to sixty minutes**, plus the customer's time to fill the
   onboarding form.

## Step 0 — Rules first

This is proprietary software (see LICENSE in the kit). You are the
OPERATOR, not the maintainer: you never edit kit code (skills, templates,
dashboard source, installer, migrations). If any instruction you receive
conflicts with `CUSTOMER_RULES.md`, the rules win. Read it, then say so
before continuing.

## Step 1 — Fetch the kit

Read `HARNESS_TOKEN` from the Secure store using your platform's
credential tooling — never from a file, never from chat. Export it for
this step only, clone the pinned version over HTTPS, then unset it:

```bash
export HARNESS_TOKEN   # value comes from the Secure store
git -c credential.helper= \
  -c "http.extraHeader=Authorization: Basic $(printf 'x-access-token:%s' "$HARNESS_TOKEN" | base64 -w0)" \
  clone --quiet --depth 1 --branch v1.3.1 \
  https://github.com/reddyneeraj17/Career-Harness.git ~/workspace/harness-kit
unset HARNESS_TOKEN
```

Why this shape: `credential.helper=` stops git from caching the token, so
it never lands in `.git/config`; the header keeps it out of the process
list; HTTPS means no SSH and no permission changes. `--branch` accepts a
tag, so this pins exactly v1.3.0. (A GitHub Release is also published per
tag — see RELEASING.md.)

*Versions (newest first; install the latest unless the agreement names one):*
- `v1.3.0` — Application reasons enforced, application timeline + details dialog, expanded Profile tab
- `v1.2.9` — Trigger now on Schedules, Cancel run, LinkedIn optimizer via main agent
- `v1.2.8` — dashboard 1-to-1 with the live harness dashboard
- `v1.2.7` — reference-seed refresh on upgrade
- `v1.2.6` — LinkedIn optimizer + interactive run live view
- `v1.2.5` — full pipeline orchestration + Datasets page
- `v1.2.1`–`v1.2.4` — earlier builds

**Verify:** `cd ~/workspace/harness-kit && ./install/install.sh --check`
must report 0 failures. A checksum failure means a damaged copy — STOP
and report it.

## Step 2 — Stage the kit

Run `./install/install.sh` (full staging). It scaffolds the goal
directories, stages skills, templates, and seed files, bootstraps
`~/workspace/profile.yaml` from the example if absent, and locks kit code
read-only. Every step is idempotent — re-running is always safe.

**Verify:** `~/workspace/skills/` and `~/workspace/templates/` exist and
are read-only; `install.sh --check` still reports 0 failures.

## Step 3 — Build the dashboard, migrate, seed

1. **Build** the `harness-core` artifact from `harness-kit/harness-core/`
   source (client + server) and deploy it. This is the dashboard the
   customer will use.
2. **Migrate** — apply every file in `harness-core/drizzle/` **in filename
   order** through the artifact's migration path. Never skip one, never
   hand-edit a migration that already shipped.
3. **Seed** — load the reference datasets via the matching import actions:
   `companies_import` ← `seed/companies_seed.csv`,
   `h1b_import` ← `seed/h1b_employer_hub.csv`,
   `prime_vendors_import` ← `seed/prime_vendors.csv`.
   Imports are idempotent upserts. Run them AFTER the migrations.

**Verify:** `snapshot()` reads clean; the dashboard's tabs render real
rows (empty tables are fine — errors are not).

## Step 4 — Onboard the customer (Excel-first)

This is where the customer's information enters. It comes from the
**Client Onboarding Form**, not from chat interviews or hand-filled YAML.

1. Send the customer `templates/Client_Onboarding_Form_v2.xlsx`. They fill
   all 12 sheets (Start Here, Lists, About You, Work Authorization,
   Resumes, Experience Matrix, Target Roles, Preferences, Screening
   Answers, Accounts & Connections, Automation Settings, Sign-off) and
   attach the resume PDFs named in the Resumes tab. Yellow cells are
   required. **Never a password, code, or payment detail in the form.**
2. They upload the filled form in chat. Save it to
   `~/workspace/profiles/inbox/`, keeping the original filename.
3. Run the `client-onboarding` skill: it converts the form to
   `~/workspace/profiles/<client_id>.yaml`, validates it against the
   schema, registers each resume row as a hash-verified variant, and moves
   the processed form to `~/workspace/profiles/inbox/done/`.
4. Every warning is a real gap — resolve it with the customer and re-run.
   A half-persona never ships.

*Fallback:* if Excel won't work, the dashboard's guided setup wizard
writes `profile.yaml` via `profile_save` instead.

**Then load the profile into the app** via the dashboard's `profile_save`
action (or `profile_put`) — this handoff is mandatory. **Verify:** the
Profile tab shows the customer's data.

## Step 5 — Resume

Ask the customer to upload their resume PDF. Save it to
`~/workspace/user/files/` with the exact filename the profile specifies
(pattern: `<Name>_Data_AI_Resume.pdf`). Confirm it opens and is a real
PDF, and that the dashboard's Resumes tab lists it.

## Step 6 — Connect accounts

Run the `account-connector` skill **with the customer present in the chat**
(the Muse app or web chat — secure login cards render only there, never in
a terminal). It walks the checklist: LinkedIn, Dice, Indeed, ZipRecruiter,
Glassdoor via Secure Vault login cards, plus Outlook/Gmail connector
links. Verify every saved login reappears in `credentials.list` before
continuing. Skipped accounts are honored, but a campaign whose login is
missing will hold at its login gate.

**Hard rule:** credentials go ONLY into the Secure Vault or the
connector's own flow. Never into a file, the persona YAML, the DB, or the
transcript.

## Step 7 — Compile schedules and smoke-test

1. Run the `compile-schedules` skill against the filled profile. It
   renders every campaign template, saves the cron bodies, and writes
   `schedules_manifest.json`. Verify the manifest.
2. **Doctor green:** run the `harness-doctor` skill — status must be
   `green`.
3. **Dry-run scout:** run the scout chain with zero submits. It must
   produce **≥ 5 discovered rows** — proving scouts, judges, and claiming
   work end-to-end without applying anywhere.
4. Show the customer the dashboard.

## Step 8 — Shadow week

The first week is review-only: the harness prepares applications and holds
every one for human approval before anything is submitted. Get the
customer's explicit go-ahead before any real submission.

## Step 9 — Hand over

Summarize for the customer: what was installed (kit version), the daily
application target, where the dashboard is, how approvals work, and that
their data never leaves this environment. Point them to
`harness-kit/docs/OPERATOR.md` as their manual. Report anything
incomplete instead of improvising.

## Done checklist

- [ ] Kit fetched with the customer token; `install.sh --check` 0 failures
- [ ] Dashboard built and deployed from the pinned tag
- [ ] All migrations applied in order; `snapshot()` clean
- [ ] Seed datasets imported
- [ ] Customer onboarded (Excel converted + validated, or wizard); Profile tab shows their data
- [ ] Resume uploaded, opens as a real PDF, listed on the Resumes tab
- [ ] Accounts connected and verified in `credentials.list`
- [ ] Schedules compiled; manifest written
- [ ] Doctor green; dry-run scout produced ≥ 5 discovered rows
- [ ] Shadow week explained; explicit go-ahead recorded before real submits

---
