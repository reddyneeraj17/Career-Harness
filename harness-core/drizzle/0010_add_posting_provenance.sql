ALTER TABLE `postings` ADD COLUMN `source_class` text CHECK (`source_class` IS NULL OR `source_class` IN ('company_portal', 'vendor_portal', 'linkedin', 'job_board', 'open_web'));
--> statement-breakpoint
ALTER TABLE `postings` ADD COLUMN `source_name` text;
--> statement-breakpoint
ALTER TABLE `postings` ADD COLUMN `discovery_phase` text CHECK (`discovery_phase` IS NULL OR `discovery_phase` IN ('dataset', 'web_expansion', 'additional_source'));
--> statement-breakpoint
ALTER TABLE `postings` ADD COLUMN `source_tier` text DEFAULT 'unknown' CHECK (`source_tier` IS NULL OR `source_tier` IN ('1', '2', '3', 'unknown'));
--> statement-breakpoint
ALTER TABLE `postings` ADD COLUMN `employment_types_offered` text DEFAULT '[]' CHECK (`employment_types_offered` IS NULL OR json_valid(`employment_types_offered`));
--> statement-breakpoint
ALTER TABLE `postings` ADD COLUMN `selected_lane` text CHECK (`selected_lane` IS NULL OR `selected_lane` IN ('full_time', 'w2_contract', 'c2c_contract', 'part_time', 'internship'));
--> statement-breakpoint
ALTER TABLE `postings` ADD COLUMN `h1b_mode` text CHECK (`h1b_mode` IS NULL OR `h1b_mode` IN ('soft_lookup', 'bypass_c2c'));
--> statement-breakpoint
ALTER TABLE `postings` ADD COLUMN `h1b_result` text CHECK (`h1b_result` IS NULL OR `h1b_result` IN ('scored', 'unknown', 'not_applicable'));
--> statement-breakpoint
UPDATE `postings` SET `source_name` = `source` WHERE `source_name` IS NULL;