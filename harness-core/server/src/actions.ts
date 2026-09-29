import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { privileged } from "@space/privileged";
import { and, asc, desc, eq, gte, inArray, isNull, lt, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import * as schema from "./schema";

const jsonValue = z.unknown();
const emptyRequest = z.object({});
const okResponse = z.object({ ok: z.boolean(), message: z.string().optional() });
const now = () => new Date();
const iso = (d: Date | null | undefined) => d ? d.toISOString() : null;
const norm = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const titleCaseForServer = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const id = (prefix: string) => `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
const countNumber = (value: unknown) => Number(value ?? 0);
const chicagoDay = (date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const jsonObject = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const jsonArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const sourceClass = z.enum(["company_portal", "vendor_portal", "linkedin", "job_board", "open_web"]);
const discoveryPhase = z.enum(["dataset", "web_expansion", "additional_source"]);
const sourceTier = z.enum(["1", "2", "3", "unknown"]);
const h1bMode = z.enum(["soft_lookup", "bypass_c2c"]);
const h1bResult = z.enum(["scored", "unknown", "not_applicable"]);
// LinkedIn optimizer (v1.2.6): profile sections the optimizer can propose rewrites for.
const linkedinSection = z.enum(["headline", "about", "experience", "skills", "visibility"]);
// LinkedIn optimizer main-agent reroute: the dashboard hands the audit and each
// approved apply to the main agent via `awaiting_main_agent` events instead of
// spawning a worker (the worker path hit LinkedIn HTTP 999 blocks).
const linkedinSections = ["headline", "about", "experience", "skills", "visibility"] as const;
const linkedinStartResponse = z.union([
  z.object({ ok: z.literal(true), run_id: z.string(), task_id: z.string().nullable(), message: z.string() }),
  z.object({ ok: z.literal(false), message: z.string() }),
]);
const linkedinProposalCompleteResponse = z.object({ ok: z.boolean(), message: z.string() });
const linkedinApplyCompleteResponse = z.object({ ok: z.boolean(), message: z.string(), run_complete: z.boolean() });

function linkedinProfileUrl(row: typeof schema.profile.$inferSelect | undefined): string | null {
  const value = jsonObject(row?.identity).linkedin;
  return typeof value === "string" && value.startsWith("https://") ? value : null;
}
const runMode = z.enum(["scheduled", "manual"]);
const postingRow = z.object({
  posting_id: z.string().min(1), company: z.string().min(1), role: z.string().min(1), url: z.string().min(1), source: z.string().min(1),
  jd_path: z.string().nullable().optional(), jd_hash: z.string().nullable().optional(), first_seen: z.string().datetime().optional(), last_seen: z.string().datetime().optional(),
  // Provenance (migration 0010): scouts supply it; the coordinator owns it from claim on.
  source_class: sourceClass.nullable().optional(), source_name: z.string().nullable().optional(),
  discovery_phase: discoveryPhase.nullable().optional(), source_tier: sourceTier.nullable().optional(),
  employment_types_offered: z.array(z.string()).nullable().optional(),
  selected_lane: z.enum(["full_time", "part_time", "w2_contract", "c2c_contract", "internship"]).nullable().optional(), h1b_mode: h1bMode.nullable().optional(), h1b_result: h1bResult.nullable().optional(),
});
const profilePayload = z.object({
  identity: jsonValue, work_auth: jsonValue, role_types: jsonValue, locations: jsonValue, targeting: jsonValue, comp: jsonValue,
  start_date: z.string().nullable(), answers: jsonValue, caps: jsonValue, reply_tiers: jsonValue,
  // Skills matrix (optional): list of {skill, category?, years, where_used?}.
  // First-class since v1.2.12 — no longer dropped on dashboard save.
  years_matrix: z.array(z.object({ skill: z.string().trim().min(1), category: z.string().trim().optional(), years: z.number().int().min(0), where_used: z.string().trim().optional() })).optional(),
});
const campaignPayload = z.record(z.string().min(1), z.object({
  cadence: z.string().min(1), type: z.string().min(1).optional(), group: z.string().min(1).optional(),
  gates: jsonValue.optional(), sources: z.array(jsonValue).optional(), cron_id: z.string().nullable().optional(),
}));
const profilePutPayload = profilePayload.extend({ campaigns: campaignPayload.optional() }).superRefine((value, ctx) => {
  if (!value.campaigns || Object.keys(value.campaigns).length === 0) return;
  const caps = jsonObject(value.caps); const perRun = Number(caps.per_run); const perDay = Number(caps.per_day);
  if (!Number.isInteger(perRun) || perRun < 1) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["caps", "per_run"], message: "A positive integer is required when campaigns are provided." });
  if (!Number.isInteger(perDay) || perDay < 1) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["caps", "per_day"], message: "A positive integer is required when campaigns are provided." });
});

const workStatus = z.enum(["H-1B", "H1B", "US citizen", "Green card", "OPT", "STEM OPT", "TN", "EAD"]);
const roleType = z.enum(["full_time", "part_time", "w2_contract", "c2c_contract", "internship"]);
const seniority = z.enum(["junior", "mid", "senior", "staff", "architect", "principal", "lead", "director"]);
const answerValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const placeholderPattern = /\[FILL IN\]/i;
const bracketPlaceholderPattern = /^\[.*\]$/;
const isPlaceholderString = (value: string) => placeholderPattern.test(value.trim()) || bracketPlaceholderPattern.test(value.trim());
const strictProfile = z.object({
  identity: z.object({ name: z.string().trim().min(1), email: z.string().email(), phone: z.string().trim().min(1), location: z.string().trim().min(1), linkedin: z.string().url(), timezone: z.string().trim().min(1) }).catchall(jsonValue),
  work_auth: z.object({ status: workStatus, sponsor_required: z.boolean(), h1b_gate: z.enum(["hard", "soft"]) }).catchall(jsonValue),
  role_types: z.array(roleType).min(1, "Select at least one employment type."),
  locations: z.object({ priority: z.array(z.string().trim().min(1)).min(1), relocation: z.string().trim().min(1) }).catchall(jsonValue),
  targeting: z.object({ industries: z.array(z.string().trim().min(1)).min(1), seniority: z.array(seniority).min(1), tiers: z.array(z.number().int().min(1).max(3)).min(1), titles: z.array(z.string().trim().min(1)).min(1) }).catchall(jsonValue),
  comp: z.object({ floor: z.union([z.number().nonnegative(), z.string().trim().min(1), z.null()]), note: z.string().trim().min(1) }).catchall(jsonValue),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  answers: z.object({ relocate: z.string().trim().min(1), covenants: z.string().trim().min(1), drivers_license: z.string().trim().min(1), degree_dates: z.string().trim().min(1), home_zip: z.string().trim().min(1), work_authorized_us: z.string().trim().min(1) }).catchall(answerValue),
  caps: z.object({ per_run: z.number().int().min(1), per_day: z.number().int().min(1), appliers: z.number().int().min(1) }).catchall(jsonValue),
  reply_tiers: z.object({ auto_send: z.array(z.string().regex(/^R[1-8]$/)).min(1), draft_for_review: z.array(z.string().trim().min(1)).min(1), never: z.array(z.string().trim().min(1)).min(1) }).catchall(jsonValue),
  // Skills matrix: optional in the dashboard payload (absent = keep existing).
  years_matrix: z.array(z.object({ skill: z.string().trim().min(1), category: z.string().trim().optional(), years: z.number().int().min(0), where_used: z.string().trim().optional() })).optional(),
}).superRefine((value, ctx) => {
  const requiredStrings: Array<{ path: (string | number)[]; value: string }> = [
    ...Object.entries(value.identity).filter(([key]) => ["name", "email", "phone", "location", "linkedin", "timezone"].includes(key)).map(([key, text]) => ({ path: ["identity", key], value: String(text) })),
    { path: ["work_auth", "status"], value: value.work_auth.status },
    { path: ["work_auth", "h1b_gate"], value: value.work_auth.h1b_gate },
    ...value.locations.priority.map((text, index) => ({ path: ["locations", "priority", index], value: text })),
    { path: ["locations", "relocation"], value: value.locations.relocation },
    ...value.targeting.industries.map((text, index) => ({ path: ["targeting", "industries", index], value: text })),
    ...value.targeting.titles.map((text, index) => ({ path: ["targeting", "titles", index], value: text })),
    ...(typeof value.comp.floor === "string" ? [{ path: ["comp", "floor"] as (string | number)[], value: value.comp.floor }] : []),
    { path: ["comp", "note"], value: value.comp.note },
    { path: ["start_date"], value: value.start_date },
    ...["relocate", "covenants", "drivers_license", "degree_dates", "home_zip", "work_authorized_us"].map((key) => ({ path: ["answers", key], value: String(value.answers[key as keyof typeof value.answers] ?? "") })),
    ...value.reply_tiers.auto_send.map((text, index) => ({ path: ["reply_tiers", "auto_send", index], value: text })),
    ...value.reply_tiers.draft_for_review.map((text, index) => ({ path: ["reply_tiers", "draft_for_review", index], value: text })),
    ...value.reply_tiers.never.map((text, index) => ({ path: ["reply_tiers", "never", index], value: text })),
  ];
  for (const field of requiredStrings) {
    if (isPlaceholderString(field.value)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: field.path, message: "Replace the placeholder with the real value." });
  }
});

const yamlProfileSchema = z.object({
  identity: z.object({ name: z.string().min(1), email: z.string().email(), phone: z.string().min(1), city: z.string().min(1), state: z.string().min(1), linkedin_url: z.string().url() }),
  work_auth: z.object({ status: workStatus, sponsor_required: z.boolean(), h1b_gate: z.enum(["hard", "soft"]) }),
  role_types: z.array(roleType).min(1, "Select at least one employment type."),
  locations: z.object({ us_only: z.boolean(), remote: z.enum(["ok", "only", "no"]), metros: z.array(z.string()).optional() }),
  targeting: z.object({ tiers: z.array(z.number().int().min(1).max(3)), industries: z.array(z.string()).min(1), seniority: z.array(seniority).min(1), titles: z.array(z.string()).min(1) }),
  comp: z.object({ floor: z.union([z.number(), z.string(), z.null()]), negotiable_answer: z.string().min(1), zero_ok: z.boolean() }),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  answers: z.object({ relocate: z.string(), restrictive_covenants: z.string(), drivers_license: z.string(), degree_dates: z.string() }).catchall(answerValue),
  caps: z.object({ per_run: z.number().int().min(1), per_day: z.number().int().min(1), appliers: z.number().int().min(1), linkedin_actions_per_hour: z.number().int().min(1) }),
  reply_tiers: z.object({ auto_send: z.array(z.string().regex(/^R[1-8]$/)).min(1), draft_for_review: z.array(z.string()).min(1), never: z.array(z.string()).min(1) }),
  resumes: z.object({ dir: z.string().min(1), filename_rule: z.string().min(1) }),
  // Skills matrix: optional top-level section (list form). Round-tripped by
  // renderProfileYaml — never silently dropped.
  years_matrix: z.array(z.object({ skill: z.string().min(1), category: z.string().optional(), years: z.number().int().min(0), where_used: z.string().optional() })).optional(),
  // All 13 job keys are accepted; cadence is required when an entry is
  // present and enabled is an optional boolean (absent = enabled).
  campaigns: z.record(z.string(), z.object({ cadence: z.string().min(1), enabled: z.boolean().optional() }).catchall(z.unknown())),
});

type ProfileInput = z.infer<typeof strictProfile>;
type ProfileRowInput = z.infer<typeof profilePayload>;
type ProfileWarning = { field: string; message: string };

const q = (value: string) => JSON.stringify(value);
const yamlList = (values: readonly (string | number)[]) => `[${values.map((value) => typeof value === "number" ? String(value) : q(value)).join(", ")}]`;
const rootSection = (text: string, name: string): string | null => {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`${name}:`));
  if (start < 0) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^[A-Za-z_][A-Za-z0-9_-]*:/.test(lines[index] ?? "")) { end = index; break; }
  }
  return lines.slice(start, end).join("\n").trimEnd();
};
const headerBlock = (text: string) => {
  const first = text.match(/^[A-Za-z_][A-Za-z0-9_-]*:/m);
  return first && first.index !== undefined ? text.slice(0, first.index).trimEnd() : "";
};

function splitLocation(location: string): { city: string; state: string } | null {
  const match = location.trim().match(/^(.+?),\s*([A-Za-z]{2})$/);
  return match && match[1] && match[2] ? { city: match[1].trim(), state: match[2].toUpperCase() } : null;
}

function deriveYamlLocations(locations: ProfileInput["locations"], previous: string | null): { block: string; warning?: ProfileWarning } {
  const values = locations.priority.map((entry) => entry.trim()).filter(Boolean);
  const remote = values.filter((entry) => /(^|[\s_-])remote([\s_-]|$)/i.test(entry));
  const generic = values.filter((entry) => /^(u\.?s\.?|united states|us[- ]wide(?: onsite)?|nationwide|anywhere in (?:the )?us)$/i.test(entry));
  const metro = values.filter((entry) => !remote.includes(entry) && !generic.includes(entry) && /^[A-Za-z .'-]+(?:,\s*[A-Z]{2})?$/.test(entry));
  const recognized = remote.length + generic.length + metro.length === values.length;
  if (!recognized || values.length === 0) {
    return {
      block: previous ?? "locations:\n  us_only: true\n  remote: no\n  metros: []",
      warning: { field: "locations.priority", message: "One or more priority entries could not be mapped safely, so the previous YAML locations block was kept." },
    };
  }
  const onlyRemote = remote.length > 0 && remote.length === values.length;
  const remoteValue = onlyRemote ? "only" : remote.length > 0 ? "ok" : "no";
  const outsideUs = /international|outside (?:the )?us|worldwide|global/i.test(locations.relocation);
  const metroNames = metro.map((entry) => entry.replace(/,\s*[A-Z]{2}$/, ""));
  // Quote the remote flag: bare `no`/`yes`/`on`/`off` parse as booleans under
  // YAML 1.1 (PyYAML, used by validate_profile.py), which corrupts the enum.
  return { block: `locations:\n  us_only: ${outsideUs ? "false" : "true"}\n  remote: ${q(remoteValue)}\n  metros: ${yamlList(metroNames)}` };
}

const KNOWN_YAML_ROOTS = new Set(["identity", "work_auth", "role_types", "locations", "targeting", "comp", "start_date", "answers", "caps", "reply_tiers", "resumes", "campaigns", "years_matrix"]);

function renderYearsMatrixYaml(entries: YearsMatrixEntry[]): string {
  const lines = ["years_matrix:"];
  for (const entry of entries) {
    lines.push(`  - skill: ${q(entry.skill)}`);
    if (entry.category !== undefined) lines.push(`    category: ${q(entry.category)}`);
    lines.push(`    years: ${entry.years}`);
    if (entry.where_used !== undefined) lines.push(`    where_used: ${q(entry.where_used)}`);
  }
  return lines.join("\n");
}

// Replace (or append) one top-level YAML section, preserving everything else
// byte-for-byte. Used for years_matrix so an import never rewrites the file.
function spliceTopLevelSection(yamlText: string, name: string, sectionText: string): string {
  const lines = yamlText.split("\n");
  const start = lines.findIndex((line) => line === `${name}:`);
  if (start < 0) return `${yamlText.trimEnd()}\n\n${sectionText.trim()}\n`;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^[A-Za-z_][A-Za-z0-9_-]*:/.test(lines[index] ?? "")) { end = index; break; }
  }
  return [...lines.slice(0, start), sectionText.trim(), ...lines.slice(end)].join("\n").trimEnd() + "\n";
}

// Top-level sections in the existing YAML that renderProfileYaml does not own
// (custom extension keys): carried over verbatim so a dashboard save can never
// silently drop them.
function preservedExtensionSections(existing: string, existingParsed: Record<string, unknown>): string[] {
  const sections: string[] = [];
  for (const key of Object.keys(existingParsed)) {
    if (KNOWN_YAML_ROOTS.has(key)) continue;
    const section = rootSection(existing, key);
    if (section) sections.push(section);
  }
  return sections;
}

function yamlInlineScalar(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return q(String(value));
}

function yamlNestedLines(value: unknown, indent: string): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) return [`${indent}[]`];
    return value.flatMap((item) => {
      if (item !== null && typeof item === "object") {
        const sub = yamlNestedLines(item, `${indent}  `);
        return [`${indent}- ${sub[0]?.trimStart() ?? ""}`, ...sub.slice(1)];
      }
      return [`${indent}- ${yamlInlineScalar(item)}`];
    });
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return [`${indent}{}`];
    return entries.flatMap(([k, v]) => {
      if (v !== null && typeof v === "object") return [`${indent}${k}:`, ...yamlNestedLines(v, `${indent}  `)];
      return [`${indent}${k}: ${yamlInlineScalar(v)}`];
    });
  }
  return [`${indent}${yamlInlineScalar(value)}`];
}

// Unknown nested keys inside a known section (hand-added extension keys):
// appended to the rendered section so a dashboard save never silently drops
// them. Rendered keys are detected from the section text, so fallback blocks
// that already carry the previous text never duplicate keys. `aliases` maps an
// old existing key to the rendered key it became (e.g. covenants ->
// restrictive_covenants).
function withUnknownNestedKeys(name: string, rendered: string, existingParsed: Record<string, unknown>, aliases: Record<string, string> = {}): string {
  const prev = jsonObject(existingParsed[name]);
  const prevKeys = Object.keys(prev);
  if (prevKeys.length === 0) return rendered;
  const renderedKeys = new Set(
    rendered.split("\n").map((line) => line.match(/^  ([A-Za-z_][A-Za-z0-9_-]*):/)?.[1]).filter((k): k is string => !!k),
  );
  const extra = prevKeys.filter((k) => !renderedKeys.has(k) && !renderedKeys.has(aliases[k] ?? ""));
  if (extra.length === 0) return rendered;
  const lines = extra.flatMap((k) => {
    const v = (prev as Record<string, unknown>)[k];
    if (v !== null && typeof v === "object") return [`  ${k}:`, ...yamlNestedLines(v, "    ")];
    return [`  ${k}: ${yamlInlineScalar(v)}`];
  });
  return `${rendered.trimEnd()}\n${lines.join("\n")}`;
}

function renderProfileYaml(profile: ProfileInput, existing: string, existingParsed: Record<string, unknown>): { text: string; warnings: ProfileWarning[] } {
  const place = splitLocation(profile.identity.location);
  if (!place) throw new Error("identity.location must use the format City, ST.");
  const previousComp = jsonObject(existingParsed.comp);
  const previousCaps = jsonObject(existingParsed.caps);
  const zeroOk = typeof previousComp.zero_ok === "boolean" ? previousComp.zero_ok : true;
  const linkedInActions = Number(profile.caps.linkedin_actions_per_hour ?? previousCaps.linkedin_actions_per_hour);
  if (!Number.isInteger(linkedInActions) || linkedInActions < 1) throw new Error("caps.linkedin_actions_per_hour is missing or invalid in both the profile and existing YAML.");
  const resumes = rootSection(existing, "resumes"); const campaigns = rootSection(existing, "campaigns");
  if (!resumes) throw new Error("resumes section is missing from the existing YAML.");
  if (!campaigns) throw new Error("campaigns section is missing from the existing YAML.");
  // Skills matrix: an explicitly supplied list wins — even an empty one
  // (clear-all writes `years_matrix: []` so YAML and DB stay identical).
  // When the payload omits the matrix, the existing YAML section is preserved
  // verbatim — never dropped.
  const matrix = profile.years_matrix !== undefined
    ? (profile.years_matrix.length > 0 ? renderYearsMatrixYaml(profile.years_matrix) : "years_matrix: []")
    : rootSection(existing, "years_matrix");
  const extensions = preservedExtensionSections(existing, existingParsed);
  const locations = deriveYamlLocations(profile.locations, rootSection(existing, "locations"));
  const answerLines = Object.entries(profile.answers).map(([key, value]) => {
    const yamlKey = key === "covenants" ? "restrictive_covenants" : key;
    const scalar = value === null ? "null" : typeof value === "boolean" || typeof value === "number" ? String(value) : q(String(value));
    return `  ${yamlKey}: ${scalar}`;
  });
  const floor = profile.comp.floor === null ? "null" : typeof profile.comp.floor === "number" ? String(profile.comp.floor) : q(profile.comp.floor);
  const header = headerBlock(existing);
  // Known sections are rebuilt from the payload; unknown nested keys inside
  // them are appended verbatim (see withUnknownNestedKeys) so extension keys
  // survive a dashboard save.
  const body = [
    withUnknownNestedKeys("identity", [
      "identity:", `  name: ${q(profile.identity.name)}`, `  email: ${q(profile.identity.email)}`, `  phone: ${q(profile.identity.phone)}`, `  city: ${q(place.city)}`, `  state: ${q(place.state)}`, `  linkedin_url: ${q(profile.identity.linkedin)}`, `  timezone: ${q(profile.identity.timezone)}`,
    ].join("\n"), existingParsed),
    withUnknownNestedKeys("work_auth", [
      "work_auth:", `  status: ${q(profile.work_auth.status)}`, `  sponsor_required: ${profile.work_auth.sponsor_required}`, `  h1b_gate: ${q(profile.work_auth.h1b_gate)}`,
    ].join("\n"), existingParsed),
    `role_types: ${yamlList(profile.role_types)}`,
    withUnknownNestedKeys("locations", locations.block, existingParsed),
    withUnknownNestedKeys("targeting", [
      "targeting:", `  tiers: ${yamlList(profile.targeting.tiers)}`, `  industries: ${yamlList(profile.targeting.industries)}`, `  seniority: ${yamlList(profile.targeting.seniority)}`, `  titles: ${yamlList(profile.targeting.titles)}`,
    ].join("\n"), existingParsed),
    withUnknownNestedKeys("comp", [
      "comp:", `  floor: ${floor}`, `  negotiable_answer: ${q(profile.comp.note)}`, `  zero_ok: ${zeroOk}`,
    ].join("\n"), existingParsed),
    `start_date: ${q(profile.start_date)}`,
    withUnknownNestedKeys("answers", ["answers:", ...answerLines].join("\n"), existingParsed, { covenants: "restrictive_covenants" }),
    withUnknownNestedKeys("caps", [
      "caps:", `  per_run: ${profile.caps.per_run}`, `  per_day: ${profile.caps.per_day}`, `  appliers: ${profile.caps.appliers}`, `  linkedin_actions_per_hour: ${linkedInActions}`,
    ].join("\n"), existingParsed),
    withUnknownNestedKeys("reply_tiers", [
      "reply_tiers:", `  auto_send: ${yamlList(profile.reply_tiers.auto_send)}`, `  draft_for_review: ${yamlList(profile.reply_tiers.draft_for_review)}`, `  never: ${yamlList(profile.reply_tiers.never)}`,
    ].join("\n"), existingParsed),
    resumes, campaigns,
    ...(matrix ? [matrix] : []),
    ...extensions,
  ].join("\n\n");
  return { text: `${header ? `${header}\n\n` : ""}${body.trim()}\n`, warnings: locations.warning ? [locations.warning] : [] };
}

async function putProfileRow(ctx: Ctx, args: ProfileRowInput): Promise<string> {
  const updated = now();
  const yearsMatrix = Array.isArray(args.years_matrix) ? args.years_matrix : [];
  await ctx.db<typeof schema>().insert(schema.profile).values({ id: 1, identity: args.identity, workAuth: args.work_auth, roleTypes: args.role_types, locations: args.locations, targeting: args.targeting, comp: args.comp, startDate: args.start_date, answers: args.answers, caps: args.caps, replyTiers: args.reply_tiers, yearsMatrix, updatedAt: updated })
    .onConflictDoUpdate({ target: schema.profile.id, set: { identity: args.identity, workAuth: args.work_auth, roleTypes: args.role_types, locations: args.locations, targeting: args.targeting, comp: args.comp, startDate: args.start_date, answers: args.answers, caps: args.caps, replyTiers: args.reply_tiers, yearsMatrix, updatedAt: updated } });
  ctx.invalidateQueries();
  return updated.toISOString();
}

const profileSaveResponse = z.union([
  z.object({ ok: z.literal(true), updated_at: z.string(), yaml_bytes: z.number(), warnings: z.array(z.object({ field: z.string(), message: z.string() })) }),
  z.object({ ok: z.literal(false), step: z.enum(["validation", "yaml_write", "database"]), field: z.string().optional(), message: z.string() }),
]);

const manifestJobSchema = z.object({
  job_id: z.string().min(1),
  title: z.string().min(1),
  campaign: z.string().min(1),
  cadence: z.string().min(1),
  schedule: z.string().min(1),
  enabled: z.boolean(),
  body_hash: z.string().min(1),
});
const schedulesManifestSchema = z.object({ jobs: z.array(manifestJobSchema) });
const scheduleStatusRowSchema = manifestJobSchema.extend({
  manifest_body_hash: z.string(),
  last_run_at: z.string().nullable(),
  last_run_status: z.string().nullable(),
  live_body_hash: z.string().nullable(),
  drift: z.enum(["in_sync", "drift", "unknown"]),
});
const schedulesStatusResponse = z.object({
  generated_at: z.string(),
  manifest_missing: z.boolean(),
  rows: z.array(scheduleStatusRowSchema),
});
// Ad-hoc schedule triggers: the dashboard's "Trigger now" button queues a
// one-shot run; the schedule-trigger-dispatch cron fires it within ~2 minutes.
const scheduleTriggerResponse = z.union([
  z.object({ ok: z.literal(true), trigger_id: z.number().int().positive() }),
  z.object({ ok: z.literal(false), reason: z.string() }),
]);
const scheduleTriggerRowSchema = z.object({
  id: z.number().int().positive(), job_id: z.string(), campaign: z.string().nullable(), status: z.string(),
  created_at: z.string().nullable(), handled_at: z.string().nullable(), error: z.string().nullable(),
});
const scheduleTriggerMarkResponse = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), reason: z.string() }),
]);

// The 13 compiled jobs (12 campaigns + the schedule-trigger-dispatch control
// job). job_id <-> campaign mapping is bijective:
// strip the `harness-` prefix and replace `-` with `_`.
const SCHEDULE_CAMPAIGNS = ["morning_run", "linkedin_feed", "career_portal", "job_board", "email_scan", "linkedin_replies", "approval_judge", "daily_report", "token_usage", "weekly_review", "harness_doctor", "profile_watch", "browser_watch", "schedule_trigger_dispatch"] as const;
type ScheduleCampaign = (typeof SCHEDULE_CAMPAIGNS)[number];
const scheduleJobId = (campaign: string) => `harness-${campaign.replace(/_/g, "-")}`;
function jobIdToCampaign(jobId: string): ScheduleCampaign | null {
  if (!jobId.startsWith("harness-")) return null;
  const campaign = jobId.slice("harness-".length).replace(/-/g, "_");
  return (SCHEDULE_CAMPAIGNS as readonly string[]).includes(campaign) ? campaign as ScheduleCampaign : null;
}

const CADENCE_ACCEPTED = 'Accepted cadence formats: "daily HH:MM" (e.g. "daily 07:00"), "nightly HH:MM" (e.g. "nightly 23:20"), "hourly", "hourly weekdays", "every Nm" (e.g. "every 15m"), "every Nh" (e.g. "every 2h"), "Nh weekdays" (e.g. "2h weekdays"), "H:MMam/pm CT" (e.g. "9:00am CT"), "Weekday H:MMam/pm CT" (e.g. "Friday 5:00pm CT").';
function cadenceError(value: string): string | null {
  const text = value.trim();
  if (!text) return `Cadence must not be empty. ${CADENCE_ACCEPTED}`;
  const weekday = "(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)";
  const patterns = [
    /^(?:daily|nightly) (?:[01][0-9]|2[0-3]):[0-5][0-9]$/,
    /^hourly$/,
    /^hourly weekdays$/,
    /^every [1-9][0-9]*(?:m|h)$/,
    /^[1-9][0-9]*h weekdays$/,
    /^(?:[1-9]|1[0-2]):[0-5][0-9](?:am|pm) CT$/,
    new RegExp(`^${weekday} (?:[1-9]|1[0-2]):[0-5][0-9](?:am|pm) CT$`, "i"),
  ];
  if (patterns.some((pattern) => pattern.test(text))) return null;
  return `Cadence ${q(text)} is not a recognized schedule. ${CADENCE_ACCEPTED}`;
}

// Render one campaigns entry in the file's existing flow style. `enabled`
// stays implicit when true (absent = enabled); only `enabled: false` is
// written, keeping the diff minimal.
function campaignEntryLine(campaign: string, fields: Record<string, unknown>): string {
  const keys = ["cadence", "enabled", ...Object.keys(fields).filter((key) => key !== "cadence" && key !== "enabled")];
  const parts: string[] = [];
  for (const key of keys) {
    const value = fields[key];
    if (value === undefined) continue;
    if (key === "enabled" && value === true) continue;
    parts.push(`${key}: ${value === null ? "null" : typeof value === "boolean" || typeof value === "number" ? String(value) : q(String(value))}`);
  }
  return `  ${campaign}: {${parts.join(", ")}}`;
}

// Surgical, comment-preserving edit of exactly one campaigns entry. Every
// other line of the file — including the rest of the campaigns section — is
// returned byte-identical. Handles flow-style entries, block-style entries,
// and absent entries (appended at the end of the section).
function spliceCampaignEntry(yamlText: string, campaign: string, line: string): string {
  const lines = yamlText.split("\n");
  const start = lines.findIndex((text) => text === "campaigns:");
  if (start < 0) throw new Error("The campaigns section is missing from profile.yaml.");
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^[A-Za-z_][A-Za-z0-9_-]*:/.test(lines[index] ?? "")) { end = index; break; }
  }
  const section = lines.slice(start + 1, end);
  const flowRe = new RegExp(`^\\s*${campaign}:\\s*\\{[^}]*\\}\\s*(?:#.*)?$`);
  const headRe = new RegExp(`^\\s*${campaign}:\\s*(?:#.*)?$`);
  const before = lines.slice(0, start + 1);
  const after = lines.slice(end);
  for (let index = 0; index < section.length; index += 1) {
    const text = section[index] ?? "";
    if (flowRe.test(text)) {
      const indent = text.match(/^\s*/)?.[0] ?? "  ";
      return [...before, ...section.slice(0, index), `${indent}${line.trimStart()}`, ...section.slice(index + 1), ...after].join("\n");
    }
    const head = text.match(headRe);
    if (head) {
      const indent = text.match(/^\s*/)?.[0] ?? "";
      let stop = index + 1;
      while (stop < section.length) {
        const next = section[stop] ?? "";
        if (next.trim() === "") { stop += 1; continue; }
        if (next.length > indent.length && next.startsWith(indent) && /^\s/.test(next.slice(indent.length))) { stop += 1; continue; }
        break;
      }
      return [...before, ...section.slice(0, index), `${indent}${line.trimStart()}`, ...section.slice(stop), ...after].join("\n");
    }
  }
  let insertAt = section.length;
  while (insertAt > 0 && (section[insertAt - 1] ?? "").trim() === "") insertAt -= 1;
  return [...before, ...section.slice(0, insertAt), line, ...section.slice(insertAt), ...after].join("\n");
}

