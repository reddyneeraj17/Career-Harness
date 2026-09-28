-- 0014: Ad-hoc schedule triggers — the dashboard's "Trigger now" button on each
-- Schedules row queues a one-shot run here; the schedule-trigger-dispatch cron
-- picks up pending rows within ~2 minutes and fires the campaign via cron.run.
-- Works on disabled schedules too (temporary enable → run → re-disable), and
-- never flips the schedule's own enabled toggle.
CREATE TABLE IF NOT EXISTS schedule_triggers (id INTEGER PRIMARY KEY AUTOINCREMENT, job_id TEXT NOT NULL, campaign TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER, handled_at INTEGER, error TEXT);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS schedule_triggers_status_idx ON schedule_triggers(status);
