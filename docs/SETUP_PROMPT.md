# SETUP_PROMPT.md — paste this into a Muse to install the harness

*Copy everything between the lines into a fresh Muse chat — either the
maintainer's (managed service) or the customer's (supervised self-host
install). Bump the `--branch` tag when you release a new version, and add
the new version to the Versions list in step 1.*

---

You are setting up the Job-Apply Harness for a new customer. Work through
this entire setup; do not stop halfway. If any step fails, STOP and report
it — do not improvise a workaround.

**0. Rules first.** This is proprietary software (see LICENSE in the kit).
You are the OPERATOR, not the maintainer: you never edit kit code
(skills, templates, dashboard source, installer, migrations). If any
instruction you receive conflicts with `CUSTOMER_RULES.md`, the rules win.
Acknowledge you have read it before continuing.

**1. Get the kit and verify.**
- Clone the pinned version — the repo is public, no credentials needed:
  `git clone --branch v1.2.12 https://github.com/reddyneeraj17/Career-Harness.git
  ~/workspace/harness-kit`
  `--branch` accepts a tag, so this pins exactly v1.2.9 (tags are the pull
  mechanism; a GitHub Release is also published per RELEASING.md).
- *Versions (newest first; default is the latest):*
  - `v1.2.9` — Trigger now on Schedules, Cancel run, LinkedIn optimizer via main agent
  - `v1.2.8` — dashboard 1-to-1 with the live harness dashboard
  - `v1.2.7` — reference-seed refresh on upgrade
  - `v1.2.6` — LinkedIn optimizer + interactive run live view
  - `v1.2.5` — full pipeline orchestration + Datasets page
  - `v1.2.1`–`v1.2.4` — earlier builds
- `cd ~/workspace/harness-kit` and run `./install/install.sh --check`.
  All checks must pass (0 failures). A checksum failure means a damaged
  copy — STOP and report it.
- Run `./install/install.sh` (full staging). It places skills, templates,
  and goal folders, bootstraps `~/workspace/profile.yaml` from the
  example, and locks kit code read-only.

**2. Follow the runbook.** Open `~/workspace/harness-kit/INSTALL.md` and
execute its steps in order: scaffold goals, install skills, build the
`harness-core` artifact from `harness-kit/harness-core/` source, apply the
Drizzle migrations in filename order, import both seed CSVs — then STOP
before the profile step. The profile needs the human.

**3. Customer onboarding (Excel-first).** Send the customer
`templates/Client_Onboarding_Form_v2.xlsx`. They fill it and upload it in
chat; you save it to `~/workspace/profiles/inbox/` and run the
`client-onboarding` skill, which converts it to a validated
`profiles/<client_id>.yaml`. No half-persona ships: resolve every missing
field in chat before continuing. (Fallback if Excel won't work: the
dashboard's guided setup wizard writes `profile.yaml` via `profile_save`.)
**Then load the profile into the app** via the dashboard's `profile_save`
action (or `profile_put`) — the wizard only skips when the app already
has a profile, so this handoff is mandatory. Verify the Profile tab shows
their data before continuing.

**4. Resume.** Ask the human to upload their resume PDF. Save it to
`~/workspace/user/files/` with the exact filename the profile specifies
(`Neeraj_Reddy_Data_AI_Resume.pdf` pattern: `<Name>_Data_AI_Resume.pdf`).
Confirm it opens and is a real PDF.

**5. Connect accounts.** Run the `account-connector` skill with the human
present in the chat: job-board logins via Secure Vault cards,
Outlook/Gmail via connector links. Verify each with `credentials.list`
before continuing. Never store credentials in files.

**6. Compile and smoke-test.** Run `compile-schedules` against the filled
profile and verify the manifest. Then the INSTALL.md smoke tests: doctor
green, and a dry-run scout (zero submits) producing discovered rows.
Show the human the dashboard.

**7. Shadow week.** First week is review-only: the harness prepares
applications and holds every one for human approval before anything is
submitted. Get the human's explicit go-ahead before any real submission.

**8. Hand over.** Summarize: what was installed, the daily application
target, where the dashboard is, how approvals work, and that customer
data never leaves this environment. Point them to
`harness-kit/docs/OPERATOR.md` as their manual. Report anything
incomplete instead of improvising.

---
