<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: run-coordinator
version: "1.19.0"
description: Orchestrates one campaign run through the 7-stage pipeline, owns all state transitions, enforces caps, and closes the run.
---

# run-coordinator

> Changelog 1.19.0: Vault-gate correction (§7) — verified 2026-09-30 that `credentials.list` does not exist in a worker context, so the coordinator no longer pretends to check the vault. The parent (main agent) may pass `logins_available` / `boards_available` pre-checked from its own namespace; otherwise the session probe (§6) is the source of truth.
> Changelog 1.18.0: Board session handling (§6) — the coordinator acts on job-board-search's per-board session states (`healthy`/`logged_out`/`challenge_wall`): partial sweeps are reported with dead boards named, zero usable boards fails the run loudly (`run_close` status `failed` with a per-board blocker), and every run writes a persistent `board_session_check` event_log row.
> Changelog 1.17.0: Server-minted intents (§5) — APPLY mints via `intent_create(app_id)`; `reviewed → applying` only accepts the server-minted intent_id. Structured evidence fields (variant/resume path/hash) now persist on every transition edge.

> Changelog 1.16.0: Backlog sweep — right after the login gate, the coordinator recovers orphaned `applying` rows from failed/stalled runs (tailored → `reviewed`, untailored → `screened`) and processes the oldest `discovered`/`screened` rows before claiming anything new. Backlog sweep, resume sweep, and SCOUT claims share one candidate-processing ceiling (`cap_per_run`); backlog first, new claims fill the remainder.
> Changelog 1.15.0: Run-lifecycle hygiene (§4) — `run_open` now requires non-empty `compiled_config` (campaign_id, caps, skill chain) and `live_config` (mode, trigger); it returns `{ok:true, run_id}` on success and `{ok:false, message}` on refusal, failing loudly instead of writing a config-less row. `run_close` on an unknown run id returns `{ok:false, message}` ("Run not found"). New `run_finalize_stale` action force-closes runs orphaned past `max_age_hours` (default 3) as failed with a diagnostic blocker (harness-doctor calls it hourly).

> Changelog 1.14.0 (2026-09-27): Operator cancellation — the coordinator checks the run's `status` at every reconciliation point; on `"cancelled"` (dashboard Cancel run button → `run_cancel` action) it stands workers down and closes out instead of continuing.
> Changelog 1.12.0 (2026-09-27): Pipeline orchestration — lane construction from `profile.role_types`; lane-balanced tier rotation (fair rotation, not quota); submission target separated from the candidate-processing ceiling with replenishment after attrition; H-1B routing owned by the coordinator (bypass for `c2c_contract`, soft lookup otherwise); deterministic dataset→web expansion ladder with stop rules; structured provenance carried through every stage.
> Changelog 1.13.0: Resume sweep — right after the login gate, the coordinator picks up applications in `reviewed` from prior runs (including rows the customer resumed via `app_resume`) and routes them straight into APPLY; no re-tailor, no re-review, no looping on re-parked rows.
> Changelog 1.11.0: Source expansion — datasets are a launchpad, not a fence. When the tier-ascending dataset sweep leaves the run short of its target, the coordinator expands outward (open web search, then additional sources) until the target is met or sources are exhausted.
> Changelog 1.10.0: Status reasons + posting verdicts + vendor-prep — every `app_transition` carries a short human-readable `reason`; the coordinator records `posting_verdict` for each posting at SCOUT (claimed) and SCREEN (judge decision); after an application reaches `submitted`, the coordinator invokes `vendor-prep` once to generate and attach recruiter talking points.
> Changelog 1.7.0: SCOUT now feeds `company-discovery` (observed companies with ≥2 sightings enter the companies table at tier 3, insert-only) so the portal sweep list grows.
> Changelog 1.6.0: JD-FETCH stage between SCOUT and SCREEN — the coordinator invokes `jd-fetch` once per run over genuinely-new postings; SCREEN judges receive `jd_text` from the snapshot files, and fetch failures hold with `insufficient jd text`.
> Changelog 1.5.0: Job-board availability is per-board, not all-or-nothing — before SCOUT, the coordinator matches `credentials.list` against dice/indeed/glassdoor/ziprecruiter, passes only the available boards to `job-board-search`, and skips the rest (a run holds only when zero boards are available).
> Changelog 1.4.0: Run-start login gate — before SCOUT, the coordinator checks `credentials.list` (metadata only) for the logins this campaign needs (see "Run-start login gate"); a missing login holds the run with a `needs_me` message up front instead of stalling mid-run on a login wall.
> Changelog 1.3.0: Token usage capture — before `run_close`, the coordinator measures real token spend for the run's whole agent subtree via `muse.db` (`agent.agent_message_token_usage`, never estimated) and records it with `token_record`; when nothing is measurable the run is explicitly marked unreported, never zero-filled.
> Changelog 1.2.0: APPLY phase evidence rule — the coordinator verifies the confirmation screenshot file exists on disk and the confirmation text is captured before allowing the `applying → submitted` transition; canonical evidence paths `goals/<campaign>/hidden_files/<run_id>/screenshots/<app_id>_<step>.png` (+ `<app_id>_confirmation.txt`).
> Changelog 1.1.0: `years_matrix` for fit-judge comes only from `profile_get` (null when the profile has none — never fabricated); applier briefs cite the ledger `app_id` and a `snapshot`-verbatim URL with executor re-check; new "APPLY phase — browser ownership" subsection (browser driving is coordinator-level only).

