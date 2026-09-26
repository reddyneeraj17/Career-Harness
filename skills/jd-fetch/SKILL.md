<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: jd-fetch
version: "1.0.0"
description: Fetches one job description per new posting between SCOUT and SCREEN — normalizes the text, writes the JD snapshot, and records jd_path + jd_hash on the posting.
---

# jd-fetch

## Why this exists

Scouts produce postings with a URL and a `jd_hash` placeholder; every judge
(eligibility, fit), the resume picker, the tailor, and the reviewer consume
`jd_text`. This skill bridges them: one browser fetch per genuinely-new
posting, normalized text, snapshot on disk, hash over the normalized text.

## Inputs

```json
{
  "campaign_id": "job_board",
  "run_id": "run-2026-09-26-001",
  "postings": [
    {"posting_id": "p-abc123", "url": "https://...", "source": "job_board:indeed"}
  ]
}
```

`postings` contains only the genuinely-new ids the scout's `posting_upsert`
returned. Never re-fetch a posting that already has `jd_path` + `jd_hash`.

## Procedure

1. **Fetch.** Open the posting URL in the browser (human pacing, one page at
   a time). For career-portal postings the careers page itself is the JD; for
   board postings follow through to the description — never settle for the
   two-line board snippet.
2. **Extract + normalize.** Pull the main description text: strip nav,
   headers, footers, cookie banners, and "similar jobs" rails. Collapse
   whitespace, drop empty lines, keep the requirement/qualification sections
   intact. Do not summarize, do not rephrase — the judges read this verbatim.
3. **Snapshot.** Write the normalized text to
   `goals/<campaign_id>/hidden_files/<run_id>/jd/<posting_id>.txt`
   (UTF-8, `.txt` only).
4. **Hash.** `jd_hash` = first 12 hex chars of sha256 over the normalized
   text — the same convention `resume-reviewer` uses for its cache key.
5. **Record.** Call `posting_upsert` with
   `{posting_id, company, role, url, source, jd_path, jd_hash}` so the row
   carries the snapshot location and hash. (`posting_upsert` updates existing
   rows; the posting keeps its original `posting_id` and `first_seen`.)

## Actions called

- `posting_upsert(rows)` — with `jd_path` + `jd_hash` filled in.
- `event_log` — exactly one row on exit with the verdict envelope and token count.

## Output

```json
{"skill":"jd-fetch","version":"1.0.0","verdict":"pass|hold|reject",
 "score":0-100,"reasons":["..."],
 "evidence":{"fetched":8,"snapshots":["goals/job_board/hidden_files/<run>/jd/p-abc123.txt"],
             "failed":[{"posting_id":"p-def456","reason":"login wall"}]},
 "tokens":1234}
```

- `pass` → every posting fetched and recorded.
- `hold` → some postings failed (login wall, 404, JS-only ATS with no
  readable text). Failed postings are listed in `evidence.failed`; they hold
  at SCREEN with reason `insufficient jd text` — the fetch is never faked.
- `reject` → zero postings fetched (all failed).

## Hard limits

- **One fetch per posting.** No retries beyond one polite reload; no hammering.
- **Never invent JD text.** Empty or unreadable page → record the failure,
  not a guess. A snippet is not a description — if only the snippet is
  reachable, that posting holds.
- **No auth bypass.** A login wall is a failure reason, not a puzzle. Never
  create accounts or enter credentials here — account setup is the
  `account-connector` skill's job at onboarding.
- **Snapshots are write-once.** If `jd_path` already exists for a posting,
  skip it — never re-fetch inside the same run.
