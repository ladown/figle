import { describe, expect, it } from "vitest";
import type { RawNode } from "../../src/extract/index.js";
import { runFromRaw } from "../../src/orchestrator.js";
import { resolve } from "../../src/resolve/index.js";

const META = {
  figmaFileKey: "0:0",
  extractedAt: "2026-06-24T00:00:00.000Z",
};

function variantChild(id: string, variantKey: Record<string, string>): RawNode {
  return {
    id,
    name: Object.entries(variantKey)
      .map(([k, v]) => `${k}=${v}`)
      .join(", "),
    type: "COMPONENT",
    visible: true,
    autoLayout: { mode: "HORIZONTAL" },
    variantKey,
    children: [],
  };
}

function buttonSet(): RawNode {
  return {
    id: "764:6237",
    name: "ButtonBase",
    type: "COMPONENT_SET",
    visible: true,
    componentSet: {
      axes: {
        modifier: ["Primary", "Secondary color"],
        size: ["sm", "md"],
        "Icon only": ["Off", "On"],
      },
    },
    children: [
      variantChild("v1", {
        modifier: "Primary",
        size: "sm",
        "Icon only": "Off",
      }),
      variantChild("v2", {
        modifier: "Secondary color",
        size: "md",
        "Icon only": "On",
      }),
    ],
  };
}

describe("resolveComponentSet", () => {
  it("emits a componentSet node carrying axes and per-variant keys", () => {
    const { root } = resolve(buttonSet(), null);
    expect(root).toMatchObject({
      $type: "componentSet",
      name: "ButtonBase",
      axes: {
        modifier: ["primary", "secondaryColor"],
        size: ["sm", "md"],
        iconOnly: ["off", "on"],
      },
      variants: [
        { key: { modifier: "primary", size: "sm", iconOnly: "off" } },
        { key: { modifier: "secondaryColor", size: "md", iconOnly: "on" } },
      ],
    });
  });

  it("normalizes axis and variant-key property names to camelCase", () => {
    const { root } = resolve(buttonSet(), null);
    if (!("axes" in root)) throw new Error("expected a componentSet root");
    expect(Object.keys(root.axes)).toEqual(["modifier", "size", "iconOnly"]);
    for (const variant of root.variants) {
      expect(Object.keys(variant.key)).toEqual([
        "modifier",
        "size",
        "iconOnly",
      ]);
    }
  });

  it("each variant subtree resolves to its own layout node", () => {
    const { root } = resolve(buttonSet(), null);
    if (!("variants" in root)) throw new Error("expected a componentSet root");
    for (const variant of root.variants) {
      expect(variant.node).toMatchObject({ $type: "layout" });
    }
  });

  it("produces a schema-valid payload end-to-end", async () => {
    const payload = await runFromRaw([{ raw: buttonSet(), meta: META }], null);
    expect(payload.specs).toHaveLength(1);
    expect(payload.specs[0]?.root).toMatchObject({
      $type: "componentSet",
      name: "ButtonBase",
    });
  });

  it("falls back to a plain layout when no variant axes were extracted", () => {
    const set: RawNode = {
      id: "1:1",
      name: "ButtonBase",
      type: "COMPONENT_SET",
      visible: true,
      autoLayout: { mode: "VERTICAL" },
      children: [variantChild("v1", { Style: "primary" })],
    };
    const { root } = resolve(set, null);
    expect(root).toMatchObject({ $type: "layout" });
  });
});
