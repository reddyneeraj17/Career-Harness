---
name: career-portal-sweep
version: "1.0.0"
description: Scout skill for the career_portal campaign — sweeps company careers pages in priority order, detects ATS type from page markers, and posts open roles for screening.
---

# career-portal-sweep

## Inputs

```json
{
  "campaign_id": "career_portal",
  "run_id": "run-2026-09-26-001",
  "companies": [
    {"company_norm": "acme health", "careers_url": "https://acmehealth.com/careers", "ats_type": "greenhouse"},
    {"company_norm": "beta bank", "careers_url": "https://betabank.com/jobs", "ats_type": "unknown"}
  ]
}
```

The sweep list is ordered by the coordinator (tier 1 in target industry first; skip-flagged companies never appear). The worker sweeps in order and stops at the run's time budget.

## Actions called

- `posting_upsert(rows)` — one row per open role: `{company, role, url, source: "career_portal", jd_hash, first_seen}`. Returns only genuinely-new ids.
- `companies_update(updates)` — report ATS detection per company: `{company_norm, detected_ats_type, expected_ats_type, park_count_delta?, skip?}`. Detected-vs-expected mismatches are corrected here, not in prose.
- `event_log(run_id, type, payload)` — **exactly one row on exit** with the verdict envelope and token count.

Skills never touch SQLite directly — only these actions.

## Output

The verdict envelope, nothing else:

```json
{
  "skill": "career-portal-sweep",
  "version": "1.0.0",
  "verdict": "pass",
  "score": 88,
  "reasons": ["9 of 10 companies swept", "1 careers page returned 403 — reported, not retried", "2 ATS corrections (greenhouse→lever, unknown→workday)"],
  "evidence": {
    "companies_swept": 9,
    "companies_planned": 10,
    "postings_new": 6,
    "new_posting_ids": ["p-abc123"],
    "ats_corrections": [
      {"company_norm": "acme health", "expected": "greenhouse", "detected": "lever"},
      {"company_norm": "beta bank", "expected": "unknown", "detected": "workday"}
    ],
    "dead_or_blocked": ["gamma labs (403)"]
  },
  "tokens": 26700
}
```

- `verdict: pass` when the sweep completed within budget (even with zero new postings). `reject` only when the sweep itself failed wholesale. `hold` when multiple pages behaved anomalously and results are likely incomplete.
- `score` = sweep health 0–100: companies swept / companies planned, minus penalties for dead pages and CAPTCHAs.
- `ats_corrections` lists every company where the detected ATS differed from the expected one — each must also have been reported via `companies_update`.

## Hard limits

- **Detect ATS type from page markers; report detected-vs-expected via `companies_update`.** Recognized types: `workday`, `greenhouse`, `lever`, `ashby`, `icims`, `generic`. Use page markers (URL patterns, form structure, footer text) — never guess from the company name. Corrections go through the action, not the report text.
- **Max 3 page loads per company.** Careers index + up to two pagination/department pages. Never brute-force pagination, never crawl the whole site.
- **A dead or blocked careers page is reported, not retried in a loop.** Record it in `dead_or_blocked` with the status (403, 404, CAPTCHA, timeout) and move on. One retry per page maximum, then report.
- **Discovery only.** Never start an application, never fill a form, never create a candidate account.
- **Sweep in the given order.** Tier-1 companies first as passed in. Do not reorder by convenience.
- **Human pacing.** Realistic delays between companies; one browser task at a time.
- **Every posting needs `company`, `role`, `url`, `source`.** Incomplete rows are dropped, not guessed.
- **Never invent facts.** Unknown ATS → `generic` via `companies_update`, never a guess presented as detection.
- **No personal data in this skill.** Customer facts come from `profile_get` only.
- **On exit, one `event_log` row** with verdict + token count. Observability is not optional.