const scheduleUpdateResponse = z.union([
  z.object({ ok: z.literal(true), job_id: z.string(), campaign: z.string(), cadence: z.string(), enabled: z.boolean(), note: z.string() }),
  z.object({ ok: z.literal(false), error: z.string() }),
]);

const hashPattern = /^[a-f0-9]{64}$/i;
function findBodyHash(value: unknown, depth = 0): string | null {
  if (depth > 4 || !value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) { const found = findBodyHash(item, depth + 1); if (found) return found; }
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const key of ["body_hash", "bodyHash"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && hashPattern.test(candidate)) return candidate.toLowerCase();
  }
  for (const nested of Object.values(record)) { const found = findBodyHash(nested, depth + 1); if (found) return found; }
  return null;
}

const LEGAL: Record<string, readonly string[]> = {
  discovered: ["screened", "rejected"], screened: ["resume_picked"], resume_picked: ["tailored"],
  tailored: ["reviewed", "parked"], reviewed: ["applying"], applying: ["submitted", "blocked", "parked", "needs_me"],
  submitted: ["confirmed"], needs_me: ["reviewed"], parked: ["reviewed"], blocked: ["discovered"],
};

const STATE_EDGE_DOCS = Object.entries(LEGAL).flatMap(([from, destinations]) => destinations.map((to) => ({
  from,
  to,
  gate: from === "reviewed" && to === "applying"
    ? "Requires intent_id"
    : from === "applying" && to === "submitted"
      ? "Requires evidence.resume_path and evidence.resume_hash"
      : from === "blocked" && to === "discovered"
        ? "Requires coordinator_correction=true, a matching coordinator_correction event_log id, and a reason"
        : "Standard transition",
})));

const purgeCounts = z.object({
  applications: z.number(), resumes: z.number(), runs: z.number(), profiles: z.number(), approvals: z.number(),
  reviews: z.number(), conversations: z.number(), replies: z.number(), token_usage: z.number(),
});
const purgeIds = z.object({
  applications: z.array(z.string()), resumes: z.array(z.string()), runs: z.array(z.string()), profiles: z.array(z.number()),
  approvals: z.array(z.string()), reviews: z.array(z.number()), conversations: z.array(z.string()), replies: z.array(z.string()),
  token_usage: z.array(z.string()),
});
const purgeResponse = z.union([
  z.object({ ok: z.literal(true), purged: purgeCounts, ids: purgeIds }),
  z.object({ ok: z.literal(false), error: z.string(), offending_ids: z.array(z.string()).optional() }),
]);

const sha256Hex = z.string().regex(/^[a-f0-9]{64}$/i, "resume_hash must be a full 64-character SHA-256 hex value.");
const submissionEvidenceSchema = z.object({
  resume_path: z.string().trim().min(1),
  resume_hash: sha256Hex,
  variant_id: z.string().trim().min(1).nullable().optional(),
  screenshot_path: z.string().trim().min(1).nullable().optional(),
  confirmation: z.string().trim().min(1).nullable().optional(),
  confirmation_path: z.string().trim().min(1).nullable().optional(),
});
type SubmissionEvidence = z.infer<typeof submissionEvidenceSchema>;

function parseSubmissionEvidence(value: string | null): { data?: SubmissionEvidence; error?: string } {
  if (!value) return { error: "Submission evidence is required; missing resume_path and resume_hash." };
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { return { error: "Submission evidence must be JSON containing resume_path and resume_hash." }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { error: "Submission evidence must contain resume_path and resume_hash." };
  const record = parsed as Record<string, unknown>; const missing: string[] = [];
  if (typeof record.resume_path !== "string" || !record.resume_path.trim()) missing.push("resume_path");
  if (typeof record.resume_hash !== "string" || !record.resume_hash.trim()) missing.push("resume_hash");
  if (missing.length) return { error: `Submission evidence is missing ${missing.join(" and ")}.` };
  const checked = submissionEvidenceSchema.safeParse(record);
  if (!checked.success) return { error: checked.error.issues[0]?.message ?? "Submission evidence is invalid." };
  return { data: checked.data };
}

function canonicalConfirmationPath(row: { campaignId: string; runId: string | null; appId: string }): string | null {
  const safe = (value: string | null) => value !== null && /^[A-Za-z0-9_-]+$/.test(value);
  if (!safe(row.campaignId) || !safe(row.runId) || !safe(row.appId) || row.runId === null) return null;
  return `goals/${row.campaignId}/hidden_files/${row.runId}/screenshots/${row.appId}_confirmation.txt`;
}

type PublishedFileInput = { filename: string; bytesBase64: string; contentType: "application/pdf" | "image/png" | "text/plain" };
async function publishFilePayload(ctx: Ctx, result: PublishedFileInput): Promise<{ filename: string; file_url: string; content_type: PublishedFileInput["contentType"] }> {
  const bytes = Buffer.from(result.bytesBase64, "base64");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const fingerprint = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
  const extension = result.filename.includes(".") ? result.filename.slice(result.filename.lastIndexOf(".")).toLowerCase() : "";
  const key = `dashboard-files/${fingerprint}${extension}`;
  await ctx.blobs.put(key, bytes, { contentType: result.contentType });
  return { filename: result.filename, file_url: await ctx.blobs.getUrl(key, { expiresInSeconds: 900 }), content_type: result.contentType };
}

type PublishedPreviewFile = Awaited<ReturnType<typeof publishFilePayload>> & { preview_pages: { page: number; file_url: string }[]; preview_truncated: boolean };
async function publishFileWithPreview(ctx: Ctx, result: PublishedFileInput): Promise<PublishedPreviewFile> {
  const published = await publishFilePayload(ctx, result);
  if (result.contentType !== "application/pdf") return { ...published, preview_pages: [], preview_truncated: false };
  try {
    const preview = await ctx.executePrivileged(privileged.renderPdfPreview, { bytesBase64: result.bytesBase64, maxPages: 8 });
    const previewPages = await Promise.all(preview.pages.map(async (page) => {
      const image = await publishFilePayload(ctx, { filename: `page-${page.page}.png`, bytesBase64: page.bytesBase64, contentType: "image/png" });
      return { page: page.page, file_url: image.file_url };
    }));
    return { ...published, preview_pages: previewPages, preview_truncated: preview.truncated };
  } catch {
    return { ...published, preview_pages: [], preview_truncated: false };
  }
}

function pathFilename(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
}

function registeredResumeLocation(path: string): "user_files" | "user_file_resumes" | "workspace_resumes" | null {
  const normalized = path.replaceAll("\\", "/").replace(/^\/home\/hatch\//, "");
  if (normalized.startsWith("workspace/user/files/resumes/")) return "user_file_resumes";
  if (normalized.startsWith("workspace/user/files/")) return "user_files";
  if (normalized.startsWith("workspace/resumes/")) return "workspace_resumes";
  return null;
}

type CorrectionEvidence = { coordinator_correction: true; event_log_id: number; reason: string };
function parseCorrectionEvidence(value: string | null): CorrectionEvidence | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (record.coordinator_correction !== true || !Number.isInteger(record.event_log_id) || Number(record.event_log_id) < 1) return null;
    if (typeof record.reason !== "string" || record.reason.trim().length === 0) return null;
    return { coordinator_correction: true, event_log_id: Number(record.event_log_id), reason: record.reason };
  } catch {
    return null;
  }
}

const markerText = (value: unknown) => typeof value === "string" ? value : (JSON.stringify(value) ?? "");
const hasSmokeMarker = (value: unknown) => /(^|[-_:/.\\\[\]\s])smoke($|[-_:/.\\\[\]\s])/i.test(markerText(value));
const hasSmokeTestLabel = (value: unknown) => markerText(value).toUpperCase().includes("[SMOKE TEST]");

// Mirror hasSmokeMarker inside the atomic batch. Normalizing the delimiters first
// avoids broad substring matches such as "smoketest" or ordinary words containing
// "test", while accepting the harness' explicit smoke-*, *_smoke and [SMOKE TEST]
// conventions.
const sqlSmokeMarker = (column: SQL<unknown>) => sql<boolean>`instr(
  ' ' || replace(replace(replace(replace(replace(replace(replace(replace(lower(coalesce(CAST(${column} AS TEXT), '')), '-', ' '), '_', ' '), ':', ' '), '/', ' '), char(92), ' '), '[', ' '), ']', ' '), '.', ' ') || ' ',
  ' smoke '
) > 0`;

function csvRows(csv: string): string[][] {
  const out: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const c = csv[i] ?? "";
    if (c === '"' && quoted && csv[i + 1] === '"') { cell += '"'; i += 1; }
    else if (c === '"') quoted = !quoted;
    else if (c === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) { if (c === "\r" && csv[i + 1] === "\n") i += 1; row.push(cell.trim()); if (row.some(Boolean)) out.push(row); row = []; cell = ""; }
    else cell += c;
  }
  row.push(cell.trim()); if (row.some(Boolean)) out.push(row); return out;
}
function recordsFromCsv(csv: string): Record<string, string>[] {
  const rows = csvRows(csv); const headers = (rows[0] ?? []).map((x) => norm(x).replaceAll(" ", "_"));
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])));
}

// Large seed CSVs travel as a URL instead of action args.
async function csvTextFromArgs(args: { csv?: string; csv_url?: string }): Promise<string> {
  if (args.csv) return args.csv;
  if (args.csv_url) {
    const res = await fetch(args.csv_url);
    if (!res.ok) throw new Error(`CSV download failed: HTTP ${res.status}`);
    return await res.text();
  }
  throw new Error("Provide csv or csv_url.");
}

// Resumable chunked imports (v1.2.12): the synchronous legacy import actions
// wedge the action worker past ~80K rows (120s limit), so large CSVs are
// staged once via the privileged contracts and upserted in bounded chunks
// through dataset_import_start / dataset_import_chunk / dataset_import_status
// / dataset_import_retry / dataset_import_cancel. The row mappers below are
// shared by both paths so the two import styles always produce identical rows.
// Progress is crash/replay-safe: cursor + counters advance in ONE update only
// after a successful upsert, and upserts are idempotent by norm key, so a
// failed chunk can be retried (or the whole job re-run) without duplicating
// dataset rows.
type ImportDataset = "h1b" | "companies" | "vendors";
const IMPORT_CHUNK_ROWS = 2000;   // rows per dataset_import_chunk call
const IMPORT_UPSERT_BATCH = 500;  // rows per multi-row upsert statement
const IMPORT_SYNC_ROW_LIMIT = 5000; // legacy sync actions refuse above this

function mapImportRow(dataset: ImportDataset, r: Record<string, string>): Record<string, unknown> | null {
  if (dataset === "h1b") {
    const company = r.company_norm || r.company || r.employer;
    if (!company) return null;
    const stats = r.stats_by_year ? (() => { try { return JSON.parse(r.stats_by_year); } catch { return {}; } })() : {};
    const lca = Number(r.lca_count ?? 0);
    const refreshed = r.last_refreshed ? new Date(r.last_refreshed) : now();
    return { companyNorm: norm(company), statsByYear: stats, lcaCount: Number.isFinite(lca) ? lca : 0, lastRefreshed: refreshed };
  }
  if (dataset === "companies") {
    const company = r.company_norm || r.company;
    if (!company) return null;
    const tier = Number(r.tier || 3); const parkCount = Number(r.park_count || 0);
    return {
      companyNorm: norm(company), tier: Number.isFinite(tier) ? tier : 3,
      industry: r.industry || null, hqState: r.hq_state || null, careersUrl: r.careers_url || null,
      atsType: r.ats_type || null, parkCount: Number.isFinite(parkCount) ? parkCount : 0,
      skipFlag: ["1", "true", "yes"].includes((r.skip_flag ?? "").toLowerCase()), skipReason: r.skip_reason || null,
    };
  }
  const name = r.vendor_name || r.vendor || r.name;
  if (!name) return null;
  return {
    vendorNorm: norm(name), vendorName: name,
    portalUrl: r.portal_url || null, tier: r.tier || null, category: r.category || null,
    specialties: r.specialties || null, engagementTypes: r.engagement_types || null,
    // Vendor's own sponsorship claim — surfaced as an "Unverified sponsorship note", never scored.
    h1bNote: r.h1b_note || null, lastRefreshed: r.last_refreshed ? new Date(r.last_refreshed) : now(),
  };
}

// Batched upserts: one multi-row INSERT .. ON CONFLICT DO UPDATE per 500 rows,
// with per-row SET values taken from the excluded row so every row in the
// batch updates to its own values.
async function upsertImportRows(ctx: Ctx, dataset: ImportDataset, rows: Record<string, unknown>[]): Promise<void> {
  const db = ctx.db<typeof schema>();
  for (let i = 0; i < rows.length; i += IMPORT_UPSERT_BATCH) {
    const group = rows.slice(i, i + IMPORT_UPSERT_BATCH);
    if (dataset === "h1b") {
      await db.insert(schema.h1bSponsors).values(group as (typeof schema.h1bSponsors.$inferInsert)[]).onConflictDoUpdate({
        target: schema.h1bSponsors.companyNorm,
        set: {
          statsByYear: sql`excluded.${sql.identifier("stats_by_year")}`,
          lcaCount: sql`excluded.${sql.identifier("lca_count")}`,
          lastRefreshed: sql`excluded.${sql.identifier("last_refreshed")}`,
        },
      });
    } else if (dataset === "companies") {
      await db.insert(schema.companies).values(group as (typeof schema.companies.$inferInsert)[]).onConflictDoUpdate({
        target: schema.companies.companyNorm,
        set: {
          tier: sql`excluded.${sql.identifier("tier")}`,
          industry: sql`excluded.${sql.identifier("industry")}`,
          hqState: sql`excluded.${sql.identifier("hq_state")}`,
          careersUrl: sql`excluded.${sql.identifier("careers_url")}`,
          atsType: sql`excluded.${sql.identifier("ats_type")}`,
          parkCount: sql`excluded.${sql.identifier("park_count")}`,
          skipFlag: sql`excluded.${sql.identifier("skip_flag")}`,
          skipReason: sql`excluded.${sql.identifier("skip_reason")}`,
        },
      });
    } else {
      await db.insert(schema.primeVendors).values(group as (typeof schema.primeVendors.$inferInsert)[]).onConflictDoUpdate({
        target: schema.primeVendors.vendorNorm,
        set: {
          vendorName: sql`excluded.${sql.identifier("vendor_name")}`,
          portalUrl: sql`excluded.${sql.identifier("portal_url")}`,
          tier: sql`excluded.${sql.identifier("tier")}`,
          category: sql`excluded.${sql.identifier("category")}`,
          specialties: sql`excluded.${sql.identifier("specialties")}`,
          engagementTypes: sql`excluded.${sql.identifier("engagement_types")}`,
          h1bNote: sql`excluded.${sql.identifier("h1b_note")}`,
          lastRefreshed: sql`excluded.${sql.identifier("last_refreshed")}`,
        },
      });
    }
  }
}

// Maps a CSV record list through the dataset mapper, returning insert-ready
// rows and a skip count. Shared by the sync and chunked import paths.
function mapImportRecords(dataset: ImportDataset, records: Record<string, string>[]): { rows: Record<string, unknown>[]; skipped: number } {
  const rows: Record<string, unknown>[] = []; let skipped = 0;
  for (const r of records) {
    const mapped = mapImportRow(dataset, r);
    if (!mapped) { skipped += 1; continue; }
    rows.push(mapped);
  }
  return { rows, skipped };
}