## Inputs

```json
{
  "campaign_id": "linkedin_feed|career_portal|job_board|email_scan|linkedin_replies",
  "run_id": "<optional; minted by run_open if absent>",
  "logins_available": "<optional; parent-provided from credentials.list, e.g. ['linkedin', 'outlook']>",
  "boards_available": "<optional; job_board only, parent-provided subset of ['dice','indeed','glassdoor','ziprecruiter']>"
}
```

The thin cron body invokes this skill with the `campaign_id`. The coordinator reads the campaign's caps, gates, and skill chain from `profile_get` and `snapshot`. `logins_available` / `boards_available` are present only when the parent (main agent) pre-checked the vault — the coordinator never calls `credentials.list` itself (unavailable in worker context); absent those fields, the session probe (§6) is the source of truth.

## Actions called

- `run_open` — open the run (mints `run_id` when not supplied); stamps the kit version. Requires non-empty `compiled_config` and `live_config` — returns `{ok:false, message}` rather than a config-less row.
- `run_close` — close the run with counts. **Refuses** if any application row is still `applying` without an outcome; returns `{ok:false, message}` for an unknown run id.
- `token_record` — record the run's measured token usage (see "Token usage capture" below). Call AFTER measuring, BEFORE `run_close`.
- `app_claim` — claim postings into the pipeline; caps (per run, per day) enforced in SQL. Never count caps in a prompt.
- `app_transition` — the ONLY writer of application state edges. Judges return verdicts; the coordinator transitions. Every call carries `reason`: a short human-readable string (the judge's reasons condensed, or the coordinator's own decision), e.g. `rejected: non-Houston location`, `held: years_matrix missing`, `submitted: confirmation captured`. The reason is stored on the application row and shown in the dashboard.
- `posting_verdict` — record one verdict row per posting per stage (`scout` / `screen`): `{posting_id, run_id, stage, verdict, reason}`. Called for every posting the run touches (see "Status reasons, posting verdicts, vendor-prep").
- `snapshot` — read-only reconciliation of run state, about every 5 minutes and at phase boundaries.
- `event_log` — one exit row per skill exit is required of workers; the coordinator appends one final row with the run verdict and token totals.

## Pipeline orchestration

### Run-start login gate (before SCOUT, every run)

Campaigns stall mid-run when a login wall appears. Check up front instead.

The coordinator itself cannot call `credentials.list` — that namespace does
not exist in a worker context (verified 2026-09-30), so the coordinator never
pretends to check the vault. The gate works like this:

1. **Parent-provided availability (when present).** When the parent (main
   agent) spawns the coordinator, it may pass `logins_available` /
   `boards_available` in the input, computed from its own `credentials.list`
   (metadata only — never values) plus each mailbox connector's status
   check. The coordinator honors that list as its starting set.
2. **The session probe is the source of truth.** For `job_board`, the
   per-board probe (job-board-search 1.3.0) decides what is actually usable
   — a vault login is not a live session. For the other campaigns, the
   first authenticated action is the probe: hitting a login wall there is
   handled exactly like a dead board session (§6).
