ALTER TABLE `runs` ADD `tokens_input` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `runs` ADD `tokens_output` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `runs` ADD `tokens_total` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `runs` ADD `tokens_reported` integer NOT NULL DEFAULT 0;
