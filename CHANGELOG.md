# Changelog

All notable changes to the Job-Apply Harness kit are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/).

## [1.2.2] — 2026-09-26

### Fixed
- **Manifest schema now mandatory in the compile spec**: the dashboard's
  `schedules_status` action validates every manifest job entry against a
  schema requiring `job_id`, `title`, `campaign`, `cadence`, `schedule`,
  `enabled`, and `body_hash`, but the compile-schedules skill spec (and the
  profile-watch template) only required job id / campaign / cadence / body
  hash. A recompile following the spec alone would fail dashboard validation
  and blank the Schedules tab ("manifest missing"). Both specs now mandate
  the full seven-field per-job schema; the skill version is bumped to 1.0.1.

## [1.2.1] — 2026-09-26

### Fixed
- **v1.2.0 feature completion**: the 1.2.0 skills called dashboard actions
  that were never implemented in the kit (`posting_verdict`,
  `talking_points_attach`, `file_open` kind `"prep"`, `reason` on
  `app_transition`). This release adds the missing implementation:
  migration `0007_verdicts_reasons_prep.sql` (`posting_verdicts` table,
  `applications.status_reason`, `applications.talking_points_path`), the
  three actions plus the transition reason, snapshot ledger fields
  (`reason`, `talking_points_path`, `prep_exists`) and per-run verdicts,
  and the client UI (Reason line + Talking points cell on application rows,
  posting-verdict details on run rows).
- **Upgrade gap**: `upgrade.sh` never rebuilt the dashboard, so new UI and
  actions stayed dead after an upgrade. The script now prints the dashboard
  rebuild as a required agent step, and the new `docs/UPGRADE_PLAYBOOK.md`
  documents the full-sync procedure: fetch kit → refresh code → migrations
  in order → rebuild/redeploy dashboard → recompile schedules → doctor
  green, with a verification checklist and rollback notes.

## [1.2.0] — 2026-09-26

_Note: v1.1.0 was tagged and the tag reached GitHub, but the release
workflow never completed on `main` (remote `main` was still at the older
`50f1e46` while local work had diverged). That stale tag is left untouched;
this release is cut as v1.2.0 and supersedes it._

### Added
- **Proprietary licensing**: Apache 2.0 replaced by the Career Harness
  Proprietary License (use + configure; no redistribution, sharing, or
  export; core files read-only). New root `NOTICE`; proprietary banners on
  all 28 skills, installer scripts, README, INSTALL, OPERATOR, PACKAGING.
- **Distribution strategy** (`DISTRIBUTION.md`, blueprint §28): private
  GitHub repo, managed-service-first; licensed self-host installs via
  supervised install with a one-time read-only deploy key (revoked after).
  Customers never pull from the repo; the judging rules and mappings stay
  in the private repo only.
- **CUSTOMER_RULES.md**: copying/sharing/exporting kit files is a license
  breach; unlicensed copies are reported, not used.

### Added
- **Status reasons**: `applications.status_reason` + optional `reason` on
  every `app_transition`; the Applications tab shows a Reason column and the
  run-detail drawer surfaces reasons inline.
- **Posting verdicts**: new `posting_verdicts` table + `posting_verdict`
  action; the coordinator records `scout`/`screen` verdicts
  (passed/held/rejected) with a human reason for every posting it touches.
- **Vendor talking points**: new `vendor-prep` skill (v1.0.0) generates
  recruiter-call talking points after each submission; `talking_points_attach`
  action + `file_open(app_id, "prep")` viewer on the Applications tab.
  `run-coordinator` v1.10.0 wires all three.
- **Applications date slicer**: Today / Last 7 days / Last 30 days / All +
  custom range (Chicago days), composing with search and state filters; the
  KPI band recomputes over the filtered set.
- **Dashboard UI/UX overhaul**: final visual pass over all seven tabs, the
  run-detail drawer, and the approvals queue — stronger KPI hierarchy,
  consistent filter bars, sharper status pills, phone + desktop polish.
  Presentation only; no schema, action, or skill changes.
- **First-run onboarding wizard**: fresh installs open a 6-step guided setup
  (identity → work auth → employment types → targeting/titles → screening
  answers → caps) instead of the dashboard tabs; saves via `profile_save`;
  placeholder values are rejected loudly on client and server.
- **Resume upload/delete on the Resumes tab**: PDF-only upload with magic-byte
  validation, SHA-256, and loudly-enforced unique variant IDs; safe delete
  moves the PDF to recoverable trash and never touches application history.
- **Per-job schedule editing**: enable/disable switch and editable cadence for
  every job on the Schedules tab; new `schedule_update` action.
- **In-page PDF viewer**: "Open PDF" links open a viewer modal with
  Close/Download controls plus a download fallback.

### Changed
- **Employment type is now a multi-select** on the Profile tab (full-time,
  part-time, W2 contract, C2C, internship); the eligibility judge screens
  against the selection.
- Dashboard renamed from "harness-core" to "Career Harness" (display name
  only; slug unchanged).
- profile-watch timeout raised 900s → 1800s.

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
