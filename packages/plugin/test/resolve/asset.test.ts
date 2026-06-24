import { describe, expect, it } from "vitest";
import type { RawNode } from "../../src/extract/index.js";
import { runFromRaw } from "../../src/orchestrator.js";
import { resolve } from "../../src/resolve/index.js";

const META = {
  figmaFileKey: "0:0",
  extractedAt: "2026-06-24T00:00:00.000Z",
};

function iconNode(size: { width: number; height: number }): RawNode {
  return {
    id: "icon1",
    name: "chevron",
    type: "VECTOR",
    visible: true,
    size,
    asset: { kind: "icon", format: "svg", bytes: new Uint8Array([1, 2, 3]) },
  };
}

describe("resolveAsset size", () => {
  it("keeps a positive icon size", () => {
    const { root } = resolve(iconNode({ width: 24, height: 24 }), null);
    expect(root).toMatchObject({
      $type: "icon",
      size: { width: 24, height: 24 },
    });
  });

  it("drops a non-positive icon size instead of emitting an invalid one", () => {
    const { root } = resolve(iconNode({ width: 24, height: 0 }), null);
    expect(root).toMatchObject({ $type: "icon", name: "chevron" });
    expect((root as { size?: unknown }).size).toBeUndefined();
  });

  it("produces a schema-valid payload for a zero-height icon", async () => {
    const payload = await runFromRaw(
      [{ raw: iconNode({ width: 24, height: 0 }), meta: META }],
      null,
    );
    expect(payload.specs).toHaveLength(1);
    expect(payload.specs[0]?.root).toMatchObject({ $type: "icon" });
  });
});
