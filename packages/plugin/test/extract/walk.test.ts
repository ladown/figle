import { describe, expect, it } from "vitest";
import type { RawNode } from "../../src/extract/index.js";
import { isIconCandidate } from "../../src/extract/walk.js";

type MockNode = { type: string; name: string; children?: MockNode[] };

// isIconCandidate only reads node.type/name/children — a structural mock is
// enough without pulling in the full SceneNode surface.
const scene = (m: MockNode) =>
  m as unknown as Parameters<typeof isIconCandidate>[0];

const raw = (over: Partial<RawNode> = {}): RawNode => ({
  id: "n",
  name: over.name ?? "n",
  type: "FRAME",
  visible: true,
  ...over,
});

describe("isIconCandidate", () => {
  it("treats leaf vector shapes as icons", () => {
    expect(
      isIconCandidate(
        scene({ type: "VECTOR", name: "x" }),
        raw({ type: "VECTOR" }),
      ),
    ).toBe(true);
    expect(
      isIconCandidate(
        scene({ type: "BOOLEAN_OPERATION", name: "x" }),
        raw({ type: "BOOLEAN_OPERATION" }),
      ),
    ).toBe(true);
  });

  it("does NOT flatten an auto-layout button variant whose name contains 'Icon only'", () => {
    const name =
      "modifier=Primary, size=sm, state=Default, Icon only=Off, destructive=false";
    const node = scene({
      type: "COMPONENT",
      name,
      children: [{ type: "TEXT", name: "Text" }],
    });
    expect(
      isIconCandidate(
        node,
        raw({ type: "COMPONENT", name, autoLayout: { mode: "HORIZONTAL" } }),
      ),
    ).toBe(false);
  });

  it("does NOT treat a node with a text descendant as an icon, even if named 'icon'", () => {
    const node = scene({
      type: "FRAME",
      name: "icon-button",
      children: [
        {
          type: "FRAME",
          name: "inner",
          children: [{ type: "TEXT", name: "label" }],
        },
      ],
    });
    expect(isIconCandidate(node, raw({ name: "icon-button" }))).toBe(false);
  });

  it("treats a leaf frame named 'icon/...' as an icon", () => {
    const node = scene({
      type: "FRAME",
      name: "icon/arrow-left",
      children: [{ type: "VECTOR", name: "v" }],
    });
    expect(isIconCandidate(node, raw({ name: "icon/arrow-left" }))).toBe(true);
  });

  it("treats an instance of an icon component as an icon", () => {
    const node = scene({ type: "INSTANCE", name: "ArrowLeft" });
    expect(
      isIconCandidate(
        node,
        raw({
          type: "INSTANCE",
          instance: { mainComponentName: "icon/arrow-left" },
        }),
      ),
    ).toBe(true);
  });

  it("does not treat a plain composite frame as an icon", () => {
    const node = scene({
      type: "FRAME",
      name: "Card",
      children: [{ type: "RECTANGLE", name: "bg" }],
    });
    expect(isIconCandidate(node, raw({ name: "Card" }))).toBe(false);
  });
});
