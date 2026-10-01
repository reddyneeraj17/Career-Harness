# Changelog

All notable changes to the Job-Apply Harness kit are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/).

## [1.3.2] — 2026-09-30

### Added
- **New `challenge-solver` skill (1.0.0).** Invoked by portal-navigator mid-application: checkbox CAPTCHAs auto-clicked, image-select one vision attempt, email OTPs read from the authorized mailbox and entered in-session (one resend), verification links opened in the same browser session. Text CAPTCHAs, bot-walls, and SMS park with evidence — never bypassed, never third-party solving services. OTP codes are transient, never persisted.
- **`docs/PORTAL_QUESTION_BANK.md`.** Canonical bank of every question portals ask (~70 entries): default answer, answer source, and risk tier (LOW auto-fill / MEDIUM fill+log / HIGH hold / NEVER hold+alert). screening-answerer 1.4.0 consults it before holding; portal-navigator 1.6.0 fills from it.
- **`docs/PERSONA_DEFAULTS.md`.** Default rules for every persona field: 7 must-ask items, everything else pre-filled (broad search defaults, 24 pre-filled screening answers, resume-extracted years matrix).
- **Onboarding converter upgrades.** Employment-type labels normalized to lane slugs (`Full-time + W2 + C2C` → `full_time, w2_contract, c2c_contract`); new `company_targeting` extraction (tier preference, industries to avoid, never-apply list, dream companies); new `preferred_lane` and `hold_policy` fields. Schema updated.
- **Consumer wiring.** eligibility-judge rejects never-apply companies; run-coordinator prioritizes dream companies within their tier.
- **Submission quality gates (portal-navigator 1.7.0).** Posting-live check before intent, ATS-readable PDF requirement (text-layer preflight), pre-submit persona-consistency check, numeric salary `0` only as a forced-field last resort, 60-second minimum pacing between submits on the same portal domain.
- **Resume story-crafting (resume-tailor 1.5.0).** Every bullet built as industry → problem → tools → story from variant facts, with per-bullet `story_provenance` in evidence; company-stack injection from company-read sources (documented patterns may frame real work; equivalent tools named honestly, never renamed); domain-based experience selection; recruiter scan structure; two-page substance target — thin histories emit `resume_gaps` for the customer instead of padding.

### Changed
- **fit-judge default threshold 60 → 25 (1.4.1).** Per operator tuning: `score >= 25` now passes. Fit bands unchanged (labels only). Shipped live in the operator's runtime alongside the v1.3.1 skill sync.
- **screening-answerer 1.4.1.** Cross-question consistency guard: answers on one application must not contradict each other (or the persona); contradictions hold for review.
- **resume-reviewer 1.5.0.** New story-provenance check: every crafted bullet's industry/problem/tools/impact must trace to a variant fact — unsourced story elements are rejected, however plausible they read.

## [1.3.1] — 2026-09-30

### Added
- **Portal walls playbook (§9).** portal-navigator 1.5.0: reCAPTCHA/CAPTCHA/
  bot-walls park (never bypass); expired OTP or no-resend option writes an
  evidence note (`otp_expired`/`otp_no_resend`, step, timestamp) and parks —
  never blocked/failed; Workday/Taleo walls (account-creation, SSO-only,
  tenant blocks) park with the specific reason (`workday_wall:` /
  `taleo_wall:`) — never `needs_me`/`hold`; Easy Apply modal timeouts write
  an evidence note (`easy_apply_timeout`), back off and retry the step
  once, then park — never failed, never retried more than once. New
  `playbooks/taleo.md`; `taleo` added to the `ats_type` enum.
  4 fixtures (P1–P4) validated live against the real skill (4/4 pass).
- **Schedule/preferences reliability (§8).** `profile_put` is now the
  single owner of the profile hash: the server computes a canonical hash
  (sorted-keys compact JSON → SHA-256, `years_matrix` normalized to `[]`
  when absent, campaigns included — a cadence change must trigger
  recompile) over the effective profile document and returns it as
  `profile_hash`; callers (compile-schedules, profile-watch) use the
  returned value and never compute their own. `profile_put` args must come
  from the validated parsed `profile.yaml`, never from memory/chat.
  profile-watch detects drift by hashing the body actually reread via
  `cron.view` (hash field blanked), not a local render. The chat watch
  stamps `{{chat_id}}` from the compile worker's runtime context and
  delivers only there. The Profile tab verifies saves by re-reading the
  row and comparing caps before presenting success.
  `profile_put canonical hash` test in `lifecycle.test.ts` (18 pass, 0 fail).
