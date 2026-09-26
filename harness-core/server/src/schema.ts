import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey().default(1),
  identity: text("identity", { mode: "json" }).notNull().default({}),
  workAuth: text("work_auth", { mode: "json" }).notNull().default({}),
  roleTypes: text("role_types", { mode: "json" }).notNull().default([]),
  locations: text("locations", { mode: "json" }).notNull().default([]),
  targeting: text("targeting", { mode: "json" }).notNull().default({}),
  comp: text("comp", { mode: "json" }).notNull().default({}),
  startDate: text("start_date"),
  answers: text("answers", { mode: "json" }).notNull().default({}),
  caps: text("caps", { mode: "json" }).notNull().default({}),
  replyTiers: text("reply_tiers", { mode: "json" }).notNull().default({}),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const resumeVariants = sqliteTable("resume_variants", {
  variantId: text("variant_id").primaryKey(), path: text("path").notNull(), sha256: text("sha256").notNull(),
  roleFamily: text("role_family").notNull(), industryTags: text("industry_tags", { mode: "json" }).notNull().default([]),
  yearsMatrix: text("years_matrix", { mode: "json" }).notNull().default({}), keywordVector: text("keyword_vector", { mode: "json" }).notNull().default({}),
  timesPicked: integer("times_picked").notNull().default(0), approvalRate: real("approval_rate").notNull().default(0),
  lastPickedAt: integer("last_picked_at", { mode: "timestamp_ms" }),
});

export const campaigns = sqliteTable("campaigns", {
  campaignId: text("campaign_id").primaryKey(), type: text("type").notNull(), cadence: text("cadence").notNull(),
  capPerRun: integer("cap_per_run").notNull(), capPerDay: integer("cap_per_day").notNull(),
  gates: text("gates", { mode: "json" }).notNull().default({}), sources: text("sources", { mode: "json" }).notNull().default([]), cronId: text("cron_id"),
});

export const postings = sqliteTable("postings", {
  postingId: text("posting_id").primaryKey(), company: text("company").notNull(), companyNorm: text("company_norm").notNull(),
  role: text("role").notNull(), roleNorm: text("role_norm").notNull(), url: text("url").notNull(), source: text("source").notNull(),
  jdPath: text("jd_path"), jdHash: text("jd_hash"), firstSeen: integer("first_seen", { mode: "timestamp_ms" }).notNull(), lastSeen: integer("last_seen", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("postings_company_role_idx").on(t.companyNorm, t.roleNorm)]);

export const applications = sqliteTable("applications", {
  appId: text("app_id").primaryKey(), postingId: text("posting_id").notNull(), companyNorm: text("company_norm").notNull(), roleNorm: text("role_norm").notNull(),
  state: text("state").notNull().default("discovered"), campaignId: text("campaign_id").notNull(), runId: text("run_id"), variantId: text("variant_id"),
  resumePath: text("resume_path"), resumeHash: text("resume_hash"), screenshotPath: text("screenshot_path"), confirmation: text("confirmation"), confirmationPath: text("confirmation_path"),
  intentId: text("intent_id"), evidencePath: text("evidence_path"), blocker: text("blocker"), outcome: text("outcome"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()), updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()), submittedAt: integer("submitted_at", { mode: "timestamp_ms" }), kitVersion: text("kit_version"),
}, (t) => [uniqueIndex("applications_posting_unique").on(t.postingId)]);

