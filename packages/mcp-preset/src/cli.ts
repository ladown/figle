#!/usr/bin/env node
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { SKILL_DIR_NAME, SKILL_FILENAME } from "./constants.js";

const USAGE = `figle-mcp — install the figle Skill for Claude Code.

Usage:
  figle-mcp install [--dest <path>]   Copy SKILL.md into ~/.claude/skills/figle/
                                      (or --dest if provided).
`;

const here = dirname(fileURLToPath(import.meta.url));
const SKILL_SOURCE = resolve(here, "..", "skill", SKILL_FILENAME);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === undefined || command === "-h" || command === "--help") {
    console.log(USAGE);
    return;
  }

  if (command !== "install") {
    console.error(`figle-mcp: unknown command "${command}"`);
    console.error(USAGE);
    process.exit(1);
  }

  const destFlagIndex = args.indexOf("--dest");
  const explicitDest = destFlagIndex >= 0 ? args[destFlagIndex + 1] : undefined;
  const baseDir =
    explicitDest ?? resolve(homedir(), ".claude", "skills", SKILL_DIR_NAME);

  await mkdir(baseDir, { recursive: true });
  const dest = resolve(baseDir, SKILL_FILENAME);
  await copyFile(SKILL_SOURCE, dest);

  console.log(`figle-mcp: installed skill to ${dest}`);
  console.log(
    `figle-mcp: restart Claude Code, then invoke the skill by name "figle".`,
  );
}

main().catch((err: unknown) => {
  console.error(
    err instanceof Error ? (err.stack ?? err.message) : String(err),
  );
  process.exit(1);
});
