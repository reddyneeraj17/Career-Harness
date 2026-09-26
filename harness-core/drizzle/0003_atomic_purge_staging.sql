CREATE TABLE purge_stage (
  batch_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX purge_stage_batch_table_row_unique ON purge_stage(batch_id, table_name, row_id);
--> statement-breakpoint
CREATE TABLE purge_guard (
  batch_id TEXT PRIMARY KEY,
  offender_count INTEGER NOT NULL CHECK(offender_count = 0)
);
