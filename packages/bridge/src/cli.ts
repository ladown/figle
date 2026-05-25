#!/usr/bin/env node
import { runInit } from "./commands/init.js";
import { runPaste } from "./commands/paste.js";
import { runSync } from "./commands/sync.js";

const USAGE = `figle — bridge between the Figma plugin and your project.

Usage:
  figle init [--force]   Create figle.config.ts in the current directory.
  figle sync             Read figle.config.{ts,mts,js,mjs}, copy a hashed blob to clipboard.
  figle paste            Read clipboard, validate as Spec, write .figle/last-spec.json + PROMPT.md.
`;

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "init": {
      const force = rest.includes("--force");
      const unknown = rest.filter((arg) => arg !== "--force");
      if (unknown.length > 0) {
        console.error(`figle: unexpected arguments: ${unknown.join(" ")}`);
        console.error(USAGE);
        process.exit(1);
      }
      await runInit(process.cwd(), { force });
      return;
    }
    case "sync":
      assertNoArgs(rest);
      await runSync(process.cwd());
      return;
    case "paste":
      assertNoArgs(rest);
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

function assertNoArgs(args: string[]): void {
  if (args.length > 0) {
    console.error(`figle: unexpected arguments: ${args.join(" ")}`);
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