3. Required logins by campaign:
   - `linkedin_feed` → LinkedIn
   - `job_board` → per-board (see below): dice, indeed, glassdoor,
     ziprecruiter — each probed individually
   - `career_portal` → none (public careers pages; ATS logins only if a portal demands it)
   - `email_scan` → Outlook (or Gmail, if the customer connected it)
   - `linkedin_replies` → LinkedIn
4. If anything required is missing — no saved login to re-login with, or
   the parent reported it absent: do NOT open the run. Hold with
   `needs_me=true` and one message naming the missing account(s) and pointing
   the customer at the `account-connector` skill. A skipped account is a
   customer decision — honor it, don't re-prompt inside the run.

### Job-board availability (per-board, before SCOUT)

The `job_board` campaign searches dice, indeed, glassdoor, and ziprecruiter —
but only the boards whose logins are actually in the credentials vault:

1. Match each saved login's site/host from the parent-provided
   `boards_available` (or all four boards when the parent did not
   pre-check — the session probe below is the source of truth) against the
   four board domains. `boards_available` = the boards to probe.
2. **Zero available → hold.** Do not open the run; `needs_me=true` naming the
   four boards and pointing at `account-connector`.
3. **Some available → run on those.** Build scout queries only for
   `boards_available`, pass `boards: [...]` to `job-board-search`, and note
   the skipped boards in the run's `event_log` row. The run never stalls on a
   board nobody connected.
4. **Session states decide the run's fate** (job-board-search 1.3.0 probes
   every board and reports `boards_session`: `healthy` / `logged_out` /
   `challenge_wall`, with re-login already attempted on `logged_out`).
   Write one `event_log` row `board_session_check` with the per-board
   states — this is the persistent record; consecutive dead-board runs are
   visible in the run history.
   - All boards usable → normal SCOUT.
   - Some dead → SCOUT the live ones; the run's report names each dead
     board and its state. Never silently pass a partial sweep as full.
   - Zero usable (`reject`: `all boards unusable: ...`) → **fail loudly**:
     `run_close(status="failed", blocker="job-board sessions dead:
     <board>=<state>, ...")`, an `event_log` row `board_session_failed`,
     and a report that names the boards and states. A zero-scan run is
     never closed as a pass and never retried silently inside the same run;
     the next scheduled run re-probes.

Stages: SCOUT -> JD-FETCH -> SCREEN -> PICK -> COMPANY-READ -> TAILOR -> REVIEW GATE -> APPLY -> VERIFY.

### Backlog sweep (right after the login gate, before SCOUT)

Oldest work first: a run processes the backlog before claiming anything new.
The sweep, the resume sweep below, and new SCOUT claims all draw from one
candidate-processing ceiling (`cap_per_run` from the compiled config,
default 10). Backlog first, then resume sweep, then SCOUT claims fill
whatever remains.

1. **Orphan recovery.** From `snapshot` view=applications, find rows with
   `state = 'applying'` whose `run_id` belongs to a run whose status is not
   `running` (failed / blocked / completed), or to a `running` run older
   than 3h (stalled — harness-doctor's `run_finalize_stale` will close it;
   do not wait for it). Never touch `applying` rows of this run or of any
   other currently-`running` run. For each orphan:
   - `resume_path` and `resume_hash` set → `app_transition(applying →
     reviewed, reason="recovered from <run_id> (<run status>); tailored
     resume on file, re-entering at APPLY")`. The resume sweep below picks
     it up; do not re-tailor.
   - otherwise → `app_transition(applying → screened, reason="recovered
     from <run_id> (<run status>); never tailored, re-entering at PICK")`.
   Log one `event_log` row `orphan_recovery` with the app ids, their prior
   run ids, and their new states.
2. **Sweep discovered/screened.** Select applications where `state` in
   (`discovered`, `screened`), ordered by `created_at` ascending (oldest
   first). Exclude rows in parked/blocked/needs_me (operator-owned) and rows
   already handled this run. Take up to the remaining ceiling.