export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }), jdHash: text("jd_hash").notNull(), resumeHash: text("resume_hash").notNull(),
  verdict: text("verdict").notNull(), notes: text("notes"), reviewerVersion: text("reviewer_version").notNull(), decidedAt: integer("decided_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [uniqueIndex("reviews_jd_resume_unique").on(t.jdHash, t.resumeHash)]);

export const runs = sqliteTable("runs", {
  runId: text("run_id").primaryKey(), campaignId: text("campaign_id").notNull(), kitVersion: text("kit_version"),
  started: integer("started", { mode: "timestamp_ms" }).notNull(), ended: integer("ended", { mode: "timestamp_ms" }), status: text("status").notNull(),
  counts: text("counts", { mode: "json" }).notNull().default({}), tokens: text("tokens", { mode: "json" }).notNull().default({}),
  tokensInput: integer("tokens_input").notNull().default(0), tokensOutput: integer("tokens_output").notNull().default(0), tokensTotal: integer("tokens_total").notNull().default(0), tokensReported: integer("tokens_reported", { mode: "boolean" }).notNull().default(false),
  needsMe: integer("needs_me", { mode: "boolean" }).notNull().default(false), compiledConfig: text("compiled_config", { mode: "json" }).notNull().default({}), liveConfig: text("live_config", { mode: "json" }).notNull().default({}), blocker: text("blocker"),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }), runId: text("run_id"), appId: text("app_id"), type: text("type").notNull(),
  payload: text("payload", { mode: "json" }).notNull().default({}), at: integer("at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const approvals = sqliteTable("approvals", {
  approvalId: text("approval_id").primaryKey(), kind: text("kind").notNull(), appId: text("app_id"), question: text("question").notNull(),
  options: text("options", { mode: "json" }).notNull().default([]), judgedBy: text("judged_by"), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }), answer: text("answer"),
});

export const h1bSponsors = sqliteTable("h1b_sponsors", {
  companyNorm: text("company_norm").primaryKey(), statsByYear: text("stats_by_year", { mode: "json" }).notNull().default({}), lcaCount: integer("lca_count").notNull().default(0), lastRefreshed: integer("last_refreshed", { mode: "timestamp_ms" }).notNull(),
});

export const companies = sqliteTable("companies", {
  companyNorm: text("company_norm").primaryKey(), tier: integer("tier").notNull().default(3), industry: text("industry"), hqState: text("hq_state"),
  careersUrl: text("careers_url"), atsType: text("ats_type"), parkCount: integer("park_count").notNull().default(0), skipFlag: integer("skip_flag", { mode: "boolean" }).notNull().default(false), skipReason: text("skip_reason"),
});

export const contacts = sqliteTable("contacts", {
  contactId: text("contact_id").primaryKey(), name: text("name").notNull(), pageUrl: text("page_url"), companyNorm: text("company_norm"),
});

export const conversations = sqliteTable("conversations", {
  threadId: text("thread_id").primaryKey(), channel: text("channel").notNull(), contactId: text("contact_id"), appId: text("app_id"),
  classification: text("classification"), state: text("state").notNull(), watermark: text("watermark"), updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const replies = sqliteTable("replies", {
  replyId: text("reply_id").primaryKey(), threadId: text("thread_id").notNull(), direction: text("direction").notNull(),
  action: text("action", { enum: ["sent", "held", "auto_sent", "skipped"] }).notNull(), ruleId: text("rule_id"), draftPath: text("draft_path"), reason: text("reason"),
  runId: text("run_id"), approvalId: text("approval_id"), attachmentName: text("attachment_name"), at: integer("at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const tokenUsage = sqliteTable("token_usage", {
  runId: text("run_id").primaryKey(), date: text("date").notNull(), campaignId: text("campaign_id").notNull(), inputTokens: integer("input_tokens").notNull(), outputTokens: integer("output_tokens").notNull(), totalTokens: integer("total_tokens").notNull(), stages: text("stages", { mode: "json" }).notNull().default({}),
});

// Internal transaction scaffolding for test_data_purge. The CHECK on
// purge_guard.offender_count is installed by migration and aborts the entire
// batch if an unmarked dependent appears between preflight and deletion.
export const purgeStage = sqliteTable("purge_stage", {
  batchId: text("batch_id").notNull(), tableName: text("table_name").notNull(), rowId: text("row_id").notNull(),
}, (t) => [uniqueIndex("purge_stage_batch_table_row_unique").on(t.batchId, t.tableName, t.rowId)]);

export const purgeGuard = sqliteTable("purge_guard", {
  batchId: text("batch_id").primaryKey(), offenderCount: integer("offender_count").notNull(),
});
