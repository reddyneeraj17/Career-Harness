<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: open-web-scout
version: "1.0.0"
description: Bounded discovery-only scout for source expansion beyond fixed contracts — runs profile-derived open-web queries per enabled lane, respects source stop conditions, and returns genuinely-new posting evidence with exact provenance.
---

# open-web-scout

> Changelog 1.0.0 (2026-09-27): Initial skill. Owns the expansion phases of the source ladder (open web, then additional legitimate sources) so `job-board-search` and `linkedin-feed-hunting` keep their fixed contracts. Discovery only; never applies, logs in, or bypasses access controls.

## Inputs

```json
{
  "campaign_id": "career_portal",
  "run_id": "run-2026-09-27-001",
  "queries": [
    {"query": "\"senior data engineer\" fintech houston jobs", "lane": "full_time", "tier_context": 2},
    {"query": "\"data engineer\" w2 contract healthcare jobs", "lane": "w2_contract", "tier_context": 2},
    {"query": "\"data engineer\" c2c remote jobs", "lane": "c2c_contract", "tier_context": 2}
  ],
  "phase": "web_expansion|additional_source",
  "max_pages_per_source": 10,
  "locations": {"us_only": true, "remote": "ok", "metros": ["Houston", "Dallas", "Austin"]}
}
```

`queries` are pre-built by the coordinator from profile targeting × enabled
lanes × the tier context being expanded into (titles, seniority, industry,
location, lane); the worker never invents search terms. `phase` tells the
skill which expansion rung it is on: `web_expansion` (search-engine result
pages) or `additional_source` (a specific legitimate board, ATS page, vendor
page, or employer page the coordinator named). The worker runs the queries
in order and stops at the run's time budget.

## Actions called

- `posting_upsert(rows)` — one row per discovered posting: `{company, role, url, source: "open_web", jd_hash, first_seen}`. Returns only genuinely-new ids.
- `event_log(run_id, type, payload)` — **exactly one row on exit** with the verdict envelope and token count.

Skills never touch SQLite directly — only these actions.

## Output

The verdict envelope, nothing else:

```json
{
  "skill": "open-web-scout",
  "version": "1.0.0",
  "verdict": "pass",
  "score": 75,
  "reasons": ["6 new postings from 9 queries", "1 source stopped after 3 consecutive empty pages", "1 source rate-limited — recorded as terminal for this run"],
  "evidence": {
    "queries_run": 9,
    "queries_no_results": 3,
    "postings_found": 14,
    "postings_new": 6,
    "new_posting_ids": ["p-abc123"],
    "postings_detail": [
      {"posting_id": "p-abc123", "company": "Acme Health", "role": "Senior Data Engineer", "url": "https://...",
       "source_class": "open_web", "source_name": "google: senior data engineer fintech houston jobs",
       "discovery_phase": "web_expansion", "source_tier": "unknown", "lane": "full_time",
       "employment_type_evidence": "snippet: 'Full-time · Houston, TX'"}
    ],
    "sources_exhausted": [{"source": "example-boardsite.com", "reason": "3 consecutive empty pages"}],
    "sources_terminal": [{"source": "another-site.com", "reason": "rate limit (429) — not retried"}]
  },
  "tokens": 31200
}
```

- `source_tier` is `unknown` unless the posting cross-references a known
  company/vendor record; the worker never assigns a tier by guessing.
- `employment_type_evidence` is a verbatim quote from the snippet or page
  (or `"unknown"`); lane classification itself is the judges' job from JD
  evidence.
- `verdict: pass` when the queries ran within budget (even with zero new
  postings). `reject` only when the expansion itself failed wholesale.
  `hold` when partial results exist but a source behaved anomalously and
  results may be incomplete.
- `score` = sweep health 0–100: queries completed / queries planned, minus
  penalties for terminal sources.

## Hard limits

- **Discovery only.** Never apply, never fill a form, never create an
  account, never log in anywhere. Public pages and search results only.
- **Stop a source after 3 consecutive empty result pages.** Record it in
  `sources_exhausted` and move on — never burn the run budget on a dry
  source.
- **Blocks and rate limits are terminal for that source in this run.**
  Record in `sources_terminal` and move on. Never retry through another
  mechanism, proxy, or URL variant in the same run — a block is a stop
  sign, not a puzzle.
- **US-only roles per `profile.locations`.** `us_only: true` means discard
  non-US postings at discovery; remote postings are kept only when
  `remote: "ok"`.
- **Queries verbatim.** Use the passed `queries[]` as given. Never invent
  new keywords, never widen titles or locations beyond the profile.
- **Every posting needs `company`, `role`, `url`, `source`.** Incomplete
  rows are dropped and counted in `reasons`, never posted. Never invent a
  company, role, or URL.
- **Human pacing.** Realistic delays between searches and page loads; no
  parallel scraping tabs.
- **No personal data in this skill.** Customer facts come from the passed
  inputs only.
- **On exit, one `event_log` row** with verdict + token count. Observability is not optional.
