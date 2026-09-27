-- 0011: held-reply resolution — dashboard approve/discard decisions on held replies.
-- The scheduled replier sends approved drafts; the dashboard only records the decision.
ALTER TABLE `replies` ADD COLUMN `held_resolution` text CHECK (`held_resolution` IS NULL OR `held_resolution` IN ('approved', 'discarded'));
--> statement-breakpoint
ALTER TABLE `replies` ADD COLUMN `held_resolved_at` integer;
