DROP INDEX IF EXISTS `applications_company_role_unique`;
--> statement-breakpoint
DROP INDEX IF EXISTS `postings_company_role_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_posting_unique` ON `applications` (`posting_id`);
--> statement-breakpoint
CREATE INDEX `postings_company_role_idx` ON `postings` (`company_norm`, `role_norm`);
