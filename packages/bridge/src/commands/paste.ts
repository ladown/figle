import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import clipboard from "clipboardy";
import {
  SpecSchema,
  renderPrompt,
  sortKeysDeep,
  type Spec,
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

  const result = SpecSchema.safeParse(parsed);
  if (!result.success) {
    console.error("figle: clipboard payload does not match Spec schema.");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".") || "<root>"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const spec: Spec = result.data;
  const sorted = sortKeysDeep(spec);
  const outDir = resolve(cwd, ".figle");
  await mkdir(outDir, { recursive: true });

  const specPath = resolve(outDir, "last-spec.json");
  await writeFile(specPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

  const promptPath = resolve(outDir, "PROMPT.md");
  const prompt = renderPrompt({
    stack: "vue3-ts-tailwind",
    specPath: ".figle/last-spec.json",
    warningsCount: spec.warnings.length,
  });
  await writeFile(promptPath, prompt, "utf8");

  console.log(`figle: wrote ${specPath}`);
  console.log(`figle: wrote ${promptPath}`);
  if (spec.warnings.length > 0) {
    console.log(`figle: ${spec.warnings.length} warning(s) in spec`);
  }
}
