-- Resumable chunked dataset imports (v1.2.12): large seed CSVs (80K+ rows) exceed
-- the 120s action limit, so imports run as a staged job with bounded chunks.
CREATE TABLE `dataset_import_jobs` (
  `job_id` TEXT PRIMARY KEY NOT NULL,
  `dataset` TEXT NOT NULL,
  `total_rows` INTEGER NOT NULL DEFAULT 0,
  `cursor` INTEGER NOT NULL DEFAULT 0,
  `processed` INTEGER NOT NULL DEFAULT 0,
  `imported` INTEGER NOT NULL DEFAULT 0,
  `skipped` INTEGER NOT NULL DEFAULT 0,
  `status` TEXT NOT NULL DEFAULT 'running',
  `error` TEXT,
  `source_url` TEXT,
  `source_sha256` TEXT,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL
);
