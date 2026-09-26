<!-- PROPRIETARY — Career Harness (c) 2026 Neeraj Reddy. Licensed customers only: no redistribution, no sharing, no export. Core files are read-only — see CUSTOMER_RULES.md. Full terms in LICENSE. -->

---
name: company-read
version: "1.0.0"
description: Bounded public-page read of a company's engineering blog / careers / stack pages — extracts their technical vocabulary with sources so the tailor can speak the company's language. Read-only; never applies or contacts anyone.
---

# Company Read

Give the tailor the company's own vocabulary: read a few public pages, extract
the technical terms they actually use, and hand each term to the tailor with its
source. This is the lightweight form of company intel — no database table, no
cross-run cache; the JSON profile lives in the run's hidden files and dies with
the run.

## Inputs

```json
{
  "company_norm": "databricks",
  "company": "Databricks",
  "careers_url": "https://www.databricks.com/company/careers",
  "campaign_id": "career_portal",
  "run_id": "run-2026-09-26-1420",
  "max_pages": 3,
  "max_minutes": 5
}
```

`careers_url` comes from the companies table when known, else the posting URL's
domain. `max_pages` defaults to 3, `max_minutes` to 5.

## What to do

1. Read up to `max_pages` public pages, in this priority order:
   - the company's engineering blog (homepage or 1–2 latest technical posts);
   - their "our stack" / engineering careers page;
   - the posting's company page, if public.
   Public pages only — no login walls, no paywalled posts, no employee profiles.
   Respect robots.txt. Human pacing between loads, like the scout skills.
2. Extract technical vocabulary: tool and product names, architecture terms
   (e.g. "medallion architecture"), methodology phrases. For each term record
   the source URL and retrieval date. Skip marketing fluff with no technical
   content.
3. Write the profile JSON to
   `goals/<campaign_id>/hidden_files/<run_id>/company/<company_norm>.json`
   (create parent directories). Shape:
   `{"company_norm": "...", "terms": [{"term": "...", "generic_equivalent": "...",
   "source_url": "https://...", "retrieved": "<ISO date>"}], "sources_read": N}`.
   `generic_equivalent` is the plain-language meaning of their term, in your own
   words from the page context — never from prior knowledge of the company.
4. Return the verdict envelope with the terms inline (the coordinator passes
   them to `resume-tailor` and `resume-reviewer`).

## Output

Return ONLY the verdict envelope JSON:

```json
{"skill":"company-read","version":"1.0.0","verdict":"pass|hold",
 "evidence":{"terms":[{"term":"medallion architecture","generic_equivalent":"bronze/silver/gold layered pipeline","source_url":"https://www.databricks.com/blog/...","retrieved":"2026-09-26"}],
 "profile_path":"goals/<campaign_id>/hidden_files/<run_id>/company/<company_norm>.json",
 "sources_read":3},"reasons":["..."],"tokens":1234}
```

- `pass` — at least one usable public source was read. `terms` may be empty
  (the pages named no technology); that is a pass with empty terms, not a
  failure — the tailor simply gets no extra vocabulary.
- `hold` — no public page reachable, all blocked, or nothing technical found
  after `max_pages` loads. The coordinator falls back to plain tailoring with
  empty `company_terms`; the run never stalls on this step.

## Hard limits

- **Read-only.** Never applies, never contacts anyone, never fills a form.
- `max_pages` and `max_minutes` are hard ceilings, not targets.
- Every term carries `source_url` and `retrieved`. A term without a source is
  dropped, never emitted.
- Never infer the stack from the company name, its marketing, or prior model
  knowledge — only from pages actually read this run. When in doubt, omit.
- Terms are vocabulary, not claims about the candidate. The tailor decides what
  the candidate may claim; this skill only reports what the company says.
- One company per invocation; the coordinator reuses the written profile for
  other postings from the same `company_norm` in the run (no re-read).
- No personal data lives in this file; facts arrive via Inputs.
- Append exactly one `event_log` row on exit. No state transitions — the
  coordinator owns them.