- **Coordinator browser capability (§7).** run-coordinator owns one browser
  session per run (spawn/steer/close); the parent may inspect, assist,
  handle OTP, or take over at any time and the coordinator reconciles after
  parent activity without fighting for control. Worker subagents never
  drive APPLY browsers. run-coordinator 1.19.0: the old "check the vault"
  gate called `credentials.list`, which was verified 2026-09-30 to be
  absent from the worker tool surface — the coordinator no longer pretends
  to check the vault. The parent (main agent) may pass pre-checked
  `logins_available`/`boards_available`; otherwise the board session probe
  (§6) is the source of truth.
- **Board session health (§6).** job-board-search 1.3.0 probes each board
  as healthy/logged_out/challenge_wall at run start: one saved-login
  retry per board per run (Outlook OTP authorized), challenge walls never
  bypassed; dead boards are swept around with a partial/hold outcome
  naming each state; zero usable boards rejects and the coordinator closes
  the run failed with a per-board blocker. `board_session_check` and
  `board_session_failed` event_log rows make consecutive dead-board runs
  visible in history; a zero-scan run never silently passes. run-coordinator
  1.18.0. 3 fixtures (B1–B3) validated live against the real skills
  (3/3 pass).
- **Transition structured fields (§5).** `app_transition` now parses
  variant_id/resume_path/resume_hash from evidence JSON on **every** edge and
  persists them to the applications row (previously only `applying →
  submitted` did; other edges left them opaque in the event payload).
  Malformed JSON persists nothing; resume_hash is only accepted as a full
  SHA-256 hex. New `intent_create` action mints intent_ids server-side with
  the central id() helper — clients never invent UUIDs; it is idempotent
  while the row is still `reviewed`. `reviewed → applying` now requires the
  server-minted intent and rejects forged/missing ids. run-coordinator
  1.17.0 and portal-navigator 1.4.0 call `intent_create` before the
  transition. 6 new tests in `harness-core/server/test/lifecycle.test.ts`
  (17 pass, 0 fail).
- **Dry-run cleanup (§3).** Verified no hardcoded dry-run mode remains in
  skills, server/client source, or templates — only the installer's
  `--check` dry-run terminology and the one-time onboarding "dry-run scout"
  verification step, both legitimate. Added a dry-run regression guardrail
  to `install.sh --check` that fails on any `dry_run`/`dryRun` identifier in
  those trees; verified it trips on a planted violation.
- **Backlog sweep (§2).** run-coordinator skill 1.16.0: right after the login
  gate, the coordinator recovers orphaned `applying` rows from failed/stalled
  runs (tailored resume on file → `reviewed`, else → `screened`, with
  `recovered from <run_id> (<status>)` reasons; never touches `applying`
  rows of live runs) and processes the oldest `discovered`/`screened` rows
  before claiming anything new. Backlog sweep, resume sweep, and SCOUT
  claims share one candidate-processing ceiling (`cap_per_run`); backlog
  first, new claims fill the remainder. Swept `discovered` rows lacking a JD
  re-enter at JD-FETCH; `screened` rows enter at PICK without re-screening;
  parked/blocked/needs_me rows are never swept. 4 coordinator fixtures in
  `skills/tests/coordinator-fixtures.md`; C1 and C2 validated live against
  the real skill (2/2 pass).
