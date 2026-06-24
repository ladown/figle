import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { InvalidOutputDirError, resolveOutputDir } from "../src/output-dir.js";

const CWD = "/project";

describe("resolveOutputDir priority", () => {
  it("falls back to .figle when no source is set", () => {
    expect(resolveOutputDir(CWD, {}).relative).toBe(".figle");
  });

  it("uses config.output.dir over the default", () => {
    expect(resolveOutputDir(CWD, { configDir: "out" }).relative).toBe("out");
  });

  it("prefers the payload (plugin field) over config", () => {
    const dir = resolveOutputDir(CWD, {
      payloadDir: "src/figma",
      configDir: "out",
    });
    expect(dir.relative).toBe("src/figma");
  });

  it("prefers --out over the payload and config", () => {
    const dir = resolveOutputDir(CWD, {
      cliFlag: "flag",
      payloadDir: "src/figma",
      configDir: "out",
    });
    expect(dir.relative).toBe("flag");
  });

  it("prefers --pick over everything else", () => {
    const dir = resolveOutputDir(CWD, {
      pickedDir: "picked",
      cliFlag: "flag",
      payloadDir: "src/figma",
      configDir: "out",
    });
    expect(dir.relative).toBe("picked");
    expect(dir.absolute).toBe(resolve(CWD, "picked"));
  });
});

describe("resolveOutputDir validation", () => {
  it("rejects absolute paths", () => {
    expect(() => resolveOutputDir(CWD, { cliFlag: "/etc" })).toThrow(
      InvalidOutputDirError,
    );
  });

  it("rejects paths that escape the project (e.g. a picked sibling folder)", () => {
    expect(() => resolveOutputDir(CWD, { pickedDir: "../outside" })).toThrow(
      InvalidOutputDirError,
    );
  });

  it("rejects paths under node_modules", () => {
    expect(() =>
      resolveOutputDir(CWD, { configDir: "node_modules/x" }),
    ).toThrow(InvalidOutputDirError);
  });
});
