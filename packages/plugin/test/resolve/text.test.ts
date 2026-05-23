import { describe, expect, it } from "vitest";
import { resolve } from "../../src/resolve/index.js";
import { demoConfig, textNode } from "./fixtures.js";

describe("resolveText", () => {
  it("maps a bound typography variable to a TokenRef", () => {
    const node = textNode("Welcome", {
      text: {
        content: "Welcome",
        typography: {
          fontName: { family: "Inter", style: "Bold" },
          fontSize: 32,
          boundVariable: {
            type: "VARIABLE_ALIAS",
            id: "v1",
            name: "heading/lg",
            collection: "typography",
          },
        },
      },
    });
    const { root, warnings } = resolve(node, demoConfig);
    expect(warnings).toEqual([]);
    expect(root).toMatchObject({
      $type: "text",
      content: "Welcome",
      typography: { $token: "typography.heading.lg" },
    });
  });

  it("emits UNBOUND_TYPOGRAPHY when no binding is present", () => {
    const { warnings } = resolve(textNode("Welcome"), demoConfig);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.code).toBe("UNBOUND_TYPOGRAPHY");
  });

  it("does not infer semantic from font size", () => {
    const { root } = resolve(
      textNode("Title", {
        text: {
          content: "Title",
          typography: {
            fontName: { family: "Inter", style: "Bold" },
            fontSize: 64,
          },
        },
      }),
      demoConfig,
    );
    expect(root).not.toHaveProperty("semantic");
  });

  it("zero-config: uses Figma variable path as token", () => {
    const node = textNode("Hi", {
      text: {
        content: "Hi",
        typography: {
          fontName: { family: "Inter", style: "Regular" },
          fontSize: 16,
          boundVariable: {
            type: "VARIABLE_ALIAS",
            id: "v1",
            name: "body/md",
            collection: "typography",
          },
        },
      },
    });
    const { root, warnings } = resolve(node, null);
    expect(warnings).toEqual([]);
    expect(root).toMatchObject({
      typography: { $token: "typography/body/md" },
    });
  });
});