- **Screening soft defaults (§1).** Employment type is now a defaultable
  field, never a hold: when a JD leaves the type unstated, unclear, or
  ambiguous, eligibility-judge (skill 1.2.0) defaults `selected_lane` to
  `profile.targeting.preferred_lane` (new optional schema field; falls back
  to the first of `profile.role_types`) and advances, stamping
  `reasons[0]` as `defaulted to <lane>; type unstated in JD` so the
  coordinator writes it to `status_reason`. An explicitly stated type that
  is not enabled still rejects — the default never rescues a real mismatch.
  fit-judge (skill 1.4.0): a score at threshold with no other flag now
  passes instead of holding for operator review; holds are reserved for
  flag situations (at/above or below threshold) and every hold carries its
  `retry_path:` in `reasons`. resume-reviewer (skill 1.4.0): the tool-claim
  check now distinguishes fabrication (invented value, or a verbatim term
  with an inflated claim attached → `rejected`, quoting the invented value
  and every source checked) from mechanical mismatch (term verbatim in the
  JD or variant, carried through as-is → note at most, never a rejection).
  11 scenario fixtures in `skills/tests/screening-fixtures.md`; 6 of them
  validated live against the real judge skills (6/6 pass).
- **Run-lifecycle hygiene (§4).** `run_open` now requires non-empty
  `compiled_config` (campaign_id, caps, skill chain) and `live_config`
  (mode, trigger) and fails loudly instead of writing a config-less row;
  its response is now `{ok:true, run_id}` / `{ok:false, message}`.
  `run_close` rejects unknown run_ids instead of returning ok:true.
  `app_claim` stamps `status_reason` ("claimed from <source>; awaiting
  screen") at claim time. `app_transition` never writes a blank reason
  (explicit > evidence-derived > mechanical fallback, enforced at the write
  layer), requires an explicit reason as the blocker for
  parked/blocked/needs_me, and clears the blocker when leaving those
  states. New `run_finalize_stale` action force-closes runs orphaned past
  `max_age_hours` (default 3) with a diagnostic blocker without touching
  application rows; the hourly harness-doctor (skill 1.2.0) calls it.
  run-coordinator skill 1.15.0 documents the new `run_open` contract.
  11 bun:test cases in `harness-core/server/test/lifecycle.test.ts` run the
  real action handlers against an isolated sqlite DB.

### Changed
- **Token-gated distribution docs (1.3.1).** All customer-facing docs now
  tell one story: the repo is private and every fetch needs the
  per-customer read-only token (`HARNESS_TOKEN` in the Secure store) over
  HTTPS. Removed the public/private contradiction (DISTRIBUTION.md said
  private, SETUP_PROMPT.md said public), replaced every "deploy key"
  (SSH — unusable with Muse's outbound-SSH-off default) with the token
  flow, and added the token-sharing rule to CUSTOMER_RULES.md (sharing
  the token is redistribution under LICENSE §5). Docs only; no script
  changes. The versioned-install layout (`update.sh` / `rollback.sh`,
  `install.sh --version`) ships in 1.4.0.

## [1.3.0] — 2026-09-28

### Added
- **Profile tab shows every captured field.** `comp.zero_ok` and
  `caps.linkedin_actions_per_hour` were captured in profile.yaml but
  invisible and uneditable in the dashboard — both are now first-class
  fields (the server accepts `zero_ok` in the save payload instead of only
  preserving the YAML value). New read-only **Resume files** section shows
  `resumes.dir` + `filename_rule` (profile_get now reads them from
  profile.yaml via the existing privileged contract). The Location
  preferences section shows a live "Saves as" preview of exactly what the
  priority list maps to in YAML (`us_only` / `remote` / `metros`), mirroring
  the server derivation. The onboarding wizard's final step carries the two
  new fields as well.

### Added
- **Application reasons, enforced.** `app_transition` now derives a
  human-readable `status_reason` server-side when the caller omits
  `args.reason` on a terminal/attention transition (`blocked`, `rejected`,
  `parked`, `needs_me`, `submitted`, `confirmed`): plain-text evidence is
  used verbatim (280 chars), JSON evidence contributes its `reason` +
  `detail` fields (falling back to `checkpoint` / `error`), so the
  dashboard Reason column never goes blank because a worker skipped the
  reason. New `app_timeline` action returns one application's row plus its
  events in chronological order (from/to/reason/evidence per event). The
  Applications tab gains a per-row "Details & timeline" dialog showing the
  app's header, reason, blocker, outcome, confirmation, evidence links, and
  full event timeline. Migration 0017 backfills blank reasons on
  terminal-state rows from their latest terminal `state_transition` event
  (never overwrites an explicitly recorded reason).

### Fixed
- **Runs view (dashboard + workers).** The snapshot `runs` view failed with
  a swallowed "Failed query" error: the live `posting_verdicts` table was
  created with the old composite-PK shape and lacks the `id` column the
  drizzle schema expects, so the select-all query emitted `SELECT "id",
  ...` against a table that has none (a schema drift predating v1.2.12, not
  a code regression). The runs view now selects explicit columns
  (`postingId`, `runId`, `stage`, `verdict`, `reason`, `at`) — the same
  pattern the run-detail view already used — which the table actually has.

## [1.2.12] — 2026-09-28

### Added
- **Resumable chunked dataset imports.** Large seed CSVs (80K+ rows) exceeded
  the 120s action limit and wedged the worker. New
  `dataset_import_start` / `dataset_import_chunk` /
  `dataset_import_status` / `dataset_import_retry` /
  `dataset_import_cancel` actions: the CSV is staged once via new privileged
  contracts (`stageImportCsv`, `readImportCsvChunk`, `deleteImportStaging`,
  confined to a `.import-staging` dir) as one JSON chunk file per 2,000 rows,
  then upserted in bounded chunks (2,000 rows/call, 500-row multi-row
  `INSERT ... ON CONFLICT DO UPDATE` batches) — chunk reads touch only the
  files the requested offset range spans, never the whole dataset. Job rows
  in the new `dataset_import_jobs` table persist cursor, progress, and source
  identity (`source_url`, `source_sha256` of the staged file). Progress is
  crash/replay-safe: cursor + counters advance in one UPDATE only after a
  successful upsert, and upserts are idempotent by norm key, so a failed
  chunk is retried with `dataset_import_retry` (cursor preserved, failed
  chunk re-processed, no duplicated dataset rows); staging is kept on chunk
  failure precisely so retry has something to resume from. The legacy
  synchronous `h1b_import` / `companies_import` / `prime_vendors_import`
  actions now refuse files over 5,000 rows with a pointer to the chunked
  path, and share the same row mappers so both paths produce identical rows.
  Verified against the real 86,230-row companies seed: staged to 44 chunk
  files, bounded reads at offsets 0 / 84,000 / last-chunk / past-end all
  correct, re-reads stable, sha256 deterministic.
- **Real health telemetry.** The `snapshot` health view now returns parked
  companies (`park_count >= 3` with skip flag/reason), H-1B refresh
  statistics (employer count, newest/oldest refresh timestamps and age in
  days), and real `hidden_files` disk usage via the new confined
  `hiddenFilesDiskUsage` privileged contract (bytes total, folder count,
  over-2GB flag, oldest folders as prune candidates). Unavailable telemetry
  is reported explicitly (`available: false`), never silently omitted. The
  ask-route health answer reports the same figures. `harness-doctor`
  1.0.0 → 1.1.0.
- **`schedule_trigger_dispatch` control-plane template.** The missing 13th
  schedule template (`templates/schedule_trigger_dispatch.body.md`) and its
  optional `schedule_trigger_dispatch` campaign schema entry (default
  `every 2m`) are now in the kit; `compile-schedules` requires all 13
  schema-defined templates.

### Fixed
- **Profile saves no longer drop `years_matrix` or extension keys.**
  `years_matrix` is a first-class profile column (migration 0015) and YAML
  section: `profile_get` returns it, `profile_put`/`profile_save` carry the
  live matrix forward when older callers omit it, and `renderProfileYaml`
  round-trips it — including an explicit clear-all (`years_matrix: []`
  writes an empty section so YAML and DB stay identical). Unknown top-level
  extension sections are preserved verbatim, and unknown *nested* keys
  inside known sections are now appended rather than dropped (idempotent —
  a second save adds nothing twice). New `years_matrix_import` action loads
  the matrix from the onboarding persona YAML (or raw YAML text) into both
  the DB column and `profile.yaml`; it writes YAML first, then the DB — a
  failure before/during the YAML write leaves both stores untouched, while
  a later DB failure leaves the YAML ahead and the next import retry (or
  compile-schedules file→DB sync) converges it. The dashboard Profile tab
  has a matrix editor (add/edit/remove rows: skill, category, years, where
  used) plus a persona-YAML import button.
- **Resume ranking no longer ties on empty vectors.** `resume_register`
  keeps an explicit caller vector but otherwise derives `keyword_vector`
  from metadata (role family, industry tags, years-matrix skill names —
  never invented from PDF bytes); `resume_upload` derives instead of
  writing `{}`. `resume_pick` tie-breaks deterministically: total score →
  exact role-family match → approval rate → least recently picked → variant
  id. New idempotent `resume_reindex` backfills vectors for variants that
  have none. `resume-picker` skill 1.0.0 → 1.1.0.
- **Profile saves no longer revert `identity.timezone`.** `renderProfileYaml`
  rebuilt the identity block without a `timezone:` line, so the file kept
  the old value (or none) while the database took the new one — the next
  file→database sync then reverted the change. The rendered block now
  writes `timezone` from the payload like every other identity field.
- **Profile saves no longer write a duplicate `restrictive_covenants` line.**
  The dashboard payload carried both `covenants` and the legacy
  `restrictive_covenants` key, and the server rendered both as
  `restrictive_covenants:` in `profile.yaml`. The client now drops the
  legacy key (`covenants` already falls back to its value).

## [1.2.11] — 2026-09-28

### Fixed
- **Server actions no longer import the host-only `node:fs` module.** The
  artifact platform's server validation forbids host modules in sandboxed
  actions; fresh v1.2.10 dashboard builds were rejected at the
  `import { existsSync, readFileSync, writeFileSync } from "node:fs"` line
  in `server/src/actions.ts` (this stayed masked behind the `process`
  violation until v1.2.10 fixed that). Held-reply draft file IO now goes
  through two new privileged contracts — `readHeldDraft` and
  `writeHeldDraft` — whose handlers run on the host with the same
  workspace confinement the actions used to apply (no `..`, absolute or
  `workspace/`-relative paths only, symlink-resolved, writes land as
  `.edited-<stamp>` siblings). `actions.ts` now imports only the space SDK,
  the generated privileged contracts, drizzle-orm, and the schema.

## [1.2.10] — 2026-09-28

### Fixed
- **Server actions no longer read the `process` global.** The artifact
  platform's server validation forbids `process` in server actions, which
  rejected fresh v1.2.9 dashboard builds at
  `workspaceHome()` (`process.env.HOME`). The workspace path is now the
  fixed literal `/home/hatch/workspace` — the same convention the
  privileged handlers already use for their `WORKSPACE_ROOT`. No behavior
  change: the fallback was already `/home/hatch` in every real
  environment.

## [1.2.9] — 2026-09-27

### Added
- **Ad-hoc "Trigger now" on every Schedules row.** Each schedule row now has
  a Trigger now button that queues a one-shot run — it works on disabled
  schedules too, without re-enabling them. New `schedule_triggers` table
  (migration 0014) with three actions: `schedule_trigger` (validates the
  job against the schedules manifest, refuses with `already_running` when
  the campaign has an active run, then queues a pending row),
  `schedule_trigger_pending` (lists pending rows for the dispatcher), and
  `schedule_trigger_mark` (marks a row `dispatched`/`failed`). The
  `schedule-trigger-dispatch` cron picks pending rows up within ~2 minutes
  and fires the campaign.
- **Operator run cancellation.** Active runs now show a Cancel run button in
  the run-detail header. A confirmation dialog calls the new `run_cancel`
  action, which marks the run `cancelled`/`ended`, cancels applications
  still in `applying`, and writes a `run_cancelled` event. The
  run-coordinator skill (1.14.0) watches for `status="cancelled"` at every
  reconciliation point and stands workers down instead of continuing.

### Changed
- **LinkedIn optimizer reroute (main-agent loop).** `linkedin_optimize_start`
  no longer spawns a worker — it emits an `awaiting_main_agent` event
  (phase `audit`) that the `linkedin-optimize-dispatch` cron hands to the
  main agent for the live-browser audit. Approving a section emits
  `awaiting_main_agent` (phase `apply`) instead of resolving-and-done; the
  main agent applies the edit in the browser and closes via
  `linkedin_optimize_apply_complete`, which now verifies hashes and closes
  the run when every approved section is applied. `approval_resolve`
  validates the run/section context and the profile's LinkedIn URL, emits
  `section_discarded` on discard, and auto-completes the run when every
  card is resolved with nothing left to apply.

## [1.2.8] — 2026-09-27

### Changed
- **Dashboard is now 1-to-1 with the live harness dashboard.** The kit's
  dashboard client (`App.tsx`, `theme.css`) is byte-identical to the
  operator's local dashboard: the same theme, the same Applications page
  with the always-visible Submission-sources provenance board, the same
  Replies page with the held-draft review dialog, the same Datasets page
  with per-dataset filters and pagination, the same LinkedIn approval
  cards with diff-and-edit in both Overview and run detail.
- Server-side support for the unified client (all additive, no migrations):
  `snapshot` applications view now also emits `provenance_summary`
  (`submitted_total` + `by_source`/`by_tier`/`by_lane`/`by_h1b_result`/`by_discovery_phase`
  with `not_recorded` for missing values); `approval_resolve` normalizes
  LinkedIn section answers (`Approve`/`Discard` → canonical
  `approved`/`discarded` the apply worker looks for) and rejects empty
  proposed text on approve; `dataset_browse` companies search now covers
  industry as the placeholder promises; `min_lca: 0` is honored instead of
  silently dropped; the vendors tier filter now matches `"1"`/`"2"`/`"3"`
  against stored `"Tier 1"`-style values.

### Fixed
- Replies activity-ledger column overlap: the Held-decision controls no
  longer collide with the Rule column (superseded by the unified
  dialog-based held-reply flow, where Decision renders last).

## [1.2.7] — 2026-09-27

### Fixed
- **Upgrades now refresh reference seeds.** `install/upgrade.sh` gained a
  seed-refresh agent hook: after migrations, the agent uploads each seed CSV
  from the new kit (`companies_seed.csv`, `h1b_employer_hub.csv`,
  `prime_vendors.csv`) to a fetchable URL and calls the matching import
  action (`companies_import`, `h1b_import`, `prime_vendors_import`) with
  `{"csv_url": ...}`. Imports are idempotent upserts, so re-running them is
  safe. Previously an upgrade left the customer's database on the old seed
  data with no path to the refreshed datasets.
- `docs/UPGRADE_PLAYBOOK.md`: new step 4 "Refresh reference seeds" (after
  migrations, before the dashboard rebuild) plus a seed row-count item in
  the sync verification checklist; later steps renumbered.

## [1.2.6] — 2026-09-27

### Added
- **Full reference seeds ship in the kit** (`seed/`): the same datasets
  the live harness runs on — `companies_seed.csv` (86,230 companies with
  tier/industry/careers URL/ATS type), `h1b_employer_hub.csv` (82,697
  sponsors, every row verified yes/no, no unknowns), `prime_vendors.csv`
  (1,010 vendors). A customer install imports all three via the
  dashboard's `companies_import` / `h1b_import` / `prime_vendors_import`
  actions (idempotent upserts; `install.sh --check` now requires all
  three files). The seed README documents the refresh process (CSV is
  the source you edit → import action → upsert) and restates the two
  standing rules: `unknown` H-1B rows must never be imported, and vendor
  H-1B notes are never sponsorship evidence.
- **New `linkedin-optimizer` skill (1.0.0)** + **"Optimize LinkedIn"**
  dashboard button (Overview tab): three gated phases — audit (read-only,
  scores the live profile against the All-Star checklist + recruiter
  keyword coverage), propose (per-section rewrites: headline formula,
  About structure with preview hook, technical-bullet experience,
  ordered skills, propose-only visibility recommendations), apply (edits
  only customer-approved sections, each edit verified by re-read). The
  identity gate runs first every phase: the profile must belong to the
  customer or the skill aborts. Per-section approvals render as cards in
  the Approvals queue with side-by-side current/proposed text and
  Approve / Edit / Discard; the run tracks through the existing
  run-trace UI (`audit → propose → awaiting approvals → apply → done`).
- **`vendor-prep` 1.1.0**: STAR story bank per top requirement
  (full / 60-second / one-liner, every sentence resume-grounded),
  "Questions to ask them" block by audience, before/after metrics
  tables, `Learnings:` gap lines, stack-mismatch honest framing,
  weakness/failure formulas, salary deflect-to-their-range (never a
  number), optional `## Reference briefing` block (human-in-the-loop;
  permission-first is a standing rule).
- **`cover-letter-writer` 1.1.0**: five-hook opening menu
  (mutual-connection only when a real connection exists in profile
  facts), `[Their Need] + [Your Exact Experience] + [Specific Result]`
  body formula, honest gap pattern, `evidence.alternate_openings`,
  10-point write-side checklist, and a human-triggered-only
  `mode: "cold_outreach"` (hook-first, confidence calibration, early
  location/work-auth disclosure) — still gated by `resume-reviewer`.
- **LinkedIn optimizer dashboard wiring** (migrations `0012`/`0013`):
  `approvals` gains `section`, `current_text`, `proposed_text`,
  `proposal_path`, `run_id`; `runs` gains `mode` (`scheduled` default,
  `manual` for dashboard-triggered runs). New actions
  `linkedin_optimize_start` (creates the manual run; refuses to stack a
  second active run), `linkedin_optimize_proposal_complete`
  (`run_id` + `verdict`), `linkedin_optimize_apply_complete`
  (`run_id` + `approval_id` + `section` + `verdict` + before/after
  hashes). `approval_enqueue` accepts the per-section proposal fields;
  `approval_resolve` accepts `edited_text` (Edit-before-approve stores
  the customer's rewrite as the text the apply worker uses); `run_open`
  accepts `mode`. Overview shows the run `mode`; approval cards and
  run-detail include the new fields. Dispatch: the button creates the
  run + event; the operator's agent runs the skill's audit → propose
  phases against the `run_id`, then one apply per approved section —
  the run trace (`audit → propose → awaiting approvals → apply → done`)
  renders in the existing Runs/event UI.

### Changed
- **`fit-judge` 1.3.0**: must-have vs nice-to-have classification
  heuristics (language cues + 3+ mention rule) in
  `evidence.requirement_tier`; `evidence.keyword_frequency` map;
  `evidence.fit_band` labels (excellent/good/stretch/under — the 60
  threshold behavior is unchanged); `evidence.red_flags` lexicon
  (workload/culture/compensation phrases, surfaced to the operator,
  never auto-reject).
- **`resume-tailor` 1.4.0**: ATS keyword placement priority (summary >
  skills > bullets; critical keywords 2–4×, important 1–2×, never
  stuffed; consumes `fit-judge`'s `keyword_frequency`), prefer-the-JD's-
  exact-phrasing rule, technical bullet formula with technology slot,
  metrics taxonomy as surfacing guidance, data-engineer bullet patterns,
  ATS format-preservation hard limit, summary-line formula + don'ts,
  3–6 bullets per recent role, before/after keyword report
  (`evidence.keywords_added`, `evidence.match_delta`).
- **`screening-answerer` 1.3.0**: "Answer shaping" for the DERIVED-answers
  path only — per-type composition formats (experience, behavioral,
  why-company, open-ended), length-calibration hard limits
  (1 sentence / 2–4 sentences / 100–250 words), and anti-patterns (no
  JD parroting, no generic traits, no over-qualifying). Verbatim
  persona/profile answers are never reshaped; unknowns still hold.

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
- **email-replier 1.2.0**: drafts now follow strict email format rules —
  proper greeting/body/sign-off shape, plain text (no markdown) in the
  email body, no hard line-wrapping, dash bullets for 2+ item lists,
  recruiter questions answered in order, one clear next step per email.
- The `snapshot` "vendors" view is removed; dataset browsing goes through
  `dataset_browse`.
- The kit's `email_scan` template is mailbox-agnostic: customers can connect
  Outlook or Gmail and the scan uses whichever is connected (the personal
  template keeps the operator's Outlook-only rule).
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
