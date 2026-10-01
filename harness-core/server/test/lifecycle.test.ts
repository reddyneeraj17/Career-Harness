// Phase 1 (§4) lifecycle-hygiene tests — run against the REAL action handlers
// with an isolated temp sqlite DB (never any artifact's app.db). Covers:
// blank-reason enforcement, blocker rules, run_open/run_close validation,
// and the orphan-run finalizer.
import { describe, test, expect, beforeAll, afterAll, mock } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

// actions.ts references @space/privileged contract stubs at module load;
// none of these tests touch privileged handlers.
mock.module("@space/privileged", () => ({
  privileged: new Proxy({}, { get: () => ({ name: "stub" }) }),
}));

const { Actions } = await import("../src/actions.ts");
const schema = await import("../src/schema.ts");
const { eq } = await import("drizzle-orm");

const TEST_DB = "/tmp/harness-lifecycle-test.db";
let raw: Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
const ctx: any = { db: () => db, invalidateQueries: () => {} };

const call = (name: string, args: any) =>
  (Actions as any)[name].handler(ctx, args);

async function row(appId: string) {
  return (
    await db.select().from(schema.applications).where(eqApp(appId)).limit(1)
  )[0];
}
const eqApp = (appId: string) => eq(schema.applications.appId, appId);

beforeAll(() => {
  try { unlinkSync(TEST_DB); } catch {}
  raw = new Database(TEST_DB);
  const dir = join(import.meta.dir, "..", "..", "drizzle");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  expect(files.length).toBeGreaterThan(0);
  for (const f of files) {
    const chunks = readFileSync(join(dir, f), "utf8").split(/-->\s*statement-breakpoint/);
    for (const c of chunks) {
      const stmt = c.trim();
      if (stmt) raw.exec(stmt);
    }
  }
  db = drizzle(raw, { schema });
  // The real artifact runtime's ctx.db() provides .batch(); plain
  // drizzle-orm/bun-sqlite does not. Shim it for tests (non-transactional).
  (db as any).batch = (queries: any[]) => Promise.all(queries.map((q) => q));
  // Seed: one campaign + one posting.
  raw.exec(
    `INSERT INTO campaigns (campaign_id, type, cadence, cap_per_run, cap_per_day) VALUES ('test_campaign', 'test', 'manual', 10, 50)`
  );
  raw.exec(
    `INSERT INTO postings (posting_id, company, company_norm, role, role_norm, url, source, first_seen, last_seen) VALUES ('p1', 'Acme', 'acme', 'Engineer', 'engineer', 'https://example.com/1', 'linkedin', ${Date.now()}, ${Date.now()})`
  );
});

afterAll(() => {
  raw.close();
  try { unlinkSync(TEST_DB); } catch {}
});

const GOOD_CONFIGS = {
  compiled_config: { campaign_id: "test_campaign", cap_per_run: 10, cap_per_day: 50, skill_chain: ["run-coordinator"] },
  live_config: { mode: "scheduled", trigger: "test" },
};

describe("run_open", () => {
  test("fails loudly on empty configs and writes no row", async () => {
    const r1: any = await call("run_open", { campaign_id: "test_campaign" });
    expect(r1.ok).toBe(false);
    expect(r1.message).toMatch(/compiled_config/);
    const r2: any = await call("run_open", {
      campaign_id: "test_campaign",
      compiled_config: { campaign_id: "test_campaign" },
      live_config: {},
    });
    expect(r2.ok).toBe(false);
    expect(r2.message).toMatch(/live_config/);
    const rows = await db.select().from(schema.runs);
    expect(rows.length).toBe(0);
  });

  test("opens with configs and persists them", async () => {
    const r: any = await call("run_open", { campaign_id: "test_campaign", ...GOOD_CONFIGS });
    expect(r.ok).toBe(true);
    expect(typeof r.run_id).toBe("string");
    const row = (await db.select().from(schema.runs).where(eq(schema.runs.runId, r.run_id)).limit(1))[0];
    expect((row.compiledConfig as any).campaign_id).toBe("test_campaign");
    expect((row.liveConfig as any).trigger).toBe("test");
  });
});

