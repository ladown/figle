#!/usr/bin/env node
// Resolve pnpm `workspace:` dependency specifiers to concrete versions for the
// published tarball, then restore the source. `npm publish` (used by
// @semantic-release/npm, which keeps npm's OIDC trusted publishing working)
// does not rewrite the `workspace:` protocol the way `pnpm publish` does, so a
// naive publish ships an uninstallable `"@figle/x": "workspace:*"`. This script
// runs as `prepack` (rewrite) and `postpack` (restore) so only the tarball is
// changed; the committed package.json keeps its `workspace:*` specifiers.
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const mode = process.argv[2];
if (mode !== "pack" && mode !== "restore") {
  console.error("usage: rewrite-workspace-deps.mjs <pack|restore>");
  process.exit(1);
}

const pkgPath = resolve(process.cwd(), "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const backupPath = join(
  tmpdir(),
  `figle-workspace-bak-${pkg.name.replaceAll(/[^a-z0-9]/gi, "-")}.json`,
);

if (mode === "restore") {
  if (existsSync(backupPath)) {
    writeFileSync(pkgPath, readFileSync(backupPath));
    rmSync(backupPath);
  }
  process.exit(0);
}

const versions = readWorkspaceVersions();
const original = readFileSync(pkgPath, "utf8");
let changed = false;

for (const field of [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
]) {
  const deps = pkg[field];
  if (!deps) continue;
  for (const [name, spec] of Object.entries(deps)) {
    if (typeof spec !== "string" || !spec.startsWith("workspace:")) continue;
    const version = versions.get(name);
    if (!version) {
      console.error(`rewrite-workspace-deps: no workspace version for ${name}`);
      process.exit(1);
    }
    const range = spec.slice("workspace:".length);
    deps[name] =
      range === "*" || range === ""
        ? version
        : range === "^" || range === "~"
          ? `${range}${version}`
          : range; // explicit version pinned after `workspace:`
    changed = true;
  }
}

if (changed) {
  writeFileSync(backupPath, original);
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function readWorkspaceVersions() {
  let root = process.cwd();
  while (!existsSync(join(root, "pnpm-workspace.yaml"))) {
    const parent = dirname(root);
    if (parent === root) {
      console.error("rewrite-workspace-deps: pnpm workspace root not found");
      process.exit(1);
    }
    root = parent;
  }
  const map = new Map();
  const packagesDir = join(root, "packages");
  for (const entry of readdirSync(packagesDir)) {
    const manifest = join(packagesDir, entry, "package.json");
    if (!existsSync(manifest)) continue;
    const json = JSON.parse(readFileSync(manifest, "utf8"));
    if (json.name && json.version) map.set(json.name, json.version);
  }
  return map;
}
