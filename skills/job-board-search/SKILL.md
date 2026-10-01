<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: job-board-search
version: "1.3.0"
description: Scout skill for the job_board campaign — runs lane-specific, targeting-derived search queries across the available job boards (Dice, Indeed, Glassdoor, ZipRecruiter) and posts deduplicated results with employment-type evidence for screening.
---

# job-board-search

> Changelog 1.3.0: Session probe + in-run re-login (§6) — at sweep start each board's session is probed and classified `healthy` / `logged_out` / `challenge_wall`; `logged_out` boards get one re-login attempt with the vault's saved login (email OTP via the connected Outlook mailbox when challenged). Dead boards are reported distinctly per state, never silently skipped; zero usable boards → `reject` so the coordinator fails the run loudly.
> Changelog 1.2.0 (2026-09-27): Accepts lane-specific profile-derived queries (`lane` on each query); returns employment-type evidence per posting so the lane can be classified without guessing. The four-board access contract is unchanged — open-web expansion is explicitly NOT this skill's job; the coordinator routes expansion through `open-web-scout`.

## Inputs

```json
{
  "campaign_id": "job_board",
  "run_id": "run-2026-09-26-001",
  "boards": ["dice", "indeed", "ziprecruiter"],
  "queries": [
    {"board": "indeed", "lane": "full_time", "query": "senior data engineer fintech", "location": "Houston, TX"},
    {"board": "dice", "lane": "w2_contract", "query": "\"staff data engineer\" healthcare contract", "location": "remote"},
    {"board": "dice", "lane": "c2c_contract", "query": "\"data engineer\" c2c", "location": "remote"}
  ],
  "locations": ["Houston, TX", "Dallas, TX", "Austin, TX", "remote"]
}
```

`boards` is the availability list the coordinator built from the credentials
vault (see below) — only boards with a stored login appear. Every entry in
`queries[]` names one of those boards. Queries are pre-built by the
coordinator from profile targeting × enabled lanes; the worker never invents new search
terms. Profile `targeting` includes `titles` (target job titles) alongside
`seniority` and `industries`: the coordinator builds each query from
`titles` × `seniority` × `industries` × `lane` (e.g. `"Staff Data Engineer"
healthcare` for lane `full_time`, `"Data Engineer" contract` for lane
`w2_contract`), plus locations — but only for boards in `boards[]`. The worker
uses the passed `queries[]` verbatim.

## Board availability

The four searchable boards are **dice, indeed, glassdoor, ziprecruiter**.
A board is searchable only when its login sits in the customer's credentials
vault (saved at onboarding by the `account-connector` skill). `boards[]` is
the availability list the parent/coordinator passes in — computed from the
credentials vault where that namespace exists (main-agent context). Where it
does not (worker context), the coordinator passes all four boards and the
session probe below is the source of truth: a board with no usable session
and no saved login to re-login with is reported `logged_out`, and the run
holds with `needs_me` pointing at `account-connector`.

- **Missing login → skip the board, search the rest.** A board with no vault
  login is simply absent from `boards[]`; its queries are never built and the
  run proceeds on the available boards. A skipped board is a customer
  decision (or an account not yet connected) — honor it, don't stall the run.
- **Zero boards available → the run holds** before SCOUT with `needs_me=true`,
  naming the missing accounts and pointing at `account-connector`.

## Session probe + in-run re-login (at sweep start, every run)

A vault login is not a live session. Before running any query, probe each
board in `boards[]` with the browser task and classify it — report
`logged_out` and `challenge_wall` distinctly, never as one "auth issue":

1. **Probe.** Open the board's homepage or account page.
   - Signed-in markers (profile name, "Sign out", saved searches) → `healthy`.
   - Login form / "Sign in" prompt with no challenge → `logged_out`.
   - "Verify you are human", Cloudflare/PerimeterX challenge, CAPTCHA wall → `challenge_wall`. Do not attempt to bypass it — record and move on.
2. **Re-login** (only on `logged_out`, one attempt per board per run).
   Apply the board's saved login from the credentials vault — in-run
   re-login with saved credentials is authorized. If the board sends an
   email OTP, read the latest code from the connected Outlook mailbox and
   enter it — OTP-via-mailbox is authorized. Then re-probe:
   - Signed in → `healthy` (`relogin_attempted: true, relogin_ok: true`).
   - Challenge appears mid-login → `challenge_wall`.
   - Credentials rejected → stays `logged_out` (`relogin_ok: false`).
   Never loop retries; never try a board outside `boards[]`.
3. **Sweep only `healthy` boards.** Record per board
   `{board, session, relogin_attempted, relogin_ok}` in
   `evidence.boards_session`.
