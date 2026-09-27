<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: linkedin-feed-hunting
version: "1.1.0"
description: Scout skill for the linkedin_feed campaign — discovers US job postings from LinkedIn feed search using per-lane Boolean blocks and posts them for screening.
---

# linkedin-feed-hunting

> Changelog 1.1.0 (2026-09-27): Runs query blocks per enabled employment lane (`lane_blocks` input); every posting carries its lane and verbatim employment-type evidence. Past-24h window, US-only constraint, and discovery-only rules unchanged.

## Inputs

```json
{
  "campaign_id": "linkedin_feed",
  "run_id": "run-2026-09-26-001",
  "hours_back": 24,
  "lane_blocks": [
    {"lane": "full_time", "boolean_blocks": ["("Senior Data Engineer" OR "Staff Data Engineer") AND (fintech OR healthcare)"]},
    {"lane": "w2_contract", "boolean_blocks": ["("Data Engineer") AND (contract) AND (fintech OR healthcare)"]},
    {"lane": "c2c_contract", "boolean_blocks": ["("Data Engineer") AND (c2c OR "corp to corp")"]}
  ],
  "profile": {
    "locations": {"us_only": true, "remote": "ok", "metros": ["Houston", "Dallas", "Austin"]},
    "role_types": ["full_time", "w2_contract", "c2c_contract"],
    "targeting": {"tiers": [1, 2], "industries": ["fintech", "healthcare"], "seniority": ["senior", "staff"], "titles": ["Senior Data Engineer", "Staff Data Engineer"]}
  }
}
```

`hours_back` defaults to 24. `lane_blocks` are pre-built from profile targeting × enabled lanes — `titles` × `seniority` × `industries` × `lane` (e.g. `("Senior Data Engineer" OR "Staff Data Engineer") AND (fintech OR healthcare)` for lane `full_time`); the worker never invents new keywords. The worker runs every lane's blocks in order — lane rotation is the coordinator's job; this skill runs what it is given.

## Actions called

- `posting_upsert(rows)` — one row per discovered posting: `{company, role, url, source: "linkedin_feed", jd_hash, first_seen}`. Returns only genuinely-new ids.
- `event_log(run_id, type, payload)` — **exactly one row on exit** with the verdict envelope and token count.

Skills never touch SQLite directly — only these actions.

## Output

The verdict envelope, nothing else:

```json
{
  "skill": "linkedin-feed-hunting",
  "version": "1.1.0",
  "verdict": "pass",
  "score": 85,
  "reasons": ["4 new postings from 6 boolean blocks across 3 lanes"],
  "evidence": {
    "postings_found": 12,
    "postings_new": 4,
    "new_posting_ids": ["p-abc123", "p-def456"],
    "lanes_run": ["full_time", "w2_contract", "c2c_contract"],
    "blocks_per_lane": {"full_time": 2, "w2_contract": 2, "c2c_contract": 2}
  },
  "tokens": 18400
}
```

- `verdict: pass` when the sweep completed (even with zero new postings). `reject` only when the sweep itself failed (feed unreachable, auth wall) — with the reason. `hold` when results are ambiguous (e.g. only contract/C2C posts found — post them and let judges decide; this skill does not filter).
- `score` = sweep health 0–100: blocks executed / blocks planned, minus penalties for errors or CAPTCHA encounters.
- Every posting reported in `evidence` must have `company`, `role`, `url`, and `source`. Rows missing any of these are dropped and counted in `reasons`, never posted. Each posted row carries the `lane` of the block that found it in the worker's internal notes; lane classification itself is the judges' job from JD evidence, not this skill's.

## Hard limits

- **Discovery only.** Never apply, never message anyone, never click "Easy Apply", never open a chat thread.
- **US-only roles per `profile.locations`.** `us_only: true` means discard non-US postings at discovery; remote postings are kept only when `remote: "ok"`.
- **Past-24h window.** Use `hours_back` (default 24) as the posted-date filter. Never widen the window to fill a quota.
- **Run every lane's blocks as given.** `lane_blocks` arrives per enabled lane from the coordinator; run them all in order. Never drop a lane's blocks or invent blocks for a lane not passed in.
- **Read-only browsing via a browser task.** All LinkedIn access goes through `browser.spawn_task`; this skill never uses credentials directly.
- **Human pacing between page loads.** Minimum realistic delay between loads; no rapid-fire scrolling or parallel page tabs.
- **Every posting needs `company`, `role`, `url`, `source`.** Incomplete rows are discarded, not guessed.
- **Never invent facts.** A posting with an unclear company or role is dropped — never guessed from context.
- **No personal data in this skill.** Customer facts come from the passed `profile` object only.
- **On exit, one `event_log` row** with verdict + token count. Observability is not optional.
