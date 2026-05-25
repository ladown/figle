import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import clipboard from "clipboardy";
import {
  SpecCopyPayloadSchema,
  SpecSchema,
  renderPrompt,
  sortKeysDeep,
  type Spec,
  type SpecCopyPayload,
} from "@figle/spec-schema";

export async function runPaste(cwd: string): Promise<void> {
  const raw = clipboard.readSync();
  if (!raw.trim()) {
    console.error("figle: clipboard is empty.");
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("figle: clipboard does not contain valid JSON.");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const payload = parsePayload(parsed);
  const outDir = resolve(cwd, ".figle");
  await mkdir(outDir, { recursive: true });

  const specFiles = assignSpecFilenames(payload.specs);
  await Promise.all(
    specFiles.map(async ({ filename, spec }) => {
      const dest = resolve(outDir, "specs", filename);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(
        dest,
        `${JSON.stringify(sortKeysDeep(spec), null, 2)}\n`,
        "utf8",
      );
      console.log(`figle: wrote ${dest}`);
    }),
  );

  await Promise.all(
    payload.assets.map(async (asset) => {
      const dest = resolve(outDir, "assets", asset.path);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, Buffer.from(asset.base64, "base64"));
    }),
  );
  if (payload.assets.length > 0) {
    console.log(
      `figle: wrote ${payload.assets.length} asset(s) to ${resolve(outDir, "assets")}`,
    );
  }

  const promptPath = resolve(outDir, "PROMPT.md");
  const promptBody = renderPrompt({
    stack: "vue3-ts-tailwind",
    specPath:
      specFiles.length === 1
        ? `.figle/specs/${specFiles[0]!.filename}`
        : ".figle/specs/",
    warningsCount: payload.specs.reduce((sum, s) => sum + s.warnings.length, 0),
  });
  await writeFile(
    promptPath,
    buildPromptHeader(specFiles) + promptBody,
    "utf8",
  );
  console.log(`figle: wrote ${promptPath}`);

  const totalWarnings = payload.specs.reduce(
    (sum, s) => sum + s.warnings.length,
    0,
  );
  if (totalWarnings > 0) {
    console.log(`figle: ${totalWarnings} warning(s) in spec(s)`);
  }
}

type SpecFile = {
  filename: string;
  spec: Spec;
};

function assignSpecFilenames(specs: Spec[]): SpecFile[] {
  const used = new Set<string>();
  const result: SpecFile[] = [];
  for (const spec of specs) {
    const base = slugify(spec.meta.nodeName ?? "spec") || "spec";
    const filename = `${base}.json`;
    if (used.has(filename)) {
      console.error(
        `figle: duplicate spec filename "${filename}" (frame "${
          spec.meta.nodeName ?? "<unnamed>"
        }" appears twice). Rename the conflicting frames in Figma or extract them separately.`,
      );
      process.exit(1);
    }
    used.add(filename);
    result.push({ filename, spec });
  }
  return result;
}

function parsePayload(input: unknown): SpecCopyPayload {
  const newFmt = SpecCopyPayloadSchema.safeParse(input);
  if (newFmt.success) return newFmt.data;

  const legacySpec = SpecSchema.safeParse(input);
  if (legacySpec.success) {
    return {
      payloadVersion: "0.1",
      specs: [legacySpec.data],
      assets: [],
    };
  }

  console.error("figle: clipboard payload does not match Spec schema.");
  for (const issue of newFmt.error.issues.slice(0, 5)) {
    console.error(`  ${issue.path.join(".") || "<root>"}: ${issue.message}`);
  }
  process.exit(1);
}

function buildPromptHeader(specFiles: SpecFile[]): string {
  if (specFiles.length === 1) {
    const { spec, filename } = specFiles[0]!;
    const { meta } = spec;
    const name = meta.nodeName ?? "Figma fragment";
    const sizeSuffix =
      meta.width !== undefined && meta.height !== undefined
        ? ` (${Math.round(meta.width)}×${Math.round(meta.height)})`
        : "";
    const lines = [
      `# ${name}${sizeSuffix}`,
      "",
      `Spec: .figle/specs/${filename}`,
    ];
    const url = sourceUrl(meta.figmaFileKey, meta.nodeId);
    if (url) lines.push(`Figma source: ${url}`);
    lines.push("", "---", "");
    return `${lines.join("\n")}\n`;
  }

  const lines = [`# Extracted ${specFiles.length} frames`, ""];
  for (const { spec, filename } of specFiles) {
    const { meta } = spec;
    const name = meta.nodeName ?? "Figma fragment";
    const sizeSuffix =
      meta.width !== undefined && meta.height !== undefined
        ? ` (${Math.round(meta.width)}×${Math.round(meta.height)})`
        : "";
    lines.push(`## ${name}${sizeSuffix}`);
    lines.push(`Spec: .figle/specs/${filename}`);
    const url = sourceUrl(meta.figmaFileKey, meta.nodeId);
    if (url) lines.push(`Figma source: ${url}`);
    lines.push("");
  }
  lines.push("---", "");
  return `${lines.join("\n")}\n`;
}

function sourceUrl(fileKey: string, nodeId: string | undefined): string | null {
  if (!fileKey || fileKey === "0:0") return null;
  const base = `https://www.figma.com/design/${encodeURIComponent(fileKey)}/`;
  if (!nodeId) return `${base}?m=dev`;
  const dashed = nodeId.replaceAll(":", "-");
  return `${base}?node-id=${dashed}&m=dev`;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}
