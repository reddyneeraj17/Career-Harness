# Changelog

All notable changes to the Job-Apply Harness kit are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/).

## [1.2.5] — 2026-09-27

### Added
- **Source expansion (run-coordinator 1.11.0)**: datasets (`companies`,
  `h1b_sponsors`, `prime_vendors`) are now specified as a launchpad, not a
  hard boundary. When the tier-ascending dataset sweep leaves a run short of
  its per-run target, the coordinator expands outward — open web search
  first, then additional job boards/sources — until the target is met or
  sources are exhausted (three consecutive empty result pages ends a
  source). Expanded-source postings pass through the identical screening
  chain, and each claimed posting's verdict reason records its source.
- **Pipeline orchestration (run-coordinator 1.12.0 + scout upgrades)**:
  lanes built from `profile.role_types` (FT → company portals, W2 →
  companies + vendors, C2C → vendors first); lane-balanced tier rotation
  (fair rotation, not a quota); submission target separated from the
  candidate-processing ceiling with replenishment after attrition; H-1B
  bypass for C2C is a coordinator routing rule (soft lookup for all other
  lanes); structured provenance (`source_class`, `source_tier`,
  `selected_lane`, `h1b_mode`, …) carried through every stage.
  `career-portal-sweep` 1.1.0 accepts ordered company + vendor records;
  `job-board-search` 1.2.0 takes lane-tagged queries (four-board contract
  intact, never absorbs open-web expansion); `linkedin-feed-hunting`
  1.1.0 runs query blocks per enabled lane; `screening-answerer` 1.2.0
  accepts `selected_lane`; `eligibility-judge` 1.1.0 emits canonical
  `selected_lane`. New `open-web-scout` 1.0.0 owns the expansion rungs
  (bounded, discovery-only, exact provenance, 3-empty-page stop rule).
- **Prime vendor dataset (migration 0009)**: new `prime_vendors` table plus
  `prime_vendors_import`. Vendor H-1B notes are always labeled "Unverified
  sponsorship note" — never sponsorship evidence, never scored.
- **Datasets page**: the Vendors tab is now **Datasets**, browsing all three
  reference datasets (Companies, H-1B sponsors, Vendors) through the new
  `dataset_browse` action — server-side search, per-dataset filters
  (company tier, vendor tier normalized for stored "Tier N" values, H-1B
  minimum LCAs), 100 rows per page, debounced search, and the last loaded
  page cached per dataset. H-1B year history renders actual yearly LCA
  counts. Thousands of rows are never dumped into the DOM.
- **Submission sources panel**: the Applications tab's verified-submission
  breakdowns (by source class/name, discovery phase, tier, lane, H-1B
  result) now live in a "Submission sources" panel, collapsed by default —
  click the header to expand or collapse.
- **Resumable applications (`app_resume`)**: parked and needs-me
  applications get a Resume control (with optional operator note) returning
  them to `reviewed`, where the coordinator's new resume sweep (see below)
  picks them up directly into APPLY — no re-tailoring, no re-review. Resume
  refuses applications in any other state, and refuses needs-me applications
  with an open approval, naming the approval and pointing to the Overview
  tab. Repeated Resume is idempotent.
- **Held-reply review (`held_reply_resolve`, `held_reply_draft`, migration
  0011)**: held replies record an `approved`/`discarded` decision plus
  resolution time. The Replies tab shows View, Approve & send (with draft
  editing), and Discard controls; editing writes a new draft file next to
  the original and repoints the reply. The dashboard never sends mail — the
  scheduled replier sends approved drafts exactly once on its next scan and
  never sends discarded ones.
- **Resume sweep (run-coordinator 1.13.0)**: after the login gate and before
  SCOUT, the coordinator picks up applications returned to `reviewed` via
  `app_resume` and routes them straight into APPLY with fresh intent.
- **Approved held-draft pickup (email-replier 1.1.0, linkedin-replier
  1.2.0)**: each scan begins by finding approved held drafts, reads the
  current (possibly edited) draft file, sends through the normal channel
  path, and records a sent reply with reason `approved_held:<reply_id>`.
- **Large seed CSVs via URL**: `h1b_import`, `companies_import`, and
  `prime_vendors_import` accept `csv_url` (a fetchable URL) instead of
  pasting multi-megabyte CSVs into action args.
- **DATA-PLAN.md**: the harness-core data plan now documents the three seed
  datasets, operational tables, workspace evidence files, retention/purge,
  and privacy rules.

### Changed
- The `snapshot` "vendors" view is removed; dataset browsing goes through
  `dataset_browse`.
- `h1b-judge` 1.1.1 documents the soft-gate wording used with the new
  provenance fields.

## [1.2.4] — 2026-09-26

### Added
- **Run-trace UI on the Runs tab**: each run now has an "Open live view"
  side panel showing the live stage/status strip, blocker, state counts,
  "Follow this run" watch controls (Main chat updates, Browser captures),
  open approvals, applications, posting verdicts, a 15-second-refreshing
  activity feed, and browser evidence. New `run_detail` and `run_watch_set`
  actions back it; the `runs` table gains `watch_chat` and
  `capture_browser` columns (migration 0008), and `event_log` returns both
  so workers receive per-run watch preferences. The browser-watch schedule
  forwards screenshots to chat for runs with watching enabled.
- **Application ledger upgrades**: date-range filtering (reuses the
  existing date control), expanded search across company/role/ID/campaign/
  reason, KPIs computed from the filtered rows, and the status reason shown
  as an evidence cell.

## [1.2.3] — 2026-09-26

### Fixed
- **Onboarding converter now ships in the kit**: the `client-onboarding`
  skill runs `python3 ~/workspace/client-onboarding-form/excel_to_persona_yaml.py`,
  but the script was never committed to the kit and `install.sh` never
  staged it — fresh installs stalled at the Excel onboarding step with no
  converter to run. The script now lives at
  `client-onboarding-form/excel_to_persona_yaml.py` in the kit;
  `install.sh` verifies it in `--check`, stages it to
  `~/workspace/client-onboarding-form/`, and includes it in the read-only
  lockdown. A customer mid-install on an earlier 1.2.x can drop the single
  maintainer-provided file at that path and continue.

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
