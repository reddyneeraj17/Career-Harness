DROP TABLE IF EXISTS entries;
--> statement-breakpoint
CREATE TABLE profile (id INTEGER PRIMARY KEY DEFAULT 1 CHECK(id=1), identity TEXT NOT NULL DEFAULT '{}', work_auth TEXT NOT NULL DEFAULT '{}', role_types TEXT NOT NULL DEFAULT '[]', locations TEXT NOT NULL DEFAULT '[]', targeting TEXT NOT NULL DEFAULT '{}', comp TEXT NOT NULL DEFAULT '{}', start_date TEXT, answers TEXT NOT NULL DEFAULT '{}', caps TEXT NOT NULL DEFAULT '{}', reply_tiers TEXT NOT NULL DEFAULT '{}', updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE resume_variants (variant_id TEXT PRIMARY KEY, path TEXT NOT NULL, sha256 TEXT NOT NULL, role_family TEXT NOT NULL, industry_tags TEXT NOT NULL DEFAULT '[]', years_matrix TEXT NOT NULL DEFAULT '{}', keyword_vector TEXT NOT NULL DEFAULT '{}', times_picked INTEGER NOT NULL DEFAULT 0, approval_rate REAL NOT NULL DEFAULT 0, last_picked_at INTEGER);
--> statement-breakpoint
CREATE TABLE campaigns (campaign_id TEXT PRIMARY KEY, type TEXT NOT NULL, cadence TEXT NOT NULL, cap_per_run INTEGER NOT NULL, cap_per_day INTEGER NOT NULL, gates TEXT NOT NULL DEFAULT '{}', sources TEXT NOT NULL DEFAULT '[]', cron_id TEXT);
--> statement-breakpoint
CREATE TABLE postings (posting_id TEXT PRIMARY KEY, company TEXT NOT NULL, company_norm TEXT NOT NULL, role TEXT NOT NULL, role_norm TEXT NOT NULL, url TEXT NOT NULL, source TEXT NOT NULL, jd_path TEXT, jd_hash TEXT, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX postings_company_role_unique ON postings(company_norm, role_norm);
--> statement-breakpoint
CREATE TABLE applications (app_id TEXT PRIMARY KEY, posting_id TEXT NOT NULL, company_norm TEXT NOT NULL, role_norm TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'discovered', campaign_id TEXT NOT NULL, run_id TEXT, variant_id TEXT, resume_hash TEXT, intent_id TEXT, evidence_path TEXT, blocker TEXT, outcome TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, submitted_at INTEGER, kit_version TEXT);
--> statement-breakpoint
CREATE UNIQUE INDEX applications_company_role_unique ON applications(company_norm, role_norm);
--> statement-breakpoint
CREATE TABLE reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, jd_hash TEXT NOT NULL, resume_hash TEXT NOT NULL, verdict TEXT NOT NULL, notes TEXT, reviewer_version TEXT NOT NULL, decided_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX reviews_jd_resume_unique ON reviews(jd_hash, resume_hash);
--> statement-breakpoint
CREATE TABLE runs (run_id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, kit_version TEXT, started INTEGER NOT NULL, ended INTEGER, status TEXT NOT NULL, counts TEXT NOT NULL DEFAULT '{}', tokens TEXT NOT NULL DEFAULT '{}', needs_me INTEGER NOT NULL DEFAULT 0, compiled_config TEXT NOT NULL DEFAULT '{}', live_config TEXT NOT NULL DEFAULT '{}', blocker TEXT);
--> statement-breakpoint
CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT, app_id TEXT, type TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}', at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE approvals (approval_id TEXT PRIMARY KEY, kind TEXT NOT NULL, app_id TEXT, question TEXT NOT NULL, options TEXT NOT NULL DEFAULT '[]', judged_by TEXT, created_at INTEGER NOT NULL, resolved_at INTEGER, answer TEXT);
--> statement-breakpoint
CREATE TABLE h1b_sponsors (company_norm TEXT PRIMARY KEY, stats_by_year TEXT NOT NULL DEFAULT '{}', lca_count INTEGER NOT NULL DEFAULT 0, last_refreshed INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE companies (company_norm TEXT PRIMARY KEY, tier INTEGER NOT NULL DEFAULT 3, industry TEXT, hq_state TEXT, careers_url TEXT, ats_type TEXT, park_count INTEGER NOT NULL DEFAULT 0, skip_flag INTEGER NOT NULL DEFAULT 0, skip_reason TEXT);
--> statement-breakpoint
CREATE TABLE contacts (contact_id TEXT PRIMARY KEY, name TEXT NOT NULL, page_url TEXT, company_norm TEXT);
--> statement-breakpoint
CREATE TABLE conversations (thread_id TEXT PRIMARY KEY, channel TEXT NOT NULL, contact_id TEXT, app_id TEXT, classification TEXT, state TEXT NOT NULL, watermark TEXT, updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE replies (reply_id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, direction TEXT NOT NULL, action TEXT NOT NULL CHECK(action IN ('sent','held','auto_sent','skipped')), rule_id TEXT, draft_path TEXT, reason TEXT, run_id TEXT, approval_id TEXT, attachment_name TEXT, at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE token_usage (run_id TEXT PRIMARY KEY, date TEXT NOT NULL, campaign_id TEXT NOT NULL, input_tokens INTEGER NOT NULL, output_tokens INTEGER NOT NULL, total_tokens INTEGER NOT NULL, stages TEXT NOT NULL DEFAULT '{}');
--> statement-breakpoint
CREATE INDEX applications_state_idx ON applications(state);
--> statement-breakpoint
CREATE INDEX applications_campaign_idx ON applications(campaign_id, created_at);
--> statement-breakpoint
CREATE INDEX events_run_idx ON events(run_id, at);
--> statement-breakpoint
CREATE INDEX approvals_open_idx ON approvals(resolved_at, created_at);
--> statement-breakpoint
CREATE INDEX replies_thread_idx ON replies(thread_id, at);
