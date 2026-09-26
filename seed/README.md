# seed/

Bulk-load CSVs for the job-apply harness. Loaded via the harness-core
artifact actions `companies_import` and `h1b_import` (see harness-kit
INSTALL.md step 4, "Seed data"). Loading is idempotent (upsert on
`company_norm`).

## Import rule for h1b_employer_hub.csv

`h1b_import` inserts one `h1b_sponsors` row per CSV row, and `h1b_lookup`
treats any present row as a *verified* record (`found: true`). Rows with
`h1b_sponsor = unknown` must be **excluded from the import payload**:
importing them would turn the judge's designed `hold` ("unknown — needs
careers-page check") into a misleading `found: true, score: 0` pass.

Filter before importing:

    python3 -c "
    import csv
    rows = list(csv.DictReader(open('h1b_employer_hub.csv')))
    kept = [r for r in rows if r['h1b_sponsor'] in ('yes','no')]
    w = csv.DictWriter(open('/tmp/h1b_import.csv','w',newline=''), fieldnames=rows[0].keys())
    w.writeheader(); w.writerows(kept)
    "

then pass `/tmp/h1b_import.csv` to `h1b_import`. The `unknown` rows stay in
this file as documentation for future research passes.

## Sources

- H-1B figures: MyVisaJobs FY2025 LCA reports, h1bdata.info, immihelp,
  USCIS H-1B Employer Data Hub (via published top-sponsor summaries).
  Counts are Labor Condition Applications (LCAs), not approvals, unless
  the evidence text says otherwise.
- ATS types: verified from ATS-domain URLs / page markers only; `unknown`
  means unverified, never a guess. The career-portal sweep corrects these
  live via `companies_update`.
- Compiled 2026-09-26. Re-verify counts yearly (FY cadence).
