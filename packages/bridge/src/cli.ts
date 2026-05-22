#!/usr/bin/env node
import { runSync } from "./commands/sync.js";
import { runPaste } from "./commands/paste.js";

const USAGE = `figle — bridge between the Figma plugin and your project.

Usage:
  figle sync    Read figle.config.{ts,mts,js,mjs}, copy a hashed blob to clipboard.
  figle paste   Read clipboard, validate as Spec, write .figle/last-spec.json + PROMPT.md.
`;

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  if (rest.length > 0) {
    console.error(`figle: unexpected arguments: ${rest.join(" ")}`);
    console.error(USAGE);
    process.exit(1);
  }

  switch (command) {
    case "sync":
      await runSync(process.cwd());
      return;
    case "paste":
      await runPaste(process.cwd());
      return;
    case undefined:
    case "-h":
    case "--help":
      console.log(USAGE);
      return;
    default:
      console.error(`figle: unknown command "${command}"`);
      console.error(USAGE);
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(
    err instanceof Error ? (err.stack ?? err.message) : String(err),
  );
  process.exit(1);
});
