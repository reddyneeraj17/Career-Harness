-- 0013: run mode — dashboard-triggered manual runs vs scheduled cron runs.
-- The LinkedIn optimizer starts from the Overview "Optimize LinkedIn" button
-- (mode='manual'); all cron-driven campaign runs stay mode='scheduled'.
ALTER TABLE `runs` ADD COLUMN `mode` text NOT NULL DEFAULT 'scheduled';
