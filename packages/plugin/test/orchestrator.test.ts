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
      [{ raw: demoCardRaw, meta: DEMO_CARD_META }],
      demoCardConfig,
    );
    expect(payload.specs).toHaveLength(1);
    expect(JSON.stringify(sortKeysDeep(payload.specs[0]))).toBe(
      JSON.stringify(sortKeysDeep(expected)),
    );
    expect(payload.assets).toEqual([]);
  });

  it("multi: produces one payload with multiple specs sharing deduped assets", async () => {
    const payload = await runFromRaw(
      [
        { raw: demoCardRaw, meta: DEMO_CARD_META },
        {
          raw: demoCardRaw,
          meta: { ...DEMO_CARD_META, nodeId: "1:99", nodeName: "DemoCard2" },
        },
      ],
      demoCardConfig,
    );
    expect(payload.specs).toHaveLength(2);
    expect(payload.specs[0]?.meta.nodeName).toBeUndefined();
    expect(payload.specs[1]?.meta.nodeName).toBe("DemoCard2");
  });
});