3. **Route:** `discovered` rows enter at JD-FETCH (re-fetch the JD when the
   posting has no `jd_path`, then SCREEN); `screened` rows enter at PICK —
   never re-screen a row that already passed the judges. A `defaulted to
   <lane>; type unstated in JD` reason from a prior run's eligibility pass
   is preserved, not re-judged.
4. Log one `event_log` row `backlog_sweep` with the swept app ids, their
   states, and the budget remaining for SCOUT.
5. **No double-processing within a run:** a swept row that parks, blocks, or
   fails keeps its reason and is not re-swept until a later run.

### Resume sweep (right after the backlog sweep, before SCOUT)

Resumed work re-enters at APPLY — it already passed TAILOR + REVIEW GATE.

1. Select applications where `state = 'reviewed'` and `run_id != <this run's id>`: these are rows a previous run left behind plus rows the customer resumed via `app_resume` (parked/needs_me → reviewed). Resumed rows carry a status_reason starting "Resumed by".
2. Route each one straight into the APPLY stage: mint intent via `intent_create(app_id)`, then `app_transition(reviewed → applying, intent_id=<returned>)`, spawn the coordinator-level browser task with the ledger `app_id`, `url`, `ats_type`, `pdf_path`, `resume_hash`, then VERIFY with the evidence rule. Do NOT re-tailor or re-review them.
3. If a resumed row parks again (CAPTCHA still there, blocker unchanged), leave it parked with the reason — do not loop on it within this run.
4. Log one `event_log` row: `resumed_pickup` with the app ids and their prior states.
5. The resume sweep draws from the same candidate-processing ceiling as the backlog sweep above — backlog first, then resumed rows, then SCOUT claims fill the remainder.

- **JD-FETCH bridges scouts and judges.** After SCOUT, the coordinator
  collects the genuinely-new posting ids plus backlog-swept `discovered`
  rows still lacking `jd_path`, and invokes `jd-fetch` once: one
  browser fetch per posting, normalized text written to
  `goals/<campaign>/hidden_files/<run_id>/jd/<posting_id>.txt`, `jd_hash`
  (first 12 hex of sha256 over the normalized text) and `jd_path` recorded
  via `posting_upsert`. SCREEN judges receive `jd_text` read from the
  snapshot file — never a snippet, never invented. Postings whose fetch
  failed hold at SCREEN with reason `insufficient jd text`.
- **The review loop closes.** When `resume-reviewer` returns
  `approved-with-notes`, the coordinator re-invokes `resume-tailor` with the
  same inputs plus `reviewer_notes` from the verdict, then re-runs the
  reviewer on the new PDF. Notes are applied, not dropped; one re-tailor per
  posting per run, then the row proceeds or parks.
- **COMPANY-READ gives the tailor the company's vocabulary.** After PICK, for
  each distinct `company_norm` entering TAILOR, invoke `company-read` once per
  run (bounded: ≤3 public pages, ≤5 minutes, public pages only). Reuse the
  written `company/<company_norm>.json` for every posting from that company in
  the run — never re-read the same company twice in one run. Pass the returned
  `company_terms` into `resume-tailor` and into `resume-reviewer` (provenance
  check). A `hold` from company-read is not a failure: fall back to plain
  tailoring with empty `company_terms` and note it in the run's event log. The
  run never stalls on this step.
