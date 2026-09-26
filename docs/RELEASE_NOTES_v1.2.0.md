# v1.2.0 — Proprietary licensing, status reasons, posting verdicts, vendor prep

> **Note:** v1.1.0 was tagged locally and the tag reached GitHub, but `main`
> was never pushed, so v1.1.0 never shipped. That stale tag is left untouched;
> this release is cut as **v1.2.0** and supersedes it.

## What's new

### Proprietary licensing & distribution
- **Proprietary license**: Apache 2.0 replaced by the Career Harness Proprietary
  License (use + configure; no redistribution, sharing, or export; core files
  read-only). New root `NOTICE`; proprietary banners on all 28 skills,
  installer scripts, README, INSTALL, OPERATOR, and PACKAGING.
- **Distribution strategy** (`DISTRIBUTION.md`, blueprint §28): private GitHub
  repo, managed-service-first; licensed self-host installs via supervised
  install with a one-time read-only deploy key (revoked after). Customers
  never pull from the repo; judging rules and mappings stay private.
- **Customer rules**: copying/sharing/exporting kit files is a license breach;
  unlicensed copies are reported, not used.

### Application tracking & transparency
- **Status reasons**: `applications.status_reason` + optional `reason` on every
  status transition; the Applications tab shows a Reason column and the
  run-detail drawer surfaces reasons inline.
- **Posting verdicts**: new `posting_verdicts` table; the coordinator records
  scout/screen verdicts (passed / held / rejected) with a human reason for
  every posting it touches.
- **Vendor talking points**: new `vendor-prep` skill generates recruiter-call
  talking points after each submission, viewable from the Applications tab.

### Dashboard
- **Date slicer** on Applications: Today / Last 7 days / Last 30 days / All +
  custom range (America/Chicago days), composing with search and state
  filters; the KPI band recomputes over the filtered set.
- **UI/UX overhaul**: final visual pass over all seven tabs, the run-detail
  drawer, and the approvals queue — stronger KPI hierarchy, consistent filter
  bars, sharper status pills, phone + desktop polish. Presentation only; no
  schema, action, or skill changes.
- **Per-job schedule editing**: enable/disable switch and editable cadence for
  every job on the Schedules tab.
- **Resume upload/delete** on the Resumes tab: PDF-only upload with magic-byte
  validation, SHA-256, and loudly-enforced unique variant IDs; safe delete
  moves the PDF to recoverable trash and never touches application history.
- **First-run onboarding wizard**: fresh installs open a 6-step guided setup
  (identity → work auth → employment types → targeting/titles → screening
  answers → caps); placeholder values are rejected loudly.
- **In-page PDF viewer**: "Open PDF" links open a viewer modal with
  Close/Download controls plus a download fallback.

### Changed
- **Employment type is now a multi-select** on the Profile tab (full-time,
  part-time, W2 contract, C2C, internship); the eligibility judge screens
  against the selection.
- Dashboard display name is now **Career Harness** (slug `harness-core`
  unchanged).
- profile-watch timeout raised 900s → 1800s.

## Install

Supervised install via the maintainer (see `DISTRIBUTION.md`). Self-host:

```sh
git clone --branch v1.2.0 <repo-with-one-time-deploy-key> ~/workspace/harness-kit
cd ~/workspace/harness-kit && ./install/install.sh --check && ./install/install.sh
```

Then follow `docs/SETUP_PROMPT.md` (paste into a fresh Muse chat).

## Verify

```sh
./install/install.sh --check   # must report 0 failures
```
