import { isAbsolute, relative, resolve } from "node:path";

export type OutputDir = {
  /** Absolute path. */
  absolute: string;
  /** Path relative to cwd, with forward slashes, suitable for PROMPT.md references. */
  relative: string;
};

export type OutputDirSources = {
  /** Folder picked via `--pick`'s native dialog, relativized to cwd. Highest priority. */
  pickedDir?: string | undefined;
  /** `--out <dir>` flag — an explicit per-run override. */
  cliFlag?: string | undefined;
  /** `outputDir` embedded in the copied payload (chosen in the plugin). */
  payloadDir?: string | undefined;
  /** `output.dir` from the project's figle.config — the project default. */
  configDir?: string | undefined;
};

export function resolveOutputDir(
  cwd: string,
  sources: OutputDirSources,
): OutputDir {
  const requested =
    sources.pickedDir ??
    sources.cliFlag ??
    sources.payloadDir ??
    sources.configDir ??
    ".figle";
  if (isAbsolute(requested)) {
    throw new InvalidOutputDirError(
      `output directory must be relative to the project (got "${requested}").`,
    );
  }
  if (requested.split(/[\\/]/).some((segment) => segment === "..")) {
    throw new InvalidOutputDirError(
      `output directory must stay inside the project (got "${requested}").`,
    );
  }
  if (/^node_modules(\/|$|\\)/i.test(requested)) {
    throw new InvalidOutputDirError(
      `output directory must not live under node_modules (got "${requested}").`,
    );
  }

  const absolute = resolve(cwd, requested);
  const relToCwd = relative(cwd, absolute).replaceAll("\\", "/");
  return { absolute, relative: relToCwd || "." };
}

export class InvalidOutputDirError extends Error {
  override readonly name = "InvalidOutputDirError";
}