- **The reviewer gets the data its checks need.** Every `resume-reviewer`
  invocation receives `variant_path` (the picked variant's file),
  `years_matrix` (verbatim from `profile_get`, same source as fit-judge), the
  `company_terms` passed to the tailor, and `forbid_terms`
  (`profile.tailoring.forbid_terms`, default `[]`). Without these the mechanical
  anti-fabrication checks cannot run — never invoke the reviewer without them.
- **Judge output flows forward.** `fit-judge` v1.2.0 returns `required_stack` in
  its evidence; the coordinator passes it into `resume-tailor` v1.3.0 as an
  alignment signal (which true capabilities to surface, which JD requirements to
  mirror). It never authorizes naming a tool the candidate lacks — the
  reviewer's tool-claim check still governs.
- **Cover letters where they're mandatory.** At TAILOR, for postings on ATS
  types where cover letters are commonly required (greenhouse, lever,
  ashby), the coordinator invokes `cover-letter-writer` (facts only from the
  tailored resume + profile), gates the letter through `resume-reviewer` in
  cover-letter mode, and passes the approved `cover_letter_path` +
  `cover_letter_hash` to `portal-navigator` — which attaches it only if the
  form actually demands one. No approved letter, no attachment, no guessing.
- **The sweep list grows.** After SCOUT, the coordinator invokes
  `company-discovery` with the companies observed in new postings (sightings
  ≥ 2): genuinely-new names enter the companies table at tier 3 for
  `career-portal-sweep` to visit. Insert-only — no tier changes, no
  un-skipping, agencies never promoted.

### Lane construction from profile.role_types

Read `profile.role_types` at run start (via `profile_get`). Every role type
present is an enabled lane for the run — e.g. `full_time`, `w2_contract`,
`c2c_contract`.

- Lane → primary discovery:
  - `full_time` → company portals, tier 1 → 2 → 3.
  - `w2_contract` → vendor portals + company portals, tier 1 → 2 → 3.
  - `c2c_contract` → vendor portals first, tier 1 → 2 → 3, then company
    portals for direct-hire C2C listings.
- Part-time / internship, if enabled, sweep companies + boards with the soft
  H-1B policy by default — never invent a different rule for them.

### Lane-balanced tier rotation — fair rotation, not a quota

Within each tier, sweep in rounds: one turn per enabled lane per round (FT
company source → W2 vendor/company source → C2C vendor source), advancing to
the next source in each lane each round. This is **fair rotation, not a
quota** — selecting three lanes does not force a 33/33/33 split. If a lane
has no fresh results, its unused turn flows immediately to the lanes that
do; if vendor sources produce most of the qualified jobs, W2/C2C may supply
most of the submissions. Move to the next tier only when the working target
is still unmet and the current tier's useful sources are exhausted.

### Target and replenishment semantics

Targets count **verified submissions**, never raw claims:

- `remaining_run_target = run_submission_target − submitted_this_run`
- `remaining_day_target = daily_submission_target − submitted_today`
- `working_target = min(remaining_run_target, remaining_day_target)`

Duplicates, rejects, holds, and parked or failed portal attempts never reduce
the target — only verified `submitted` rows count. Finding ten postings is
not the same as submitting ten applications.

Keep a separate **candidate-processing safety ceiling** (`cap_per_run` from
the compiled config, default 10) so a batch of ten claims that yields two
submissions does not stop the run. The ceiling is shared: the backlog sweep
(oldest `discovered`/`screened` first) and the resume sweep (`reviewed`
rows) draw from it before SCOUT claims anything new; SCOUT fills only the
remainder. After each batch, reconcile the ledger via `snapshot` and
replenish from the current tier, then lower tiers, then expansion, until the
working target is met or a stop condition fires. The
SQL-enforced caps in `app_claim` remain authoritative; this ceiling is the
coordinator's own discovery budget, tracked in the run's event log.

### H-1B routing

The coordinator decides H-1B routing from `selected_lane` before invoking
judges — the bypass is a routing rule, never a judge verdict:

- `selected_lane = c2c_contract` → never invoke `h1b-judge`. Record the
  verdict note `H-1B bypass — C2C lane`; set `h1b_mode=bypass_c2c`,
  `h1b_result=not_applicable`.
- Any other lane → invoke `h1b-judge` with the profile's gate (soft per the
  current policy). Unknown record → the honest hold/check path; never an
  invented score.
- Vendor membership is not sponsorship evidence; an H-1B record does not
  prove a specific posting offers sponsorship — the JD and the application
  form stay authoritative for posting-specific restrictions.
- `eligibility-judge` v1.1.0 returns the canonical `selected_lane` per the
  multi-type rules; the coordinator feeds it into H-1B routing and passes it
  to `screening-answerer` at APPLY.

### Source expansion ladder and stop rules

The expansion order is deterministic and owned by the coordinator:

1. **Preferred dataset tiers**, ascending (tier 1 → 2 → 3).
2. **Remaining dataset tiers** — deeper known records, including tier 3,
   when the preferred tiers fall short.
3. **Open web** via the `open-web-scout` worker — profile-derived queries
   plus lane/tier context, discovery only, exact provenance recorded.
4. **Additional sources** — legitimate boards beyond the four, ATS pages,
   vendor pages, employer pages discovered from the web — through the same
   worker.

