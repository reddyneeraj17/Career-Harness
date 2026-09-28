# Release notes — Career Harness v1.2.8

**Dashboard unification: the customer kit now ships the exact dashboard
the operator runs.**

## What changed

The kit's dashboard (`harness-core/client`) was a fork of the live
dashboard with a different theme, different page layouts, and several
backend-driven features the local didn't have (and vice versa). As of
v1.2.8 the fork is gone: the kit ships the operator's dashboard 1-to-1.

- **Applications** — the Submission-sources provenance board is always
  visible (previously it only appeared once submissions existed), with
  per-row provenance grids and the inline resume dialog.
- **Replies** — the held-reply flow is now the review dialog (View draft /
  Approve & send / Discard) with per-page notices, and Decision renders
  as the last column. This also resolves the activity-ledger formatting
  bug where the held-decision controls overlapped the Rule column.
- **Datasets** — per-dataset pages with filters (tier, minimum LCAs,
  search), pagination, and retry-on-error, matching the operator's view.
- **Overview / run detail** — LinkedIn section approvals render the
  side-by-side diff with edit mode in both places; the Optimize LinkedIn
  button reports the started run.

## Server support (additive — no database migrations)

- `snapshot` (applications view) now also returns `provenance_summary`.
- `approval_resolve` normalizes LinkedIn answers to the canonical
  `approved` / `discarded` the apply worker consumes.
- `dataset_browse`: company search covers industry; `min_lca: 0` works;
  the vendor tier filter matches `"1"`/`"2"`/`"3"`.

## Upgrade notes

- No new migrations. Upgrading customers keep their database; the
  dashboard rebuilds from the new client on upgrade as usual
  (`docs/UPGRADE_PLAYBOOK.md`).
- The customer's dashboard will look different after this upgrade —
  it now matches the operator's dashboard exactly.
