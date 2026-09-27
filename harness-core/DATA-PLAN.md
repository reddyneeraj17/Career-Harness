# Data Plan — Career Harness core

The harness stores everything in its own SQLite database (`app.db`, managed by
the app) plus a small set of workspace files. No third-party analytics, no
external data warehouse, no cross-customer sharing. Seed datasets are imported
by the customer from their own CSVs; the harness never phones home.

## 1. Seed reference datasets (customer-imported)

Three read-mostly datasets form the launchpad every scout sweep starts from.
All three are imported with the `*_import` actions (`csv` or `csv_url` args)
and upserted by normalized key — re-imports update rows in place, never
duplicate them.

| Dataset | Table | Key | Typical scale | Import action |
|---|---|---|---|---|
| Companies | `companies` | `company_norm` | tens of thousands | `companies_import` |
| H-1B sponsors | `h1b_sponsors` | `company_norm` | tens of thousands | `h1b_import` |
| Prime vendors | `prime_vendors` | `vendor_norm` | ~1k staffing vendors | `prime_vendors_import` |

- `companies`: tier (1–3), industry, HQ state, careers URL, ATS type, park/skip
  flags. Tiers drive the coordinator's tier-ascending sweep.
- `h1b_sponsors`: LCA count plus `stats_by_year` (per-year LCA counts) and the
  last refresh date. This is the **only** sponsorship-history source the
  `h1b-judge` skill may score from — never invented, never inferred.
- `prime_vendors`: vendor name, portal URL, tier, category, specialties,
  engagement types, and an optional `h1b_note`. The note is the vendor's own
  claim and is **always surfaced as an "Unverified sponsorship note"** — it is
  never sponsorship evidence and never feeds the H-1B score.

Seed CSVs are the customer's source of truth: edit the CSV/Excel, convert to
CSV, re-run the import. The database never reads the Excel directly.

## 2. Operational data (written by campaigns)

- `postings` — discovered job postings, deduplicated by normalized
  company+role. Carries pipeline provenance: source class/name, discovery
  phase, source tier, employment types offered, selected lane, H-1B mode and
  result (migration 0010).
- `applications` — the application ledger with state machine
  (`discovered → screened → tailored → reviewed → applying → submitted`, plus
  `parked`, `needs_me`, `blocked`, `rejected`). Evidence paths (resume PDF,
  sha256, screenshot, confirmation text) are stored per row; a submission
  counts toward targets only when fully verified.
- `runs` / `events` — campaign runs with an append-only event log (state
  transitions, resume pickups, spillover replays, token usage).
- `conversations` / `replies` — recruiter threads and the reply ledger
  (`sent`, `held`, `auto_sent`, `skipped`). Held replies carry a dashboard
  decision (`held_resolution`: `approved`/`discarded`, migration 0011); the
  scheduled replier sends approved drafts exactly once and never sends
  discarded ones.
- `approvals` — questions awaiting the customer (`needs_me`); unresolved
  approvals block `app_resume` until answered on the Overview tab.
- `resumes`, `reviews`, `postings_verdicts`, `token_usage`, `schedules` —
  supporting ledgers for resume variants, reviewer verdicts, scout/judge
  verdicts, measured token spend, and compiled campaign schedules.

## 3. Workspace files (outside the DB)

- `goals/<campaign>/hidden_files/<run_id>/` — per-run working state: JD
  snapshots (`jd_path`), tailored resume PDFs, confirmation texts, screenshots
  (`<app_id>_<step>.png`), held-reply draft files (`drafts/<file>.md`).
- `workspace/user/files/` — the customer's resume(s); canonical name
  `Neeraj_Reddy_Data_AI_Resume.pdf` on the maintainer's own instance.
- `profile.yaml` + compiled `schedules_manifest.json` — the customer profile
  and the schedule bodies compiled from it.

## 4. Retention and purge

- `test_data_purge` removes smoke-test rows (ids prefixed `test_` /
  `[SMOKE TEST]` markers) across postings, applications, approvals,
  conversations, replies, runs, and their staging tables.
- Campaign data is otherwise kept indefinitely; the customer deletes rows
  through the dashboard actions or by re-importing seeds.

## 5. Privacy and safety rules

- The dashboard shows the customer's own data only. Recruiter threads are the
  customer's own inbox/LinkedIn activity.
- H-1B scores are computed from the customer's own imported sponsor dataset;
  unknown history means "hold", never a fabricated score.
- CAPTCHA / SMS / login walls are recorded as parks — never bypassed.
- Seeds ship empty in the kit; the customer imports their own. No customer
  data is bundled with the distributable.
