---
name: job-board-search
version: "1.0.0"
description: Scout skill for the job_board campaign — runs targeting-derived search queries across job boards and posts deduplicated results for screening.
---

# job-board-search

## Inputs

```json
{
  "campaign_id": "job_board",
  "run_id": "run-2026-09-26-001",
  "queries": [
    {"board": "indeed", "query": "senior data engineer fintech", "location": "Houston, TX"},
    {"board": "dice", "query": "\"staff data engineer\" healthcare", "location": "remote"}
  ],
  "locations": ["Houston, TX", "Dallas, TX", "Austin, TX", "remote"]
}
```

Queries are pre-built by the coordinator from profile targeting; the worker never invents new search terms.

## Actions called

- `posting_upsert(rows)` — one row per result: `{company, role, url, source: "job_board:<board>", jd_hash, first_seen}`. Dedupes on `posting_id` and `(company_norm, role_norm)`; returns only genuinely-new ids.
- `event_log(run_id, type, payload)` — **exactly one row on exit** with the verdict envelope and token count.

Skills never touch SQLite directly — only these actions.

## Output

The verdict envelope, nothing else:

```json
{
  "skill": "job-board-search",
  "version": "1.0.0",
  "verdict": "pass",
  "score": 90,
  "reasons": ["8 new postings from 12 queries", "2 queries returned no results"],
  "evidence": {
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

- **Queries built only from profile targeting.** Use the passed `queries[]` verbatim. Never invent new keywords, boards, or locations.
- **Record source board + url per posting.** Every posted row carries `source: "job_board:<board>"` and a full `url`. Rows missing either are dropped, not guessed.
- **`posting_upsert` dedupes — report only the genuinely-new ids it returns.** Never re-report known ids as new; never claim a posting was "found" when the action says it's a duplicate.
- **Discovery only.** Never apply, never create accounts, never upload a resume on a board.
- **Human pacing.** Realistic delays between queries and page loads; no parallel scraping tabs.
- **Never invent facts.** Unclear company/role → drop the row. Unknown posting date → omit it, never fabricate one.
- **No personal data in this skill.** Customer facts come from `profile_get` only (the coordinator injects the targeting into `queries`).
- **On exit, one `event_log` row** with verdict + token count. Observability is not optional.
