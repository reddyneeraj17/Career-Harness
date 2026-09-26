# Release v1.2.2 — 2026-09-26

Patch release fixing a systemic spec bug in schedule compilation.

## Fixed

- **Manifest schema now mandatory in the compile spec.** The dashboard's
  Schedules tab validates every `schedules_manifest.json` job entry against a
  schema requiring all seven fields — `job_id`, `title`, `campaign`,
  `cadence`, `schedule`, `enabled`, `body_hash` — but the compile-schedules
  skill spec (and the profile-watch auto-recompile template) only required
  job id / campaign / cadence / body hash. A recompile following the spec
  alone would fail dashboard validation and render the Schedules tab as
  "manifest missing". Both specs now mandate the full per-job schema, so no
  future recompile can regress the tab. The compile-schedules skill version
  is bumped to 1.0.1.

## Notes

- The Runs and Replies date-range filters and the Applications date slicer
  (with search + state filters) shipped in earlier releases and are
  documented in their changelog sections; this release adds no new filters.
- No migration in this release. Upgrade is the normal playbook path
  (`docs/UPGRADE_PLAYBOOK.md`); customer data is untouched.
