<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: run-coordinator
version: "1.10.0"
description: Orchestrates one campaign run through the 7-stage pipeline, owns all state transitions, enforces caps, and closes the run.
---

# run-coordinator

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
  "run_id": "<optional; minted by run_open if absent>"
}
```

The thin cron body invokes this skill with the `campaign_id`. The coordinator reads the campaign's caps, gates, and skill chain from `profile_get` and `snapshot`.

## Actions called

- `run_open` — open the run (mints `run_id` when not supplied); stamps the kit version.
- `run_close` — close the run with counts. **Refuses** if any application row is still `applying` without an outcome.
- `token_record` — record the run's measured token usage (see "Token usage capture" below). Call AFTER measuring, BEFORE `run_close`.
- `app_claim` — claim postings into the pipeline; caps (per run, per day) enforced in SQL. Never count caps in a prompt.
- `app_transition` — the ONLY writer of application state edges. Judges return verdicts; the coordinator transitions. Every call carries `reason`: a short human-readable string (the judge's reasons condensed, or the coordinator's own decision), e.g. `rejected: non-Houston location`, `held: years_matrix missing`, `submitted: confirmation captured`. The reason is stored on the application row and shown in the dashboard.
- `posting_verdict` — record one verdict row per posting per stage (`scout` / `screen`): `{posting_id, run_id, stage, verdict, reason}`. Called for every posting the run touches (see "Status reasons, posting verdicts, vendor-prep").
- `snapshot` — read-only reconciliation of run state, about every 5 minutes and at phase boundaries.
- `event_log` — one exit row per skill exit is required of workers; the coordinator appends one final row with the run verdict and token totals.

## Pipeline orchestration

### Run-start login gate (before SCOUT, every run)

Campaigns stall mid-run when a login wall appears. Check up front instead:

1. Call `credentials.list` (metadata only — never values) and each mailbox
   connector's status check.
2. Required logins by campaign:
   - `linkedin_feed` → LinkedIn
   - `job_board` → per-board (see below): dice, indeed, glassdoor,
     ziprecruiter — each checked individually against the vault
   - `career_portal` → none (public careers pages; ATS logins only if a portal demands it)
   - `email_scan` → Outlook (or Gmail, if the customer connected it)
   - `linkedin_replies` → LinkedIn
3. If anything required is missing: do NOT open the run. Hold with
   `needs_me=true` and one message naming the missing account(s) and pointing
   the customer at the `account-connector` skill. A skipped account is a
   customer decision — honor it, don't re-prompt inside the run.

### Job-board availability (per-board, before SCOUT)

The `job_board` campaign searches dice, indeed, glassdoor, and ziprecruiter —
but only the boards whose logins are actually in the credentials vault:

1. Match each saved login's site/host from `credentials.list` against the
   four board domains. `boards_available` = the boards with a stored login.
2. **Zero available → hold.** Do not open the run; `needs_me=true` naming the
   four boards and pointing at `account-connector`.
3. **Some available → run on those.** Build scout queries only for
   `boards_available`, pass `boards: [...]` to `job-board-search`, and note
   the skipped boards in the run's `event_log` row. The run never stalls on a
   board nobody connected.

Stages: SCOUT -> JD-FETCH -> SCREEN -> PICK -> COMPANY-READ -> TAILOR -> REVIEW GATE -> APPLY -> VERIFY.

- **JD-FETCH bridges scouts and judges.** After SCOUT, the coordinator
  collects the genuinely-new posting ids and invokes `jd-fetch` once: one
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

- **Pipelined, not batched.** Stage n+1 starts on the first ready row, not the last. Scouts still search while the first resume is tailored; appliers submit each resume the moment its approval lands.
- **One subagent per skill invocation**, spawned with a small brief: "You are the <skill name>. Read ~/workspace/skills/<path>/SKILL.md and follow it exactly. Inputs: <json>. Return ONLY the JSON verdict." Max tree depth 2: workers never spawn further workers; a stuck worker reports back to the coordinator via the store.
- **Claim, don't race.** Parallel workers never own one row: judges return verdict JSON, the coordinator calls `app_transition`.
- **Intent before submit.** Applier workers write `applying` + `intent_id` before the submit click (portal-navigator skill). Unresolved intents are the doctor's job, not the coordinator's to re-submit.
- **Reconcile from `snapshot`, never from memory.** Every ~5 minutes and at phase boundaries, reconcile worker reports against `snapshot(run)`. Handoffs can lag 30+ minutes; wait for expected handoffs under 90 minutes old.
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
- The coordinator NEVER delegates browser driving to a worker subagent. Worker subagents in APPLY handle store-only steps: intent write via `app_transition`, upload hash verification, outcome transitions, and `approval_enqueue`.
- Handoffs that need browser work return a browser brief UP to the coordinator instead of attempting it — the worker writes the brief (with ledger `app_id` and ledger-verbatim `url`) and the coordinator performs the browser driving.

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
{"skill":"run-coordinator","version":"1.3.0","verdict":"pass|hold|reject","score":0-100,
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
