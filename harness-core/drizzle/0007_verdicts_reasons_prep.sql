-- 0007: v1.2.0 — posting verdicts, status reasons, talking-points linkage.
-- posting_verdicts: one row per posting per stage (scout/screen) per run.
ALTER TABLE applications ADD COLUMN status_reason TEXT;
ALTER TABLE applications ADD COLUMN talking_points_path TEXT;
CREATE TABLE posting_verdicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  posting_id TEXT NOT NULL,
  run_id TEXT,
  stage TEXT NOT NULL CHECK(stage IN ('scout', 'screen')),
  verdict TEXT NOT NULL CHECK(verdict IN ('passed', 'held', 'rejected')),
  reason TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX idx_posting_verdicts_posting ON posting_verdicts(posting_id);
CREATE INDEX idx_posting_verdicts_run ON posting_verdicts(run_id);
