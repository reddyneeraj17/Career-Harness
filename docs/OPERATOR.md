# OPERATOR.md — the customer's guide to the Job-Apply Harness

> **PROPRIETARY — Career Harness © 2026 Neeraj Reddy.** Licensed customers only: no redistribution, no sharing, no export. Core files are read-only (see CUSTOMER_RULES.md). Full terms in LICENSE.


*You don't need to read the architecture spec. This is the whole manual.*

## What this is

The Job-Apply Harness is an autonomous job-application system that lives
inside your Muse. You tell it what you're looking for once; then, on a
schedule, it finds matching job postings, checks each one against your
rules (role type, location, sponsorship needs, seniority), tailors your
resume, applies through the employer's portal, and logs every step with
evidence — which resume was sent, the confirmation text, a screenshot —
on a private dashboard only you can see.

It never sends a contract application if you said full-time only. It never
guesses an answer on an application form — anything it can't answer from
your profile waits for you in an approval queue. It never edits its own
code (see CUSTOMER_RULES.md).

## What you need before install

1. **A Muse environment** — this is where the harness lives.
2. **Your resume** as a PDF. You'll place it in the harness during setup.
3. **About 20 minutes** for the guided setup: a 6-step wizard in the dashboard
   covers your target roles, locations, work authorization, screening answers
   (relocation, licenses, covenants), and how many applications per day
   you want. (The full agent-led setup, including the Excel form path,
   takes 30–60 minutes.)
4. **Your accounts** stay yours: email and LinkedIn connect through
   Muse's normal secure flows when the installer asks. Passwords are never
   typed into chat or stored in files.

## Installing (what happens)

Your Muse does the work; you answer questions. The sequence:

1. You give your Muse the kit (a folder or a `.tar.gz` file from the
   maintainer) and say "install the job-apply harness."
2. It verifies the kit is intact (checksums), stages the software, and
   builds your private dashboard.
3. It onboards you with the Excel form (primary path): you fill in the
   client onboarding workbook and upload it in chat; your Muse converts it
   into `profiles/<your-id>.yaml` and loads it into the app, so your
   Profile tab shows your real data. (A guided setup wizard is the
   fallback.) Everything the harness does derives from it. You can change
   any answer later on the Profile tab.
4. It connects your schedules (job feeds, email scans, reply handling),
   runs a dry-run test with **zero real applications**, and shows you the
   dashboard.
5. The first week runs in **shadow mode**: it prepares applications and
   holds them for your review before anything is submitted. You flip the
   switch when you're comfortable.

Your data — profile, resume, applications, messages — never leaves your
Muse environment and is never sent back to the maintainer.

## Day to day

- **Dashboard** (7 tabs): Overview, Applications, Resumes, Runs, Schedules,
  Replies, Profile. Applications shows exactly which resume went where, with
  confirmation text and screenshots.
- **Approvals**: when a form asks something your profile doesn't cover,
  the application pauses and waits for your answer. Nothing is guessed.
- **Replies**: recruiter messages are triaged automatically; anything
  needing you appears in the Replies tab.
- **Reports**: a short daily summary of what ran, what applied, and what
  needs you.

## Upgrades

When the maintainer releases a new version, your Muse applies it with one
command (`install/upgrade.sh`). Your profile, resumes, and history carry
over untouched — upgrades never ask you to re-enter anything. You'll get a
one-line changelog of what changed.

## What you should never touch

- The kit's code (skills, templates, dashboard source). It's installed
  read-only on purpose. If something looks wrong, report it — don't fix it.
- The database file directly. Use the dashboard.
- Cron bodies (the schedules). They recompile from your profile; editing
  them by hand just gets overwritten — the profile-watch job will revert
  your edit within ~15 minutes anyway.

The one file that is yours: `profile.yaml`. Change job targets,
locations, or answers there (via the dashboard's Profile tab), and the
whole system follows within about 15 minutes: the profile-watch job
notices the change and recompiles every affected schedule automatically.
You never need to ask for a recompile.

## If something looks wrong

1. Open the dashboard and check the Runs tab — it shows what ran and what
   each run did.
2. Ask your Muse "run the harness doctor" — it self-checks schedules,
   data, and install integrity and tells you what's off in plain language.
3. If it's still wrong, your support bundle is: the doctor's output plus
   your `profile.yaml` with personal details removed. Send that to the
   maintainer. That's the entire support boundary — with those two things,
   almost everything is diagnosable.

## Uninstalling

Delete the schedules, the `harness-core` dashboard, `~/workspace/skills`,
`~/workspace/templates`, and `~/workspace/goals`. Your `profile.yaml` and
`user/files/` are plain files — keep or delete them as you like. Nothing
phones home; there is nothing to deactivate.
