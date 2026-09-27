# Release v1.2.4 — 2026-09-26

Feature release: the run-trace UI and application ledger upgrades from the
live dashboard are now in the kit.

## Added

- **Run-trace UI on the Runs tab.** Each run now has an "Open live view"
  side panel: live stage/status strip, blocker, state counts, "Follow this
  run" watch controls (Main chat updates, Browser captures), open approvals,
  applications, posting verdicts, a 15-second-refreshing activity feed, and
  browser evidence.
- **New actions**: `run_detail` (full run context for the panel) and
  `run_watch_set` (persist per-run watch preferences).
- **Schema**: `runs` gains `watch_chat` and `capture_browser` columns
  (migration `0008_run_watch_controls.sql`); `event_log` returns both so
  workers receive per-run watch preferences with every event.
- **Application ledger upgrades**: date-range filtering, expanded search
  across company/role/ID/campaign/reason, KPIs computed from the filtered
  rows, and the status reason shown as an evidence cell.

## Upgrade notes

- This is a real upgrade: migration 0008 adds the watch columns, two new
  actions ship, and the dashboard rebuilds with the new UI. Follow
  `docs/UPGRADE_PLAYBOOK.md` (fetch → refresh → migrations → rebuild
  dashboard → recompile → doctor green).
- The browser-watch schedule (every 2m) forwards screenshots to chat for
  runs with "Watch in chat" enabled — flip the toggle in any run's live
  view to try it.

## Notes

- No blueprint PDF changes in this release; the run-trace design update to
  the blueprint follows separately.