`job-board-search` and `linkedin-feed-hunting` keep their fixed contracts;
they never absorb open-web expansion. Stop a source after **3 consecutive
empty result pages** or a terminal condition (block, rate limit, unavailable
page) — a blocked source is never retried through another mechanism in the
same run. Stop discovery entirely when the working target is met, the daily
cap is reached, the run safety budget is reached, or the ordered sources are
honestly exhausted.

### Provenance through every stage

Carry this provenance on every posting from claim through VERIFY:

- `source_class`: `company_portal` | `vendor_portal` | `linkedin` |
  `job_board` | `open_web`
- `source_name`: exact board, vendor, employer, or discovery source
- `discovery_phase`: `dataset` | `web_expansion` | `additional_source`
- `source_tier`: `1` | `2` | `3` | `unknown`
- `employment_types_offered`: `[...]` (from posting evidence, never inferred)
- `selected_lane`: `full_time` | `w2_contract` | `c2c_contract` | …
- `h1b_mode`: `soft_lookup` | `bypass_c2c`
- `h1b_result`: `scored` | `unknown` | `not_applicable`

Claim-time verdict reasons name the source (`claimed — tier-1 vendor
portal`, `claimed — open-web expansion`); SCREEN reasons name the lane and
H-1B behavior (`screen passed — W2, H-1B soft score recorded`, `screen
passed — C2C, H-1B bypassed`, `held — H-1B record unknown`). New companies
or vendors observed in any phase feed `company-discovery` as before.

- **Pipelined, not batched.** Stage n+1 starts on the first ready row, not the last. Scouts still search while the first resume is tailored; appliers submit each resume the moment its approval lands.
- **One subagent per skill invocation**, spawned with a small brief: "You are the <skill name>. Read ~/workspace/skills/<path>/SKILL.md and follow it exactly. Inputs: <json>. Return ONLY the JSON verdict." Max tree depth 2: workers never spawn further workers; a stuck worker reports back to the coordinator via the store.
- **Claim, don't race.** Parallel workers never own one row: judges return verdict JSON, the coordinator calls `app_transition`.
- **Intent before submit.** Applier workers mint the intent via `intent_create(app_id)` then write `applying` + the returned `intent_id` before the submit click (portal-navigator skill). Unresolved intents are the doctor's job, not the coordinator's to re-submit.
- **Reconcile from `snapshot`, never from memory.** Every ~5 minutes and at phase boundaries, reconcile worker reports against `snapshot(run)`. Handoffs can lag 30+ minutes; wait for expected handoffs under 90 minutes old.
- **Honor operator cancellation.** At every reconciliation point, also read the run's `status`. If it is `"cancelled"` (the operator hit Cancel run on the dashboard, via the `run_cancel` action): stop spawning new workers, tell in-flight workers to stand down, record a `run_cancelled_acknowledged` event, and close out with `run_close` (status `"cancelled"`). Never start new applications after seeing the flag; never override it.
- **`years_matrix` comes only from `profile_get`.** The `years_matrix` passed to fit-judge is taken verbatim from the profile. If the profile has no years matrix (the profile may state only overall experience, e.g. "10+ years"), pass null/omit the field. NEVER fabricate per-skill years — an invented matrix is a data-integrity violation.
- **Briefs cite the ledger, never summaries.** Every brief handed to an applier or browser task cites the ledger `app_id` and the `url` copied VERBATIM from the ledger row (read via `snapshot`) — never from run summaries, memory, or worker handoffs. The executor must re-read the ledger row via `snapshot` before acting and refuse if the row's URL differs from the brief.
- **Harness-core outage.** If `harness-core` is unreachable, workers append to the run's `spillover.jsonl` (`goals/<g>/hidden_files/<run>/spillover.jsonl`); the doctor replays it later via `spillover_replay`. Never invent state the store didn't confirm.
- **Report only what's new.** Silence by default; the daily-report skill decides what reaches the customer. The coordinator's report to main is: submitted, parked/blocked with reasons, needs-me decisions — counts from `run_close`, never invented.

### Status reasons, posting verdicts, vendor-prep

Every decision the run makes is recorded with its reason — the dashboard's
Reason column and run-detail verdicts read from these, never from event
payloads.

