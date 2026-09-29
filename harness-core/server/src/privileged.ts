import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { definePrivilegedContracts, definePrivilegedHandlers, z } from "@hatch/space-sdk";

export const privileged = definePrivilegedContracts({
  readApplicationEvidence: {
    request: z.object({ appId: z.string().regex(/^[A-Za-z0-9_-]+$/), campaignId: z.string().regex(/^[A-Za-z0-9_-]+$/), runId: z.string().regex(/^[A-Za-z0-9_-]+$/), kind: z.enum(["resume", "screenshot", "confirmation", "prep"]), filename: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*$/) }),
    response: z.object({ filename: z.string(), bytesBase64: z.string(), contentType: z.enum(["application/pdf", "image/png", "text/plain"]) }),
    timeoutMs: 15_000,
  },
  applicationEvidenceExists: {
    request: z.object({ appId: z.string().regex(/^[A-Za-z0-9_-]+$/), campaignId: z.string().regex(/^[A-Za-z0-9_-]+$/), runId: z.string().regex(/^[A-Za-z0-9_-]+$/), kind: z.enum(["resume", "screenshot", "confirmation", "prep"]), filename: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*$/) }),
    response: z.object({ exists: z.boolean() }),
    timeoutMs: 5_000,
  },
  readRegisteredResume: {
    request: z.object({ filename: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*\.pdf$/i), location: z.enum(["user_files", "user_file_resumes", "workspace_resumes"]) }),
    response: z.object({ filename: z.string(), bytesBase64: z.string(), contentType: z.literal("application/pdf") }),
    timeoutMs: 15_000,
  },
  writeResumeUpload: {
    request: z.object({ filename: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/i), bytes_base64: z.string().min(1) }),
    response: z.object({ path: z.string(), filename: z.string() }),
    timeoutMs: 20_000,
  },
  trashResumeFile: {
    request: z.object({ variant_id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/), filename: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*\.pdf$/i), location: z.enum(["user_files", "user_file_resumes", "workspace_resumes"]) }),
    response: z.object({ file_moved: z.boolean(), trashed_path: z.string().nullable() }),
    timeoutMs: 15_000,
  },
  readTrashedResume: {
    request: z.object({ variant_id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/), filename: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*\.pdf$/i), sha256: z.string().regex(/^[a-f0-9]{64}$/i).nullable().optional() }),
    response: z.object({ found: z.boolean(), filename: z.string().optional(), bytesBase64: z.string().optional(), contentType: z.literal("application/pdf").optional() }),
    timeoutMs: 15_000,
  },
  renderPdfPreview: {
    request: z.object({ bytesBase64: z.string().min(1), maxPages: z.number().int().min(1).max(8) }),
    response: z.object({ pages: z.array(z.object({ page: z.number().int().positive(), bytesBase64: z.string() })), truncated: z.boolean() }),
    timeoutMs: 30_000,
  },
  readSchedulesManifest: {
    request: z.object({}),
    response: z.object({ manifestText: z.string().nullable() }),
    timeoutMs: 5_000,
  },
  readProfileYaml: {
    request: z.object({}),
    response: z.object({ yamlText: z.string() }),
    timeoutMs: 5_000,
  },
  parseProfileYaml: {
    request: z.object({ yamlText: z.string().min(1) }),
    response: z.object({ parsed: z.unknown() }),
    timeoutMs: 5_000,
  },
  writeProfileYaml: {
    request: z.object({ yaml_text: z.string().min(1) }),
    response: z.object({ ok: z.literal(true), bytes_written: z.number().int().nonnegative() }),
    timeoutMs: 5_000,
  },
  readHeldDraft: {
    request: z.object({ draft_path: z.string().min(1).max(2000) }),
    response: z.object({ found: z.boolean(), text: z.string().optional() }),
    timeoutMs: 5_000,
  },
  // Client persona YAML (from the onboarding Excel converter) — confined to
  // ~/workspace/profiles/*.yaml so the years matrix can be imported on setup.
  readPersonaYaml: {
    request: z.object({ persona_path: z.string().regex(/^profiles\/[A-Za-z0-9][A-Za-z0-9._-]*\.ya?ml$/) }),
    response: z.object({ found: z.boolean(), yamlText: z.string().optional() }),
    timeoutMs: 5_000,
  },
  // Disk usage of every `hidden_files` directory under ~/workspace/goals/
  // (per-campaign run artifacts: screenshots, confirmations, spillover).
  // Bounded walk — no request parameters, no file contents returned.
  hiddenFilesDiskUsage: {
    request: z.object({ prune_candidates: z.number().int().min(1).max(20).optional() }),
    response: z.object({
      bytes_total: z.number().int(),
      folder_count: z.number().int(),
      oldest_folders: z.array(z.object({ folder: z.string(), bytes: z.number().int() })),
    }),
    timeoutMs: 30_000,
  },
  // Chunked dataset imports: the CSV is staged once to a confined
  // .import-staging dir (never through action args again), then read back in
  // bounded row ranges so no single action exceeds the 120s limit. Staging
  // is one JSON chunk file per 2,000 rows — chunk reads touch only the files
  // the requested offset range spans, never the whole dataset.
  stageImportCsv: {
    request: z.object({
      job_id: z.string().regex(/^imp_[A-Za-z0-9_-]{1,64}$/),
      csv: z.string().min(1).max(20 * 1024 * 1024).optional(),
      csv_url: z.string().url().max(2000).optional(),
    }).refine((v) => v.csv || v.csv_url, { message: "Provide csv or csv_url." }),
    response: z.object({ total_rows: z.number().int(), chunks: z.number().int(), source_sha256: z.string(), size_bytes: z.number().int() }),
    timeoutMs: 120_000,
  },
  readImportCsvChunk: {
    request: z.object({
      job_id: z.string().regex(/^imp_[A-Za-z0-9_-]{1,64}$/),
      offset: z.number().int().min(0),
      limit: z.number().int().min(1).max(10000),
    }),
    response: z.object({
      rows: z.array(z.record(z.string(), z.string())),
      total_rows: z.number().int(),
      next_offset: z.number().int(),
    }),
    timeoutMs: 30_000,
  },
  deleteImportStaging: {
    request: z.object({ job_id: z.string().regex(/^imp_[A-Za-z0-9_-]{1,64}$/) }),
    response: z.object({ deleted: z.boolean() }),
    timeoutMs: 10_000,
  },
  writeHeldDraft: {
    request: z.object({ draft_path: z.string().min(1).max(2000), text: z.string().min(1).max(200000) }),
    response: z.object({ ok: z.boolean(), draft_path: z.string().nullable(), message: z.string().optional() }),
    timeoutMs: 5_000,
  },
});

