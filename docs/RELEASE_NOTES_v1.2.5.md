# Release v1.2.5 — 2026-09-27

Feature release: pipeline orchestration, the Datasets page, and resumable
applications + held replies — the full v1.2.5 design from the live dashboard
is now in the kit.

## Added

- **Pipeline orchestration** (run-coordinator 1.12.0 + scout upgrades).
  Employment lanes derived per posting (`full_time`, `w2_contract`,
  `c2c_contract`, `internship`): FT scouts company portals, W2 scouts
  companies + vendors, C2C scouts vendors first. Fair lane rotation, tier
  1 → 2 → 3 progression, and outward source expansion (open web via the new
  `open-web-scout` 1.0.0, then additional sources) when datasets leave a run
  short of its target. Three consecutive empty pages ends a source. Only
  verified `submitted` rows count toward the target; the coordinator
  replenishes after duplicates, rejects, holds, failures, and parks.
- **H-1B rules.** Soft gate everywhere it applies; C2C fully bypasses H-1B
  (no lookup, no score). `h1b_sponsors` is the sole sponsor-history source;
  `prime_vendors` is never sponsorship evidence. Unknown H-1B history means
  hold — never a fabricated score. Vendor H-1B notes are labeled
  "Unverified sponsorship note".
- **Posting provenance** (migration 0010): every posting records
  `source_name`, `source_tier`, `source_class`, `discovery_phase`,
  `selected_lane`, `employment_types_offered`, `h1b_mode`, and `h1b_result`.
  Submission summaries break down by source, tier, lane, H-1B result, and
  discovery phase.
- **Prime vendor dataset** (migration 0009): new `prime_vendors` table +
  `prime_vendors_import`.
- **Datasets page**: the old Vendors tab now browses all three reference
  datasets (Companies, H-1B sponsors, Vendors) through the new
  `dataset_browse` action — server-side search, per-dataset filters, 100
  rows per page, debounced search, last page cached per dataset. H-1B year
  history renders real yearly LCA counts.
- **Submission sources panel**: the Applications tab's verified-submission
  breakdowns live in a "Submission sources" panel, collapsed by default —
  click the header to expand or collapse.
- **Resumable applications** (`app_resume`): parked and needs-me
  applications get a Resume control (optional note) returning them to
  `reviewed`, where the coordinator's resume sweep (run-coordinator 1.13.0)
  picks them up directly into APPLY — no re-tailoring, no re-review. Resume
  refuses other states, refuses needs-me with an open approval (naming it),
  and is idempotent on repeat clicks.
- **Held-reply review** (`held_reply_resolve`, `held_reply_draft`,
  migration 0011): held replies record an `approved`/`discarded` decision +
  timestamp. The Replies tab shows View, Approve & send (with draft editing),
  and Discard; the dashboard never sends — the scheduled replier sends
  approved drafts exactly once on its next scan and never sends discarded
  ones.
- **Large seed CSVs via URL**: `h1b_import`, `companies_import`, and
  `prime_vendors_import` accept `csv_url` instead of pasting multi-megabyte
  CSVs into action args.
- **DATA-PLAN.md** now documents the three seed datasets, operational
  tables, workspace evidence files, retention/purge, and privacy rules.

## Changed

- The `snapshot` "vendors" view is removed; dataset browsing goes through
  `dataset_browse`.
- `h1b-judge` 1.1.1 documents the soft-gate wording used with the new
  provenance fields.

## Upgrade notes

- Real upgrade: migrations 0009 (prime vendors), 0010 (posting provenance),
  and 0011 (held-reply resolution) run in order on existing databases.
  Follow `docs/UPGRADE_PLAYBOOK.md` (fetch → refresh → migrations →
  rebuild dashboard → recompile → doctor green).
- Existing rows keep working: `source_name` backfills from `source`,
  `source_tier` defaults to `unknown`, vendor tier filters normalize stored
  "Tier N" values both sides.
- Seed datasets refresh the same way as before: run the import actions with
  `csv_url` (remote-storage temp links work for multi-megabyte CSVs).
