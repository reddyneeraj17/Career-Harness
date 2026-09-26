import { readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
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
    request: z.object({ filename: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*$/), location: z.enum(["user_files", "user_file_resumes", "workspace_resumes"]) }),
    response: z.object({ filename: z.string(), bytesBase64: z.string(), contentType: z.literal("application/pdf") }),
    timeoutMs: 15_000,
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
const RESUME_ROOTS = {
  user_files: "/home/hatch/workspace/user/files",
  user_file_resumes: "/home/hatch/workspace/user/files/resumes",
  workspace_resumes: "/home/hatch/workspace/resumes",
} as const;

function isWithin(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
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
