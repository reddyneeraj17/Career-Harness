-- 0008: run watch controls — per-run "Follow this run" preferences.
-- Adds watch_chat / capture_browser to runs; read by run_detail, written by
-- run_watch_set, and returned with every event_log call so workers receive
-- the preferences with every event they log.
ALTER TABLE runs ADD COLUMN watch_chat INTEGER NOT NULL DEFAULT 0;
ALTER TABLE runs ADD COLUMN capture_browser INTEGER NOT NULL DEFAULT 0;
