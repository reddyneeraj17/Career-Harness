-- 0015: years_matrix becomes a first-class profile column. Previously the skills
-- matrix lived only as a top-level section in profile.yaml (and, in some
-- installs, embedded inside one of the profile JSON columns) — so the
-- dashboard's profile_save rewrote profile.yaml from fixed fields and silently
-- dropped it. The column is the durable store; profile.yaml round-trips it.
ALTER TABLE profile ADD COLUMN years_matrix TEXT NOT NULL DEFAULT '[]';