4. **Verdict rules (no silent skips).**
   - Every board healthy (natively or via re-login) → normal sweep.
   - Some boards dead → sweep the live ones; verdict `hold`, reasons naming
     each dead board and its state (`glassdoor=challenge_wall`,
     `dice=logged_out after failed re-login`). Results may be incomplete.
   - Zero boards usable → verdict `reject`,
     reason `all boards unusable: <board>=<state>, ...`. The coordinator
     fails the run loudly on this — a zero-scan run is never reported as a
     pass.
- **Dead sessions are handled by the probe above, not skipped mid-run.**
  A board that degrades mid-sweep (session dies after a healthy probe) is
  recorded in `evidence.boards_skipped` with the reason and its queries are
  abandoned for this run — `reject` only when every board failed; `hold`
  when partial results exist but a board behaved anomalously (rate-limit
  warnings, CAPTCHA) and results may be incomplete.

## Actions called

- `posting_upsert(rows)` — one row per result: `{company, role, url, source: "job_board:<board>", jd_hash, first_seen}`. Dedupes on `posting_id` and `(company_norm, role_norm)`; returns only genuinely-new ids.
- `event_log(run_id, type, payload)` — **exactly one row on exit** with the verdict envelope and token count.

Skills never touch SQLite directly — only these actions.

## Output

The verdict envelope, nothing else:

```json
{
  "skill": "job-board-search",
  "version": "1.2.0",
  "verdict": "pass",
  "score": 90,
  "reasons": ["8 new postings from 12 queries", "2 queries returned no results", "glassdoor skipped: no vault login"],
  "evidence": {
    "boards_available": ["dice", "indeed", "ziprecruiter"],
    "boards_session": [{"board": "dice", "session": "healthy", "relogin_attempted": true, "relogin_ok": true}, {"board": "indeed", "session": "healthy", "relogin_attempted": false}, {"board": "ziprecruiter", "session": "challenge_wall", "relogin_attempted": false}],
    "boards_skipped": [{"board": "glassdoor", "reason": "no vault login"}],
    "queries_run": 12,
    "queries_no_results": 2,
    "postings_new": 8,
    "new_posting_ids": ["p-abc123"],
    "ranked_postings": [
      {"posting_id": "p-abc123", "company": "Acme Health", "role": "Senior Data Engineer", "url": "https://...", "source_board": "indeed", "lane": "full_time",
       "employment_type_evidence": "board listing field: 'Full-time'"}
    ]
  },
  "tokens": 22100
}
```

- `verdict: pass` when all queries ran (even with zero new postings). `reject` when the sweep itself failed (board down, auth wall) — with the reason. `hold` when partial results exist but a board behaved anomalously (rate-limit warnings, CAPTCHA) and results may be incomplete.
- `score` = sweep health 0–100: queries completed / queries planned, minus penalties for errors.
- `ranked_postings` lists only the genuinely-new ids returned by `posting_upsert`, ordered by result relevance (top result first per query). Every entry carries `source_board`, `url`, the query's `lane`, and `employment_type_evidence` — the board's own employment-type field or posting snippet quoted verbatim (e.g. `board field: 'Contract'`, `snippet: '…w2 only…'`). When the board shows no type information, write `"unknown"` — never classify by keyword guesswork.

## Hard limits

- **Queries built only from profile targeting × enabled lanes, boards only from the vault.**
  Use the passed `queries[]` verbatim. Never invent new keywords, boards, or
  locations. Never attempt a board outside the passed `boards[]` — no
  credential in the vault means no visit, no guessing, no account creation.
- **This skill never absorbs open-web expansion.** If the coordinator needs
  sources beyond the four boards, it spawns `open-web-scout` — a separate
  bounded worker. This skill searches only `boards[]`.
- **Record source board + url + employment-type evidence per posting.** Every posted row carries `source: "job_board:<board>"` and a full `url`. Rows missing either are dropped, not guessed. `employment_type_evidence` is a verbatim quote from the board's type field or snippet, or `"unknown"`.
- **`posting_upsert` dedupes — report only the genuinely-new ids it returns.** Never re-report known ids as new; never claim a posting was "found" when the action says it's a duplicate.
- **Discovery only.** Never apply, never create accounts, never upload a resume on a board.
- **Human pacing.** Realistic delays between queries and page loads; no parallel scraping tabs.
- **Never invent facts.** Unclear company/role → drop the row. Unknown posting date → omit it, never fabricate one.
- **No personal data in this skill.** Customer facts come from `profile_get` only (the coordinator injects the targeting into `queries`).
- **On exit, one `event_log` row** with verdict + token count. Observability is not optional.