- **`reason` on every `app_transition`.** Every state edge carries a short
  human-readable reason string: the judge's `reasons` condensed to one line,
  or the coordinator's own decision. Examples: `rejected: non-Houston
  location`, `held: years_matrix missing`, `held: ambiguous location`,
  `submitted: confirmation captured`, `submitted: screenshot missing —
  confirmation text captured`, `parked: CAPTCHA checkpoint`. Never an empty
  string; when the cause is genuinely unknown, `held: under review`.
  (v2.17 backstop: if `reason` is omitted on a terminal/attention transition
  — `blocked`, `rejected`, `parked`, `needs_me`, `submitted`, `confirmed` —
  the server derives it from the transition evidence, so the dashboard
  Reason column never goes blank. Pass the reason anyway; the derivation is
  a safety net, not the primary path.)
- **`posting_verdict` per posting per stage.** Call for every posting the run
  touches:
  - At claim time (`app_claim`): `stage="scout"`, `verdict="passed"`,
    `reason="claimed into pipeline"`.
  - At SCREEN, for each judged posting: `stage="screen"`, `verdict` = the
    judge outcome mapped to `passed` / `held` / `rejected`, `reason` = the
    judge's reasons condensed (e.g. `rejected: contract role vs profile
    role_types`, `held: H-1B sponsorship unknown — soft gate`).
  - For postings explicitly dropped before claim (duplicate of an in-flight
    application, already applied): `stage="scout"`, `verdict="held"` or
    `"rejected"` with the honest reason.
- **vendor-prep after submit.** Once an application reaches `submitted` (after
  the evidence rule passes), spawn one worker subagent: "You are the
  vendor-prep skill. Read ~/workspace/skills/vendor-prep/SKILL.md and follow
  it exactly. Inputs: {"app_id": "<app_id>"}. Return ONLY the JSON verdict."
  The skill writes the talking-points file and calls `talking_points_attach`
  itself. A `hold` from vendor-prep (e.g. JD unresolvable) is noted in the
  run's event log and never blocks the run or the application.

## Token usage capture (measured, never invented)

Token numbers are MEASURED from the platform's own metering — never estimated, scaled, or backfilled.

**Track worker agent ids.** Every `subagent.spawn` result returns an `agent_id`. Keep a map of `worker_agent_id → skill_name` for the whole run. Derive your own agent id once (after the first spawn) with:

```sql
SELECT parent_agent_id FROM agent.subagent_spawns WHERE child_agent_id = '<one worker agent_id>' LIMIT 1
```

**Measure just before `run_close`.** Run this via `muse.db` (one bounded SELECT):

```sql
SELECT t.agent_id,
       sum(t.input_tokens)  AS in_tok,
       sum(t.output_tokens) AS out_tok
FROM agent.agent_message_token_usage t
WHERE t.agent_id IN (
  SELECT '<coordinator_agent_id>'
  UNION
  SELECT descendant_id FROM agent.agent_ancestors WHERE ancestor_id = '<coordinator_agent_id>'
)
GROUP BY t.agent_id
```

This covers the coordinator, every worker subagent, and any grandchildren (one row per agent that has flushed usage). Browser-task usage is included: APPLY-phase browser driving is coordinator-level, so it lands on the coordinator's own agent id.

**Record.** Build `stages` = `{"coordinator": <own total>}` plus one entry per worker (`<skill_name>: <its total>`; merge repeat spawns of the same skill by summing). Sum all agents for `input_tokens` / `output_tokens` / `total_tokens`. Then call:

```json
token_record({"run_id":"...","campaign_id":"...","date":"YYYY-MM-DD",
  "input_tokens":<int>,"output_tokens":<int>,"total_tokens":<int>,
  "stages":{...},"usage_reported":true})
