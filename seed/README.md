# seed/

Bulk-load CSVs for the job-apply harness. Loaded via the harness-core
artifact actions `companies_import`, `h1b_import`, and
`prime_vendors_import` (see harness-kit INSTALL.md, "Seed data"). Loading
is idempotent (upsert on the normalized key: `company_norm` /
`vendor_name` norm) — re-importing updates existing rows and inserts new
ones, never duplicates.

## What's in here (full reference datasets, refreshed 2026-09-27)

| File | Rows | Table | Contents |
|---|---|---|---|
| `companies_seed.csv` | 86,230 | `companies` | Company name, tier (1–3), industry, HQ state, careers URL, ATS type |
| `h1b_employer_hub.csv` | 82,697 | `h1b_sponsors` | Company, `h1b_sponsor` yes/no, evidence text, LCA count, per-year stats |
| `prime_vendors.csv` | 1,010 | `prime_vendors` | Vendor name, portal URL, tier, category, specialties, engagement types |

These are the launchpad for the tier-ascending sweep — not a hard
boundary. When a run comes up short, the coordinator expands to open web
search and additional sources.

## Import rule for h1b_employer_hub.csv

`h1b_import` inserts one `h1b_sponsors` row per CSV row, and `h1b_lookup`
treats any present row as a *verified* record (`found: true`). Rows with
`h1b_sponsor = unknown` must be **excluded from the import payload**:
importing them would turn the judge's designed `hold` ("unknown — needs
careers-page check") into a misleading `found: true, score: 0` pass.

The bundled file is already clean (every row is `yes` or `no` — no
`unknown` rows as of the 2026-09-27 refresh). If you ever rebuild it from
a source that includes `unknown` rows, filter before importing:

    python3 -c "
    import csv
    rows = list(csv.DictReader(open('h1b_employer_hub.csv')))
    kept = [r for r in rows if r['h1b_sponsor'] in ('yes','no')]
    w = csv.DictWriter(open('/tmp/h1b_import.csv','w',newline=''), fieldnames=rows[0].keys())
    w.writeheader(); w.writerows(kept)
    "

then pass `/tmp/h1b_import.csv` to `h1b_import`.

## Vendor H-1B notes are never evidence

`prime_vendors.csv` carries an `h1b_note` column, but it is stored and
displayed as an "Unverified sponsorship note" only. The `prime_vendors`
table is **never** a source for sponsorship history or scores —
`h1b_sponsors` is the sole source, and C2C lanes skip H-1B lookup
entirely.

## Refreshing the seeds

The CSV is the source you edit. To refresh:

1. Edit the CSV (or rebuild it from the upstream source), keeping the
   header row exactly as-is.
2. Run the matching import action (`companies_import`, `h1b_import`,
   or `prime_vendors_import`) against the file. The dashboard actions
   also accept a `csv_url` for large files.
3. The upsert handles the rest: existing rows update, new rows insert.

The database never reads a spreadsheet directly — convert Excel to CSV
first (as was done for the vendor list on 2026-09-27).

## Sources

- H-1B figures: MyVisaJobs FY2025 LCA reports, h1bdata.info, immihelp,
  USCIS H-1B Employer Data Hub (via published top-sponsor summaries).
  Counts are Labor Condition Applications (LCAs), not approvals, unless
  the evidence text says otherwise.
- ATS types: verified from ATS-domain URLs / page markers only; `unknown`
  means unverified, never a guess. The career-portal sweep corrects these
  live via `companies_update`.
- Companies list compiled 2026-09-27 (86,230 rows). Re-verify counts
  yearly (FY cadence).