describe("run_close", () => {
  test("rejects unknown run_id", async () => {
    const r: any = await call("run_close", { run_id: "run_nope", status: "completed" });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Run not found/);
  });

  test("closes a known run", async () => {
    const open: any = await call("run_open", { campaign_id: "test_campaign", ...GOOD_CONFIGS });
    const r: any = await call("run_close", { run_id: open.run_id, status: "completed" });
    expect(r.ok).toBe(true);
    const row = (await db.select().from(schema.runs).where(eq(schema.runs.runId, open.run_id)).limit(1))[0];
    expect(row.ended).not.toBeNull();
    expect(row.status).toBe("completed");
  });
});

describe("app_claim", () => {
  test("writes a non-blank status_reason at claim time", async () => {
    const open: any = await call("run_open", { campaign_id: "test_campaign", ...GOOD_CONFIGS });
    expect(open.ok).toBe(true);
    const claimed: any = await call("app_claim", { posting_id: "p1", campaign_id: "test_campaign" });
    expect(claimed.ok).toBe(true);
    const a = await row(claimed.app_id);
    expect(a.state).toBe("discovered");
    expect(a.statusReason).toBe("claimed from linkedin; awaiting screen");
  });
});

describe("app_transition reason hygiene", () => {
  test("never writes a blank reason (mechanical fallback)", async () => {
    const apps = await db.select().from(schema.applications).limit(1);
    const appId = apps[0].appId;
    const r: any = await call("app_transition", { app_id: appId, from: "discovered", to: "screened", evidence: null });
    expect(r.ok).toBe(true);
    const a = await row(appId);
    expect(a.state).toBe("screened");
    expect(a.statusReason && a.statusReason.trim().length).toBeGreaterThan(0);
  });

  test("explicit reason wins", async () => {
    const apps = await db.select().from(schema.applications).limit(1);
    const appId = apps[0].appId;
    const r: any = await call("app_transition", { app_id: appId, from: "screened", to: "resume_picked", evidence: null, reason: "resume picked: v3" });
    expect(r.ok).toBe(true);
    const a = await row(appId);
    expect(a.statusReason).toBe("resume picked: v3");
  });

  test("parked without reason fails; with reason sets blocker", async () => {
    const apps = await db.select().from(schema.applications).limit(1);
    const appId = apps[0].appId;
    // resume_picked -> tailored first
    await call("app_transition", { app_id: appId, from: "resume_picked", to: "tailored", evidence: null, reason: "tailored ok" });
    const bad: any = await call("app_transition", { app_id: appId, from: "tailored", to: "parked", evidence: null });
    expect(bad.ok).toBe(false);
    expect(bad.message).toMatch(/explicit reason/);
    const good: any = await call("app_transition", { app_id: appId, from: "tailored", to: "parked", evidence: null, reason: "portal login wall; parked for operator" });
    expect(good.ok).toBe(true);
    const a = await row(appId);
    expect(a.state).toBe("parked");
    expect(a.blocker).toBe("portal login wall; parked for operator");
    expect(a.statusReason).toBe("portal login wall; parked for operator");
  });

  test("leaving an attention state clears the blocker", async () => {
    const apps = await db.select().from(schema.applications).limit(1);
    const appId = apps[0].appId;
    const r: any = await call("app_transition", { app_id: appId, from: "parked", to: "reviewed", evidence: null, reason: "operator resumed" });
    expect(r.ok).toBe(true);
    const a = await row(appId);
    expect(a.state).toBe("reviewed");
    expect(a.blocker).toBeNull();
  });

  test("blocked via applying requires a reason and sets blocker", async () => {
    const apps = await db.select().from(schema.applications).limit(1);
    const appId = apps[0].appId;
    const minted: any = await call("intent_create", { app_id: appId });
    expect(minted.ok).toBe(true);
    await call("app_transition", { app_id: appId, from: "reviewed", to: "applying", evidence: null, reason: "applying now", intent_id: minted.intent_id });
    const bad: any = await call("app_transition", { app_id: appId, from: "applying", to: "blocked", evidence: null });
    expect(bad.ok).toBe(false);
    const good: any = await call("app_transition", { app_id: appId, from: "applying", to: "blocked", evidence: JSON.stringify({ error: "captcha wall" }), reason: "invisible recaptcha; no bypass" });
    expect(good.ok).toBe(true);
    const a = await row(appId);
    expect(a.blocker).toBe("invisible recaptcha; no bypass");
  });
});

