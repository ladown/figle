import { readFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { sortKeysDeep } from "@figle/spec-schema";
import { describe, expect, it } from "vitest";
import { runFromRaw } from "../src/orchestrator.js";
import {
  DEMO_CARD_META,
  demoCardConfig,
  demoCardRaw,
} from "./fixtures/demo-card.js";

const here = dirname(fileURLToPath(import.meta.url));
const expected = JSON.parse(
  readFileSync(resolvePath(here, "fixtures/demo-card.expected.json"), "utf8"),
);

describe("orchestrator: DemoCard fixture", () => {
  it("produces the expected Spec byte-for-byte after sorting keys", async () => {
    const payload = await runFromRaw(
      demoCardRaw,
      demoCardConfig,
      DEMO_CARD_META,
    );
    expect(JSON.stringify(sortKeysDeep(payload.spec))).toBe(
      JSON.stringify(sortKeysDeep(expected)),
    );
    expect(payload.assets).toEqual([]);
  });
});
