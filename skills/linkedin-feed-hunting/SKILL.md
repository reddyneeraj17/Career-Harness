---
name: linkedin-feed-hunting
version: "1.0.0"
description: Scout skill for the linkedin_feed campaign — discovers US job postings from LinkedIn feed search using Boolean blocks and posts them for screening.
---

# linkedin-feed-hunting

## Inputs

```json
{
  "campaign_id": "linkedin_feed",
  "run_id": "run-2026-09-26-001",
  "hours_back": 24,
  "boolean_blocks": ["("Senior Data Engineer" OR "Staff Data Engineer") AND (fintech OR healthcare)", "..."],
  "profile": {
    "locations": {"us_only": true, "remote": "ok", "metros": ["Houston", "Dallas", "Austin"]},
    "role_types": ["full_time", "w2_contract"],
    "targeting": {"tiers": [1, 2], "industries": ["fintech", "healthcare"], "seniority": ["senior", "staff"]}
  }
}
```

`hours_back` defaults to 24. `boolean_blocks` are pre-built from profile targeting; the worker never invents new keywords.

## Actions called

- `posting_upsert(rows)` — one row per discovered posting: `{company, role, url, source: "linkedin_feed", jd_hash, first_seen}`. Returns only genuinely-new ids.
- `event_log(run_id, type, payload)` — **exactly one row on exit** with the verdict envelope and token count.

Skills never touch SQLite directly — only these actions.

## Output

The verdict envelope, nothing else:

```json
{
  "skill": "linkedin-feed-hunting",
  "version": "1.0.0",
  "verdict": "pass",
  "score": 85,
  "reasons": ["4 new postings from 6 boolean blocks"],
  "evidence": {
    "postings_found": 12,
    "postings_new": 4,
    "new_posting_ids": ["p-abc123", "p-def456"]
  },
  "tokens": 18400
}
```

- `verdict: pass` when the sweep completed (even with zero new postings). `reject` only when the sweep itself failed (feed unreachable, auth wall) — with the reason. `hold` when results are ambiguous (e.g. only contract/C2C posts found — post them and let judges decide; this skill does not filter).
- `score` = sweep health 0–100: blocks executed / blocks planned, minus penalties for errors or CAPTCHA encounters.
- Every posting reported in `evidence` must have `company`, `role`, `url`, and `source`. Rows missing any of these are dropped and counted in `reasons`, never posted.

## Hard limits

- **Discovery only.** Never apply, never message anyone, never click "Easy Apply", never open a chat thread.
- **US-only roles per `profile.locations`.** `us_only: true` means discard non-US postings at discovery; remote postings are kept only when `remote: "ok"`.
- **Past-24h window.** Use `hours_back` (default 24) as the posted-date filter. Never widen the window to fill a quota.
- **Read-only browsing via a browser task.** All LinkedIn access goes through `browser.spawn_task`; this skill never uses credentials directly.
- **Human pacing between page loads.** Minimum realistic delay between loads; no rapid-fire scrolling or parallel page tabs.
- **Every posting needs `company`, `role`, `url`, `source`.** Incomplete rows are discarded, not guessed.
- **Never invent facts.** A posting with an unclear company or role is dropped — never guessed from context.
- **No personal data in this skill.** Customer facts come from the passed `profile` object only.
- **On exit, one `event_log` row** with verdict + token count. Observability is not optional.
