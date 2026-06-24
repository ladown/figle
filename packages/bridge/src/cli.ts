#!/usr/bin/env node
import { runInit } from "./commands/init.js";
import { runPaste, type PasteOptions } from "./commands/paste.js";
import { runSync } from "./commands/sync.js";

const USAGE = `figle — bridge between the Figma plugin and your project.

Usage:
  figle init [--force]              Create figle.config.ts in the current directory.
  figle sync                        Read figle.config.{ts,mts,js,mjs}, copy a hashed blob to clipboard.
  figle paste [--out <dir>|--pick]  Read clipboard, validate as Spec, write specs/assets/PROMPT.md.
                                    --pick opens a native folder dialog (Finder/Explorer/zenity).
                                    Default output dir: .figle/ (also from config.output.dir or the
                                    plugin's Output folder field). The chosen folder must stay inside
                                    the project.
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
      let out: string | undefined;
      let pick = false;
      const remaining: string[] = [];
      for (let i = 0; i < rest.length; i++) {
        const arg = rest[i]!;
        if (arg === "--out") {
          out = rest[i + 1];
          i += 1;
          if (out === undefined || out.startsWith("-")) {
            console.error("figle: --out requires a directory argument.");
            console.error(USAGE);
            process.exit(1);
          }
          continue;
        }
        if (arg === "--pick") {
          pick = true;
          continue;
        }
        remaining.push(arg);
      }
      if (out !== undefined && pick) {
        console.error("figle: --out and --pick cannot be combined.");
        console.error(USAGE);
        process.exit(1);
      }
      assertNoArgs(remaining);
      const opts: PasteOptions = {};
      if (out !== undefined) opts.out = out;
      if (pick) opts.pick = true;
      await runPaste(process.cwd(), opts);
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