describe("run_finalize_stale", () => {
  test("finalizes orphans, leaves fresh runs alone", async () => {
    const fourHoursAgo = new Date(Date.now() - 4 * 3600_000);
    raw.exec(
      `INSERT INTO runs (run_id, campaign_id, started, status, mode) VALUES ('run_orphan_1', 'test_campaign', ${fourHoursAgo.getTime()}, 'running', 'scheduled')`
    );
    const fresh: any = await call("run_open", { campaign_id: "test_campaign", ...GOOD_CONFIGS });
    const r: any = await call("run_finalize_stale", { max_age_hours: 3 });
    expect(r.ok).toBe(true);
    expect(r.finalized).toContain("run_orphan_1");
    expect(r.finalized).not.toContain(fresh.run_id);
    const orphan = (await db.select().from(schema.runs).where(eq(schema.runs.runId, "run_orphan_1")).limit(1))[0];
    expect(orphan.ended).not.toBeNull();
    expect(orphan.status).toBe("failed");
    expect(orphan.blocker).toMatch(/orphaned: no run_close within 3h/);
    const stillOpen = (await db.select().from(schema.runs).where(eq(schema.runs.runId, fresh.run_id)).limit(1))[0];
    expect(stillOpen.ended).toBeNull();
  });
});

describe("intent_create (§5)", () => {
  let n = 0;
  const mkApp = (state: string) => {
    n += 1;
    const appId = `app_p5_${n}`;
    const nowMs = Date.now();
    raw.exec(
      `INSERT INTO applications (app_id, posting_id, company_norm, role_norm, state, campaign_id, created_at, updated_at) VALUES ('${appId}', 'posting_${appId}', 'acme', 'engineer', '${state}', 'test_campaign', ${nowMs}, ${nowMs})`
    );
    return appId;
  };

  test("mints a server-side intent on a reviewed row; idempotent on retry", async () => {
    const appId = mkApp("reviewed");
    const r1: any = await call("intent_create", { app_id: appId });
    expect(r1.ok).toBe(true);
    expect(r1.intent_id).toMatch(/^intent_/);
    const r2: any = await call("intent_create", { app_id: appId });
    expect(r2.ok).toBe(true);
    expect(r2.intent_id).toBe(r1.intent_id);
    const a = await row(appId);
    expect(a.intentId).toBe(r1.intent_id);
  });

  test("refuses when the row is not in reviewed; unknown app", async () => {
    const appId = mkApp("screened");
    const r: any = await call("intent_create", { app_id: appId });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/reviewed/);
    const r2: any = await call("intent_create", { app_id: "app_nope" });
    expect(r2.ok).toBe(false);
    expect(r2.message).toMatch(/not found/);
  });

  test("reviewed → applying requires the server-minted intent", async () => {
    const appId = mkApp("reviewed");
    const noIntent: any = await call("app_transition", { app_id: appId, from: "reviewed", to: "applying", evidence: null, reason: "go" });
    expect(noIntent.ok).toBe(false);
    expect(noIntent.message).toMatch(/intent_create/);
    const forged: any = await call("app_transition", { app_id: appId, from: "reviewed", to: "applying", evidence: null, reason: "go", intent_id: "intent_forged_by_client" });
    expect(forged.ok).toBe(false);
    expect(forged.message).toMatch(/does not match/);
    const minted: any = await call("intent_create", { app_id: appId });
    const good: any = await call("app_transition", { app_id: appId, from: "reviewed", to: "applying", evidence: null, reason: "go", intent_id: minted.intent_id });
    expect(good.ok).toBe(true);
    const a = await row(appId);
    expect(a.state).toBe("applying");
    expect(a.intentId).toBe(minted.intent_id);
  });
});

