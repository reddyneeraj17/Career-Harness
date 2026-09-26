---
name: company-discovery
version: "1.0.0"
description: Promotes companies first seen by the job-board and LinkedIn scouts into the companies table so career-portal-sweep coverage grows over time.
---

# company-discovery

## Why this exists

`career-portal-sweep` consumes the companies table; `companies_seed.csv` is
static. The job-board and LinkedIn scouts constantly see companies that are
hiring for the customer's roles, but nothing promoted them into the sweep
list — so tier-1/2 coverage never grew. This skill closes that loop.

## Inputs

```json
{
  "run_id": "run-2026-09-26-001",
  "observed": [
    {"company": "Acme Health", "source": "job_board:indeed", "industry": "healthcare", "sightings": 3}
  ],
  "min_sightings": 2
}
```

`observed` is built by the coordinator from recent `postings` rows
(deduplicated on `company_norm`). `min_sightings` defaults to 2 — a company
seen only once is noise; twice is a pattern.

## Procedure

1. **Dedupe against the known list.** Read the companies table via
   `snapshot()` (or the `company_norm` keys). Drop every observed company
   already present — including `skip_flag` ones, which stay skipped.
2. **Promote the rest** via `companies_update`, one row per new company:
   - `tier`: 3 (unknown until the operator or weekly-tuner promotes it —
     never guess tier 1/2 from a sighting).
   - `industry`: from the posting when the scout recorded one, else null.
   - `careers_url` / `ats_type`: null until `career-portal-sweep` discovers
     them on its first visit.
   - `skip_flag`: false.
3. **Report** the promoted list in the output envelope so the operator (and
   the weekly tuning summary) can see what entered the sweep list.

## Actions called

- `snapshot` — read the current companies table for dedupe.
- `companies_update` — insert the genuinely-new companies.
- `event_log` — one row on exit with the verdict envelope and token count.

## Output

```json
{"skill":"company-discovery","version":"1.0.0","verdict":"pass",
 "score":0-100,"reasons":["..."],
 "evidence":{"observed":9,"already_known":6,"promoted":["Acme Health","Northwind Labs"]},
 "tokens":1234}
```

## Hard limits

- **Never invent company facts.** Tier defaults to 3, industry/URL/ATS stay
  null when unknown — the sweep discovers them, this skill doesn't guess.
- **Never touch existing rows.** No tier changes, no un-skipping, no
  overwriting careers URLs the sweep already found. Promotion is
  insert-only.
- **Never promote staffing agencies or job boards themselves** (the poster
  is not the hirer): if the posting source indicates an agency repost with
  no named hirer, drop it.
- **Noise gate.** Below `min_sightings`, an observed company is reported in
  `reasons` but not promoted.
