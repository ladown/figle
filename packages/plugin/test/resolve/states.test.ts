import { describe, expect, it } from "vitest";
import { resolve } from "../../src/resolve/index.js";
import { demoConfig, instanceNode } from "./fixtures.js";

describe("resolveStates", () => {
  it("emits StateSnapshot per state when the instance has raw states", () => {
    const node = instanceNode(
      "Button",
      { Variant: "primary", State: "default" },
      [],
      {
        instance: {
          mainComponentName: "Button",
          variantProperties: { Variant: "primary", State: "default" },
          states: {
            hover: {
              fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }],
            },
            disabled: {
              opacity: 0.5,
            },
          },
        },
      },
    );
    const { root } = resolve(node, demoConfig);
    expect(root).toMatchObject({
      $component: "UiButton",
      states: {
        hover: { background: "#ff0000" },
        disabled: { opacity: 0.5 },
      },
    });
  });

  it("omits states when no raw states are present", () => {
    const node = instanceNode("Button", { Variant: "primary" }, []);
    const { root } = resolve(node, demoConfig);
    expect(root).not.toHaveProperty("states");
  });
});
