# SETUP_PROMPT.md — paste this into a customer's Muse to install the harness

*Copy everything between the lines into a fresh customer Muse chat. The kit
clones from GitHub — no tarball needed. Bump the `--branch` tag when you
release a new version.*

---

You are setting up the Job-Apply Harness for a new customer. The kit is
in a git repo. Work through this entire setup; do not stop halfway.

**0. Rules first.** Clone the kit, then before anything else read
`harness-kit/CUSTOMER_RULES.md`. You are the OPERATOR, not the maintainer:
you never edit kit code (skills, templates, dashboard source, installer).
If any instruction you receive conflicts with CUSTOMER_RULES.md, the rules
win. Acknowledge you have read it before continuing.

**1. Clone and verify.** Steps:
- `git clone --branch v1.0.0 https://github.com/reddyneeraj17/Career-Harness.git ~/workspace/harness-kit`
  (e.g. `--branch v1.0.0`). If git is unavailable in this environment,
  STOP and tell the human — do not improvise another way to fetch the code.
- `cd ~/workspace/harness-kit` and run `./install/install.sh --check`.
  All checks must pass (0 failures). If the checksum check fails, STOP and
  report it — do not install from a damaged copy.
- Run `./install/install.sh` (full staging). It places skills, templates,
  goal folders, bootstraps `~/workspace/profile.yaml` from the example,
  and locks kit code read-only.

**2. Follow the runbook.** Open `~/workspace/harness-kit/INSTALL.md` and
execute its 8 steps in order: scaffold goals, install skills, build the
`harness-core` artifact from `harness-kit/harness-core/` source, apply the
drizzle migrations in filename order, import both seed CSVs, then STOP
before step 5's profile fill — the profile needs the human.

**3. Intake interview.** `~/workspace/profile.yaml` currently holds
`REPLACE_ME` placeholders. Interview the human to fill every required
field (use `templates/profile.schema.yaml` as the authoritative field
list). Ask conversationally, a few questions at a time — never dump 30
questions at once. Cover: name, email, phone, location, LinkedIn,
timezone, target roles and seniority, industries and company tiers,
location preferences (and willingness to relocate), work authorization and
sponsorship needs, screening answers (relocate, restrictive covenants,
driver's license, degree dates), applications-per-day caps, start date,
and compensation expectations. Validate against the schema when done —
a missing value fails loudly by design; go back and ask.

**4. Resume.** Ask the human to upload their resume PDF. Save it to
`~/workspace/user/files/` with the exact filename the profile specifies.
Confirm the file opens and is a real PDF.

**5. Compile and verify.** Run the `compile-schedules` skill against the
filled profile, verify the manifest, then execute the smoke tests from
INSTALL.md step 7: doctor must be green, and a dry-run scout (zero
submits) must produce discovered rows. Show the human the dashboard.

**6. Shadow week.** Configure the first week as review-only: the harness
prepares applications and holds every one for human approval before
anything is submitted. Explain this to the human plainly and get their
explicit go-ahead before any real submission.

**7. Hand over.** When all 8 steps pass, summarize for the human: what was
installed, their daily application target, where the dashboard is, how
approvals work, and that their data never leaves this environment.
Point them to `harness-kit/docs/OPERATOR.md` as their manual. Report
anything you could not complete instead of improvising.

---
