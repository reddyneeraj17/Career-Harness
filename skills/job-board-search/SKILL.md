---
name: job-board-search
version: "1.1.0"
description: Scout skill for the job_board campaign — runs targeting-derived search queries across the available job boards (Dice, Indeed, Glassdoor, ZipRecruiter) and posts deduplicated results for screening.
---

# job-board-search

## Inputs

```json
{
  "campaign_id": "job_board",
  "run_id": "run-2026-09-26-001",
  "boards": ["dice", "indeed", "ziprecruiter"],
  "queries": [
    {"board": "indeed", "query": "senior data engineer fintech", "location": "Houston, TX"},
    {"board": "dice", "query": "\"staff data engineer\" healthcare", "location": "remote"}
  ],
  "locations": ["Houston, TX", "Dallas, TX", "Austin, TX", "remote"]
}
```

`boards` is the availability list the coordinator built from the credentials
vault (see below) — only boards with a stored login appear. Every entry in
`queries[]` names one of those boards. Queries are pre-built by the
coordinator from profile targeting; the worker never invents new search
terms. Profile `targeting` includes `titles` (target job titles) alongside
`seniority` and `industries`: the coordinator builds each query from
`titles` × `seniority` × `industries` (e.g. `"Staff Data Engineer"
healthcare`), plus locations — but only for boards in `boards[]`. The worker
uses the passed `queries[]` verbatim.

## Board availability

The four searchable boards are **dice, indeed, glassdoor, ziprecruiter**.
A board is searchable only when its login sits in the customer's credentials
vault (saved at onboarding by the `account-connector` skill). The coordinator
checks `credentials.list` (metadata only — never values) at run start and
passes the available subset as `boards[]`.

- **Missing login → skip the board, search the rest.** A board with no vault
  login is simply absent from `boards[]`; its queries are never built and the
  run proceeds on the available boards. A skipped board is a customer
  decision (or an account not yet connected) — honor it, don't stall the run.
- **Zero boards available → the run holds** before SCOUT with `needs_me=true`,
  naming the missing accounts and pointing at `account-connector`.
- **Mid-run auth wall** (stale session despite a vault login): skip that
  board for this run, finish the rest, and record it in
  `evidence.boards_skipped` with the reason. `reject` only when every board
  failed; `hold` when partial results exist but a board behaved anomalously
  (rate-limit warnings, CAPTCHA) and results may be incomplete.

## Actions called

- `posting_upsert(rows)` — one row per result: `{company, role, url, source: "job_board:<board>", jd_hash, first_seen}`. Dedupes on `posting_id` and `(company_norm, role_norm)`; returns only genuinely-new ids.
- `event_log(run_id, type, payload)` — **exactly one row on exit** with the verdict envelope and token count.

Skills never touch SQLite directly — only these actions.

## Output

The verdict envelope, nothing else:

```json
{
  "skill": "job-board-search",
  "version": "1.1.0",
  "verdict": "pass",
  "score": 90,
  "reasons": ["8 new postings from 12 queries", "2 queries returned no results", "glassdoor skipped: no vault login"],
  "evidence": {
    "boards_available": ["dice", "indeed", "ziprecruiter"],
    "boards_skipped": [{"board": "glassdoor", "reason": "no vault login"}],
    "queries_run": 12,
    "queries_no_results": 2,
    "postings_new": 8,
    "new_posting_ids": ["p-abc123"],
    "ranked_postings": [
      {"posting_id": "p-abc123", "company": "Acme Health", "role": "Senior Data Engineer", "url": "https://...", "source_board": "indeed"}
    ]
  },
  "tokens": 22100
}
```

- `verdict: pass` when all queries ran (even with zero new postings). `reject` when the sweep itself failed (board down, auth wall) — with the reason. `hold` when partial results exist but a board behaved anomalously (rate-limit warnings, CAPTCHA) and results may be incomplete.
- `score` = sweep health 0–100: queries completed / queries planned, minus penalties for errors.
- `ranked_postings` lists only the genuinely-new ids returned by `posting_upsert`, ordered by result relevance (top result first per query). Every entry carries `source_board` and `url`.

## Hard limits

- **Queries built only from profile targeting, boards only from the vault.**
  Use the passed `queries[]` verbatim. Never invent new keywords, boards, or
  locations. Never attempt a board outside the passed `boards[]` — no
  credential in the vault means no visit, no guessing, no account creation.
- **Record source board + url per posting.** Every posted row carries `source: "job_board:<board>"` and a full `url`. Rows missing either are dropped, not guessed.
- **`posting_upsert` dedupes — report only the genuinely-new ids it returns.** Never re-report known ids as new; never claim a posting was "found" when the action says it's a duplicate.
- **Discovery only.** Never apply, never create accounts, never upload a resume on a board.
- **Human pacing.** Realistic delays between queries and page loads; no parallel scraping tabs.
- **Never invent facts.** Unclear company/role → drop the row. Unknown posting date → omit it, never fabricate one.
- **No personal data in this skill.** Customer facts come from `profile_get` only (the coordinator injects the targeting into `queries`).
- **On exit, one `event_log` row** with verdict + token count. Observability is not optional.
