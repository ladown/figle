import { describe, expect, it } from "vitest";
import { resolve } from "../../src/resolve/index.js";
import { demoConfig, instanceNode, textNode } from "./fixtures.js";

describe("resolveInstance", () => {
  it("maps a mapped component instance to a ComponentRef", () => {
    const { root, warnings } = resolve(
      instanceNode("Card", { Variant: "elevated" }),
      demoConfig,
    );
    expect(warnings).toEqual([]);
    expect(root).toMatchObject({
      $component: "UiCard",
      importPath: "@/components/UiCard.vue",
      props: { variant: "elevated" },
    });
  });

  it("extracts text label via auto-text slot for Button", () => {
    const { root } = resolve(
      instanceNode("Button", { Variant: "primary", Size: "md" }, [
        textNode("Get started"),
      ]),
      demoConfig,
    );
    expect(root).toMatchObject({
      $component: "UiButton",
      props: { variant: "primary", size: "md" },
      children: [{ $type: "text", content: "Get started" }],
    });
  });

  it("emits UNKNOWN_COMPONENT for unmapped instances and falls back to layout", () => {
    const { root, warnings } = resolve(
      instanceNode("Mystery", {}, []),
      demoConfig,
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.code).toBe("UNKNOWN_COMPONENT");
    expect(root).toMatchObject({ $type: "layout" });
  });
});
