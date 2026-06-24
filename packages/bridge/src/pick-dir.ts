import { execFileSync } from "node:child_process";
import { platform } from "node:os";

const PROMPT = "Select the figle output folder";

export class PickDirError extends Error {
  override readonly name = "PickDirError";
}

/**
 * Opens the OS-native folder chooser (Finder on macOS, Explorer on Windows,
 * zenity on Linux) and returns the selected absolute path, or `null` if the
 * user cancelled. Throws {@link PickDirError} when no native dialog tool is
 * available (e.g. a headless shell).
 *
 * The bridge shells out to the platform tool instead of taking a dependency —
 * the same osascript / PowerShell / zenity technique GUI pickers use under the
 * hood. It runs only in the CLI (Node on the user's machine); the plugin stays
 * sandboxed with `allowedDomains: ["none"]`.
 */
export function pickDirectory(): string | null {
  switch (platform()) {
    case "darwin":
      return pickMac();
    case "win32":
      return pickWindows();
    default:
      return pickLinux();
  }
}

type RunResult =
  | { ok: true; out: string }
  | {
      ok: false;
      status: number | null;
      code: string | undefined;
      stderr: string;
    };

function run(cmd: string, args: string[]): RunResult {
  try {
    const out = execFileSync(cmd, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, out: out.trim() };
  } catch (err) {
    const e = err as {
      status?: number | null;
      code?: string;
      stderr?: Buffer | string;
    };
    const stderr =
      typeof e.stderr === "string" ? e.stderr : (e.stderr?.toString() ?? "");
    return { ok: false, status: e.status ?? null, code: e.code, stderr };
  }
}

function pickMac(): string | null {
  const script = `POSIX path of (choose folder with prompt "${PROMPT}")`;
  const r = run("osascript", ["-e", script]);
  if (r.ok) return r.out || null;
  if (r.code === "ENOENT") {
    throw new PickDirError(
      "could not open the macOS folder dialog (osascript not found).",
    );
  }
  // Cancel → osascript exits non-zero with "User canceled. (-128)".
  if (r.stderr.includes("-128") || /user canceled/i.test(r.stderr)) return null;
  throw new PickDirError(
    `folder dialog failed: ${r.stderr.trim() || `exit ${r.status}`}`,
  );
}

function pickLinux(): string | null {
  const r = run("zenity", [
    "--file-selection",
    "--directory",
    `--title=${PROMPT}`,
  ]);
  if (r.ok) return r.out || null;
  if (r.code === "ENOENT") {
    throw new PickDirError(
      "could not open the folder dialog (install zenity, or pass --out <dir>).",
    );
  }
  // Cancel → zenity exits 1 with empty stdout.
  if (r.status === 1) return null;
  throw new PickDirError(
    `folder dialog failed: ${r.stderr.trim() || `exit ${r.status}`}`,
  );
}

function pickWindows(): string | null {
  const ps = [
    "Add-Type -AssemblyName System.Windows.Forms;",
    "$f = New-Object System.Windows.Forms.FolderBrowserDialog;",
    `$f.Description = '${PROMPT}';`,
    "if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($f.SelectedPath) }",
  ].join(" ");
  const r = run("powershell", ["-NoProfile", "-STA", "-Command", ps]);
  if (r.ok) return r.out || null;
  if (r.code === "ENOENT") {
    throw new PickDirError(
      "could not open the Explorer folder dialog (PowerShell not found).",
    );
  }
  throw new PickDirError(
    `folder dialog failed: ${r.stderr.trim() || `exit ${r.status}`}`,
  );
}