describe("structured transition fields (§5)", () => {
  let n = 100;
  const mkApp = (state: string) => {
    n += 1;
    const appId = `app_p5_${n}`;
    const nowMs = Date.now();
    raw.exec(
      `INSERT INTO applications (app_id, posting_id, company_norm, role_norm, state, campaign_id, created_at, updated_at) VALUES ('${appId}', 'posting_${appId}', 'acme', 'engineer', '${state}', 'test_campaign', ${nowMs}, ${nowMs})`
    );
    return appId;
  };

  test("variant/resume path+hash persist on a non-submission edge", async () => {
    const appId = mkApp("tailored");
    const ev = JSON.stringify({ variant_id: "v3", resume_path: "goals/c/h/f/r/app.pdf", resume_hash: "a".repeat(64) });
    const r: any = await call("app_transition", { app_id: appId, from: "tailored", to: "reviewed", evidence: ev, reason: "reviewed ok" });
    expect(r.ok).toBe(true);
    const a = await row(appId);
    expect(a.variantId).toBe("v3");
    expect(a.resumePath).toBe("goals/c/h/f/r/app.pdf");
    expect(a.resumeHash).toBe("a".repeat(64));
  });

  test("malformed evidence and non-sha256 hashes persist nothing and never crash", async () => {
    const appId = mkApp("tailored");
    const r1: any = await call("app_transition", { app_id: appId, from: "tailored", to: "reviewed", evidence: "not-json{{{", reason: "ok" });
    expect(r1.ok).toBe(true);
    let a = await row(appId);
    expect(a.variantId).toBeNull();
    expect(a.resumeHash).toBeNull();
    const appId2 = mkApp("discovered");
    const r2: any = await call("app_transition", { app_id: appId2, from: "discovered", to: "screened", evidence: JSON.stringify({ resume_hash: "xyz", variant_id: "v9" }), reason: "ok" });
    expect(r2.ok).toBe(true);
    a = await row(appId2);
    expect(a.variantId).toBe("v9");
    expect(a.resumeHash).toBeNull();
  });

  test("applying → submitted still enforces the strict evidence contract", async () => {
    const appId = mkApp("reviewed");
    const minted: any = await call("intent_create", { app_id: appId });
    await call("app_transition", { app_id: appId, from: "reviewed", to: "applying", evidence: null, reason: "go", intent_id: minted.intent_id });
    const bad: any = await call("app_transition", { app_id: appId, from: "applying", to: "submitted", evidence: JSON.stringify({ confirmation: "ok" }), reason: "done" });
    expect(bad.ok).toBe(false);
    expect(bad.message).toMatch(/resume_path/);
    const hash = "b".repeat(64);
    const good: any = await call("app_transition", { app_id: appId, from: "applying", to: "submitted", evidence: JSON.stringify({ resume_path: "goals/c/h/f/r/final.pdf", resume_hash: hash, variant_id: "v3", confirmation: "Applied" }), reason: "done" });
    expect(good.ok).toBe(true);
    const a = await row(appId);
    expect(a.resumePath).toBe("goals/c/h/f/r/final.pdf");
    expect(a.resumeHash).toBe(hash);
    expect(a.variantId).toBe("v3");
  });
});

describe("profile_put canonical hash (§8)", () => {
  const facts = {
    identity: { name: "Test User" }, work_auth: {}, role_types: ["full_time"],
    locations: {}, targeting: {}, comp: {}, start_date: null, answers: {},
    caps: { per_run: 10, per_day: 50 }, reply_tiers: {},
  };
  test("returns a canonical profile_hash owned by the server", async () => {
    const r1: any = await call("profile_put", { ...facts });
    expect(r1.ok).toBe(true);
    expect(r1.profile_hash).toMatch(/^[a-f0-9]{64}$/);
    // Deterministic: same facts, different key order → same hash.
    const shuffled: any = {};
    for (const k of Object.keys(facts).reverse()) shuffled[k] = (facts as any)[k];
    const r2: any = await call("profile_put", shuffled);
    expect(r2.profile_hash).toBe(r1.profile_hash);
    // Different facts → different hash.
    const r3: any = await call("profile_put", { ...facts, caps: { per_run: 5, per_day: 50 } });
    expect(r3.profile_hash).not.toBe(r1.profile_hash);
  });
});
