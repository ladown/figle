#!/usr/bin/env node
import { runInit } from "./commands/init.js";
import { runPaste } from "./commands/paste.js";
import { runSync } from "./commands/sync.js";

const USAGE = `figle — bridge between the Figma plugin and your project.

Usage:
  figle init [--force]              Create figle.config.ts in the current directory.
  figle sync                        Read figle.config.{ts,mts,js,mjs}, copy a hashed blob to clipboard.
  figle paste [--out <dir>]         Read clipboard, validate as Spec, write specs/assets/PROMPT.md.
                                    Default output dir: .figle/ (override via --out or config.output.dir).
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
    case "paste": {
      const outFlagIndex = rest.indexOf("--out");
      let out: string | undefined;
      const remaining: string[] = [];
      for (let i = 0; i < rest.length; i++) {
        if (i === outFlagIndex) {
          out = rest[i + 1];
          i += 1;
          continue;
        }
        remaining.push(rest[i]!);
      }
      if (outFlagIndex >= 0 && (out === undefined || out.startsWith("-"))) {
        console.error("figle: --out requires a directory argument.");
        console.error(USAGE);
        process.exit(1);
      }
      assertNoArgs(remaining);
      await runPaste(process.cwd(), out !== undefined ? { out } : {});
      return;
    }
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
