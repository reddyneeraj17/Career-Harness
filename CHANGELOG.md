# Changelog

All notable changes to the Job-Apply Harness kit are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-09-26

First shippable release. A complete, self-contained kit that installs the
autonomous job-application harness into a customer's Muse environment.

### Added
- **Documentation set**: `docs/OPERATOR.md` (customer guide: install,
  daily use, upgrades, troubleshooting, support boundary), `README.md`
  documentation map, and this changelog.
- **CUSTOMER_RULES.md**: hard rules for every customer Muse — kit code is
  read-only in customer environments; changes ship only as maintainer
  releases via `install/upgrade.sh`; drift is resolved by reinstall, never
  by patching.
- **Installer lockdown**: `install.sh` stages skills/templates read-only
  after install and verifies the new docs in `--check`; `upgrade.sh`
  briefly unlocks, refreshes, and re-locks.
- **Setup prompt** (`docs/SETUP_PROMPT.md`): paste-into-chat prompt that drives a full customer install — rules, unpack, runbook, intake interview, resume, smoke test, shadow week.
- **18 skills** (`skills/`): the full pipeline playbook catalog —
  scout (career-portal-sweep, job-board-search, linkedin-feed-hunting),
  screen (eligibility-judge, fit-judge, h1b-judge, resume-picker),
  tailor (resume-tailor, resume-reviewer), apply (portal-navigator),
  reply (email-replier, linkedin-replier), answer (screening-answerer,
  approval-judge), orchestration (run-coordinator), reporting
  (daily-report), health (harness-doctor), setup (compile-schedules).
- **harness-core artifact source** (`harness-core/`): the private
  fullstack dashboard + SQLite store (space.json, client/, server/,
  drizzle/ migrations 0001–0005, package.json, bun.lock).
- **templates/**: 11 compiled cron body templates + `profile.schema.yaml`
  (the compatibility contract every release declares against).
- **seed/**: `h1b_employer_hub.csv` and `companies_seed.csv` (85
  companies, H-1B sponsorship records) + README.
- **goal-skeletons/**: empty per-campaign goal directories
  (career_portal, email_scan, job_board, linkedin_feed, linkedin_replies).
- **profile.example.yaml**: fully redacted profile template — the only
  customer-authored file; everything derives from it via compile-schedules.
- **install/**: `install.sh` (prereq checks, `--check` dry-run mode,
  checksum manifest verification, staging) and `upgrade.sh` (version
  check, ordered migration runner hook, recompile hook, doctor hook).
- **docs/**: the living architecture blueprint PDF
  (`job-apply-harness-blueprint-v2.pdf`).
- **PACKAGING.md**: repo layout, release process, upgrade/rollback rules,
  and what never ships.
- Dashboard features in this release: 6 tabs (overview, applications,
  resumes, runs, replies, profile), per-application resume evidence
  (file + sha256 + confirmation text + screenshot status), per-run token
  usage metering, unified replies ledger with rule ids (R1–R8),
  date-range filtering, two-way profile ↔ YAML sync.

### Notes
- Requires the customer's own `profile.yaml` (from `profile.example.yaml`)
  and their resume PDF at `user/files/<filename per profile.resumes.filename_rule>`
  (renamed to their own filename per the profile rule).
- Credentials live in the customer's Secure Vault; never in this kit.
