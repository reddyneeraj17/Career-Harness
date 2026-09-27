<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: career-portal-sweep
version: "1.1.0"
description: Scout skill for the career_portal campaign — sweeps company careers pages and vendor portal/job pages in priority order, detects ATS type from page markers, and posts open roles for screening.
---

# career-portal-sweep

> Changelog 1.1.0 (2026-09-27): Accepts both ordered company records and ordered vendor records as first-class inputs (vendors are primary for W2/C2C, not a late fallback); returns `source_class`, `source_tier`, and offered-employment-type evidence per posting. Bounded crawling, ATS detection, one-retry, and discovery-only rules unchanged. Structured provenance persistence to the store is pending the harness-core change; until then, provenance travels in the verdict envelope.

## Inputs

```json
{
  "campaign_id": "career_portal",
  "run_id": "run-2026-09-26-001",
  "companies": [
    {"company_norm": "acme health", "careers_url": "https://acmehealth.com/careers", "ats_type": "greenhouse", "tier": 1},
    {"company_norm": "beta bank", "careers_url": "https://betabank.com/jobs", "ats_type": "unknown", "tier": 2}
  ],
  "vendors": [
    {"vendor_norm": "beacon hill", "portal_url": "https://jobs.beaconhillstaffing.com", "tier": 1},
    {"vendor_norm": "rose international", "portal_url": "https://www.roseint.com/jobs", "tier": 2}
  ]
}
```

The company and vendor lists are both ordered by the coordinator (tier 1
first; skip-flagged entries never appear). Vendor sources are searched first
within W2/C2C turns — they are first-class inputs, not a fallback. The
worker sweeps in order and stops at the run's time budget.

## Actions called

- `posting_upsert(rows)` — one row per open role: `{company, role, url, source: "career_portal", jd_hash, first_seen}`. `company` is the company or vendor name as shown on the page. Returns only genuinely-new ids.
- `companies_update(updates)` — report ATS detection per company: `{company_norm, detected_ats_type, expected_ats_type, park_count_delta?, skip?}`. Detected-vs-expected mismatches are corrected here, not in prose. (Vendor portal ATS observations are reported the same way against the vendor's normalized name.)
- `event_log(run_id, type, payload)` — **exactly one row on exit** with the verdict envelope and token count.

Skills never touch SQLite directly — only these actions.

## Output

The verdict envelope, nothing else:

```json
{
  "skill": "career-portal-sweep",
  "version": "1.1.0",
  "verdict": "pass",
  "score": 88,
  "reasons": ["9 of 10 sources swept", "1 careers page returned 403 — reported, not retried", "2 ATS corrections (greenhouse→lever, unknown→workday)"],
  "evidence": {
    "sources_swept": 9,
    "sources_planned": 10,
    "companies_swept": 6,
    "vendors_swept": 3,
    "postings_new": 6,
    "new_posting_ids": ["p-abc123"],
    "postings_detail": [
      {"posting_id": "p-abc123", "source_class": "vendor_portal", "source_name": "beacon hill", "source_tier": 1,
       "employment_types_offered": ["w2_contract"], "type_evidence": "posting text: 'W2 contract, 12 months'"}
    ],
    "ats_corrections": [
      {"company_norm": "acme health", "expected": "greenhouse", "detected": "lever"},
      {"company_norm": "beta bank", "expected": "unknown", "detected": "workday"}
    ],
    "dead_or_blocked": ["gamma labs (403)"]
  },
  "tokens": 26700
}
```

- `source_class` is `company_portal` or `vendor_portal`, matching the input list the posting came from.
- `employment_types_offered` is classified only from on-page evidence (e.g. "W2", "contract-to-hire", "C2C", "full-time" in the posting text), quoted in `type_evidence`. Unclear or unmarked → `["unknown"]` — never inferred from the vendor or company name.
- `verdict: pass` when the sweep completed within budget (even with zero new postings). `reject` only when the sweep itself failed wholesale. `hold` when multiple pages behaved anomalously and results are likely incomplete.
- `score` = sweep health 0–100: sources swept / sources planned, minus penalties for dead pages and CAPTCHAs.
- `ats_corrections` lists every source where the detected ATS differed from the expected one — each must also have been reported via `companies_update`.

## Hard limits

- **Detect ATS type from page markers; report detected-vs-expected via `companies_update`.** Recognized types: `workday`, `greenhouse`, `lever`, `ashby`, `icims`, `generic`. Use page markers (URL patterns, form structure, footer text) — never guess from the company name. Corrections go through the action, not the report text.
- **Max 3 page loads per source.** Careers/index page + up to two pagination/department pages per company or vendor. Never brute-force pagination, never crawl the whole site.
- **A dead or blocked page is reported, not retried in a loop.** Record it in `dead_or_blocked` with the status (403, 404, CAPTCHA, timeout) and move on. One retry per page maximum, then report. A blocked source is skipped for the run — never bypassed through another mechanism.
- **Discovery only.** Never start an application, never fill a form, never create a candidate account.
- **Sweep in the given order.** Companies and vendors in the order passed in. Do not reorder by convenience.
- **Human pacing.** Realistic delays between companies; one browser task at a time.
- **Every posting needs `company`, `role`, `url`, `source`.** Incomplete rows are dropped, not guessed.
- **Never invent facts.** Unknown ATS → `generic` via `companies_update`, never a guess presented as detection.
- **No personal data in this skill.** Customer facts come from `profile_get` only.
- **On exit, one `event_log` row** with verdict + token count. Observability is not optional.