```

**Unreported, not zero.** If the query returns zero rows (usage rows can lag a few minutes behind the run) or `muse.db` is unreachable, call `token_record` with `input_tokens: 0, output_tokens: 0, total_tokens: 0, stages: {}` and **`"usage_reported": false`**. The Runs tab renders such runs as "— (unreported)". A run can never genuinely use 0 tokens, so 0 without the flag would be a lie.

**Hard limits for telemetry:**
- Never invent a number: no estimates from tool-call counts, no per-model averages, no scaling from a sibling run.
- Never backfill historical runs. Runs closed before this change keep `tokens_reported=false` and display as unreported — the only pre-existing aggregates are the subscription-level daily numbers on the customer's Muse usage page, which are account-wide, not per-run.
- The figure is "measured at close": trailing usage that flushes after `run_close` is not captured. Say so if asked; do not re-open runs to chase it.
- If the coordinator is NOT a subagent (interactive/main-agent run), there is no agent subtree to measure: record `usage_reported: false`.

## APPLY phase — browser ownership

Browser driving is coordinator-level ONLY.

- The coordinator spawns the browser task itself for each application (max 2 concurrent, per the appliers cap), passing only `app_id`, `url` (ledger-verbatim), `ats_type`, `pdf_path`, and `resume_hash`.
- The coordinator NEVER delegates browser driving to a worker subagent. Worker subagents in APPLY handle store-only steps: intent minting via `intent_create`, upload hash verification, outcome transitions, and `approval_enqueue`.
- Handoffs that need browser work return a browser brief UP to the coordinator instead of attempting it — the worker writes the brief (with ledger `app_id` and ledger-verbatim `url`) and the coordinator performs the browser driving.

## Coordinator browser capability (one session per run)

The coordinator runs with its own browser capability for the run's
duration — SCOUT probes, JD-FETCH, and APPLY browser work are the
coordinator's own browser tasks, never bounced back to the parent
undelegated.

- The parent spawns the coordinator with browser access bound to the run
  (one browser session per run). The coordinator spawns, steers, and
  closes its own browser tasks inside that session.
- The parent may use that browser session at any time — to assist with an
  OTP step, inspect a stuck task, or take over driving. The coordinator
  treats parent browser activity as help, not interference: it reconciles
  via `snapshot` before its next browser step and never fights the parent
  for control of a page.
- A coordinator browser task that the parent has taken over is not
  re-driven by the coordinator until the parent hands it back (via the
  task handoff or an explicit note in the run's context).

## APPLY phase — evidence rule

No application is marked `submitted` without complete evidence:

- Canonical evidence directory: `goals/<campaign>/hidden_files/<run_id>/screenshots/`.
- Required per submit: confirmation screenshot `<app_id>_confirmation.png`, confirmation text
  `<app_id>_confirmation.txt` (verbatim string from the confirmation page), the exact resume
  file uploaded (`resume_path`) and its sha256 (`resume_hash`, re-verified at upload).
- The coordinator verifies the screenshot file exists on disk and the confirmation text is
  non-empty BEFORE calling `app_transition(app_id, applying → submitted, ...)`. If the
  screenshot capture failed, the transition carries `screenshot_path: null` with the reason
  recorded honestly — never a path to a file that does not exist. The transition's `reason`
  reflects the evidence state: `submitted: confirmation captured` when both exist,
  `submitted: screenshot missing — confirmation text captured` otherwise.
- The `event_log` exit row for the applier records all evidence paths before the transition,
  so evidence survives even if the transition write fails.

## Output

```json
{"skill":"run-coordinator","version":"1.12.0","verdict":"pass|hold|reject","score":0-100,
 "reasons":["run closed clean","3 submitted","1 parked: CAPTCHA"],
 "evidence":{"run_id":"...","campaign_id":"...","counts":{"submitted":3,"blocked":0,"parked":1,"needs_me":0},"tokens":{"input":19445162,"output":104161,"total":19549323,"reported":true}},
 "tokens":19549323}
```

- `pass`: run closed clean. `hold`: run closed with rows in `needs_me` / pending approvals awaiting the customer. `reject`: run failed (store unreachable and spillover incomplete, or `run_close` refused and could not be resolved).

## Hard limits

- Only the coordinator calls `app_transition`. Workers return verdicts; they never transition rows.
- Caps come from `app_claim` in SQL. Never enforce, estimate, or relax caps in prompt text.
- `run_close` refuses while any row is `applying` without an outcome; resolve (verify-only check) or fail the run — never force-close.
- Never re-submit an application while an intent is unresolved.
- Never edit cron bodies or recompile schedules; that is the compile-schedules skill's job.
- No personal data in this file; customer facts come from `profile_get` and Inputs only.
- Append one `event_log` row on exit, always.