const WORKSPACE_ROOT = "/home/hatch/workspace";
const PROFILE_YAML = "/home/hatch/workspace/profile.yaml";
const SCHEDULES_MANIFEST = "/home/hatch/workspace/schedules_manifest.json";
const TRASH_RESUMES = "/home/hatch/workspace/.trash/resumes";
const RESUME_ROOTS = {
  user_files: "/home/hatch/workspace/user/files",
  user_file_resumes: "/home/hatch/workspace/user/files/resumes",
  workspace_resumes: "/home/hatch/workspace/resumes",
} as const;

function isWithin(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

function isPdf(bytes: Buffer): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

async function ensureRealDirectory(path: string): Promise<string> {
  await mkdir(path, { recursive: true });
  const actual = await realpath(path);
  if (actual !== path) throw new Error("The destination directory is not allowlisted.");
  return actual;
}

async function readCheckedFile(candidate: string, root: string): Promise<Buffer> {
  const target = resolve(candidate);
  if (!isWithin(target, root)) throw new Error("File path is outside its record-bound directory.");
  const actual = await realpath(target);
  if (!isWithin(actual, root)) throw new Error("File symlinks outside the record-bound directory are not allowed.");
  return readFile(actual);
}

function applicationEvidencePath(input: { appId: string; campaignId: string; runId: string; kind: "resume" | "screenshot" | "confirmation" | "prep"; filename: string }): { root: string; path: string; contentType: "application/pdf" | "image/png" | "text/plain" } {
  const extension = input.filename.slice(input.filename.lastIndexOf(".")).toLowerCase();
  if (input.kind === "resume" && extension !== ".pdf") throw new Error("Application resume evidence must be a PDF.");
  if (input.kind === "screenshot" && (extension !== ".png" || !input.filename.startsWith(`${input.appId}_`))) throw new Error("Screenshot evidence must use the canonical application filename.");
  if (input.kind === "confirmation" && input.filename !== `${input.appId}_confirmation.txt`) throw new Error("Confirmation evidence must use the canonical application filename.");
  if (input.kind === "prep" && (extension !== ".md" || input.filename !== `${input.appId}_talking_points.md`)) throw new Error("Talking-points evidence must use the canonical application filename.");
  const folder = input.kind === "resume" ? "resumes" : "screenshots";
  const root = resolve(WORKSPACE_ROOT, "goals", input.campaignId, "hidden_files", input.runId, folder);
  return { root, path: resolve(root, input.filename), contentType: input.kind === "resume" ? "application/pdf" : input.kind === "screenshot" ? "image/png" : "text/plain" };
}

async function checkedProfilePath(): Promise<string> {
  const target = resolve(PROFILE_YAML);
  if (target !== PROFILE_YAML) throw new Error("Profile YAML path is not allowlisted.");
  const actualParent = await realpath(dirname(target));
  if (actualParent !== WORKSPACE_ROOT) throw new Error("Profile YAML parent path is not allowlisted.");
  try {
    const actual = await realpath(target);
    if (actual !== PROFILE_YAML) throw new Error("Profile YAML symlinks are not allowed.");
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
    if (code !== "ENOENT") throw error;
  }
  return target;
}

async function pathExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

// Held-draft files are stored as workspace-relative paths (e.g. "goals/<campaign>/…/drafts/<file>.md"
// or "/home/hatch/workspace/goals/…"). Resolve them to absolute paths under the workspace root and
// refuse anything that would escape it — the same confinement the server actions used to apply.
function draftAbsolutePath(stored: string): string | null {
  const normalized = stored.replaceAll("\\", "/");
  if (normalized.includes("..")) return null;
  const abs = normalized.startsWith("/") ? normalized : `${WORKSPACE_ROOT}/${normalized.replace(/^workspace\//, "")}`;
  return abs === WORKSPACE_ROOT || abs.startsWith(`${WORKSPACE_ROOT}/`) ? abs : null;
}

function workspaceRelativePath(abs: string): string {
  const prefix = `${WORKSPACE_ROOT}/`;
  return abs.startsWith(prefix) ? abs.slice(prefix.length) : abs;
}

function collisionName(filename: string, sequence: number): string {
  if (sequence === 1) return filename;
  const extension = extname(filename);
  return `${filename.slice(0, -extension.length)}-${sequence}${extension}`;
}

const IMPORT_STAGING_ROOT = resolve(WORKSPACE_ROOT, ".import-staging");
const importJobIdPattern = /^imp_[A-Za-z0-9_-]{1,64}$/;
const normHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replaceAll(" ", "_");

function stagingPaths(jobId: string) {
  if (!importJobIdPattern.test(jobId)) throw new Error("The import job id is invalid.");
  const dir = resolve(IMPORT_STAGING_ROOT, jobId);
  const meta = resolve(dir, "meta.json");
  if (!isWithin(dir, IMPORT_STAGING_ROOT) || !isWithin(meta, dir)) throw new Error("The import staging path is outside the staging directory.");
  return { dir, meta };
}
// Rows per staged chunk file. Matches IMPORT_CHUNK_ROWS in actions.ts so one
// dataset_import_chunk call normally touches exactly one chunk file.
const STAGE_CHUNK_ROWS = 2000;
function chunkPath(dir: string, index: number) {
  const p = resolve(dir, `chunk-${String(index).padStart(6, "0")}.json`);
  if (!isWithin(p, dir)) throw new Error("The import chunk path is outside the staging directory.");
  return p;
}

// Small RFC-4180-ish CSV parser (port of the server action's csvRows) so the
// staged rows match what the legacy synchronous imports would have produced.
function stagedCsvRows(csv: string): string[][] {
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

export const privilegedHandlers = definePrivilegedHandlers(privileged, {
  async readApplicationEvidence(input) {
    const target = applicationEvidencePath(input);
    const bytes = await readCheckedFile(target.path, target.root);
    return { filename: input.filename, bytesBase64: bytes.toString("base64"), contentType: target.contentType };
  },
  async applicationEvidenceExists(input) {
    try {
      const target = applicationEvidencePath(input);
      await readCheckedFile(target.path, target.root);
      return { exists: true };
    } catch {
      return { exists: false };
    }
  },
  async readRegisteredResume({ filename, location }) {
    if (!filename.toLowerCase().endsWith(".pdf")) throw new Error("Registered resumes must be PDF files.");
    const root = RESUME_ROOTS[location];
    const bytes = await readCheckedFile(resolve(root, filename), root);
    return { filename, bytesBase64: bytes.toString("base64"), contentType: "application/pdf" as const };
  },
  async writeResumeUpload({ filename, bytes_base64 }) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/i.test(filename)) throw new Error("The resume filename is invalid.");
    const bytes = Buffer.from(bytes_base64, "base64");
    if (!isPdf(bytes)) throw new Error("The uploaded file is not a PDF.");
    const root = await ensureRealDirectory(RESUME_ROOTS.user_files);
    for (let sequence = 1; sequence < 10_000; sequence += 1) {
      const candidateName = collisionName(filename, sequence);
      const candidate = resolve(root, candidateName);
      if (!isWithin(candidate, root)) throw new Error("The upload path is outside the resume directory.");
      try {
        await writeFile(candidate, bytes, { flag: "wx" });
        const actual = await realpath(candidate);
        if (!isWithin(actual, root)) throw new Error("The uploaded resume resolved outside the resume directory.");
        return { path: candidate, filename: candidateName };
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
        if (code === "EEXIST") continue;
        throw error;
      }
    }
    throw new Error("Could not allocate a unique filename for the uploaded resume.");
  },
  async trashResumeFile({ variant_id, filename, location }) {
    const sourceRoot = RESUME_ROOTS[location];
    const source = resolve(sourceRoot, filename);
    if (!isWithin(source, sourceRoot)) throw new Error("The registered resume path is outside the library.");
    try {
      const actual = await realpath(source);
      if (!isWithin(actual, sourceRoot)) throw new Error("The registered resume symlinks outside the library.");
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
      if (code === "ENOENT") return { file_moved: false, trashed_path: null };
      throw error;
    }
    const trashRoot = await ensureRealDirectory(TRASH_RESUMES);
    const base = `${variant_id}__${filename}`;
    for (let sequence = 1; sequence < 10_000; sequence += 1) {
      const target = resolve(trashRoot, collisionName(base, sequence));
      if (!isWithin(target, trashRoot)) throw new Error("The trash path is outside the recoverable trash directory.");
      if (await pathExists(target)) continue;
      await rename(source, target);
      return { file_moved: true, trashed_path: target };
    }
    throw new Error("Could not allocate a unique recoverable trash filename.");
  },
  async readTrashedResume({ variant_id, filename, sha256 }) {
    const trashRoot = await ensureRealDirectory(TRASH_RESUMES);
    const base = `${variant_id}__${filename}`;
    for (let sequence = 1; sequence < 10_000; sequence += 1) {
      const candidateName = collisionName(base, sequence);
      const candidate = resolve(trashRoot, candidateName);
      if (!isWithin(candidate, trashRoot)) throw new Error("The trash path is outside the recoverable trash directory.");
      if (!await pathExists(candidate)) {
        if (sequence === 1) continue;
        break;
      }
      const bytes = await readCheckedFile(candidate, trashRoot);
      if (!isPdf(bytes)) continue;
      if (sha256 && createHash("sha256").update(bytes).digest("hex").toLowerCase() !== sha256.toLowerCase()) continue;
      return { found: true, filename, bytesBase64: bytes.toString("base64"), contentType: "application/pdf" as const };
    }
    return { found: false };
  },
  async renderPdfPreview({ bytesBase64, maxPages }) {
    const bytes = Buffer.from(bytesBase64, "base64");
    if (!isPdf(bytes)) throw new Error("Only PDF files can be previewed.");
    const workingDirectory = await mkdtemp(join(tmpdir(), "harness-pdf-preview-"));
    try {
      const pdfPath = join(workingDirectory, "document.pdf");
      const outputPrefix = join(workingDirectory, "page");
      await writeFile(pdfPath, bytes, { flag: "wx" });
      const child = Bun.spawn(["/usr/bin/pdftoppm", "-png", "-r", "108", "-f", "1", "-l", String(maxPages + 1), pdfPath, outputPrefix], { stdout: "pipe", stderr: "pipe" });
      const stderrPromise = new Response(child.stderr).text();
      const exitCode = await child.exited;
      const stderr = await stderrPromise;
      if (exitCode !== 0) throw new Error(stderr.trim() || "The PDF renderer could not open this file.");
      const pageFiles = (await readdir(workingDirectory))
        .filter((name) => /^page-\d+\.png$/.test(name))
        .sort((left, right) => Number(left.match(/\d+/)?.[0] ?? 0) - Number(right.match(/\d+/)?.[0] ?? 0));
      const selected = pageFiles.slice(0, maxPages);
      if (selected.length === 0) throw new Error("The PDF renderer returned no pages.");
      const pages = await Promise.all(selected.map(async (name, index) => ({ page: index + 1, bytesBase64: (await readFile(join(workingDirectory, name))).toString("base64") })));
      return { pages, truncated: pageFiles.length > maxPages };
    } finally {
      await rm(workingDirectory, { recursive: true, force: true });
    }
  },
  async readSchedulesManifest() {
    try {
      const actual = await realpath(SCHEDULES_MANIFEST);
      if (actual !== SCHEDULES_MANIFEST) return { manifestText: null };
      return { manifestText: await readFile(actual, "utf8") };
    } catch {
      return { manifestText: null };
    }
  },
  async readProfileYaml() {
    const path = await checkedProfilePath();
    return { yamlText: await readFile(path, "utf8") };
  },
  async parseProfileYaml({ yamlText }) {
    return { parsed: Bun.YAML.parse(yamlText) as unknown };
  },
  async writeProfileYaml({ yaml_text }) {
    const path = await checkedProfilePath();
    await writeFile(path, yaml_text, { encoding: "utf8", flag: "w" });
    return { ok: true as const, bytes_written: Buffer.byteLength(yaml_text, "utf8") };
  },
  async readHeldDraft({ draft_path }) {
    const abs = draftAbsolutePath(draft_path);
    if (!abs) return { found: false };
    try {
      const actual = await realpath(abs);
      if (!isWithin(actual, WORKSPACE_ROOT)) return { found: false };
      return { found: true, text: await readFile(actual, "utf8") };
    } catch {
      return { found: false };
    }
  },
  async writeHeldDraft({ draft_path, text }) {
    const invalid = { ok: false, draft_path: null, message: "The held reply's draft path is invalid." };
    const abs = draftAbsolutePath(draft_path);
    if (!abs) return invalid;
    const slash = abs.lastIndexOf("/");
    const dir = abs.slice(0, slash);
    const base = abs.slice(slash + 1);
    if (!dir || !base) return invalid;
    const stamp = Date.now();
    const nextBase = base.includes(".") ? base.replace(/(\.[^.]+)$/, `.edited-${stamp}$1`) : `${base}.edited-${stamp}`;
    const target = `${dir}/${nextBase}`;
    if (!isWithin(resolve(target), WORKSPACE_ROOT)) return invalid;
    try {
      const actualDir = await realpath(dir);
      if (!isWithin(actualDir, WORKSPACE_ROOT)) return invalid;
    } catch {
      return { ok: false, draft_path: null, message: "The held reply's draft directory does not exist." };
    }
    await writeFile(target, text, "utf8");
    return { ok: true, draft_path: workspaceRelativePath(target) };
  },
  async readPersonaYaml({ persona_path }) {
    const abs = resolve(WORKSPACE_ROOT, persona_path);
    const profilesRoot = resolve(WORKSPACE_ROOT, "profiles");
    if (!isWithin(abs, profilesRoot)) return { found: false };
    try {
      const actual = await realpath(abs);
      if (!isWithin(actual, profilesRoot)) return { found: false };
      const text = await readFile(actual, "utf8");
      return { found: true, yamlText: text };
    } catch {
      return { found: false };
    }
  },
  async deleteImportStaging({ job_id }) {
    const { dir } = stagingPaths(job_id);
    try { await rm(dir, { recursive: true, force: true }); return { deleted: true }; }
    catch { return { deleted: false }; }
  },
  async hiddenFilesDiskUsage({ prune_candidates }) {
    const goalsRoot = resolve(WORKSPACE_ROOT, "goals");
    const folders: { folder: string; bytes: number; mtimeMs: number }[] = [];
    const stack: string[] = [];
    try {
      for (const entry of await readdir(goalsRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const hidden = resolve(goalsRoot, entry.name, "hidden_files");
        try { if (!(await stat(hidden)).isDirectory()) continue; } catch { continue; }
        try {
          const actual = await realpath(hidden);
          if (!isWithin(actual, goalsRoot)) continue;
        } catch { continue; }
        stack.push(hidden);
      }
    } catch {
      return { bytes_total: 0, folder_count: 0, oldest_folders: [] };
    }
    // Per hidden_files dir: recursive byte sum + dir mtime (oldest first for
    // prune candidates). Symlinks are never followed.
    while (stack.length) {
      const dir = stack.pop()!;
      let bytes = 0; let mtimeMs = 0;
      const inner: string[] = [dir];
      try { mtimeMs = (await stat(dir)).mtimeMs; } catch { continue; }
      while (inner.length) {
        const current = inner.pop()!;
        let entries;
        try { entries = await readdir(current, { withFileTypes: true }); } catch { continue; }
        for (const entry of entries) {
          const path = join(current, entry.name);
          try {
            if (entry.isDirectory()) { if (!entry.isSymbolicLink()) inner.push(path); }
            else if (entry.isFile() && !entry.isSymbolicLink()) bytes += (await stat(path)).size;
          } catch { /* unreadable entry: skip, keep the totals honest */ }
        }
      }
      const rel = dir.startsWith(`${WORKSPACE_ROOT}/`) ? dir.slice(WORKSPACE_ROOT.length + 1) : dir;
      folders.push({ folder: rel, bytes, mtimeMs });
    }
    folders.sort((a, b) => a.mtimeMs - b.mtimeMs);
    const limit = prune_candidates ?? 10;
    return {
      bytes_total: folders.reduce((sum, f) => sum + f.bytes, 0),
      folder_count: folders.length,
      oldest_folders: folders.slice(0, limit).map(({ folder, bytes }) => ({ folder, bytes })),
    };
  },
  async stageImportCsv({ job_id, csv, csv_url }) {
    const { dir, meta } = stagingPaths(job_id);
    let text: string;
    if (csv) {
      text = csv;
    } else if (csv_url) {
      const res = await fetch(csv_url);
      if (!res.ok) throw new Error(`CSV download failed: HTTP ${res.status}`);
      text = await res.text();
    } else {
      throw new Error("Provide csv or csv_url.");
    }
    const parsed = stagedCsvRows(text);
    const headers = (parsed[0] ?? []).map(normHeader);
    const records = parsed.slice(1).map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])));
    await mkdir(dir, { recursive: true });
    const actualDir = await realpath(dir);
    if (!isWithin(actualDir, WORKSPACE_ROOT)) throw new Error("The import staging directory resolved outside the workspace.");
    // Source identity: sha256 of the raw source text, stored on the job row so
    // an operator can always tell which file a job staged.
    const sourceSha256 = createHash("sha256").update(text, "utf8").digest("hex");
    // One chunk file per STAGE_CHUNK_ROWS rows: chunk reads stay bounded no
    // matter how large the dataset is.
    let chunks = 0;
    for (let i = 0; i < records.length; i += STAGE_CHUNK_ROWS) {
      await writeFile(chunkPath(actualDir, chunks), JSON.stringify(records.slice(i, i + STAGE_CHUNK_ROWS)), "utf8");
      chunks += 1;
    }
    await writeFile(meta, JSON.stringify({ total_rows: records.length, chunk_rows: STAGE_CHUNK_ROWS, chunks }), "utf8");
    return { total_rows: records.length, chunks, source_sha256: sourceSha256, size_bytes: Buffer.byteLength(text, "utf8") };
  },
  async readImportCsvChunk({ job_id, offset, limit }) {
    const { dir, meta } = stagingPaths(job_id);
    let staged: { total_rows?: unknown; chunk_rows?: unknown };
    try {
      staged = JSON.parse(await readFile(meta, "utf8")) as { total_rows?: unknown; chunk_rows?: unknown };
    } catch {
      throw new Error(`No staged import found for job '${job_id}'.`);
    }
    const totalRows = Number(staged.total_rows ?? 0);
    const chunkRows = Number(staged.chunk_rows ?? STAGE_CHUNK_ROWS) || STAGE_CHUNK_ROWS;
    if (offset >= totalRows) return { rows: [], total_rows: totalRows, next_offset: totalRows };
    // Bounded: only the chunk files overlapped by [offset, offset+limit) are
    // read. The full dataset is never loaded.
    const end = Math.min(offset + limit, totalRows);
    const out: Record<string, string>[] = [];
    let idx = offset;
    while (idx < end) {
      const chunkIndex = Math.floor(idx / chunkRows);
      const chunkStart = chunkIndex * chunkRows;
      let rows: unknown;
      try {
        rows = JSON.parse(await readFile(chunkPath(dir, chunkIndex), "utf8"));
      } catch {
        throw new Error(`Staged chunk ${chunkIndex} for job '${job_id}' is missing or corrupt.`);
      }
      if (!Array.isArray(rows)) throw new Error(`Staged chunk ${chunkIndex} for job '${job_id}' is corrupt.`);
      const from = idx - chunkStart;
      const take = Math.min(end - idx, rows.length - from);
      if (take <= 0) break; // short chunk: stop rather than spin
      for (let i = 0; i < take; i += 1) {
        const row = (rows as unknown[])[from + i];
        if (row && typeof row === "object" && !Array.isArray(row)) out.push(row as Record<string, string>);
      }
      idx += take;
    }
    return { rows: out, total_rows: totalRows, next_offset: offset + out.length };
  },
});
