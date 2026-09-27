-- 0012: LinkedIn optimizer — per-section proposal data on approvals.
-- kind='linkedin_section' rows carry the profile section, the live text at
-- audit time, and the proposed rewrite so the dashboard can render the
-- side-by-side Approve / Edit / Discard cards.
ALTER TABLE `approvals` ADD COLUMN `section` text;
--> statement-breakpoint
ALTER TABLE `approvals` ADD COLUMN `current_text` text;
--> statement-breakpoint
ALTER TABLE `approvals` ADD COLUMN `proposed_text` text;
--> statement-breakpoint
ALTER TABLE `approvals` ADD COLUMN `proposal_path` text;
--> statement-breakpoint
ALTER TABLE `approvals` ADD COLUMN `run_id` text;