function newImportJobId(): string {
  return `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

const safeResumeFilenamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/i;
const safeResumeVariantPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const resumeUploadResponse = z.union([
  z.object({ ok: z.literal(true), variant_id: z.string(), path: z.string(), filename: z.string(), sha256: z.string() }),
  z.object({ ok: z.literal(false), message: z.string() }),
]);
const resumeDeleteResponse = z.union([
  z.object({ ok: z.literal(true), variant_id: z.string(), usage_count: z.number(), trashed_path: z.string().nullable(), file_moved: z.boolean() }),
  z.object({ ok: z.literal(false), message: z.string() }),
]);

function decodeBase64(value: string): Buffer | null {
  const text = value.trim();
  if (!text || text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) return null;
  try {
    const bytes = Buffer.from(text, "base64");
    const canonical = bytes.toString("base64");
    return canonical === text ? bytes : null;
  } catch {
    return null;
  }
}

function pdfBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

async function bytesSha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

type YearsMatrixEntry = { skill: string; category?: string; years: number; where_used?: string };

// Legacy scavenge: some installs embedded the matrix inside one of the profile
// JSON columns before it became a first-class column (migration 0015).
function profileYearsMatrix(row: typeof schema.profile.$inferSelect | undefined): Record<string, unknown> {
  if (!row) return {};
  const column = (row as { yearsMatrix?: unknown }).yearsMatrix;
  if (Array.isArray(column)) {
    const map: Record<string, unknown> = {};
    for (const entry of column) {
      const item = entry as Partial<YearsMatrixEntry>;
      if (item && typeof item.skill === "string" && typeof item.years === "number") map[item.skill] = item.years;
    }
    if (Object.keys(map).length) return map;
  } else if (column && typeof column === "object" && !Array.isArray(column)) {
    return column as Record<string, unknown>;
  }
  for (const section of [row.identity, row.workAuth, row.locations, row.targeting, row.comp, row.answers, row.caps, row.replyTiers]) {
    const candidate = jsonObject(section).years_matrix;
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) return candidate as Record<string, unknown>;
  }
  return {};
}

// List form of the matrix for YAML rendering and profile_get: new column
// first, legacy map-scavenge converted to entries, else empty.
function yearsMatrixList(row: typeof schema.profile.$inferSelect | undefined): YearsMatrixEntry[] {
  if (!row) return [];
  const column = (row as { yearsMatrix?: unknown }).yearsMatrix;
  if (Array.isArray(column)) {
    return (column as Partial<YearsMatrixEntry>[]).filter((e) => e && typeof e.skill === "string").map((e) => ({
      skill: String(e.skill), ...(typeof e.category === "string" ? { category: e.category } : {}),
      years: typeof e.years === "number" && e.years >= 0 ? Math.floor(e.years) : 0,
      ...(typeof e.where_used === "string" ? { where_used: e.where_used } : {}),
    }));
  }
  const legacy = profileYearsMatrix(row);
  return Object.entries(legacy).filter(([, years]) => typeof years === "number").map(([skill, years]) => ({ skill, years: Math.max(0, Math.floor(years as number)) }));
}

// Draft file IO lives in the privileged handlers (they run on the host and may
// touch the filesystem directly); sandboxed server actions reach it through
// ctx.executePrivileged and never import host-only modules.

// Keyword vector for resume_pick scoring. Derived ONLY from registration
// metadata the operator/worker explicitly supplied (role family, industry
// tags, years-matrix skill names) — never invented from the PDF bytes. Keys
// are lowercase single tokens; resume_pick scores by key presence in the JD.
const KEYWORD_STOPWORDS = new Set(["and", "or", "the", "of", "a", "an", "in", "on", "for", "with", "to", "at", "by", "from", "into", "ii", "iii"]);
function keywordVectorFromMetadata(args: { role_family: string; industry_tags: unknown; years_matrix: unknown }): Record<string, number> {
  const tokens = new Set<string>();
  const add = (text: string) => {
    for (const token of norm(text).split(" ").filter(Boolean)) {
      if (token.length < 2 || KEYWORD_STOPWORDS.has(token)) continue;
      tokens.add(token);
    }
  };
  if (typeof args.role_family === "string") add(args.role_family);
  for (const tag of jsonArray(args.industry_tags)) if (typeof tag === "string") add(tag);
  // years_matrix arrives as a list from profile_get/years_matrix_import and
  // as the legacy {skill: years} map on older resume variant rows.
  const ym = args.years_matrix;
  const skillNames: string[] = Array.isArray(ym)
    ? ym.flatMap((entry) => { const map = jsonObject(entry); return typeof map.skill === "string" ? [map.skill] : []; })
    : Object.keys(jsonObject(ym));
  for (const skill of skillNames) add(skill);
  const vector: Record<string, number> = {};
  for (const token of [...tokens].sort().slice(0, 200)) vector[token] = 1;
  return vector;
}

export const Actions = {
  profile_get: defineAction({
    request: emptyRequest, response: z.object({ profile: profilePayload.nullable(), updated_at: z.string().nullable() }),
    async handler(ctx) {
      const row = (await ctx.db<typeof schema>().select().from(schema.profile).where(eq(schema.profile.id, 1)).limit(1))[0];
      if (!row) return { profile: null, updated_at: null };
      return { profile: { identity: row.identity, work_auth: row.workAuth, role_types: row.roleTypes, locations: row.locations, targeting: row.targeting, comp: row.comp, start_date: row.startDate, answers: row.answers, caps: row.caps, reply_tiers: row.replyTiers, years_matrix: yearsMatrixList(row) }, updated_at: row.updatedAt.toISOString() };
    },
  }),

  profile_put: defineAction({
    request: profilePutPayload, response: z.object({ ok: z.literal(true), updated_at: z.string() }),
    async handler(ctx, args) {
      // compile-schedules parses profile.yaml and may not carry years_matrix
      // (older schema): never wipe the live matrix with an absent field.
      const db0 = ctx.db<typeof schema>();
      const live = args.years_matrix === undefined ? (await db0.select().from(schema.profile).where(eq(schema.profile.id, 1)).limit(1))[0] : undefined;
      const updatedAt = await putProfileRow(ctx, live ? { ...args, years_matrix: yearsMatrixList(live) } : args);
      const db = ctx.db<typeof schema>(); const caps = jsonObject(args.caps); const capPerRun = Number(caps.per_run); const capPerDay = Number(caps.per_day);
      for (const [campaignId, campaign] of Object.entries(args.campaigns ?? {})) {
        const type = campaign.type ?? campaign.group ?? campaignId;
        await db.insert(schema.campaigns).values({ campaignId, type, cadence: campaign.cadence, capPerRun, capPerDay, gates: campaign.gates ?? {}, sources: campaign.sources ?? [], cronId: campaign.cron_id ?? null })
          .onConflictDoUpdate({ target: schema.campaigns.campaignId, set: { type, cadence: campaign.cadence, capPerRun, capPerDay, gates: campaign.gates ?? {}, sources: campaign.sources ?? [], cronId: campaign.cron_id ?? null } });
      }
      ctx.invalidateQueries(); return { ok: true as const, updated_at: updatedAt };
    },
  }),

  profile_save: defineAction({
    request: profilePayload,
    response: profileSaveResponse,
    privileged: [privileged.readProfileYaml, privileged.parseProfileYaml, privileged.writeProfileYaml],
    async handler(ctx, args): Promise<z.infer<typeof profileSaveResponse>> {
      const checked = strictProfile.safeParse(args);
      if (!checked.success) {
        const issue = checked.error.issues[0];
        return { ok: false, step: "validation", field: issue?.path.join(".") || "profile", message: issue?.message ?? "The profile is invalid." };
      }
      let existingText: string; let existingParsed: Record<string, unknown>;
      try {
        const existing = await ctx.executePrivileged(privileged.readProfileYaml, {});
        existingText = existing.yamlText;
        const parsed = await ctx.executePrivileged(privileged.parseProfileYaml, { yamlText: existingText });
        existingParsed = jsonObject(parsed.parsed);
      } catch {
        return { ok: false, step: "validation", field: "profile.yaml", message: "The existing profile.yaml could not be read or parsed." };
      }
      // Live DB row: the matrix carry-over source when the dashboard payload
      // omits years_matrix (older clients), and the legacy-scavenge fallback.
      const existingRow = (await ctx.db<typeof schema>().select().from(schema.profile).where(eq(schema.profile.id, 1)).limit(1))[0];
      let rendered: { text: string; warnings: ProfileWarning[] };
      try {
        rendered = renderProfileYaml(checked.data, existingText, existingParsed);
        const reparsed = await ctx.executePrivileged(privileged.parseProfileYaml, { yamlText: rendered.text });
        const validated = yamlProfileSchema.safeParse(reparsed.parsed);
        if (!validated.success) {
          const issue = validated.error.issues[0];
          return { ok: false, step: "validation", field: issue?.path.join(".") || "profile.yaml", message: issue?.message ?? "The rendered YAML did not pass validation." };
        }
      } catch (error) {
        return { ok: false, step: "validation", field: "profile.yaml", message: error instanceof Error ? error.message : "The rendered YAML could not be validated." };
      }
      let bytes: number;
      try {
        const result = await ctx.executePrivileged(privileged.writeProfileYaml, { yaml_text: rendered.text });
        bytes = result.bytes_written;
      } catch {
        return { ok: false, step: "yaml_write", field: "profile.yaml", message: "The YAML file could not be written. The database was not changed." };
      }
      try {
        const updatedAt = await putProfileRow(ctx, checked.data.years_matrix === undefined
          // Dashboard payload omitted the matrix (older client): keep the live
          // one — never wipe it with an empty write.
          ? { ...checked.data, years_matrix: yearsMatrixList(existingRow) }
          : checked.data);
        return { ok: true, updated_at: updatedAt, yaml_bytes: bytes, warnings: rendered.warnings };
      } catch {
        return { ok: false, step: "database", field: "profile", message: "profile.yaml was written, but the live database update failed. The next compile-schedules run will restore convergence." };
      }
    },
  }),

  // Import the skills matrix from a client persona YAML (the onboarding Excel
  // converter's output) into the profile — the "initial load" path. Writes the
  // first-class DB column AND the profile.yaml years_matrix section, so later
  // dashboard saves round-trip it instead of dropping it.
  years_matrix_import: defineAction({
    request: z.object({ persona_path: z.string().min(1).optional(), yaml_text: z.string().min(1).optional() })
      .refine((v) => (v.persona_path ? 1 : 0) + (v.yaml_text ? 1 : 0) === 1, { message: "Provide exactly one of persona_path or yaml_text." }),
    response: z.union([
      z.object({ ok: z.literal(true), imported: z.number().int(), updated_at: z.string() }),
      z.object({ ok: z.literal(false), message: z.string() }),
    ]),
    privileged: [privileged.readPersonaYaml, privileged.readProfileYaml, privileged.parseProfileYaml, privileged.writeProfileYaml],
    async handler(ctx, args): Promise<{ ok: true; imported: number; updated_at: string } | { ok: false; message: string }> {
      let yamlText: string | undefined = args.yaml_text ?? undefined;
      if (args.persona_path) {
        const found = await ctx.executePrivileged(privileged.readPersonaYaml, { persona_path: args.persona_path });
        if (!found.found || !found.yamlText) return { ok: false, message: `Persona file '${args.persona_path}' was not found under workspace profiles/.` };
        yamlText = found.yamlText;
      }
      let parsed: Record<string, unknown>;
      try {
        parsed = jsonObject((await ctx.executePrivileged(privileged.parseProfileYaml, { yamlText: yamlText ?? "" })).parsed);
      } catch {
        return { ok: false, message: "The persona YAML could not be parsed." };
      }
      const raw = parsed.years_matrix;
      if (!Array.isArray(raw) || raw.length === 0) return { ok: false, message: "The persona YAML has no years_matrix entries to import." };
      const entrySchema = z.object({ skill: z.string().trim().min(1), category: z.string().trim().optional(), years: z.number().int().min(0), where_used: z.string().trim().optional() });
      const entries: YearsMatrixEntry[] = [];
      for (const item of raw) {
        const checked = entrySchema.safeParse(typeof item === "object" && item !== null ? {
          skill: (item as Record<string, unknown>).skill,
          category: (item as Record<string, unknown>).category,
          years: typeof (item as Record<string, unknown>).years === "number" ? (item as Record<string, unknown>).years : Number((item as Record<string, unknown>).years),
          where_used: (item as Record<string, unknown>).where_used,
        } : item);
        if (!checked.success) return { ok: false, message: `A years_matrix entry is invalid: ${checked.error.issues[0]?.message ?? "bad entry"}.` };
        entries.push(checked.data);
      }
      const db = ctx.db<typeof schema>(); const updated = now();
      // YAML first, then the database. Everything up to the YAML write is
      // validated before anything is written, so a failure there leaves both
      // stores untouched. If the DB write then fails, the YAML is ahead —
      // re-running the import (or the next compile-schedules file→DB sync)
      // converges the DB. The reverse order would be worse: a later
      // file→DB sync could clobber the imported matrix.
      let existingText: string;
      try {
        existingText = (await ctx.executePrivileged(privileged.readProfileYaml, {})).yamlText;
      } catch {
        return { ok: false, message: "profile.yaml could not be read. Nothing was changed." };
      }
      const next = spliceTopLevelSection(existingText, "years_matrix", renderYearsMatrixYaml(entries));
      try {
        const reparsed = jsonObject((await ctx.executePrivileged(privileged.parseProfileYaml, { yamlText: next })).parsed);
        if (!yamlProfileSchema.safeParse(reparsed).success) throw new Error("validation failed");
      } catch {
        return { ok: false, message: "The updated profile.yaml did not validate. Nothing was changed." };
      }
      try {
        await ctx.executePrivileged(privileged.writeProfileYaml, { yaml_text: next });
      } catch {
        return { ok: false, message: "profile.yaml could not be written. Nothing was changed." };
      }
      try {
        await db.insert(schema.profile).values({ id: 1, yearsMatrix: entries, updatedAt: updated })
          .onConflictDoUpdate({ target: schema.profile.id, set: { yearsMatrix: entries, updatedAt: updated } });
      } catch {
        return { ok: false, message: "profile.yaml was updated, but the database write failed. Re-run the import or the next compile-schedules sync to restore convergence." };
      }
      ctx.invalidateQueries();
      return { ok: true, imported: entries.length, updated_at: updated.toISOString() };
    },
  }),

  posting_upsert: defineAction({
    request: z.object({ rows: z.array(postingRow).max(500) }), response: z.object({ new_ids: z.array(z.string()), seen: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>(); const newIds: string[] = [];
      const TERMINAL = ["submitted", "confirmed", "blocked", "rejected"];
      const provenanceInsert = (row: z.infer<typeof postingRow>) => ({
        sourceClass: row.source_class ?? null, sourceName: row.source_name ?? row.source,
        discoveryPhase: row.discovery_phase ?? null, sourceTier: row.source_tier ?? "unknown",
        employmentTypesOffered: row.employment_types_offered ?? [],
        selectedLane: row.selected_lane ?? null, h1bMode: row.h1b_mode ?? null, h1bResult: row.h1b_result ?? null,
      });
      // On re-scrape only overwrite provenance the scout actually supplied.
      const provenancePatch = (row: z.infer<typeof postingRow>) => Object.fromEntries(
        [["sourceClass", row.source_class], ["sourceName", row.source_name], ["discoveryPhase", row.discovery_phase],
         ["sourceTier", row.source_tier], ["employmentTypesOffered", row.employment_types_offered],
         ["selectedLane", row.selected_lane], ["h1bMode", row.h1b_mode], ["h1bResult", row.h1b_result]]
          .filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, v]));
      for (const row of args.rows) {
        const companyNorm = norm(row.company); const roleNorm = norm(row.role);
        const lastSeen = row.last_seen ? new Date(row.last_seen) : now();
        const byId = (await db.select({ id: schema.postings.postingId }).from(schema.postings).where(eq(schema.postings.postingId, row.posting_id)).limit(1))[0];
        if (byId) {
          await db.update(schema.postings).set({ company: row.company, role: row.role, url: row.url, source: row.source, jdPath: row.jd_path ?? null, jdHash: row.jd_hash ?? null, lastSeen, ...provenancePatch(row) }).where(eq(schema.postings.postingId, byId.id));
          continue;
        }
        const byRole = (await db.select({ id: schema.postings.postingId }).from(schema.postings).where(and(eq(schema.postings.companyNorm, companyNorm), eq(schema.postings.roleNorm, roleNorm))).limit(1))[0];
        if (byRole) {
          // Same company+role, different posting_id: re-post or same live listing?
          const app = (await db.select({ state: schema.applications.state }).from(schema.applications).where(eq(schema.applications.postingId, byRole.id)).limit(1))[0];
          if (app && TERMINAL.includes(app.state)) {
            // The old listing ran its course — this is a genuinely new posting. Re-apply allowed.
            await db.insert(schema.postings).values({ postingId: row.posting_id, company: row.company, companyNorm, role: row.role, roleNorm, url: row.url, source: row.source, jdPath: row.jd_path ?? null, jdHash: row.jd_hash ?? null, firstSeen: lastSeen, lastSeen, ...provenanceInsert(row) });
            newIds.push(row.posting_id);
          } else {
            // Same live listing re-scraped (pipeline still open) — refresh, keep the original posting_id.
            await db.update(schema.postings).set({ company: row.company, role: row.role, url: row.url, source: row.source, jdPath: row.jd_path ?? null, jdHash: row.jd_hash ?? null, lastSeen, ...provenancePatch(row) }).where(eq(schema.postings.postingId, byRole.id));
          }
          continue;
        }
        await db.insert(schema.postings).values({ postingId: row.posting_id, company: row.company, companyNorm, role: row.role, roleNorm, url: row.url, source: row.source, jdPath: row.jd_path ?? null, jdHash: row.jd_hash ?? null, firstSeen: row.first_seen ? new Date(row.first_seen) : lastSeen, lastSeen, ...provenanceInsert(row) });
        newIds.push(row.posting_id);
      }
      if (args.rows.length) ctx.invalidateQueries(); return { new_ids: newIds, seen: args.rows.length };
    },
  }),

  app_claim: defineAction({
    request: z.object({ posting_id: z.string(), campaign_id: z.string() }), response: z.object({ ok: z.boolean(), app_id: z.string().optional(), reason: z.string().optional() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>(); const appId = id("app"); const created = Date.now(); const day = chicagoDay();
      const openRun = (await db.select().from(schema.runs).where(and(eq(schema.runs.campaignId, args.campaign_id), eq(schema.runs.status, "running"))).orderBy(desc(schema.runs.started)).limit(1))[0];
      if (!openRun) return { ok: false, reason: "No open run exists for this campaign." };
      await db.run(sql`INSERT INTO applications (app_id, posting_id, company_norm, role_norm, state, campaign_id, run_id, created_at, updated_at, kit_version)
        SELECT ${appId}, p.posting_id, p.company_norm, p.role_norm, 'discovered', c.campaign_id, ${openRun.runId}, ${created}, ${created}, ${openRun.kitVersion}
        FROM postings p JOIN campaigns c ON c.campaign_id = ${args.campaign_id}
        WHERE p.posting_id = ${args.posting_id}
          AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.posting_id=p.posting_id)
          AND (SELECT COUNT(*) FROM applications a WHERE a.run_id=${openRun.runId}) < c.cap_per_run
          AND (SELECT COUNT(*) FROM applications a WHERE a.campaign_id=c.campaign_id AND strftime('%Y-%m-%d', a.created_at/1000, 'unixepoch', '-5 hours')=${day}) < c.cap_per_day
        ON CONFLICT DO NOTHING`);
      const inserted = (await db.select({ appId: schema.applications.appId }).from(schema.applications).where(eq(schema.applications.appId, appId)).limit(1))[0];
      if (!inserted) {
        const duplicate = (await db.select({ id: schema.applications.appId }).from(schema.applications).where(eq(schema.applications.postingId, args.posting_id)).limit(1))[0];
        return { ok: false, reason: duplicate ? "Duplicate posting — an application already exists for this posting." : "Campaign cap reached, or posting/campaign is unavailable." };
      }
      await db.insert(schema.events).values({ runId: openRun.runId, appId, type: "application_claimed", payload: { posting_id: args.posting_id, campaign_id: args.campaign_id } });
      ctx.invalidateQueries(); return { ok: true, app_id: appId };
    },
  }),

  evidence_attach: defineAction({
    request: z.object({
      app_id: z.string().min(1), resume_path: z.string().trim().min(1), resume_hash: sha256Hex,
      variant_id: z.string().trim().min(1).optional(), screenshot_path: z.string().trim().min(1).nullable().optional(), confirmation: z.string().trim().min(1).optional(),
    }),
    response: z.object({ ok: z.boolean(), message: z.string().optional(), confirmation_path: z.string().nullable().optional() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const row = (await db.select().from(schema.applications).where(eq(schema.applications.appId, args.app_id)).limit(1))[0];
      if (!row) return { ok: false, message: "Application not found." };
      const changed = now();
      const confirmationPath = args.confirmation ? canonicalConfirmationPath(row) : row.confirmationPath;
      await db.batch([
        db.update(schema.applications).set({
          resumePath: args.resume_path,
          resumeHash: args.resume_hash.toLowerCase(),
          variantId: args.variant_id ?? row.variantId,
          screenshotPath: args.screenshot_path === undefined ? row.screenshotPath : args.screenshot_path,
          confirmation: args.confirmation ?? row.confirmation,
          confirmationPath,
          updatedAt: changed,
        }).where(eq(schema.applications.appId, args.app_id)),
        db.insert(schema.events).values({
          runId: row.runId,
          appId: row.appId,
          type: "evidence_attached",
          payload: {
            resume_path: args.resume_path,
            resume_hash: args.resume_hash.toLowerCase(),
            variant_id: args.variant_id ?? row.variantId,
            screenshot_path: args.screenshot_path === undefined ? row.screenshotPath : args.screenshot_path,
            confirmation: args.confirmation ?? row.confirmation,
            confirmation_path: confirmationPath,
          },
          at: changed,
        }),
      ]);
      ctx.invalidateQueries();
      return { ok: true, confirmation_path: confirmationPath };
    },
  }),

  app_transition: defineAction({
    request: z.object({ app_id: z.string(), from: z.string(), to: z.string(), evidence: z.string().nullable(), intent_id: z.string().nullable().optional(), reason: z.string().trim().min(1).max(280).nullable().optional() }), response: okResponse,
    async handler(ctx, args) {
      const allowed = LEGAL[args.from] ?? [];
      if (!allowed.includes(args.to)) return { ok: false, message: `Illegal transition: ${args.from} → ${args.to}.` };
      if (args.from === "reviewed" && args.to === "applying" && !args.intent_id) return { ok: false, message: "An intent_id is required before applying." };
      const submittedEvidence = args.to === "submitted" ? parseSubmissionEvidence(args.evidence) : null;
      if (submittedEvidence?.error) return { ok: false, message: submittedEvidence.error };
      const db = ctx.db<typeof schema>(); const row = (await db.select().from(schema.applications).where(eq(schema.applications.appId, args.app_id)).limit(1))[0];
      if (!row || row.state !== args.from) return { ok: false, message: row ? `Current state is ${row.state}, not ${args.from}.` : "Application not found." };
      if (args.from === "blocked" && args.to === "discovered") {
        const correction = parseCorrectionEvidence(args.evidence);
        if (!correction) return { ok: false, message: "Blocked → discovered requires JSON evidence with coordinator_correction=true, a valid event_log_id, and a reason." };
        const correctionEvent = (await db.select({ id: schema.events.id, appId: schema.events.appId, type: schema.events.type }).from(schema.events).where(eq(schema.events.id, correction.event_log_id)).limit(1))[0];
        if (!correctionEvent || correctionEvent.type !== "coordinator_correction" || correctionEvent.appId !== row.appId) return { ok: false, message: "The event_log_id must reference a coordinator_correction event for this application." };
      }
      const changed = now(); const evidence = submittedEvidence?.data;
      const confirmationPath = evidence?.confirmation
        ? evidence.confirmation_path ?? canonicalConfirmationPath(row)
        : evidence?.confirmation_path ?? row.confirmationPath;
      await db.batch([
        db.update(schema.applications).set({
          state: args.to,
          evidencePath: args.evidence,
          intentId: args.intent_id ?? row.intentId,
          resumePath: evidence?.resume_path ?? row.resumePath,
          resumeHash: evidence?.resume_hash.toLowerCase() ?? row.resumeHash,
          variantId: evidence?.variant_id ?? row.variantId,
          screenshotPath: evidence ? evidence.screenshot_path ?? null : row.screenshotPath,
          confirmation: evidence?.confirmation ?? row.confirmation,
          confirmationPath,
          statusReason: args.reason ?? row.statusReason,
          updatedAt: changed,
          submittedAt: args.to === "submitted" ? changed : row.submittedAt,
        }).where(and(eq(schema.applications.appId, args.app_id), eq(schema.applications.state, args.from))),
        db.insert(schema.events).values({ runId: row.runId, appId: row.appId, type: "state_transition", payload: { from: args.from, to: args.to, reason: args.reason ?? null, evidence: args.evidence, intent_id: args.intent_id ?? null }, at: changed }),
      ]);
      ctx.invalidateQueries(); return { ok: true };
    },
  }),

  // Resume a parked / needs-me application: returns it to reviewed so the
  // coordinator's resume sweep picks it up and re-drives APPLY → VERIFY.
  // Never submits from the button; needs-me still requires its approval first.
  app_resume: defineAction({
    request: z.object({ app_id: z.string().min(1), note: z.string().min(1).max(2000).optional() }),
    response: z.object({ ok: z.boolean(), message: z.string().optional() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const app = (await db.select().from(schema.applications).where(eq(schema.applications.appId, args.app_id)).limit(1))[0];
      if (!app) return { ok: false, message: "Application not found." };
      if (app.state !== "parked" && app.state !== "needs_me") return { ok: false, message: `Application is ${app.state}; only parked or needs-me applications can be resumed.` };
      if (app.state === "needs_me") {
        const open = (await db.select().from(schema.approvals).where(and(eq(schema.approvals.appId, app.appId), isNull(schema.approvals.resolvedAt))).orderBy(asc(schema.approvals.createdAt)).limit(1))[0];
        if (open) return { ok: false, message: `Resolve approval “${open.question}” (${open.approvalId}) on the Overview tab before resuming.` };
      }
      const changed = now(); const reason = args.note ? `Resumed by user: ${args.note}` : "Resumed by user";
      await db.batch([
        db.update(schema.applications).set({ state: "reviewed", statusReason: reason, updatedAt: changed }).where(eq(schema.applications.appId, app.appId)),
        db.insert(schema.events).values({ runId: app.runId, appId: app.appId, type: "application_resumed", payload: { from: app.state, note: args.note ?? null }, at: changed }),
      ]);
      ctx.invalidateQueries(); return { ok: true };
    },
  }),

  posting_verdict: defineAction({
    request: z.object({
      posting_id: z.string().min(1), run_id: z.string().min(1).nullable().optional(),
      stage: z.enum(["scout", "screen"]), verdict: z.enum(["passed", "held", "rejected"]),
      reason: z.string().trim().min(1).max(280),
    }), response: okResponse,
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>(); const at = now();
      await db.insert(schema.postingVerdicts).values({
        postingId: args.posting_id, runId: args.run_id ?? null,
        stage: args.stage, verdict: args.verdict, reason: args.reason, at,
      });
      await db.insert(schema.events).values({ runId: args.run_id ?? null, appId: null, type: "posting_verdict", payload: { posting_id: args.posting_id, stage: args.stage, verdict: args.verdict, reason: args.reason }, at });
      ctx.invalidateQueries(); return { ok: true };
    },
  }),

  talking_points_attach: defineAction({
    request: z.object({ app_id: z.string().min(1), talking_points_path: z.string().trim().min(1) }), response: okResponse,
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const row = (await db.select({ appId: schema.applications.appId }).from(schema.applications).where(eq(schema.applications.appId, args.app_id)).limit(1))[0];
      if (!row) return { ok: false, message: "Application not found." };
      await db.update(schema.applications).set({ talkingPointsPath: args.talking_points_path, updatedAt: now() }).where(eq(schema.applications.appId, args.app_id));
      await db.insert(schema.events).values({ appId: args.app_id, type: "talking_points_attached", payload: { talking_points_path: args.talking_points_path }, at: now() });
      ctx.invalidateQueries(); return { ok: true };
    },
  }),

  review_get: defineAction({
    request: z.object({ jd_hash: z.string(), resume_hash: z.string() }), response: z.object({ review: z.unknown().nullable() }),
    async handler(ctx, args) {
      const row = (await ctx.db<typeof schema>().select().from(schema.reviews).where(and(eq(schema.reviews.jdHash, args.jd_hash), eq(schema.reviews.resumeHash, args.resume_hash))).limit(1))[0];
      return { review: row ? { ...row, decidedAt: row.decidedAt.toISOString() } : null };
    },
  }),

  review_put: defineAction({
    request: z.object({ jd_hash: z.string(), resume_hash: z.string(), verdict: z.string(), notes: z.string().nullable().optional(), reviewer_version: z.string() }), response: okResponse,
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>(); const decidedAt = now();
      await db.insert(schema.reviews).values({ jdHash: args.jd_hash, resumeHash: args.resume_hash, verdict: args.verdict, notes: args.notes ?? null, reviewerVersion: args.reviewer_version, decidedAt })
        .onConflictDoUpdate({ target: [schema.reviews.jdHash, schema.reviews.resumeHash], set: { verdict: args.verdict, notes: args.notes ?? null, reviewerVersion: args.reviewer_version, decidedAt } });
      ctx.invalidateQueries(); return { ok: true };
    },
  }),

  resume_register: defineAction({
    request: z.object({
      variant_id: z.string().min(1), path: z.string().min(1), sha256: z.string().min(1), role_family: z.string().min(1),
      industry_tags: z.array(z.string()), years_matrix: jsonValue, keyword_vector: jsonValue,
    }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      // An explicit non-empty caller vector wins (the tailoring worker knows
      // the keywords it built the resume around); otherwise derive from
      // registration metadata so the vector is never empty.
      const provided = jsonObject(args.keyword_vector);
      const vector = Object.keys(provided).length > 0 ? provided : keywordVectorFromMetadata(args);
      await db.insert(schema.resumeVariants).values({ variantId: args.variant_id, path: args.path, sha256: args.sha256, roleFamily: args.role_family, industryTags: args.industry_tags, yearsMatrix: args.years_matrix, keywordVector: vector })
        .onConflictDoUpdate({ target: schema.resumeVariants.variantId, set: { path: args.path, sha256: args.sha256, roleFamily: args.role_family, industryTags: args.industry_tags, yearsMatrix: args.years_matrix, keywordVector: vector } });
      ctx.invalidateQueries(); return { ok: true as const };
    },
  }),

  resume_upload: defineAction({
    request: z.object({ filename: z.string(), bytes_base64: z.string(), variant_id: z.string(), role_family: z.string(), industry_tags: z.array(z.string()).optional() }),
    response: resumeUploadResponse,
    privileged: [privileged.writeResumeUpload, privileged.trashResumeFile],
    async handler(ctx, args): Promise<z.infer<typeof resumeUploadResponse>> {
      const bytes = decodeBase64(args.bytes_base64);
      if (!bytes) return { ok: false, message: "The uploaded file could not be decoded." };
      if (bytes.byteLength > 15 * 1024 * 1024) return { ok: false, message: "The uploaded PDF is larger than the 15 MB limit." };
      if (!pdfBytes(bytes)) return { ok: false, message: "The uploaded file is not a PDF." };
      const filename = args.filename.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
      if (!safeResumeFilenamePattern.test(filename)) return { ok: false, message: "Use a PDF filename that starts with a letter or number and contains only letters, numbers, dots, underscores, or hyphens." };
      const variantId = args.variant_id.trim();
      if (!variantId || !safeResumeVariantPattern.test(variantId)) return { ok: false, message: "Variant id is required and may contain only letters, numbers, dots, underscores, or hyphens." };
      const roleFamily = args.role_family.trim();
      if (!roleFamily) return { ok: false, message: "Role family is required." };
      const db = ctx.db<typeof schema>();
      const existing = (await db.select({ variantId: schema.resumeVariants.variantId }).from(schema.resumeVariants).where(eq(schema.resumeVariants.variantId, variantId)).limit(1))[0];
      if (existing) return { ok: false, message: `Variant id '${variantId}' is already registered. Choose a different id.` };
      const profileRow = (await db.select().from(schema.profile).where(eq(schema.profile.id, 1)).limit(1))[0];
      let written: { path: string; filename: string };
      try {
        written = await ctx.executePrivileged(privileged.writeResumeUpload, { filename, bytes_base64: args.bytes_base64 });
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "The PDF could not be saved to the resume library." };
      }
      const sha256 = await bytesSha256(bytes);
      const industryTags = args.industry_tags ?? [];
      try {
        await db.insert(schema.resumeVariants).values({
          variantId,
          path: written.path,
          sha256,
          roleFamily,
          industryTags,
          yearsMatrix: profileYearsMatrix(profileRow),
          // Uploads carry no explicit keyword list: derive from metadata so
          // resume_pick's keyword term can never be silently zero.
          keywordVector: keywordVectorFromMetadata({ role_family: roleFamily, industry_tags: industryTags, years_matrix: yearsMatrixList(profileRow) }),
        });
      } catch {
        try { await ctx.executePrivileged(privileged.trashResumeFile, { variant_id: variantId, filename: written.filename, location: "user_files" }); } catch { /* preserve the uploaded file if recovery trash is unavailable */ }
        const duplicate = (await db.select({ variantId: schema.resumeVariants.variantId }).from(schema.resumeVariants).where(eq(schema.resumeVariants.variantId, variantId)).limit(1))[0];
        return { ok: false, message: duplicate ? `Variant id '${variantId}' is already registered. Choose a different id.` : "The PDF was saved but could not be registered. It was moved to recoverable trash when possible." };
      }
      ctx.invalidateQueries();
      return { ok: true, variant_id: variantId, path: written.path, filename: written.filename, sha256 };
    },
  }),

  resume_delete: defineAction({
    request: z.object({ variant_id: z.string().min(1) }),
    response: resumeDeleteResponse,
    privileged: [privileged.trashResumeFile],
    async handler(ctx, args): Promise<z.infer<typeof resumeDeleteResponse>> {
      const variantId = args.variant_id.trim();
      const db = ctx.db<typeof schema>();
      const row = (await db.select().from(schema.resumeVariants).where(eq(schema.resumeVariants.variantId, variantId)).limit(1))[0];
      if (!row) return { ok: false, message: `Variant '${variantId}' is not in the library.` };
      const usage = (await db.select({ count: sql<number>`count(*)` }).from(schema.applications).where(eq(schema.applications.variantId, variantId)))[0];
      const usageCount = countNumber(usage?.count);
      const location = registeredResumeLocation(row.path);
      const filename = pathFilename(row.path);
      if (!location || !filename) return { ok: false, message: "This resume is outside the registered library locations and was not removed." };
      let moved: { file_moved: boolean; trashed_path: string | null };
      try {
        moved = await ctx.executePrivileged(privileged.trashResumeFile, { variant_id: variantId, filename, location });
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "The PDF could not be moved to recoverable trash. The library entry was kept." };
      }
      await db.delete(schema.resumeVariants).where(eq(schema.resumeVariants.variantId, variantId));
      ctx.invalidateQueries();
      return { ok: true, variant_id: variantId, usage_count: usageCount, trashed_path: moved.trashed_path, file_moved: moved.file_moved };
    },
  }),

  resume_pick: defineAction({
    request: z.object({ jd_text: z.string().min(1), role_family: z.string().optional() }), response: z.object({ results: z.array(z.object({ variant_id: z.string(), score: z.number(), breakdown: z.record(z.string(), z.number()) })) }),
    async handler(ctx, args) {
      const rows = await ctx.db<typeof schema>().select().from(schema.resumeVariants); const text = args.jd_text.toLowerCase(); const targetRole = norm(args.role_family ?? "");
      const scored = rows.map((row) => {
        const vector = jsonObject(row.keywordVector); const keys = Object.keys(vector); const keyword = keys.length ? keys.filter((key) => text.includes(key.toLowerCase())).length / keys.length : 0;
        const tags = jsonArray(row.industryTags).filter((x): x is string => typeof x === "string"); const tagPool = [row.roleFamily, ...tags]; const tag = tagPool.length ? tagPool.filter((x) => text.includes(x.toLowerCase()) || (targetRole && norm(x) === targetRole)).length / tagPool.length : 0;
        const approval = Math.max(0, Math.min(1, row.approvalRate > 1 ? row.approvalRate / 100 : row.approvalRate));
        const days = row.lastPickedAt ? (Date.now() - row.lastPickedAt.getTime()) / 86_400_000 : 90; const recency = Math.max(0, Math.min(1, days / 30));
        const score = 0.45 * keyword + 0.25 * tag + 0.20 * approval + 0.10 * recency;
        const roleMatch = targetRole ? (norm(row.roleFamily) === targetRole ? 1 : 0) : 0;
        const pickedAtMs = row.lastPickedAt ? row.lastPickedAt.getTime() : 0;
        return { variant_id: row.variantId, score: Number(score.toFixed(4)), roleMatch, approval: Number(approval.toFixed(4)), pickedAtMs, breakdown: { keyword: Number(keyword.toFixed(4)), tag: Number(tag.toFixed(4)), approval_rate: Number(approval.toFixed(4)), recency: Number(recency.toFixed(4)) } };
      }).sort((a, b) =>
        // Deterministic: score → role-family match → approval rate →
        // least recently picked → stable variant id. No arbitrary ties.
        b.score - a.score || b.roleMatch - a.roleMatch || b.approval - a.approval || a.pickedAtMs - b.pickedAtMs || (a.variant_id < b.variant_id ? -1 : a.variant_id > b.variant_id ? 1 : 0)
      ).map(({ variant_id, score, breakdown }) => ({ variant_id, score, breakdown })).slice(0, 3);
      return { results: scored };
    },
  }),

  // Backfill keyword vectors for variants registered before keyword
  // derivation existed (empty vectors). Idempotent: only touches variants
  // whose vector is empty or missing.
  resume_reindex: defineAction({
    request: emptyRequest, response: z.object({ ok: z.literal(true), reindexed: z.number().int(), total: z.number().int() }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.resumeVariants);
      let reindexed = 0;
      for (const row of rows) {
        if (Object.keys(jsonObject(row.keywordVector)).length > 0) continue;
        const vector = keywordVectorFromMetadata({ role_family: row.roleFamily, industry_tags: row.industryTags, years_matrix: row.yearsMatrix });
        await db.update(schema.resumeVariants).set({ keywordVector: vector }).where(eq(schema.resumeVariants.variantId, row.variantId));
        reindexed += 1;
      }
      ctx.invalidateQueries();
      return { ok: true as const, reindexed, total: rows.length };
    },
  }),

  h1b_lookup: defineAction({
    request: z.object({ company: z.string() }), response: z.object({ found: z.boolean(), score: z.number(), evidence_years: z.array(z.string()), lca_count: z.number(), last_refreshed: z.string().nullable() }),
    async handler(ctx, args) {
      const row = (await ctx.db<typeof schema>().select().from(schema.h1bSponsors).where(eq(schema.h1bSponsors.companyNorm, norm(args.company))).limit(1))[0];
      if (!row) return { found: false, score: 0, evidence_years: [], lca_count: 0, last_refreshed: null };
      const years = Object.keys(jsonObject(row.statsByYear)).sort().reverse(); const score = Math.max(0, Math.min(100, Math.round(25 * Math.log10(row.lcaCount + 1) + Math.min(40, years.length * 8))));
      return { found: true, score, evidence_years: years, lca_count: row.lcaCount, last_refreshed: row.lastRefreshed.toISOString() };
    },
  }),

  companies_update: defineAction({
    request: z.object({ rows: z.array(z.object({ company: z.string(), tier: z.number().int().optional(), industry: z.string().nullable().optional(), hq_state: z.string().nullable().optional(), careers_url: z.string().nullable().optional(), ats_type: z.string().nullable().optional(), park_count: z.number().int().optional(), skip_flag: z.boolean().optional(), skip_reason: z.string().nullable().optional() })).max(500) }), response: z.object({ updated: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      for (const row of args.rows) await db.insert(schema.companies).values({ companyNorm: norm(row.company), tier: row.tier ?? 3, industry: row.industry ?? null, hqState: row.hq_state ?? null, careersUrl: row.careers_url ?? null, atsType: row.ats_type ?? null, parkCount: row.park_count ?? 0, skipFlag: row.skip_flag ?? false, skipReason: row.skip_reason ?? null }).onConflictDoUpdate({ target: schema.companies.companyNorm, set: { tier: row.tier ?? 3, industry: row.industry ?? null, hqState: row.hq_state ?? null, careersUrl: row.careers_url ?? null, atsType: row.ats_type ?? null, parkCount: row.park_count ?? 0, skipFlag: row.skip_flag ?? false, skipReason: row.skip_reason ?? null } });
      if (args.rows.length) ctx.invalidateQueries(); return { updated: args.rows.length };
    },
  }),

  approval_enqueue: defineAction({
    request: z.object({ approval_id: z.string().optional(), kind: z.string(), app_id: z.string().nullable().optional(), question: z.string(), options: z.array(z.string()), section: linkedinSection.nullable().optional(), current_text: z.string().nullable().optional(), proposed_text: z.string().nullable().optional(), proposal_path: z.string().nullable().optional(), run_id: z.string().nullable().optional() }), response: z.object({ approval_id: z.string() }),
    async handler(ctx, args) { const approvalId = args.approval_id ?? id("approval"); await ctx.db<typeof schema>().insert(schema.approvals).values({ approvalId, kind: args.kind, appId: args.app_id ?? null, question: args.question, options: args.options, section: args.section ?? null, currentText: args.current_text ?? null, proposedText: args.proposed_text ?? null, proposalPath: args.proposal_path ?? null, runId: args.run_id ?? null }); ctx.invalidateQueries(); return { approval_id: approvalId }; },
  }),

  approval_resolve: defineAction({
    request: z.object({ approval_id: z.string(), answer: z.string(), judged_by: z.string(), edited_text: z.string().trim().min(1).optional() }), response: okResponse,
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const found = (await db.select().from(schema.approvals).where(eq(schema.approvals.approvalId, args.approval_id)).limit(1))[0];
      if (!found || found.resolvedAt) return { ok: false, message: found ? "Approval is already resolved." : "Approval not found." };
      if (found.kind !== "linkedin_section") {
        await db.update(schema.approvals).set({ answer: args.answer, judgedBy: args.judged_by, resolvedAt: now() }).where(eq(schema.approvals.approvalId, args.approval_id));
        ctx.invalidateQueries();
        return { ok: true };
      }
      // LinkedIn optimizer main-agent reroute: approving a section hands the
      // apply to the main agent via an `awaiting_main_agent` event; the
      // linkedin-optimize-dispatch cron picks it up within ~2 minutes.
      const decision = args.answer.trim().toLowerCase();
      if (!found.runId || !found.section || !linkedinSections.includes(found.section as (typeof linkedinSections)[number])) return { ok: false, message: "This LinkedIn approval is missing its run or section context." };
      if (decision !== "approve" && decision !== "approved" && decision !== "discard" && decision !== "discarded") return { ok: false, message: "Choose Approve or Discard. Edit the proposal before approving it." };
      const approved = decision === "approve" || decision === "approved";
      const proposedText = args.edited_text?.trim() || found.proposedText?.trim() || "";
      if (approved && !proposedText) return { ok: false, message: "The proposed text is empty and cannot be applied." };
      const run = (await db.select().from(schema.runs).where(eq(schema.runs.runId, found.runId)).limit(1))[0];
      const profileRow = (await db.select().from(schema.profile).where(eq(schema.profile.id, 1)).limit(1))[0];
      const profileUrl = linkedinProfileUrl(profileRow);
      if (!run || run.campaignId !== "linkedin_optimize") return { ok: false, message: "The LinkedIn optimizer run could not be found." };
      if (approved && !profileUrl) return { ok: false, message: "Add a valid HTTPS LinkedIn URL in Profile before approving this section." };
      await db.update(schema.approvals).set({ answer: approved ? "approved" : "discarded", proposedText: approved ? proposedText : found.proposedText, judgedBy: args.judged_by, resolvedAt: now() }).where(eq(schema.approvals.approvalId, args.approval_id));
      if (!approved) {
        await db.insert(schema.events).values({ runId: found.runId, type: "section_discarded", payload: { section: found.section, approval_id: found.approvalId }, at: now() });
      } else {
        await db.update(schema.runs).set({ status: "running", needsMe: false, blocker: null }).where(eq(schema.runs.runId, found.runId));
        await db.insert(schema.events).values({ runId: found.runId, type: "awaiting_main_agent", payload: { phase: "apply", section: found.section, approval_id: found.approvalId }, at: now() });
      }
      const remaining = (await db.select({ count: sql<number>`count(*)` }).from(schema.approvals).where(and(eq(schema.approvals.runId, found.runId), eq(schema.approvals.kind, "linkedin_section"), isNull(schema.approvals.resolvedAt))))[0];
      if (!approved && countNumber(remaining?.count) === 0) {
        const allSectionApprovals = await db.select().from(schema.approvals).where(and(eq(schema.approvals.runId, found.runId), eq(schema.approvals.kind, "linkedin_section")));
        const applyEvents = await db.select().from(schema.events).where(and(eq(schema.events.runId, found.runId), eq(schema.events.type, "section_applied")));
        const appliedIds = new Set(applyEvents.map((event) => jsonObject(event.payload).approval_id).filter((value): value is string => typeof value === "string"));
        const allApprovedApplied = allSectionApprovals.every((row) => row.answer !== "approved" || appliedIds.has(row.approvalId));
        if (allApprovedApplied) {
          const discarded = allSectionApprovals.filter((row) => row.answer === "discarded").length;
          await db.update(schema.runs).set({ status: "completed", ended: now(), needsMe: false, blocker: null, counts: { sections: allSectionApprovals.length, applied: appliedIds.size, discarded } }).where(eq(schema.runs.runId, found.runId));
          await db.insert(schema.events).values({ runId: found.runId, type: "done", payload: { phase: "done", applied: appliedIds.size, discarded }, at: now() });
        }
      }
      ctx.invalidateQueries();
      return { ok: true, message: approved ? `Approved ${titleCaseForServer(found.section)}. The main agent will apply it automatically.` : `Discarded ${titleCaseForServer(found.section)}. The live profile was not changed.` };
    },
  }),

  run_open: defineAction({
    request: z.object({ run_id: z.string().optional(), campaign_id: z.string(), kit_version: z.string().nullable().optional(), compiled_config: jsonValue.optional(), live_config: jsonValue.optional(), mode: runMode.optional() }), response: z.object({ run_id: z.string() }),
    async handler(ctx, args) { const runId = args.run_id ?? id("run"); await ctx.db<typeof schema>().insert(schema.runs).values({ runId, campaignId: args.campaign_id, kitVersion: args.kit_version ?? null, started: now(), status: "running", mode: args.mode ?? "scheduled", compiledConfig: args.compiled_config ?? {}, liveConfig: args.live_config ?? {} }); ctx.invalidateQueries(); return { run_id: runId }; },
  }),

  run_close: defineAction({
    request: z.object({ run_id: z.string(), status: z.string(), counts: jsonValue.optional(), tokens: jsonValue.optional(), needs_me: z.boolean().optional(), blocker: z.string().nullable().optional() }), response: okResponse,
    async handler(ctx, args) { const db = ctx.db<typeof schema>(); const pending = (await db.select({ count: sql<number>`count(*)` }).from(schema.applications).where(and(eq(schema.applications.runId, args.run_id), eq(schema.applications.state, "applying"), or(isNull(schema.applications.outcome), eq(schema.applications.outcome, "")))))[0]; if (countNumber(pending?.count) > 0) return { ok: false, message: "Run cannot close while applying rows lack an outcome." }; await db.update(schema.runs).set({ ended: now(), status: args.status, counts: args.counts ?? {}, tokens: args.tokens ?? {}, needsMe: args.needs_me ?? false, blocker: args.blocker ?? null }).where(eq(schema.runs.runId, args.run_id)); ctx.invalidateQueries(); return { ok: true }; },
  }),

  // Operator cancellation: the dashboard's Cancel run button marks an active run
  // cancelled and ends it; applications still in `applying` are cancelled too.
  // The run-coordinator watches for status="cancelled" and stands workers down.
  run_cancel: defineAction({
    request: z.object({ run_id: z.string().min(1) }),
    response: okResponse,
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const run = (await db.select({ ended: schema.runs.ended }).from(schema.runs).where(eq(schema.runs.runId, args.run_id)).limit(1))[0];
      if (!run) return { ok: false, message: "Run not found." };
      if (run.ended) return { ok: false, message: "Run has already ended." };
      const changed = now();
      const reason = "Run cancelled by user.";
      const applying = await db.select({ appId: schema.applications.appId }).from(schema.applications)
        .where(and(eq(schema.applications.runId, args.run_id), eq(schema.applications.state, "applying")));
      await db.batch([
        db.update(schema.applications).set({ state: "cancelled", outcome: "cancelled", statusReason: reason, blocker: null, updatedAt: changed })
          .where(and(eq(schema.applications.runId, args.run_id), eq(schema.applications.state, "applying"))),
        db.update(schema.runs).set({ status: "cancelled", ended: changed, needsMe: false, blocker: null })
          .where(and(eq(schema.runs.runId, args.run_id), isNull(schema.runs.ended))),
        db.insert(schema.events).values({ runId: args.run_id, type: "run_cancelled", payload: { reason, cancelled_applications: applying.length }, at: changed }),
      ]);
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  run_detail: defineAction({
    request: z.object({ run_id: z.string().min(1) }),
    response: z.object({ found: z.boolean(), generated_at: z.string(), data: z.unknown().nullable() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const run = (await db.select().from(schema.runs).where(eq(schema.runs.runId, args.run_id)).limit(1))[0];
      if (!run) return { found: false, generated_at: now().toISOString(), data: null };
      const eventRows = await db.select().from(schema.events).where(eq(schema.events.runId, args.run_id)).orderBy(desc(schema.events.at), desc(schema.events.id)).limit(250);
      const appRows = await db.select().from(schema.applications).where(eq(schema.applications.runId, args.run_id)).orderBy(desc(schema.applications.updatedAt));
      const verdictRows = await db.select({
        postingId: schema.postingVerdicts.postingId, stage: schema.postingVerdicts.stage, verdict: schema.postingVerdicts.verdict,
        reason: schema.postingVerdicts.reason, at: schema.postingVerdicts.at, company: schema.postings.company, role: schema.postings.role,
      }).from(schema.postingVerdicts).leftJoin(schema.postings, eq(schema.postingVerdicts.postingId, schema.postings.postingId)).where(eq(schema.postingVerdicts.runId, args.run_id)).orderBy(desc(schema.postingVerdicts.at));
      const seenPostings = new Set<string>();
      const latestPostingVerdicts = verdictRows.filter((row) => {
        if (seenPostings.has(row.postingId)) return false;
        seenPostings.add(row.postingId);
        return true;
      });
      const appIds = appRows.map((row) => row.appId);
      const approvalRows = appIds.length > 0
        ? await db.select().from(schema.approvals).where(and(inArray(schema.approvals.appId, appIds), isNull(schema.approvals.resolvedAt))).orderBy(asc(schema.approvals.createdAt))
        : [];
      const stateCounts = Object.fromEntries(Object.entries(appRows.reduce<Record<string, number>>((counts, row) => {
        counts[row.state] = (counts[row.state] ?? 0) + 1;
        return counts;
      }, {})).sort(([left], [right]) => left.localeCompare(right)));
      return {
        found: true,
        generated_at: now().toISOString(),
        data: {
          run: {
            run_id: run.runId, campaign_id: run.campaignId, kit_version: run.kitVersion,
            started: run.started.toISOString(), ended: iso(run.ended), status: run.status,
            counts: run.counts, current_state_counts: stateCounts, needs_me: run.needsMe,
            blocker: run.blocker, watch_chat: run.watchChat, capture_browser: run.captureBrowser,
            current_stage: eventRows[0]?.type ?? (run.status === "running" ? "starting" : run.status),
          },
          events: eventRows.map((event) => ({ id: event.id, app_id: event.appId, type: event.type, payload: event.payload, at: event.at.toISOString() })),
          approvals: approvalRows.map((approval) => ({ approval_id: approval.approvalId, kind: approval.kind, app_id: approval.appId, question: approval.question, options: approval.options, section: approval.section, current_text: approval.currentText, proposed_text: approval.proposedText, proposal_path: approval.proposalPath, run_id: approval.runId, created_at: approval.createdAt.toISOString() })),
          applications: appRows.map((app) => ({ app_id: app.appId, posting_id: app.postingId, state: app.state, status_reason: app.statusReason, blocker: app.blocker, outcome: app.outcome, talking_points_path: app.talkingPointsPath, screenshot_path: app.screenshotPath, confirmation: app.confirmation, updated_at: app.updatedAt.toISOString() })),
          posting_verdicts: latestPostingVerdicts.map((row) => ({ posting_id: row.postingId, company: row.company, role: row.role, stage: row.stage, verdict: row.verdict, reason: row.reason, at: row.at.toISOString() })),
        },
      };
    },
  }),

  run_watch_set: defineAction({
    request: z.object({ run_id: z.string().min(1), watch_chat: z.boolean().optional(), capture_browser: z.boolean().optional() }).superRefine((value, ctx) => {
      if (value.watch_chat === undefined && value.capture_browser === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose at least one watch setting." });
    }),
    response: z.object({ ok: z.boolean(), message: z.string(), watch_chat: z.boolean(), capture_browser: z.boolean() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const run = (await db.select().from(schema.runs).where(eq(schema.runs.runId, args.run_id)).limit(1))[0];
      if (!run) return { ok: false, message: "Run not found.", watch_chat: false, capture_browser: false };
      const watchChat = args.watch_chat ?? run.watchChat;
      const captureBrowser = args.capture_browser ?? run.captureBrowser;
      await db.update(schema.runs).set({ watchChat, captureBrowser }).where(eq(schema.runs.runId, args.run_id));
      await db.insert(schema.events).values({ runId: args.run_id, type: "watch_settings_changed", payload: { watch_chat: watchChat, capture_browser: captureBrowser }, at: now() });
      ctx.invalidateQueries();
      return { ok: true, message: run.status === "running" ? "Watch settings saved for this run." : "Watch settings saved. This run is no longer active.", watch_chat: watchChat, capture_browser: captureBrowser };
    },
  }),

  event_log: defineAction({
    request: z.object({ run_id: z.string().nullable().optional(), app_id: z.string().nullable().optional(), type: z.string(), payload: jsonValue.optional(), at: z.string().datetime().optional() }), response: z.object({ id: z.number(), watch_chat: z.boolean(), capture_browser: z.boolean() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const result = await db.insert(schema.events).values({ runId: args.run_id ?? null, appId: args.app_id ?? null, type: args.type, payload: args.payload ?? {}, at: args.at ? new Date(args.at) : now() }).returning({ id: schema.events.id });
      const inserted = result[0]; if (!inserted) throw new Error("Event could not be logged.");
      const run = args.run_id ? (await db.select({ watchChat: schema.runs.watchChat, captureBrowser: schema.runs.captureBrowser }).from(schema.runs).where(eq(schema.runs.runId, args.run_id)).limit(1))[0] : undefined;
      ctx.invalidateQueries();
      return { id: inserted.id, watch_chat: run?.watchChat ?? false, capture_browser: run?.captureBrowser ?? false };
    },
  }),

  test_data_purge: defineAction({
    request: emptyRequest,
    response: purgeResponse,
    async handler(ctx): Promise<z.infer<typeof purgeResponse>> {
      const db = ctx.db<typeof schema>();
      const appCandidates = await db.select({ appId: schema.applications.appId, source: schema.postings.source, url: schema.postings.url })
        .from(schema.applications)
        .leftJoin(schema.postings, eq(schema.applications.postingId, schema.postings.postingId))
        .where(or(
          eq(schema.postings.source, "smoke"),
          sqlSmokeMarker(sql`${schema.applications.appId}`),
        ));
      const resumeCandidates = await db.select().from(schema.resumeVariants).where(or(
        sqlSmokeMarker(sql`${schema.resumeVariants.variantId}`),
        sqlSmokeMarker(sql`${schema.resumeVariants.path}`),
        sqlSmokeMarker(sql`${schema.resumeVariants.sha256}`),
      ));
      const runCandidates = await db.select().from(schema.runs).where(or(
        sqlSmokeMarker(sql`${schema.runs.campaignId}`),
        sqlSmokeMarker(sql`${schema.runs.runId}`),
      ));
      const profileCandidates = await db.select().from(schema.profile).where(or(
        sql`${schema.profile.identity} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.workAuth} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.roleTypes} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.locations} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.targeting} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.comp} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.startDate} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.answers} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.caps} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.replyTiers} LIKE ${"%SMOKE TEST%"}`,
      ));

      const rootApplicationIds = new Set(appCandidates.map((row) => row.appId));
      const resumeIds = resumeCandidates.map((row) => row.variantId);
      const resumeHashes = new Set(resumeCandidates.map((row) => row.sha256));
      const runIds = runCandidates.map((row) => row.runId);
      const resumeIdSet = new Set(resumeIds);
      const runIdSet = new Set(runIds);

      // Applications can themselves be dependents of candidate runs or resumes. Collect
      // those rows before traversing the application-owned approval/conversation edges.
      const allApplications = await db.select({
        appId: schema.applications.appId,
        postingId: schema.applications.postingId,
        runId: schema.applications.runId,
        variantId: schema.applications.variantId,
        resumeHash: schema.applications.resumeHash,
        source: schema.postings.source,
        url: schema.postings.url,
        jdHash: schema.postings.jdHash,
      }).from(schema.applications).leftJoin(schema.postings, eq(schema.applications.postingId, schema.postings.postingId));
      const applicationsToDelete = allApplications.filter((row) =>
        rootApplicationIds.has(row.appId)
        || (row.runId !== null && runIdSet.has(row.runId))
        || (row.variantId !== null && resumeIdSet.has(row.variantId))
        || (row.resumeHash !== null && resumeHashes.has(row.resumeHash))
      );
      const applicationIds = applicationsToDelete.map((row) => row.appId);
      const applicationIdSet = new Set(applicationIds);

      const allApprovals = await db.select().from(schema.approvals);
      const approvalCandidates = allApprovals.filter((row) => row.appId !== null && applicationIdSet.has(row.appId));
      const approvalIds = approvalCandidates.map((row) => row.approvalId);
      const approvalIdSet = new Set(approvalIds);

      const allConversations = await db.select().from(schema.conversations);
      const conversationCandidates = allConversations.filter((row) => row.appId !== null && applicationIdSet.has(row.appId));
      const conversationIds = conversationCandidates.map((row) => row.threadId);
      const conversationIdSet = new Set(conversationIds);

      const reviewKeys = new Set(applicationsToDelete
        .filter((row) => row.jdHash !== null && row.resumeHash !== null)
        .map((row) => `${row.jdHash}\u0000${row.resumeHash}`));
      const allReviews = await db.select().from(schema.reviews);
      const reviewCandidates = allReviews.filter((row) =>
        resumeHashes.has(row.resumeHash) || reviewKeys.has(`${row.jdHash}\u0000${row.resumeHash}`)
      );
      const allReplies = await db.select().from(schema.replies);
      const replyCandidates = allReplies.filter((row) =>
        conversationIdSet.has(row.threadId)
        || (row.runId !== null && runIdSet.has(row.runId))
        || (row.approvalId !== null && approvalIdSet.has(row.approvalId))
      );
      const allTokenUsage = await db.select().from(schema.tokenUsage);
      const tokenUsageCandidates = allTokenUsage.filter((row) => runIdSet.has(row.runId));
      const offending: string[] = [];
      for (const row of applicationsToDelete) {
        if (!(row.source === "smoke" || hasSmokeMarker(row.appId))) offending.push(`applications:${row.appId}`);
      }
      for (const row of resumeCandidates) {
        if (![row.variantId, row.path, row.sha256].some(hasSmokeMarker)) offending.push(`resumes:${row.variantId}`);
      }
      for (const row of runCandidates) {
        if (![row.campaignId, row.runId].some(hasSmokeMarker)) offending.push(`runs:${row.runId}`);
      }
      for (const row of profileCandidates) {
        const textColumns = [row.identity, row.workAuth, row.roleTypes, row.locations, row.targeting, row.comp, row.startDate, row.answers, row.caps, row.replyTiers];
        if (!textColumns.some(hasSmokeTestLabel)) offending.push(`profiles:${row.id}`);
      }
      for (const row of approvalCandidates) {
        if (![row.approvalId, row.kind, row.question, row.judgedBy].some(hasSmokeMarker)) offending.push(`approvals:${row.approvalId}`);
      }
      for (const row of reviewCandidates) {
        if (![row.jdHash, row.resumeHash, row.notes, row.reviewerVersion].some(hasSmokeMarker)) offending.push(`reviews:${row.id}`);
      }
      for (const row of conversationCandidates) {
        if (![row.threadId, row.channel, row.classification, row.state, row.watermark].some(hasSmokeMarker)) offending.push(`conversations:${row.threadId}`);
      }
      for (const row of replyCandidates) {
        if (![row.replyId, row.ruleId, row.draftPath, row.reason, row.attachmentName].some(hasSmokeMarker)) offending.push(`replies:${row.replyId}`);
      }
      for (const row of tokenUsageCandidates) {
        if (![row.runId, row.campaignId].some(hasSmokeMarker)) offending.push(`token_usage:${row.runId}`);
      }
      if (offending.length > 0) return {
        ok: false,
        error: `Purge refused; candidates failed strict marker verification: ${offending.join(", ")}`,
        offending_ids: offending,
      };

      const batchId = id("purge");
      const stageRows = (tableName: string, rowId: SQL<string>) => ({
        batchId: sql<string>`${batchId}`.as("batch_id"),
        tableName: sql<string>`${tableName}`.as("table_name"),
        rowId: rowId.as("row_id"),
      });

      const stageApplications = db.insert(schema.purgeStage).select(db.select(stageRows("applications", sql<string>`${schema.applications.appId}`))
        .from(schema.applications)
        .leftJoin(schema.postings, eq(schema.applications.postingId, schema.postings.postingId))
        .where(or(
          eq(schema.postings.source, "smoke"),
          sqlSmokeMarker(sql`${schema.applications.appId}`),
          sql`${schema.applications.runId} IN (SELECT run_id FROM runs WHERE ${sqlSmokeMarker(sql`campaign_id`)} OR ${sqlSmokeMarker(sql`run_id`)})`,
          sql`${schema.applications.variantId} IN (SELECT variant_id FROM resume_variants WHERE ${sqlSmokeMarker(sql`variant_id`)} OR ${sqlSmokeMarker(sql`path`)} OR ${sqlSmokeMarker(sql`sha256`)})`,
          sql`${schema.applications.resumeHash} IN (SELECT sha256 FROM resume_variants WHERE ${sqlSmokeMarker(sql`variant_id`)} OR ${sqlSmokeMarker(sql`path`)} OR ${sqlSmokeMarker(sql`sha256`)})`,
        ))).onConflictDoNothing();
      const stageResumes = db.insert(schema.purgeStage).select(db.select(stageRows("resumes", sql<string>`${schema.resumeVariants.variantId}`))
        .from(schema.resumeVariants).where(or(
          sqlSmokeMarker(sql`${schema.resumeVariants.variantId}`),
          sqlSmokeMarker(sql`${schema.resumeVariants.path}`),
          sqlSmokeMarker(sql`${schema.resumeVariants.sha256}`),
        ))).onConflictDoNothing();
      const stageRuns = db.insert(schema.purgeStage).select(db.select(stageRows("runs", sql<string>`${schema.runs.runId}`))
        .from(schema.runs).where(or(sqlSmokeMarker(sql`${schema.runs.campaignId}`), sqlSmokeMarker(sql`${schema.runs.runId}`)))).onConflictDoNothing();
      const stageProfiles = db.insert(schema.purgeStage).select(db.select({
        batchId: sql<string>`${batchId}`.as("batch_id"),
        tableName: sql<string>`${"profiles"}`.as("table_name"),
        rowId: sql<string>`CAST(${schema.profile.id} AS TEXT)`.as("row_id"),
      }).from(schema.profile).where(or(
        sql`${schema.profile.identity} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.workAuth} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.roleTypes} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.locations} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.targeting} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.comp} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.startDate} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.answers} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.caps} LIKE ${"%SMOKE TEST%"}`,
        sql`${schema.profile.replyTiers} LIKE ${"%SMOKE TEST%"}`,
      ))).onConflictDoNothing();
      const stageApprovals = db.insert(schema.purgeStage).select(db.select(stageRows("approvals", sql<string>`${schema.approvals.approvalId}`))
        .from(schema.approvals).where(sql`${schema.approvals.appId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'applications')`)).onConflictDoNothing();
      const stageConversations = db.insert(schema.purgeStage).select(db.select(stageRows("conversations", sql<string>`${schema.conversations.threadId}`))
        .from(schema.conversations).where(sql`${schema.conversations.appId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'applications')`)).onConflictDoNothing();
      const stageReviews = db.insert(schema.purgeStage).select(db.select({
        batchId: sql<string>`${batchId}`.as("batch_id"),
        tableName: sql<string>`${"reviews"}`.as("table_name"),
        rowId: sql<string>`CAST(${schema.reviews.id} AS TEXT)`.as("row_id"),
      }).from(schema.reviews).where(or(
        sql`${schema.reviews.resumeHash} IN (SELECT rv.sha256 FROM resume_variants rv JOIN purge_stage ps ON ps.row_id = rv.variant_id WHERE ps.batch_id = ${batchId} AND ps.table_name = 'resumes')`,
        sql`EXISTS (SELECT 1 FROM applications a JOIN postings p ON p.posting_id = a.posting_id JOIN purge_stage ps ON ps.row_id = a.app_id WHERE ps.batch_id = ${batchId} AND ps.table_name = 'applications' AND p.jd_hash = ${schema.reviews.jdHash} AND a.resume_hash = ${schema.reviews.resumeHash})`,
      ))).onConflictDoNothing();
      const stageReplies = db.insert(schema.purgeStage).select(db.select(stageRows("replies", sql<string>`${schema.replies.replyId}`))
        .from(schema.replies).where(or(
          sql`${schema.replies.threadId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'conversations')`,
          sql`${schema.replies.runId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'runs')`,
          sql`${schema.replies.approvalId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'approvals')`,
        ))).onConflictDoNothing();
      const stageTokenUsage = db.insert(schema.purgeStage).select(db.select(stageRows("token_usage", sql<string>`${schema.tokenUsage.runId}`))
        .from(schema.tokenUsage).where(sql`${schema.tokenUsage.runId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'runs')`)).onConflictDoNothing();
      const stageRetainedEvents = db.insert(schema.purgeStage).select(db.select({
        batchId: sql<string>`${batchId}`.as("batch_id"),
        tableName: sql<string>`${"retained_events"}`.as("table_name"),
        rowId: sql<string>`CAST(${schema.events.id} AS TEXT)`.as("row_id"),
      }).from(schema.events).where(or(
        sql`${schema.events.runId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'runs')`,
        sql`${schema.events.appId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'applications')`,
      ))).onConflictDoNothing();

      const markerFailures = sql<number>`(
        (SELECT COUNT(*) FROM purge_stage ps JOIN applications a ON a.app_id = ps.row_id LEFT JOIN postings p ON p.posting_id = a.posting_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'applications' AND NOT (p.source = 'smoke' OR ${sqlSmokeMarker(sql`a.app_id`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN resume_variants r ON r.variant_id = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'resumes' AND NOT (${sqlSmokeMarker(sql`r.variant_id`)} OR ${sqlSmokeMarker(sql`r.path`)} OR ${sqlSmokeMarker(sql`r.sha256`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN runs r ON r.run_id = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'runs' AND NOT (${sqlSmokeMarker(sql`r.campaign_id`)} OR ${sqlSmokeMarker(sql`r.run_id`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN profile p ON CAST(p.id AS TEXT) = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'profiles' AND NOT (p.identity LIKE '%[SMOKE TEST]%' OR p.work_auth LIKE '%[SMOKE TEST]%' OR p.role_types LIKE '%[SMOKE TEST]%' OR p.locations LIKE '%[SMOKE TEST]%' OR p.targeting LIKE '%[SMOKE TEST]%' OR p.comp LIKE '%[SMOKE TEST]%' OR coalesce(p.start_date,'') LIKE '%[SMOKE TEST]%' OR p.answers LIKE '%[SMOKE TEST]%' OR p.caps LIKE '%[SMOKE TEST]%' OR p.reply_tiers LIKE '%[SMOKE TEST]%'))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN approvals a ON a.approval_id = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'approvals' AND NOT (${sqlSmokeMarker(sql`a.approval_id`)} OR ${sqlSmokeMarker(sql`a.kind`)} OR ${sqlSmokeMarker(sql`a.question`)} OR ${sqlSmokeMarker(sql`a.judged_by`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN reviews r ON CAST(r.id AS TEXT) = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'reviews' AND NOT (${sqlSmokeMarker(sql`r.jd_hash`)} OR ${sqlSmokeMarker(sql`r.resume_hash`)} OR ${sqlSmokeMarker(sql`r.notes`)} OR ${sqlSmokeMarker(sql`r.reviewer_version`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN conversations c ON c.thread_id = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'conversations' AND NOT (${sqlSmokeMarker(sql`c.thread_id`)} OR ${sqlSmokeMarker(sql`c.channel`)} OR ${sqlSmokeMarker(sql`c.classification`)} OR ${sqlSmokeMarker(sql`c.state`)} OR ${sqlSmokeMarker(sql`c.watermark`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN replies r ON r.reply_id = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'replies' AND NOT (${sqlSmokeMarker(sql`r.reply_id`)} OR ${sqlSmokeMarker(sql`r.rule_id`)} OR ${sqlSmokeMarker(sql`r.draft_path`)} OR ${sqlSmokeMarker(sql`r.reason`)} OR ${sqlSmokeMarker(sql`r.attachment_name`)}))
        + (SELECT COUNT(*) FROM purge_stage ps JOIN token_usage t ON t.run_id = ps.row_id
          WHERE ps.batch_id = ${batchId} AND ps.table_name = 'token_usage' AND NOT (${sqlSmokeMarker(sql`t.run_id`)} OR ${sqlSmokeMarker(sql`t.campaign_id`)}))
      )`;
      const auditPayload = sql<unknown>`json_object(
        'batch_id', ${batchId},
        'purged', json_object(
          'applications', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'applications'),
          'resumes', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'resumes'),
          'runs', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'runs'),
          'profiles', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'profiles'),
          'approvals', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'approvals'),
          'reviews', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'reviews'),
          'conversations', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'conversations'),
          'replies', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'replies'),
          'token_usage', (SELECT COUNT(*) FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'token_usage')
        ),
        'ids', json_object(
          'applications', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'applications' ORDER BY row_id)), '[]')),
          'resumes', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'resumes' ORDER BY row_id)), '[]')),
          'runs', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'runs' ORDER BY row_id)), '[]')),
          'profiles', json(COALESCE((SELECT json_group_array(CAST(row_id AS INTEGER)) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'profiles' ORDER BY row_id)), '[]')),
          'approvals', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'approvals' ORDER BY row_id)), '[]')),
          'reviews', json(COALESCE((SELECT json_group_array(CAST(row_id AS INTEGER)) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'reviews' ORDER BY CAST(row_id AS INTEGER))), '[]')),
          'conversations', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'conversations' ORDER BY row_id)), '[]')),
          'replies', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'replies' ORDER BY row_id)), '[]')),
          'token_usage', json(COALESCE((SELECT json_group_array(row_id) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'token_usage' ORDER BY row_id)), '[]'))
        ),
        'retained_event_ids', json(COALESCE((SELECT json_group_array(CAST(row_id AS INTEGER)) FROM (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'retained_events' ORDER BY CAST(row_id AS INTEGER))), '[]'))
      )`;

      try {
        await db.batch([
          db.delete(schema.purgeStage).where(eq(schema.purgeStage.batchId, batchId)),
          db.delete(schema.purgeGuard).where(eq(schema.purgeGuard.batchId, batchId)),
          stageApplications,
          stageResumes,
          stageRuns,
          stageProfiles,
          stageApprovals,
          stageConversations,
          stageReviews,
          stageReplies,
          stageTokenUsage,
          stageRetainedEvents,
          db.insert(schema.purgeGuard).values({ batchId, offenderCount: markerFailures }),
          db.delete(schema.replies).where(sql`${schema.replies.replyId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'replies')`),
          db.delete(schema.approvals).where(sql`${schema.approvals.approvalId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'approvals')`),
          db.delete(schema.conversations).where(sql`${schema.conversations.threadId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'conversations')`),
          db.delete(schema.reviews).where(sql`CAST(${schema.reviews.id} AS TEXT) IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'reviews')`),
          db.delete(schema.tokenUsage).where(sql`${schema.tokenUsage.runId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'token_usage')`),
          db.delete(schema.applications).where(sql`${schema.applications.appId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'applications')`),
          db.delete(schema.runs).where(sql`${schema.runs.runId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'runs')`),
          db.delete(schema.resumeVariants).where(sql`${schema.resumeVariants.variantId} IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'resumes')`),
          db.delete(schema.profile).where(sql`CAST(${schema.profile.id} AS TEXT) IN (SELECT row_id FROM purge_stage WHERE batch_id = ${batchId} AND table_name = 'profiles')`),
          db.insert(schema.events).values({ type: "test_data_purge", payload: auditPayload, at: now() }),
          db.delete(schema.purgeGuard).where(eq(schema.purgeGuard.batchId, batchId)),
          db.delete(schema.purgeStage).where(eq(schema.purgeStage.batchId, batchId)),
        ]);
      } catch {
        return { ok: false, error: "Purge refused; data changed during atomic verification. No rows were deleted." };
      }

      const auditEvent = (await db.select({ payload: schema.events.payload }).from(schema.events)
        .where(and(eq(schema.events.type, "test_data_purge"), sql`json_extract(${schema.events.payload}, '$.batch_id') = ${batchId}`)).limit(1))[0];
      if (!auditEvent) return { ok: false, error: "Purge audit record was not written; no successful result can be reported." };
      const payload = jsonObject(auditEvent.payload);
      const parsed = purgeResponse.safeParse({ ok: true, purged: payload.purged, ids: payload.ids });
      if (!parsed.success || !parsed.data.ok) return { ok: false, error: "Purge audit record could not be validated." };
      ctx.invalidateQueries();
      return parsed.data;
    },
  }),

  schedules_status: defineAction({
    request: emptyRequest,
    response: schedulesStatusResponse,
    privileged: [privileged.readSchedulesManifest],
    async handler(ctx): Promise<z.infer<typeof schedulesStatusResponse>> {
      const generatedAt = now().toISOString();
      const result = await ctx.executePrivileged(privileged.readSchedulesManifest, {});
      if (!result.manifestText) return { generated_at: generatedAt, manifest_missing: true, rows: [] };

      let parsed: z.infer<typeof schedulesManifestSchema> | null = null;
      try {
        const checked = schedulesManifestSchema.safeParse(JSON.parse(result.manifestText));
        parsed = checked.success ? checked.data : null;
      } catch {
        parsed = null;
      }
      if (!parsed) return { generated_at: generatedAt, manifest_missing: true, rows: [] };

      const runRows = await ctx.db<typeof schema>().select().from(schema.runs).orderBy(desc(schema.runs.started));
      const latestByCampaign = new Map<string, (typeof runRows)[number]>();
      for (const run of runRows) if (!latestByCampaign.has(run.campaignId)) latestByCampaign.set(run.campaignId, run);
      const rows = parsed.jobs.map((job) => {
        const latest = latestByCampaign.get(job.campaign);
        const liveBodyHash = latest ? findBodyHash(latest.liveConfig) ?? findBodyHash(latest.compiledConfig) : null;
        const latestRunDrift = latest
          ? JSON.stringify(latest.compiledConfig) === JSON.stringify(latest.liveConfig) ? "in_sync" as const : "drift" as const
          : null;
        const hashDrift = liveBodyHash && job.body_hash
          ? liveBodyHash === job.body_hash.toLowerCase() ? "in_sync" as const : "drift" as const
          : null;
        return {
          ...job,
          manifest_body_hash: job.body_hash,
          last_run_at: latest ? latest.started.toISOString() : null,
          last_run_status: latest?.status ?? null,
          live_body_hash: liveBodyHash,
          drift: latest ? latestRunDrift ?? hashDrift ?? "unknown" as const : "unknown" as const,
        };
      });
      return { generated_at: generatedAt, manifest_missing: false, rows };
    },
  }),

  schedule_update: defineAction({
    request: z.object({ job_id: z.string().min(1), cadence: z.string().optional(), enabled: z.boolean().optional() })
      .superRefine((value, ctx) => {
        if (value.cadence === undefined && value.enabled === undefined) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide at least one of cadence or enabled." });
        }
      }),
    response: scheduleUpdateResponse,
    privileged: [privileged.readProfileYaml, privileged.parseProfileYaml, privileged.writeProfileYaml, privileged.readSchedulesManifest],
    async handler(ctx, args): Promise<z.infer<typeof scheduleUpdateResponse>> {
      const jobId = args.job_id.trim();
      const campaign = jobIdToCampaign(jobId);
      if (!campaign) {
        return { ok: false, error: `Unknown job_id ${q(jobId)}. Known job ids: ${SCHEDULE_CAMPAIGNS.map(scheduleJobId).join(", ")}.` };
      }
      let cadence: string | undefined;
      if (args.cadence !== undefined) {
        const problem = cadenceError(args.cadence);
        if (problem) return { ok: false, error: problem };
        cadence = args.cadence.trim();
      }
      let originalText: string;
      let parsed: Record<string, unknown>;
      try {
        originalText = (await ctx.executePrivileged(privileged.readProfileYaml, {})).yamlText;
        parsed = jsonObject((await ctx.executePrivileged(privileged.parseProfileYaml, { yamlText: originalText })).parsed);
      } catch {
        return { ok: false, error: "profile.yaml could not be read or parsed; nothing was changed." };
      }
      const campaigns = jsonObject(parsed.campaigns);
      const rawExisting = campaigns[campaign];
      if (rawExisting !== undefined && (typeof rawExisting !== "object" || rawExisting === null || Array.isArray(rawExisting))) {
        return { ok: false, error: `campaigns.${campaign} is malformed in profile.yaml; fix it by hand before editing from the dashboard.` };
      }
      const existing = rawExisting ? rawExisting as Record<string, unknown> : null;
      let nextCadence = cadence ?? (typeof existing?.cadence === "string" && existing.cadence.trim() ? existing.cadence.trim() : undefined);
      if (!nextCadence) {
        // Absent entry: carry over the live cadence from the compiled manifest
        // so toggling enabled never forces the user to retype the cadence.
        try {
          const manifest = await ctx.executePrivileged(privileged.readSchedulesManifest, {});
          if (manifest.manifestText) {
            const jobs = jsonArray((JSON.parse(manifest.manifestText) as Record<string, unknown>).jobs);
            const row = jobs.map(jsonObject).find((job) => job.job_id === jobId);
            const found = row && typeof row.cadence === "string" ? row.cadence.trim() : "";
            if (found) nextCadence = found;
          }
        } catch {
          // fall through to the explicit-cadence error below
        }
        if (!nextCadence) return { ok: false, error: `campaigns.${campaign} has no cadence yet and the manifest has no row for ${q(jobId)}; pass cadence explicitly.` };
      }
      const nextFields: Record<string, unknown> = { ...(existing ?? {}), cadence: nextCadence };
      if (args.enabled !== undefined) nextFields.enabled = args.enabled;
      let updatedText: string;
      try {
        updatedText = spliceCampaignEntry(originalText, campaign, campaignEntryLine(campaign, nextFields));
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "The campaigns section could not be edited." };
      }
      // Validate the full edited profile against the schema mirror before
      // writing. On failure the previous file bytes are restored untouched.
      try {
        const reparsed = jsonObject((await ctx.executePrivileged(privileged.parseProfileYaml, { yamlText: updatedText })).parsed);
        const checked = yamlProfileSchema.safeParse(reparsed);
        if (!checked.success) throw new Error(checked.error.issues[0]?.message ?? "The edited profile did not validate.");
      } catch (error) {
        try {
          await ctx.executePrivileged(privileged.writeProfileYaml, { yaml_text: originalText });
        } catch {
          // best effort: the original text was already validated on read
        }
        return { ok: false, error: `Edited profile failed validation; the previous profile.yaml was restored. ${error instanceof Error ? error.message : ""}`.trim() };
      }
      try {
        await ctx.executePrivileged(privileged.writeProfileYaml, { yaml_text: updatedText });
      } catch {
        return { ok: false, error: "profile.yaml could not be written; nothing was changed." };
      }
      ctx.invalidateQueries();
      const enabled = nextFields.enabled === false ? false : true;
      return {
        ok: true, job_id: jobId, campaign, cadence: nextCadence, enabled,
        note: `Saved to profile.yaml campaigns.${campaign}. Recompiles within ~15 min via profile_watch — the job is never deleted.`,
      };
    },
  }),

  snapshot: defineAction({
    request: z.object({ view: z.enum(["overview", "applications", "resumes", "runs", "replies", "health", "ask"]), query: z.string().optional() }), response: z.object({ view: z.string(), generated_at: z.string(), data: z.unknown() }),
    privileged: [privileged.applicationEvidenceExists, privileged.hiddenFilesDiskUsage],
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>(); const generatedAt = now(); const cutoff24 = new Date(Date.now() - 86_400_000); const cutoff7 = new Date(Date.now() - 7 * 86_400_000); const cutoff30 = new Date(Date.now() - 30 * 86_400_000);
      const appCounts = async () => {
        const rows = await db.select({ state: schema.applications.state, count: sql<number>`count(*)` }).from(schema.applications).groupBy(schema.applications.state);
        const byState = Object.fromEntries(rows.map((r) => [r.state, countNumber(r.count)]));
        const todayRows = await db.select({ createdAt: schema.applications.createdAt, submittedAt: schema.applications.submittedAt }).from(schema.applications);
        return { total: Object.values(byState).reduce((a, b) => a + b, 0), by_state: byState, today_applied: todayRows.filter((r) => r.submittedAt && chicagoDay(r.submittedAt) === chicagoDay()).length, submitted_7d: todayRows.filter((r) => r.submittedAt && r.submittedAt >= cutoff7).length, submitted_30d: todayRows.filter((r) => r.submittedAt && r.submittedAt >= cutoff30).length };
      };
      if (args.view === "applications" || args.view === "resumes") {
        const counts = await appCounts(); const apps = await db.select().from(schema.applications).orderBy(desc(schema.applications.updatedAt)).limit(500); const posts = await db.select().from(schema.postings); const postMap = new Map(posts.map((p) => [p.postingId, p]));
        const usage = await db.select({ variantId: schema.applications.variantId, count: sql<number>`count(*)` }).from(schema.applications).where(sql`${schema.applications.variantId} IS NOT NULL`).groupBy(schema.applications.variantId);
        const usageMap = new Map(usage.map((u) => [u.variantId, countNumber(u.count)])); const resumes = (await db.select().from(schema.resumeVariants).orderBy(desc(schema.resumeVariants.timesPicked))).map((r) => ({ variant_id: r.variantId, path: r.path, sha256: r.sha256, role_family: r.roleFamily, industry_tags: r.industryTags, times_picked: r.timesPicked, exact_usage: usageMap.get(r.variantId) ?? 0, approval_rate: r.approvalRate, last_picked_at: iso(r.lastPickedAt) }));
        const screenshotChecks = await Promise.all(apps.filter((app) => app.screenshotPath && app.runId).map(async (app) => {
          const result = await ctx.executePrivileged(privileged.applicationEvidenceExists, { appId: app.appId, campaignId: app.campaignId, runId: app.runId ?? "", kind: "screenshot", filename: pathFilename(app.screenshotPath ?? "") });
          return [app.appId, result.exists] as const;
        }));
        const screenshotExists = new Map(screenshotChecks);
        const prepChecks = await Promise.all(apps.filter((app) => app.talkingPointsPath && app.runId).map(async (app) => {
          const result = await ctx.executePrivileged(privileged.applicationEvidenceExists, { appId: app.appId, campaignId: app.campaignId, runId: app.runId ?? "", kind: "prep", filename: pathFilename(app.talkingPointsPath ?? "") });
          return [app.appId, result.exists] as const;
        }));
        const prepExists = new Map(prepChecks);
        const ledger = apps.map((a) => { const p = postMap.get(a.postingId); return {
          app_id: a.appId, company: p?.company ?? a.companyNorm, role: p?.role ?? a.roleNorm, source: p?.source ?? "unavailable", url: p?.url ?? null,
          state: a.state, campaign_id: a.campaignId, run_id: a.runId, variant_id: a.variantId,
          resume_path: a.resumePath, resume_hash: a.resumeHash, screenshot_path: a.screenshotPath,
          screenshot_exists: a.screenshotPath ? screenshotExists.get(a.appId) === true : false,
          confirmation: a.confirmation, confirmation_path: a.confirmationPath,
          blocker: a.blocker, outcome: a.outcome, created_at: a.createdAt.toISOString(), updated_at: a.updatedAt.toISOString(), submitted_at: iso(a.submittedAt),
          reason: a.statusReason, talking_points_path: a.talkingPointsPath,
          prep_exists: a.talkingPointsPath ? prepExists.get(a.appId) === true : false,
          // Provenance carried from claim through VERIFY (migration 0010).
          source_class: p?.sourceClass ?? null, source_name: p?.sourceName ?? null,
          discovery_phase: p?.discoveryPhase ?? null, source_tier: p?.sourceTier ?? null,
          employment_types_offered: p?.employmentTypesOffered ?? [],
          selected_lane: p?.selectedLane ?? null, h1b_mode: p?.h1bMode ?? null, h1b_result: p?.h1bResult ?? null,
        }; });
        // Verified-submission counts by provenance facet (migration 0010).
        type Posting = typeof schema.postings.$inferSelect;
        const submittedProvenance = apps.filter((a) => a.state === "submitted");
        const facet = (pick: (p: Posting | undefined) => string | null) => {
          const m = new Map<string, number>();
          for (const a of submittedProvenance) { const key = pick(postMap.get(a.postingId)) ?? "unknown"; m.set(key, (m.get(key) ?? 0) + 1); }
          return Object.fromEntries(m);
        };
        const submitted_breakdowns = {
          by_source_class: facet((p) => p?.sourceClass ?? null),
          by_source_name: facet((p) => p?.sourceName ?? null),
          by_discovery_phase: facet((p) => p?.discoveryPhase ?? null),
          by_source_tier: facet((p) => p?.sourceTier ?? null),
          by_lane: facet((p) => p?.selectedLane ?? null),
          by_h1b_result: facet((p) => p?.h1bResult ?? null),
        };
        // Dashboard provenance board shape (matches the local dashboard client):
        // totals + per-facet tallies with "not_recorded" for missing values.
        const tally = (values: Array<string | null>) => Object.fromEntries(Array.from(values.reduce((result, value) => {
          const key = value ?? "not_recorded"; result.set(key, (result.get(key) ?? 0) + 1); return result;
        }, new Map<string, number>())).sort(([left], [right]) => left.localeCompare(right)));
        const provenanceValues = submittedProvenance.map((a) => postMap.get(a.postingId));
        const provenance_summary = {
          submitted_total: submittedProvenance.length,
          by_source: tally(provenanceValues.map((p) => p?.sourceClass ?? null)),
          by_tier: tally(provenanceValues.map((p) => p?.sourceTier ?? null)),
          by_lane: tally(provenanceValues.map((p) => p?.selectedLane ?? null)),
          by_h1b_result: tally(provenanceValues.map((p) => p?.h1bResult ?? null)),
          by_discovery_phase: tally(provenanceValues.map((p) => p?.discoveryPhase ?? null)),
        };
        return { view: args.view, generated_at: generatedAt.toISOString(), data: { counts, ledger, resumes, submitted_breakdowns, provenance_summary } };
      }
      if (args.view === "runs") {
        const runRows = await db.select().from(schema.runs).orderBy(desc(schema.runs.started)).limit(200);
        const rows = runRows.map((r) => ({
          run_id: r.runId,
          campaign_id: r.campaignId,
          kit_version: r.kitVersion,
          mode: r.mode,
          started: r.started.toISOString(),
          ended: iso(r.ended),
          status: r.status,
          counts: r.counts,
          tokens: r.tokens,
          tokens_input: r.tokensInput,
          tokens_output: r.tokensOutput,
          tokens_total: r.tokensTotal,
          tokens_reported: r.tokensReported,
          needs_me: r.needsMe,
          blocker: r.blocker,
          watch_chat: r.watchChat,
          capture_browser: r.captureBrowser,
          drift: JSON.stringify(r.compiledConfig) === JSON.stringify(r.liveConfig) ? "in_sync" : "drift",
          compiled_config: r.compiledConfig,
          live_config: r.liveConfig,
        }));
        const totalTokens = runRows.reduce((sum, r) => r.tokensReported ? sum + r.tokensTotal : sum, 0);
        const runIds = runRows.map((r) => r.runId);
        const verdictRows = runIds.length ? await db.select().from(schema.postingVerdicts).where(inArray(schema.postingVerdicts.runId, runIds)).orderBy(desc(schema.postingVerdicts.at)).limit(2000) : [];
        const verdictsByRun = new Map<string, { posting_id: string; stage: string; verdict: string; reason: string; at: string }[]>();
        for (const v of verdictRows) {
          const list = verdictsByRun.get(v.runId ?? "") ?? []; list.push({ posting_id: v.postingId, stage: v.stage, verdict: v.verdict, reason: v.reason, at: v.at.toISOString() }); verdictsByRun.set(v.runId ?? "", list);
        }
        const rowsWithVerdicts = rows.map((r) => ({ ...r, verdicts: verdictsByRun.get(r.run_id) ?? [] }));
        return { view: args.view, generated_at: generatedAt.toISOString(), data: { hero: runRows.length, running: runRows.filter((r) => r.status === "running").length, blocked: runRows.filter((r) => Boolean(r.blocker)).length, needs_me: runRows.filter((r) => r.needsMe).length, total_tokens: totalTokens, rows: rowsWithVerdicts } };
      }
      if (args.view === "replies") {
        const threads = await db.select().from(schema.conversations).orderBy(desc(schema.conversations.updatedAt)).limit(300); const replyRows = await db.select().from(schema.replies).orderBy(desc(schema.replies.at)).limit(500); const apps = await db.select().from(schema.applications);
        const perWeek = replyRows.filter((r) => r.at >= cutoff7).reduce((acc, r) => { if (r.action === "sent" || r.action === "auto_sent") acc.sent += 1; if (r.action === "held") acc.held += 1; return acc; }, { sent: 0, held: 0 });
        const repliedApps = new Set(threads.map((t) => t.appId).filter(Boolean)); const interviewed = apps.filter((a) => (a.outcome ?? "").toLowerCase().includes("interview")).length;
        return { view: args.view, generated_at: generatedAt.toISOString(), data: { hero: threads.length, sent_7d: perWeek.sent, held_7d: perWeek.held, awaiting_me: threads.filter((t) => ["awaiting_me", "needs_me", "held"].includes(t.state)), funnel: { applied: apps.length, replied: repliedApps.size, interview: interviewed }, threads: threads.map((t) => ({ thread_id: t.threadId, channel: t.channel, contact_id: t.contactId, app_id: t.appId, classification: t.classification, state: t.state, watermark: t.watermark, updated_at: t.updatedAt.toISOString() })), replies: replyRows.map((r) => ({ ...r, at: r.at.toISOString() })) } };
      }
      if (args.view === "health") {
        const runRows = await db.select().from(schema.runs).orderBy(desc(schema.runs.started)).limit(100); const aged = await db.select().from(schema.approvals).where(and(isNull(schema.approvals.resolvedAt), lt(schema.approvals.createdAt, cutoff24))).orderBy(asc(schema.approvals.createdAt)); const stale = await db.select().from(schema.applications).where(and(eq(schema.applications.state, "applying"), lt(schema.applications.updatedAt, cutoff24)));
        const drift = runRows.filter((r) => JSON.stringify(r.compiledConfig) !== JSON.stringify(r.liveConfig)).map((r) => ({ run_id: r.runId, campaign_id: r.campaignId, compiled: r.compiledConfig, live: r.liveConfig })); const last = runRows[0];
        // Parked companies the doctor watches (park_count >= 3): skip flag +
        // reason so the doctor can set the flag and enqueue operator review.
        const parked = (await db.select().from(schema.companies).where(gte(schema.companies.parkCount, 3)).orderBy(desc(schema.companies.parkCount)).limit(50))
          .map((c) => ({ company_norm: c.companyNorm, park_count: c.parkCount, skip_flag: c.skipFlag, skip_reason: c.skipReason }));
        // H-1B dataset freshness: min/max refresh across all sponsor rows.
        const h1bStats = (await db.select({ count: sql<number>`count(*)`, oldest: sql<number | null>`min(${schema.h1bSponsors.lastRefreshed})`, newest: sql<number | null>`max(${schema.h1bSponsors.lastRefreshed})` }).from(schema.h1bSponsors))[0];
        const h1bNewestMs = h1bStats?.newest ? Number(h1bStats.newest) : null;
        const h1bOldestMs = h1bStats?.oldest ? Number(h1bStats.oldest) : null;
        const h1b = {
          employers: countNumber(h1bStats?.count),
          newest_refresh: h1bNewestMs ? new Date(h1bNewestMs).toISOString() : null,
          oldest_refresh: h1bOldestMs ? new Date(h1bOldestMs).toISOString() : null,
          age_days_newest: h1bNewestMs ? Number(((Date.now() - h1bNewestMs) / 86_400_000).toFixed(1)) : null,
          age_days_oldest: h1bOldestMs ? Number(((Date.now() - h1bOldestMs) / 86_400_000).toFixed(1)) : null,
        };
        // Disk telemetry: real hidden_files usage via the privileged contract;
        // explicit unavailable state (never silently omitted) when it fails.
        let disk: Record<string, unknown>;
        try {
          const usage = await ctx.executePrivileged(privileged.hiddenFilesDiskUsage, { prune_candidates: 10 });
          disk = { available: true, bytes_total: usage.bytes_total, folder_count: usage.folder_count, over_2gb: usage.bytes_total > 2 * 1024 * 1024 * 1024, prune_candidates: usage.oldest_folders };
        } catch {
          disk = { available: false, message: "Disk telemetry source unavailable." };
        }
        return { view: args.view, generated_at: generatedAt.toISOString(), data: { status: !last ? "no_runs" : last.status === "running" || (last.ended && last.ended >= cutoff24) ? "healthy" : "attention", runs_24h: runRows.filter((r) => r.started >= cutoff24).length, drift, stale_intents: stale.map((a) => ({ app_id: a.appId, updated_at: a.updatedAt.toISOString(), intent_id: a.intentId })), aged_approvals: aged.map((a) => ({ approval_id: a.approvalId, question: a.question, created_at: a.createdAt.toISOString() })), state_edges: STATE_EDGE_DOCS, parked_companies: parked, h1b_refresh: h1b, disk } };
      }
      if (args.view === "overview") {
        const counts = await appCounts(); const recentRuns = await db.select().from(schema.runs).where(gte(schema.runs.started, cutoff24)).orderBy(desc(schema.runs.started)); const pending = await db.select().from(schema.approvals).where(isNull(schema.approvals.resolvedAt)).orderBy(asc(schema.approvals.createdAt)).limit(20); const recentEvents = await db.select({ count: sql<number>`count(*)` }).from(schema.events).where(gte(schema.events.at, cutoff24));
        return { view: args.view, generated_at: generatedAt.toISOString(), data: { counts, runs_24h: recentRuns.length, healthy_runs_24h: recentRuns.filter((r) => r.status === "completed").length, events_24h: countNumber(recentEvents[0]?.count), approvals: pending.map((a) => ({ approval_id: a.approvalId, kind: a.kind, app_id: a.appId, question: a.question, options: a.options, section: a.section, current_text: a.currentText, proposed_text: a.proposedText, proposal_path: a.proposalPath, run_id: a.runId, created_at: a.createdAt.toISOString() })) } };
      }
      const query = (args.query ?? "").trim().toLowerCase();
      const route = query.match(/resume|variant/) ? "resumes" : query.match(/reply|thread|message/) ? "replies" : query.match(/token|cost/) ? "tokens" : query.match(/block|stuck/) ? "blockers" : query.match(/schedule|cron|cadence/) ? "schedules" : query.match(/health|doctor|drift|stale|disk/) ? "health" : query.match(/run|campaign/) ? "runs" : query.match(/application|applied|submit|reject|park/) ? "applications" : "unknown";
      let answer = "I couldn’t map that question to a ledger. Try applications, resumes, replies, runs, tokens, blockers, schedules, or health."; let sources: string[] = [];
      if (route === "applications") { const c = await appCounts(); answer = `${c.total.toLocaleString()} applications are recorded; ${countNumber(c.by_state.submitted).toLocaleString()} are submitted and ${countNumber(c.by_state.blocked).toLocaleString()} are blocked.`; sources = ["applications"]; }
      else if (route === "resumes") { const rows = await db.select({ count: sql<number>`count(*)` }).from(schema.resumeVariants); answer = `${countNumber(rows[0]?.count).toLocaleString()} resume variants are available.`; sources = ["resume_variants", "applications.variant_id"]; }
      else if (route === "replies") { const rows = await db.select({ action: schema.replies.action, count: sql<number>`count(*)` }).from(schema.replies).groupBy(schema.replies.action); answer = rows.length ? rows.map((r) => `${r.action}: ${countNumber(r.count).toLocaleString()}`).join(" · ") : "The replies ledger is available but empty."; sources = ["replies"]; }
      else if (route === "runs") { const rows = await db.select({ status: schema.runs.status, count: sql<number>`count(*)` }).from(schema.runs).groupBy(schema.runs.status); answer = rows.length ? rows.map((r) => `${r.status}: ${countNumber(r.count).toLocaleString()}`).join(" · ") : "The runs ledger is available but empty."; sources = ["runs"]; }
      else if (route === "tokens") { const rows = await db.select({ total: sql<number>`coalesce(sum(${schema.tokenUsage.totalTokens}),0)` }).from(schema.tokenUsage); answer = `${countNumber(rows[0]?.total).toLocaleString()} total tokens are recorded.`; sources = ["token_usage"]; }
      else if (route === "blockers") { const apps = await db.select({ count: sql<number>`count(*)` }).from(schema.applications).where(or(eq(schema.applications.state, "blocked"), sql`${schema.applications.blocker} IS NOT NULL`)); const runs = await db.select({ count: sql<number>`count(*)` }).from(schema.runs).where(sql`${schema.runs.blocker} IS NOT NULL`); answer = `${countNumber(apps[0]?.count).toLocaleString()} application blockers and ${countNumber(runs[0]?.count).toLocaleString()} run blockers are recorded.`; sources = ["applications", "runs"]; }
      else if (route === "schedules") { const rows = await db.select().from(schema.campaigns); answer = rows.length ? rows.map((r) => `${r.campaignId}: ${r.cadence}`).join(" · ") : "The campaigns schedule ledger is available but empty."; sources = ["campaigns"]; }
      else if (route === "health") { const aged = await db.select({ count: sql<number>`count(*)` }).from(schema.approvals).where(and(isNull(schema.approvals.resolvedAt), lt(schema.approvals.createdAt, cutoff24))); const parkedRows = await db.select({ count: sql<number>`count(*)` }).from(schema.companies).where(gte(schema.companies.parkCount, 3)); let diskNote = "disk telemetry unavailable"; try { const usage = await ctx.executePrivileged(privileged.hiddenFilesDiskUsage, { prune_candidates: 1 }); diskNote = `hidden_files uses ${(usage.bytes_total / 1073741824).toFixed(2)} GB across ${usage.folder_count} campaign folders`; } catch { /* keep the explicit unavailable note */ } answer = `${countNumber(aged[0]?.count).toLocaleString()} approvals have been waiting more than 24 hours. ${countNumber(parkedRows[0]?.count)} companies have park_count >= 3. ${diskNote}.`; sources = ["approvals", "companies", "hidden_files"]; }
      return { view: args.view, generated_at: generatedAt.toISOString(), data: { route, answer, sources } };
    },
  }),

  conversation_upsert: defineAction({
    request: z.object({ thread_id: z.string(), channel: z.string(), contact_id: z.string().nullable().optional(), app_id: z.string().nullable().optional(), classification: z.string().nullable().optional(), state: z.string(), watermark: z.string().nullable().optional() }), response: okResponse,
    async handler(ctx, args) { const db = ctx.db<typeof schema>(); const updatedAt = now(); await db.insert(schema.conversations).values({ threadId: args.thread_id, channel: args.channel, contactId: args.contact_id ?? null, appId: args.app_id ?? null, classification: args.classification ?? null, state: args.state, watermark: args.watermark ?? null, updatedAt }).onConflictDoUpdate({ target: schema.conversations.threadId, set: { channel: args.channel, contactId: args.contact_id ?? null, appId: args.app_id ?? null, classification: args.classification ?? null, state: args.state, watermark: args.watermark ?? null, updatedAt } }); ctx.invalidateQueries(); return { ok: true }; },
  }),

  reply_log: defineAction({
    request: z.object({ reply_id: z.string().optional(), thread_id: z.string(), direction: z.string(), action: z.enum(["sent", "held", "auto_sent", "skipped"]), rule_id: z.string().nullable().optional(), draft_path: z.string().nullable().optional(), reason: z.string().nullable().optional(), run_id: z.string().nullable().optional(), approval_id: z.string().nullable().optional(), attachment_name: z.string().nullable().optional() }), response: z.object({ ok: z.boolean(), reply_id: z.string().optional(), message: z.string().optional() }),
    async handler(ctx, args) { const db = ctx.db<typeof schema>(); const thread = (await db.select().from(schema.conversations).where(eq(schema.conversations.threadId, args.thread_id)).limit(1))[0]; if (!thread) return { ok: false, message: "Conversation not found." }; if (thread.channel.toLowerCase() === "linkedin" && (args.attachment_name ?? "").toLowerCase().endsWith(".pdf")) return { ok: false, message: "PDF attachments are not permitted on LinkedIn replies." }; const replyId = args.reply_id ?? id("reply"); await db.insert(schema.replies).values({ replyId, threadId: args.thread_id, direction: args.direction, action: args.action, ruleId: args.rule_id ?? null, draftPath: args.draft_path ?? null, reason: args.reason ?? null, runId: args.run_id ?? null, approvalId: args.approval_id ?? null, attachmentName: args.attachment_name ?? null }); ctx.invalidateQueries(); return { ok: true, reply_id: replyId }; },
  }),

  // Read the current draft text of a held reply (what the customer approved or will edit).
  held_reply_draft: defineAction({
    request: z.object({ reply_id: z.string().min(1) }),
    response: z.object({ ok: z.boolean(), draft_text: z.string().optional(), draft_path: z.string().nullable().optional(), message: z.string().optional() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const reply = (await db.select().from(schema.replies).where(eq(schema.replies.replyId, args.reply_id)).limit(1))[0];
      if (!reply) return { ok: false, message: "Reply not found." };
      if (reply.action !== "held") return { ok: false, message: "Only held replies have drafts." };
      if (!reply.draftPath) return { ok: false, message: "No draft file is attached to this held reply." };
      const draft = await ctx.executePrivileged(privileged.readHeldDraft, { draft_path: reply.draftPath });
      if (!draft.found || draft.text === undefined) return { ok: false, message: "No draft file is attached to this held reply." };
      return { ok: true, draft_text: draft.text, draft_path: reply.draftPath };
    },
  }),

  // Record the dashboard decision on a held reply. Approve → the scheduled replier
  // sends the (possibly edited) draft on its next scan, exactly once. Discard →
  // the replier never sends it. The dashboard never sends mail itself.
  held_reply_resolve: defineAction({
    request: z.object({ reply_id: z.string().min(1), decision: z.enum(["approved", "discarded"]), edited_text: z.string().min(1).max(200000).optional() }),
    response: z.object({ ok: z.boolean(), message: z.string().optional() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const reply = (await db.select().from(schema.replies).where(eq(schema.replies.replyId, args.reply_id)).limit(1))[0];
      if (!reply) return { ok: false, message: "Reply not found." };
      if (reply.action !== "held") return { ok: false, message: "Only held replies can be resolved." };
      if (reply.heldResolution) return { ok: false, message: `This held reply was already ${reply.heldResolution}.` };
      let draftPath = reply.draftPath;
      if (args.edited_text !== undefined) {
        if (!reply.draftPath) return { ok: false, message: "The held reply has no draft file to edit." };
        const saved = await ctx.executePrivileged(privileged.writeHeldDraft, { draft_path: reply.draftPath, text: args.edited_text });
        if (!saved.ok || !saved.draft_path) return { ok: false, message: saved.message ?? "The held reply's draft path is invalid." };
        draftPath = saved.draft_path;
      }
      const resolvedAt = now();
      await db.batch([
        db.update(schema.replies).set({ heldResolution: args.decision, heldResolvedAt: resolvedAt, draftPath }).where(eq(schema.replies.replyId, reply.replyId)),
        db.insert(schema.events).values({ runId: reply.runId, appId: null, type: "held_reply_resolved", payload: { reply_id: reply.replyId, decision: args.decision, edited: args.edited_text !== undefined }, at: resolvedAt }),
      ]);
      ctx.invalidateQueries(); return { ok: true };
    },
  }),

  spillover_replay: defineAction({
    request: z.object({ run_id: z.string() }), response: z.object({ replayed: z.boolean(), count: z.number() }),
    async handler(ctx, args) { const db = ctx.db<typeof schema>(); const prior = (await db.select({ id: schema.events.id }).from(schema.events).where(and(eq(schema.events.runId, args.run_id), eq(schema.events.type, "spillover_replayed"))).limit(1))[0]; if (prior) return { replayed: false, count: 0 }; const parked = await db.select().from(schema.applications).where(and(eq(schema.applications.runId, args.run_id), inArray(schema.applications.state, ["parked", "blocked"]))); await db.insert(schema.events).values({ runId: args.run_id, type: "spillover_replayed", payload: { app_ids: parked.map((a) => a.appId), count: parked.length } }); ctx.invalidateQueries(); return { replayed: true, count: parked.length }; },
  }),

  file_open: defineAction({
    request: z.union([
      z.object({ app_id: z.string().min(1), kind: z.enum(["resume", "screenshot", "confirmation", "prep"]) }),
      z.object({ variant_id: z.string().min(1) }),
    ]),
    response: z.object({ filename: z.string(), file_url: z.string(), content_type: z.enum(["application/pdf", "image/png", "text/plain"]), preview_pages: z.array(z.object({ page: z.number().int().positive(), file_url: z.string() })), preview_truncated: z.boolean() }),
    privileged: [privileged.readApplicationEvidence, privileged.readRegisteredResume, privileged.readTrashedResume, privileged.renderPdfPreview],
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      if ("variant_id" in args) {
        const row = (await db.select({ path: schema.resumeVariants.path }).from(schema.resumeVariants).where(eq(schema.resumeVariants.variantId, args.variant_id)).limit(1))[0];
        const location = row ? registeredResumeLocation(row.path) : null; const filename = row ? pathFilename(row.path) : "";
        if (!row || !location || !filename) throw new Error("The requested resume is not available from a registered location.");
        const result = await ctx.executePrivileged(privileged.readRegisteredResume, { filename, location });
        return publishFileWithPreview(ctx, result);
      }
      const row = (await db.select({ appId: schema.applications.appId, campaignId: schema.applications.campaignId, runId: schema.applications.runId, variantId: schema.applications.variantId, resumePath: schema.applications.resumePath, resumeHash: schema.applications.resumeHash, screenshotPath: schema.applications.screenshotPath, confirmationPath: schema.applications.confirmationPath, talkingPointsPath: schema.applications.talkingPointsPath }).from(schema.applications).where(eq(schema.applications.appId, args.app_id)).limit(1))[0];
      const path = row ? args.kind === "resume" ? row.resumePath : args.kind === "screenshot" ? row.screenshotPath : args.kind === "prep" ? row.talkingPointsPath : row.confirmationPath : null;
      if (!row || !path) throw new Error("The requested file is not attached to this application.");
      if (args.kind === "resume") {
        const location = registeredResumeLocation(path); const filename = pathFilename(path);
        if (location) {
          const registered = row.variantId ? (await db.select({ path: schema.resumeVariants.path }).from(schema.resumeVariants).where(and(eq(schema.resumeVariants.variantId, row.variantId), eq(schema.resumeVariants.path, path))).limit(1))[0] : null;
          if (registered) return publishFileWithPreview(ctx, await ctx.executePrivileged(privileged.readRegisteredResume, { filename, location }));
          if (!row.variantId) throw new Error("The application resume has no recorded variant id.");
          const trashed = await ctx.executePrivileged(privileged.readTrashedResume, { variant_id: row.variantId, filename, sha256: row.resumeHash });
          if (!trashed.found || !trashed.filename || !trashed.bytesBase64 || !trashed.contentType) throw new Error(`Removed resume variant '${row.variantId}' is no longer available in recoverable trash.`);
          return publishFileWithPreview(ctx, { filename: trashed.filename, bytesBase64: trashed.bytesBase64, contentType: trashed.contentType });
        }
      }
      if (!row.runId) throw new Error("The application has no run-bound evidence directory.");
      const result = await ctx.executePrivileged(privileged.readApplicationEvidence, { appId: row.appId, campaignId: row.campaignId, runId: row.runId, kind: args.kind, filename: pathFilename(path) });
      return publishFileWithPreview(ctx, result);
    },
  }),

  get_resume: defineAction({
    request: z.object({ filename: z.string().min(1) }), response: z.object({ filename: z.string(), bytes_base64: z.string(), content_type: z.literal("application/pdf") }), privileged: [privileged.readApplicationEvidence, privileged.readRegisteredResume],
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const registered = (await db.select({ path: schema.resumeVariants.path }).from(schema.resumeVariants).where(eq(schema.resumeVariants.path, args.filename)).limit(1))[0];
      if (registered) {
        const location = registeredResumeLocation(registered.path); const filename = pathFilename(registered.path);
        if (!location || !filename) throw new Error("The registered PDF location is unavailable.");
        const result = await ctx.executePrivileged(privileged.readRegisteredResume, { filename, location });
        return { filename: result.filename, bytes_base64: result.bytesBase64, content_type: result.contentType };
      }
      const attached = (await db.select({ appId: schema.applications.appId, campaignId: schema.applications.campaignId, runId: schema.applications.runId, path: schema.applications.resumePath }).from(schema.applications).where(eq(schema.applications.resumePath, args.filename)).limit(1))[0];
      if (!attached?.path || !attached.runId) throw new Error("The requested PDF is not registered or attached to an application.");
      const result = await ctx.executePrivileged(privileged.readApplicationEvidence, { appId: attached.appId, campaignId: attached.campaignId, runId: attached.runId, kind: "resume", filename: pathFilename(attached.path) });
      if (result.contentType !== "application/pdf") throw new Error("The attached resume is not a PDF.");
      return { filename: result.filename, bytes_base64: result.bytesBase64, content_type: result.contentType };
    },
  }),

  // Seed CSVs are too large for action args; callers may pass csv_url (a fetchable
  // URL) instead of pasting the CSV. Exactly one of csv / csv_url is required.
  // Synchronous imports are capped at 5,000 rows: larger files must use the
  // resumable dataset_import_start / dataset_import_chunk path below, because
  // an 80K-row single-action import exceeds the 120s action limit and wedges
  // the worker.
  h1b_import: defineAction({
    request: z.object({ csv: z.string().min(1).optional(), csv_url: z.string().url().optional() }).refine((v) => v.csv || v.csv_url, { message: "Provide csv or csv_url." }),
    response: z.object({ imported: z.number(), skipped: z.number() }),
    async handler(ctx, args) { const records = recordsFromCsv(await csvTextFromArgs(args)); if (records.length > IMPORT_SYNC_ROW_LIMIT) throw new Error(`CSV has ${records.length.toLocaleString()} rows — over the ${IMPORT_SYNC_ROW_LIMIT.toLocaleString()}-row synchronous limit. Use dataset_import_start + dataset_import_chunk for a resumable chunked import.`); const { rows, skipped } = mapImportRecords("h1b", records); await upsertImportRows(ctx, "h1b", rows); if (rows.length) ctx.invalidateQueries(); return { imported: rows.length, skipped }; },
  }),

  companies_import: defineAction({
    request: z.object({ csv: z.string().min(1).optional(), csv_url: z.string().url().optional() }).refine((v) => v.csv || v.csv_url, { message: "Provide csv or csv_url." }),
    response: z.object({ imported: z.number(), skipped: z.number() }),
    async handler(ctx, args) { const records = recordsFromCsv(await csvTextFromArgs(args)); if (records.length > IMPORT_SYNC_ROW_LIMIT) throw new Error(`CSV has ${records.length.toLocaleString()} rows — over the ${IMPORT_SYNC_ROW_LIMIT.toLocaleString()}-row synchronous limit. Use dataset_import_start + dataset_import_chunk for a resumable chunked import.`); const { rows, skipped } = mapImportRecords("companies", records); await upsertImportRows(ctx, "companies", rows); if (rows.length) ctx.invalidateQueries(); return { imported: rows.length, skipped }; },
  }),

  prime_vendors_import: defineAction({
    request: z.object({ csv: z.string().min(1).optional(), csv_url: z.string().url().optional() }).refine((v) => v.csv || v.csv_url, { message: "Provide csv or csv_url." }),
    response: z.object({ imported: z.number(), skipped: z.number() }),
    async handler(ctx, args) { const records = recordsFromCsv(await csvTextFromArgs(args)); if (records.length > IMPORT_SYNC_ROW_LIMIT) throw new Error(`CSV has ${records.length.toLocaleString()} rows — over the ${IMPORT_SYNC_ROW_LIMIT.toLocaleString()}-row synchronous limit. Use dataset_import_start + dataset_import_chunk for a resumable chunked import.`); const { rows, skipped } = mapImportRecords("vendors", records); await upsertImportRows(ctx, "vendors", rows); if (rows.length) ctx.invalidateQueries(); return { imported: rows.length, skipped }; },
  }),

  // Resumable chunked dataset imports: stage the CSV once (host-side, outside
  // action-arg limits), then process it in bounded chunks. A chunk call upserts
  // at most IMPORT_CHUNK_ROWS rows in 500-row batches — always well under the
  // 120s action limit. The job row persists cursor/progress, so a failed or
  // timed-out chunk is simply retried; chunks are idempotent (upsert by norm
  // key) and the worker drives start -> chunk* -> done in a loop.
  dataset_import_start: defineAction({
    request: z.object({ dataset: z.enum(["h1b", "companies", "vendors"]), csv: z.string().min(1).max(20 * 1024 * 1024).optional(), csv_url: z.string().url().optional() }).refine((v) => v.csv || v.csv_url, { message: "Provide csv or csv_url." }),
    response: z.object({ job_id: z.string(), dataset: z.string(), total_rows: z.number(), status: z.string(), source_sha256: z.string().nullable() }),
    privileged: [privileged.stageImportCsv, privileged.deleteImportStaging],
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>(); const jobId = newImportJobId(); const started = now();
      await db.insert(schema.datasetImportJobs).values({ jobId, dataset: args.dataset, status: "running", createdAt: started, updatedAt: started });
      try {
        const staged = await ctx.executePrivileged(privileged.stageImportCsv, { job_id: jobId, csv: args.csv, csv_url: args.csv_url });
        await db.update(schema.datasetImportJobs).set({ totalRows: staged.total_rows, sourceUrl: args.csv_url ?? null, sourceSha256: staged.source_sha256, updatedAt: now() }).where(eq(schema.datasetImportJobs.jobId, jobId));
        return { job_id: jobId, dataset: args.dataset, total_rows: staged.total_rows, status: "running", source_sha256: staged.source_sha256 };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await db.update(schema.datasetImportJobs).set({ status: "failed", error: message.slice(0, 500), updatedAt: now() }).where(eq(schema.datasetImportJobs.jobId, jobId));
        try { await ctx.executePrivileged(privileged.deleteImportStaging, { job_id: jobId }); } catch { /* staging may not exist */ }
        throw err;
      }
    },
  }),

  dataset_import_chunk: defineAction({
    request: z.object({ job_id: z.string().min(1), limit: z.number().int().min(1).max(10000).optional() }),
    response: z.object({ job_id: z.string(), dataset: z.string(), status: z.string(), processed: z.number(), total_rows: z.number(), imported: z.number(), skipped: z.number(), done: z.boolean(), error: z.string().nullable().optional() }),
    privileged: [privileged.readImportCsvChunk, privileged.deleteImportStaging],
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const job = (await db.select().from(schema.datasetImportJobs).where(eq(schema.datasetImportJobs.jobId, args.job_id)).limit(1))[0];
      if (!job) throw new Error(`Import job '${args.job_id}' was not found.`);
      const terminal = job.status !== "running";
      const statusPayload = { job_id: job.jobId, dataset: job.dataset, status: job.status, processed: job.processed, total_rows: job.totalRows, imported: job.imported, skipped: job.skipped, done: job.status === "done", error: job.error ?? null };
      if (terminal) return statusPayload;
      const limit = args.limit ?? IMPORT_CHUNK_ROWS;
      try {
        const chunk = await ctx.executePrivileged(privileged.readImportCsvChunk, { job_id: job.jobId, offset: job.cursor, limit });
        const { rows, skipped } = mapImportRecords(job.dataset as ImportDataset, chunk.rows);
        await upsertImportRows(ctx, job.dataset as ImportDataset, rows);
        const nextCursor = chunk.next_offset; const done = nextCursor >= chunk.total_rows;
        const processed = job.processed + chunk.rows.length; const imported = job.imported + rows.length; const totalSkipped = job.skipped + skipped;
        await db.update(schema.datasetImportJobs).set({ cursor: nextCursor, processed, imported, skipped: totalSkipped, status: done ? "done" : "running", updatedAt: now() }).where(eq(schema.datasetImportJobs.jobId, job.jobId));
        if (done) {
          try { await ctx.executePrivileged(privileged.deleteImportStaging, { job_id: job.jobId }); } catch { /* best-effort cleanup */ }
          ctx.invalidateQueries();
        }
        return { job_id: job.jobId, dataset: job.dataset, status: done ? "done" : "running", processed, total_rows: chunk.total_rows, imported, skipped: totalSkipped, done, error: null };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await db.update(schema.datasetImportJobs).set({ status: "failed", error: message.slice(0, 500), updatedAt: now() }).where(eq(schema.datasetImportJobs.jobId, job.jobId));
        throw err;
      }
    },
  }),

  dataset_import_status: defineAction({
    request: z.object({ job_id: z.string().min(1) }),
    response: z.object({ job_id: z.string(), dataset: z.string(), status: z.string(), processed: z.number(), total_rows: z.number(), imported: z.number(), skipped: z.number(), done: z.boolean(), error: z.string().nullable().optional(), source_url: z.string().nullable().optional(), source_sha256: z.string().nullable().optional(), updated_at: z.string() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const job = (await db.select().from(schema.datasetImportJobs).where(eq(schema.datasetImportJobs.jobId, args.job_id)).limit(1))[0];
      if (!job) throw new Error(`Import job '${args.job_id}' was not found.`);
      return { job_id: job.jobId, dataset: job.dataset, status: job.status, processed: job.processed, total_rows: job.totalRows, imported: job.imported, skipped: job.skipped, done: job.status === "done", error: job.error ?? null, source_url: job.sourceUrl ?? null, source_sha256: job.sourceSha256 ?? null, updated_at: job.updatedAt.toISOString() };
    },
  }),

  // Retry a failed import job: the cursor never advances past a failed chunk
  // (cursor + counters move in one UPDATE only after a successful upsert) and
  // chunk upserts are idempotent by norm key, so resuming re-processes the
  // failed chunk safely. Staging is kept on chunk failure precisely so retry
  // has something to resume from; cancel/delete removes it.
  dataset_import_retry: defineAction({
    request: z.object({ job_id: z.string().min(1) }),
    response: z.object({ job_id: z.string(), dataset: z.string(), status: z.string(), cursor: z.number(), processed: z.number(), total_rows: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const job = (await db.select().from(schema.datasetImportJobs).where(eq(schema.datasetImportJobs.jobId, args.job_id)).limit(1))[0];
      if (!job) throw new Error(`Import job '${args.job_id}' was not found.`);
      if (job.status !== "failed") throw new Error(`Import job '${args.job_id}' is '${job.status}' — only failed jobs can be retried.`);
      await db.update(schema.datasetImportJobs).set({ status: "running", error: null, updatedAt: now() }).where(eq(schema.datasetImportJobs.jobId, job.jobId));
      return { job_id: job.jobId, dataset: job.dataset, status: "running", cursor: job.cursor, processed: job.processed, total_rows: job.totalRows };
    },
  }),

  dataset_import_cancel: defineAction({
    request: z.object({ job_id: z.string().min(1) }),
    response: z.object({ job_id: z.string(), status: z.string() }),
    privileged: [privileged.deleteImportStaging],
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const job = (await db.select().from(schema.datasetImportJobs).where(eq(schema.datasetImportJobs.jobId, args.job_id)).limit(1))[0];
      if (!job) throw new Error(`Import job '${args.job_id}' was not found.`);
      if (job.status === "running" || job.status === "failed") {
        try { await ctx.executePrivileged(privileged.deleteImportStaging, { job_id: job.jobId }); } catch { /* best-effort */ }
        await db.update(schema.datasetImportJobs).set({ status: "cancelled", updatedAt: now() }).where(eq(schema.datasetImportJobs.jobId, job.jobId));
      }
      return { job_id: job.jobId, status: (job.status === "running" || job.status === "failed") ? "cancelled" : job.status };
    },
  }),

  // Fast server-side browsing for the Datasets page: the dashboard never dumps
  // thousands of rows into the DOM. One dataset per call, 100 rows per page.
  // Ad-hoc schedule triggers: "Trigger now" on a Schedules row queues a pending
  // row here (works on disabled schedules too — it never re-enables them).
  // The schedule-trigger-dispatch cron picks pending rows up within ~2 minutes
  // and fires the campaign; already_running guards queue-time duplicates.
  schedule_trigger: defineAction({
    request: z.object({ job_id: z.string().min(1) }),
    response: scheduleTriggerResponse,
    privileged: [privileged.readSchedulesManifest],
    async handler(ctx, args): Promise<z.infer<typeof scheduleTriggerResponse>> {
      const jobId = args.job_id.trim();
      let parsed: z.infer<typeof schedulesManifestSchema> | null = null;
      try {
        const result = await ctx.executePrivileged(privileged.readSchedulesManifest, {});
        if (!result.manifestText) return { ok: false, reason: "manifest_missing" };
        const checked = schedulesManifestSchema.safeParse(JSON.parse(result.manifestText));
        parsed = checked.success ? checked.data : null;
      } catch {
        return { ok: false, reason: "manifest_unparseable" };
      }
      if (!parsed) return { ok: false, reason: "manifest_unparseable" };
      const job = parsed.jobs.find((entry) => entry.job_id === jobId);
      if (!job) return { ok: false, reason: "unknown_job_id" };

      const db = ctx.db<typeof schema>();
      const activeRun = (await db.select({ runId: schema.runs.runId }).from(schema.runs)
        .where(and(eq(schema.runs.campaignId, job.campaign), isNull(schema.runs.ended))).limit(1))[0];
      if (activeRun) return { ok: false, reason: "already_running" };

      const inserted = await db.insert(schema.scheduleTriggers).values({
        jobId, campaign: job.campaign, status: "pending", createdAt: now(),
      }).returning({ id: schema.scheduleTriggers.id });
      const triggerId = inserted[0]?.id;
      if (triggerId === undefined) return { ok: false, reason: "queue_failed" };
      ctx.invalidateQueries();
      return { ok: true, trigger_id: triggerId };
    },
  }),

  schedule_trigger_pending: defineAction({
    request: emptyRequest,
    response: z.object({ rows: z.array(scheduleTriggerRowSchema) }),
    async handler(ctx) {
      const rows = await ctx.db<typeof schema>().select().from(schema.scheduleTriggers)
        .where(eq(schema.scheduleTriggers.status, "pending")).orderBy(asc(schema.scheduleTriggers.id));
      return {
        rows: rows.map((row) => ({
          id: row.id, job_id: row.jobId, campaign: row.campaign, status: row.status,
          created_at: iso(row.createdAt), handled_at: iso(row.handledAt), error: row.error,
        })),
      };
    },
  }),

  schedule_trigger_mark: defineAction({
    request: z.object({ id: z.number().int().positive(), status: z.enum(["dispatched", "failed"]), error: z.string().nullable().optional() }),
    response: scheduleTriggerMarkResponse,
    async handler(ctx, args): Promise<z.infer<typeof scheduleTriggerMarkResponse>> {
      const updated = await ctx.db<typeof schema>().update(schema.scheduleTriggers).set({
        status: args.status, handledAt: now(), error: args.error ?? null,
      }).where(eq(schema.scheduleTriggers.id, args.id)).returning({ id: schema.scheduleTriggers.id });
      if (!updated[0]) return { ok: false, reason: "not_found" };
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  dataset_browse: defineAction({
    request: z.object({
      dataset: z.enum(["companies", "h1b_sponsors", "prime_vendors"]),
      search: z.string().optional(), tier: z.string().optional(), min_lca: z.number().int().min(0).optional(),
      page: z.number().int().min(1).default(1), page_size: z.number().int().min(1).max(500).default(100),
    }),
    response: z.object({ dataset: z.string(), page: z.number(), page_size: z.number(), total: z.number(), rows: z.array(z.unknown()) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>(); const q = (args.search ?? "").trim().toLowerCase();
      const like = (col: SQLWrapper) => sql<boolean>`${col} LIKE ${`%${q.replace(/[%_]/g, "")}%`}`;
      const offset = (args.page - 1) * args.page_size;
      if (args.dataset === "companies") {
        const conds: SQLWrapper[] = [];
        if (q) { const searchCond = or(like(schema.companies.companyNorm), like(schema.companies.industry)); if (searchCond) conds.push(searchCond); }
        if (args.tier) conds.push(eq(schema.companies.tier, Number(args.tier)));
        const where = conds.length ? and(...conds) : undefined;
        const total = (await db.select({ n: sql<number>`count(*)` }).from(schema.companies).where(where))[0]?.n ?? 0;
        const rows = await db.select().from(schema.companies).where(where).orderBy(schema.companies.companyNorm).limit(args.page_size).offset(offset);
        return { dataset: args.dataset, page: args.page, page_size: args.page_size, total, rows: rows.map((c) => ({ company_norm: c.companyNorm, tier: c.tier, industry: c.industry, hq_state: c.hqState, careers_url: c.careersUrl, ats_type: c.atsType, park_count: c.parkCount, skip_flag: c.skipFlag, skip_reason: c.skipReason })) };
      }
      if (args.dataset === "h1b_sponsors") {
        const conds: SQLWrapper[] = []; if (q) conds.push(like(schema.h1bSponsors.companyNorm)); if (args.min_lca !== undefined) conds.push(gte(schema.h1bSponsors.lcaCount, args.min_lca));
        const where = conds.length ? and(...conds) : undefined;
        const total = (await db.select({ n: sql<number>`count(*)` }).from(schema.h1bSponsors).where(where))[0]?.n ?? 0;
        const rows = await db.select().from(schema.h1bSponsors).where(where).orderBy(desc(schema.h1bSponsors.lcaCount)).limit(args.page_size).offset(offset);
        return { dataset: args.dataset, page: args.page, page_size: args.page_size, total, rows: rows.map((h) => ({ company_norm: h.companyNorm, lca_count: h.lcaCount, stats_by_year: h.statsByYear, last_refreshed: iso(h.lastRefreshed) })) };
      }
      // prime_vendors: stored tiers look like "Tier 1" — normalize both sides before comparing.
      const tierNorm = (t: string | null) => (t ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
      // The dashboard sends bare "1"/"2"/"3"; stored values normalize to "tier1"/etc.
      const wantTier = args.tier ? tierNorm(/^\d+$/.test(args.tier.trim()) ? `tier${args.tier.trim()}` : args.tier) : "";
      const conds: SQLWrapper[] = [];
      if (q) conds.push(sql<boolean>`(${like(schema.primeVendors.vendorNorm)} OR ${like(schema.primeVendors.vendorName)} OR ${like(schema.primeVendors.category)} OR ${like(schema.primeVendors.tier)} OR ${like(schema.primeVendors.specialties)} OR ${like(schema.primeVendors.engagementTypes)})`);
      const where = conds.length ? and(...conds) : undefined;
      const all = await db.select().from(schema.primeVendors).where(where).orderBy(schema.primeVendors.vendorName);
      const filtered = wantTier ? all.filter((v) => tierNorm(v.tier) === wantTier) : all;
      const rows = filtered.slice(offset, offset + args.page_size);
      return {
        dataset: args.dataset, page: args.page, page_size: args.page_size, total: filtered.length,
        rows: rows.map((v) => ({
          vendor_name: v.vendorName, vendor_norm: v.vendorNorm, portal_url: v.portalUrl, tier: v.tier,
          category: v.category, specialties: v.specialties, engagement_types: v.engagementTypes,
          // A vendor's own sponsorship claim — surfaced as an unverified note, never evidence.
          h1b_note_unverified: v.h1bNote, last_refreshed: iso(v.lastRefreshed),
        })),
      };
    },
  }),

  token_record: defineAction({
    request: z.object({ run_id: z.string(), campaign_id: z.string(), date: z.string(), input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative(), total_tokens: z.number().int().nonnegative(), stages: jsonValue, usage_reported: z.boolean().optional().default(true) }), response: okResponse,
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      await db.batch([
        db.insert(schema.tokenUsage).values({ runId: args.run_id, campaignId: args.campaign_id, date: args.date, inputTokens: args.input_tokens, outputTokens: args.output_tokens, totalTokens: args.total_tokens, stages: args.stages }).onConflictDoUpdate({ target: schema.tokenUsage.runId, set: { campaignId: args.campaign_id, date: args.date, inputTokens: args.input_tokens, outputTokens: args.output_tokens, totalTokens: args.total_tokens, stages: args.stages } }),
        db.update(schema.runs).set({ tokens: args.stages, tokensInput: args.input_tokens, tokensOutput: args.output_tokens, tokensTotal: args.total_tokens, tokensReported: args.usage_reported }).where(eq(schema.runs.runId, args.run_id)),
      ]);
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  // LinkedIn optimizer (v1.2.6): dashboard-triggered manual run. Creates the
  // run row (mode='manual') and logs the start event; the operator's agent
  // then runs the linkedin-optimizer skill's audit → propose phases against
  // the returned run_id. Refuses to stack a second run while one is active —
  // two workers must never edit the same live profile at once.
  linkedin_optimize_start: defineAction({
    request: emptyRequest,
    response: linkedinStartResponse,
    async handler(ctx): Promise<z.infer<typeof linkedinStartResponse>> {
      const db = ctx.db<typeof schema>();
      const profileRow = (await db.select().from(schema.profile).where(eq(schema.profile.id, 1)).limit(1))[0];
      const profileUrl = linkedinProfileUrl(profileRow);
      if (!profileUrl) return { ok: false, message: "Add a valid HTTPS LinkedIn URL in Profile before starting an optimization run." };
      const runId = id("run_linkedin_optimize");
      await db.batch([
        db.insert(schema.runs).values({ runId, campaignId: "linkedin_optimize", mode: "manual", started: now(), status: "running", counts: {}, tokens: {}, compiledConfig: { phases: ["audit", "propose", "awaiting_approvals", "apply", "done"], sections: linkedinSections }, liveConfig: { profile_url: profileUrl } }),
        db.insert(schema.events).values({ runId, type: "awaiting_main_agent", payload: { phase: "audit", sections: linkedinSections }, at: now() }),
      ]);
      ctx.invalidateQueries();
      return { ok: true, run_id: runId, task_id: null, message: "LinkedIn optimize run created. The main agent will pick it up automatically via the browser route." };
    },
  }),

  linkedin_optimize_proposal_complete: defineAction({
    request: z.object({ run_id: z.string().min(1), verdict: z.enum(["pass", "reject", "hold"]), reason: z.string().nullable().optional() }),
    response: linkedinProposalCompleteResponse,
    async handler(ctx, args): Promise<z.infer<typeof linkedinProposalCompleteResponse>> {
      const db = ctx.db<typeof schema>();
      const run = (await db.select().from(schema.runs).where(eq(schema.runs.runId, args.run_id)).limit(1))[0];
      if (!run || run.campaignId !== "linkedin_optimize") return { ok: false, message: "LinkedIn optimizer run not found." };
      if (args.verdict !== "pass") {
        const blocker = args.reason?.trim() || (args.verdict === "hold" ? "The live LinkedIn profile could not be read." : "The LinkedIn identity or proposal gate failed.");
        await db.batch([
          db.update(schema.runs).set({ status: args.verdict === "hold" ? "blocked" : "failed", ended: now(), needsMe: args.verdict === "hold", blocker }).where(eq(schema.runs.runId, args.run_id)),
          db.insert(schema.events).values({ runId: args.run_id, type: args.verdict === "hold" ? "blocked" : "failed", payload: { phase: "propose", verdict: args.verdict, reason: blocker }, at: now() }),
        ]);
        ctx.invalidateQueries();
        return { ok: true, message: blocker };
      }
      const sectionRows = await db.select().from(schema.approvals).where(and(eq(schema.approvals.runId, args.run_id), eq(schema.approvals.kind, "linkedin_section"), isNull(schema.approvals.resolvedAt)));
      const present = new Set(sectionRows.map((row) => row.section).filter((value): value is string => typeof value === "string"));
      const missing = linkedinSections.filter((section) => !present.has(section));
      const duplicateSections = linkedinSections.filter((section) => sectionRows.filter((row) => row.section === section).length !== 1);
      if (missing.length > 0 || sectionRows.length !== linkedinSections.length || duplicateSections.length > 0) {
        const detail = missing.length > 0 ? `missing: ${missing.join(", ")}` : duplicateSections.length > 0 ? `duplicates: ${duplicateSections.join(", ")}` : `received ${sectionRows.length} cards`;
        const blocker = `Proposal did not produce exactly one approval card per LinkedIn section (${detail}).`;
        await db.batch([
          db.update(schema.runs).set({ status: "blocked", needsMe: true, blocker }).where(eq(schema.runs.runId, args.run_id)),
          db.insert(schema.events).values({ runId: args.run_id, type: "blocked", payload: { phase: "propose", reason: blocker }, at: now() }),
        ]);
        ctx.invalidateQueries();
        return { ok: false, message: blocker };
      }
      await db.batch([
        db.update(schema.runs).set({ status: "awaiting_approvals", needsMe: true, blocker: null }).where(eq(schema.runs.runId, args.run_id)),
        db.insert(schema.events).values({ runId: args.run_id, type: "propose", payload: { phase: "propose", verdict: "pass", sections: sectionRows.map((row) => row.section) }, at: now() }),
        db.insert(schema.events).values({ runId: args.run_id, type: "awaiting_approvals", payload: { phase: "awaiting_approvals", count: sectionRows.length }, at: now() }),
      ]);
      ctx.invalidateQueries();
      return { ok: true, message: "Five LinkedIn section proposals are ready for review." };
    },
  }),

  linkedin_optimize_apply_complete: defineAction({
    request: z.object({
      run_id: z.string().min(1), approval_id: z.string().min(1), section: linkedinSection,
      verdict: z.enum(["pass", "reject", "hold"]), reason: z.string().nullable().optional(),
      before_hash: z.string().nullable().optional(), after_hash: z.string().nullable().optional(),
    }),
    response: linkedinApplyCompleteResponse,
    async handler(ctx, args): Promise<z.infer<typeof linkedinApplyCompleteResponse>> {
      const db = ctx.db<typeof schema>();
      const approval = (await db.select().from(schema.approvals).where(eq(schema.approvals.approvalId, args.approval_id)).limit(1))[0];
      if (!approval || approval.runId !== args.run_id || approval.kind !== "linkedin_section" || approval.section !== args.section || approval.answer !== "approved") return { ok: false, message: "The approved LinkedIn section could not be matched to this run.", run_complete: false };
      if (args.verdict !== "pass") {
        const blocker = args.reason?.trim() || `The ${args.section} edit could not be verified.`;
        await db.batch([
          db.update(schema.runs).set({ status: "blocked", needsMe: true, blocker }).where(eq(schema.runs.runId, args.run_id)),
          db.insert(schema.events).values({ runId: args.run_id, type: "apply_failed", payload: { section: args.section, approval_id: args.approval_id, verdict: args.verdict, reason: blocker }, at: now() }),
        ]);
        ctx.invalidateQueries();
        return { ok: true, message: blocker, run_complete: false };
      }
      await db.insert(schema.events).values({ runId: args.run_id, type: "section_applied", payload: { section: args.section, approval_id: args.approval_id, before_hash: args.before_hash ?? null, after_hash: args.after_hash ?? null }, at: now() });
      const approvalsForRun = await db.select().from(schema.approvals).where(and(eq(schema.approvals.runId, args.run_id), eq(schema.approvals.kind, "linkedin_section")));
      const applyEvents = await db.select().from(schema.events).where(and(eq(schema.events.runId, args.run_id), eq(schema.events.type, "section_applied")));
      const completedApprovalIds = new Set(applyEvents.map((event) => jsonObject(event.payload).approval_id).filter((value): value is string => typeof value === "string"));
      const unresolved = approvalsForRun.some((row) => row.resolvedAt === null);
      const approvedOutstanding = approvalsForRun.some((row) => row.answer === "approved" && !completedApprovalIds.has(row.approvalId));
      const runComplete = !unresolved && !approvedOutstanding;
      if (runComplete) {
        await db.batch([
          db.update(schema.runs).set({ status: "completed", ended: now(), needsMe: false, blocker: null, counts: { sections: approvalsForRun.length, applied: completedApprovalIds.size, discarded: approvalsForRun.filter((row) => row.answer === "discarded").length } }).where(eq(schema.runs.runId, args.run_id)),
          db.insert(schema.events).values({ runId: args.run_id, type: "done", payload: { phase: "done", applied: completedApprovalIds.size, discarded: approvalsForRun.filter((row) => row.answer === "discarded").length }, at: now() }),
        ]);
      } else {
        const stillWaiting = unresolved;
        await db.update(schema.runs).set({ status: stillWaiting ? "awaiting_approvals" : "running", needsMe: stillWaiting, blocker: null }).where(eq(schema.runs.runId, args.run_id));
        if (stillWaiting) await db.insert(schema.events).values({ runId: args.run_id, type: "awaiting_approvals", payload: { phase: "awaiting_approvals", remaining: approvalsForRun.filter((row) => row.resolvedAt === null).length }, at: now() });
      }
      ctx.invalidateQueries();
      return { ok: true, message: runComplete ? "LinkedIn optimization run completed." : `${titleCaseForServer(args.section)} was applied and verified.`, run_complete: runComplete };
    },
  }),
} satisfies ActionsModule;
