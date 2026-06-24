// Force a release when a package's published artifact pins an out-of-date
// workspace dependency.
//
// `semantic-release-monorepo` only releases a package when commits touch that
// package's own directory. So a change to `@figle/spec-schema` publishes a new
// spec-schema but leaves `@figle/cli` / `@figle/mcp-preset` pinned (via
// `rewrite-workspace-deps.ts`) to the *previous* spec-schema version — users
// then get a CLI validating against a stale schema.
//
// Wired as `@semantic-release/exec`'s `analyzeCommitsCmd`: semantic-release
// takes the highest release type across all analyzers, so emitting `patch`
// here forces a release even when commit-analyzer finds nothing for this
// package. Releases run topologically and sequentially
// (`pnpm -r --workspace-concurrency=1`), so by the time a dependent is analyzed
// its dependency has already been bumped on disk and published.
//
// Contract: print ONLY a release type (`patch`) to stdout when a bump is
// needed, nothing otherwise; all diagnostics go to stderr; always exit 0 so a
// lookup hiccup never fails the release.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type Manifest = {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

function log(message: string): void {
  process.stderr.write(`detect-dependency-bump: ${message}\n`);
}

try {
  const pkg = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
  ) as Manifest;

  const workspaceDeps = collectWorkspaceDeps(pkg);
  if (workspaceDeps.length === 0) process.exit(0);

  const distTag = channelDistTag();
  const published = publishedDependencies(pkg.name ?? "", distTag);
  if (!published) {
    log(`${pkg.name}@${distTag} not published yet — leaving it to commits`);
    process.exit(0);
  }

  const versions = readWorkspaceVersions();
  for (const dep of workspaceDeps) {
    const intended = versions.get(dep);
    const pinned = published[dep];
    if (intended && pinned && intended !== pinned) {
      log(
        `${pkg.name}@${distTag} pins ${dep}@${pinned}, workspace is ${intended} → forcing patch`,
      );
      process.stdout.write("patch");
      process.exit(0);
    }
  }
  process.exit(0);
} catch (error) {
  log(`skipped (${error instanceof Error ? error.message : String(error)})`);
  process.exit(0);
}

function collectWorkspaceDeps(pkg: Manifest): string[] {
  const names: string[] = [];
  for (const field of [
    "dependencies",
    "peerDependencies",
    "optionalDependencies",
  ] as const) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const [name, spec] of Object.entries(deps)) {
      if (
        typeof spec === "string" &&
        spec.startsWith("workspace:") &&
        name.startsWith("@figle/")
      ) {
        names.push(name);
      }
    }
  }
  return names;
}

function channelDistTag(): string {
  const branch = process.env.GITHUB_REF_NAME ?? gitBranch() ?? "beta";
  return branch === "master" ? "latest" : "beta";
}

function gitBranch(): string | undefined {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return undefined;
  }
}

// Returns the published package's `dependencies` object for the given dist-tag,
// or `null` when the package/tag is not published (or the lookup failed).
function publishedDependencies(
  name: string,
  distTag: string,
): Record<string, string> | null {
  try {
    const out = execFileSync(
      "npm",
      ["view", `${name}@${distTag}`, "dependencies", "--json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return out ? (JSON.parse(out) as Record<string, string>) : {};
  } catch {
    return null;
  }
}

function readWorkspaceVersions(): Map<string, string> {
  let root = process.cwd();
  while (!existsSync(join(root, "pnpm-workspace.yaml"))) {
    const parent = dirname(root);
    if (parent === root) {
      throw new Error("pnpm workspace root not found");
    }
    root = parent;
  }
  const map = new Map<string, string>();
  const packagesDir = join(root, "packages");
  for (const entry of readdirSync(packagesDir)) {
    const manifest = join(packagesDir, entry, "package.json");
    if (!existsSync(manifest)) continue;
    const json = JSON.parse(readFileSync(manifest, "utf8")) as Manifest;
    if (json.name && json.version) map.set(json.name, json.version);
  }
  return map;
}
