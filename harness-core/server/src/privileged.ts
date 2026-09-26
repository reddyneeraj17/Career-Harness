import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve, sep } from "node:path";
import { definePrivilegedContracts, definePrivilegedHandlers, z } from "@hatch/space-sdk";

export const privileged = definePrivilegedContracts({
  readApplicationEvidence: {
    request: z.object({ appId: z.string().regex(/^[A-Za-z0-9_-]+$/), campaignId: z.string().regex(/^[A-Za-z0-9_-]+$/), runId: z.string().regex(/^[A-Za-z0-9_-]+$/), kind: z.enum(["resume", "screenshot", "confirmation"]), filename: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*$/) }),
    response: z.object({ filename: z.string(), bytesBase64: z.string(), contentType: z.enum(["application/pdf", "image/png", "text/plain"]) }),
    timeoutMs: 15_000,
  },
  applicationEvidenceExists: {
    request: z.object({ appId: z.string().regex(/^[A-Za-z0-9_-]+$/), campaignId: z.string().regex(/^[A-Za-z0-9_-]+$/), runId: z.string().regex(/^[A-Za-z0-9_-]+$/), kind: z.enum(["resume", "screenshot", "confirmation"]), filename: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*$/) }),
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

function applicationEvidencePath(input: { appId: string; campaignId: string; runId: string; kind: "resume" | "screenshot" | "confirmation"; filename: string }): { root: string; path: string; contentType: "application/pdf" | "image/png" | "text/plain" } {
  const extension = input.filename.slice(input.filename.lastIndexOf(".")).toLowerCase();
  if (input.kind === "resume" && extension !== ".pdf") throw new Error("Application resume evidence must be a PDF.");
  if (input.kind === "screenshot" && (extension !== ".png" || !input.filename.startsWith(`${input.appId}_`))) throw new Error("Screenshot evidence must use the canonical application filename.");
  if (input.kind === "confirmation" && input.filename !== `${input.appId}_confirmation.txt`) throw new Error("Confirmation evidence must use the canonical application filename.");
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

function collisionName(filename: string, sequence: number): string {
  if (sequence === 1) return filename;
  const extension = extname(filename);
  return `${filename.slice(0, -extension.length)}-${sequence}${extension}`;
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
});
