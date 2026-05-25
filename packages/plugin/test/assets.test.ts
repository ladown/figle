import { describe, expect, it } from "vitest";
import type { RawNode } from "../src/extract/index.js";
import { runFromRaw } from "../src/orchestrator.js";

const META = {
  figmaFileKey: "demo-file-key",
  extractedAt: "2026-05-22T10:00:00.000Z",
};

function layoutNode(children: RawNode[], opts: Partial<RawNode> = {}): RawNode {
  return {
    id: opts.id ?? "frame",
    name: opts.name ?? "Frame",
    type: "FRAME",
    visible: true,
    size: { width: 400, height: 200 },
    autoLayout: { mode: "VERTICAL", primaryAxisAlign: "MIN" },
    children,
    ...opts,
  };
}

function iconNode(
  name: string,
  bytes: Uint8Array,
  opts: Partial<RawNode> = {},
): RawNode {
  return {
    id: opts.id ?? `i_${name}`,
    name,
    type: "VECTOR",
    visible: true,
    size: { width: 24, height: 24 },
    asset: { kind: "icon", format: "svg", bytes },
    ...opts,
  };
}

function imageNode(
  name: string,
  size: { width: number; height: number },
  asset: Uint8Array | { oversize: true },
  opts: Partial<RawNode> = {},
): RawNode {
  const base: RawNode = {
    id: opts.id ?? `img_${name}`,
    name,
    type: "RECTANGLE",
    visible: true,
    size,
    ...opts,
  };
  if (asset instanceof Uint8Array) {
    base.asset = { kind: "image", format: "png", bytes: asset };
  } else {
    base.imageOversize = size;
  }
  return base;
}

const SVG_A = new TextEncoder().encode("<svg>icon-a</svg>");
const SVG_B = new TextEncoder().encode("<svg>icon-b</svg>");
const PNG_A = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);

describe("assets in SpecCopyPayload", () => {
  it("dedupes identical icon bytes to a single asset entry", async () => {
    const root = layoutNode([
      iconNode("arrow-left", SVG_A, { id: "n1" }),
      iconNode("Arrow Left Copy", SVG_A, { id: "n2" }),
    ]);
    const payload = await runFromRaw(root, null, META);
    expect(payload.assets).toHaveLength(1);
    const children = (payload.spec.root as { children: { src: string }[] })
      .children;
    expect(children[0]?.src).toBe(children[1]?.src);
    expect(payload.assets[0]?.path).toBe(children[0]?.src);
  });

  it("emits two entries for icons with different bytes", async () => {
    const root = layoutNode([
      iconNode("arrow-left", SVG_A, { id: "n1" }),
      iconNode("arrow-right", SVG_B, { id: "n2" }),
    ]);
    const payload = await runFromRaw(root, null, META);
    expect(payload.assets).toHaveLength(2);
    const paths = payload.assets.map((a) => a.path);
    expect(new Set(paths).size).toBe(2);
  });

  it("emits an ImageNode without src for oversize images", async () => {
    const root = layoutNode([
      imageNode("hero", { width: 4000, height: 3000 }, { oversize: true }),
    ]);
    const payload = await runFromRaw(root, null, META);
    expect(payload.assets).toEqual([]);
    const image = (payload.spec.root as { children: unknown[] })
      .children[0] as {
      $type: string;
      src?: string;
      size: { width: number; height: number };
    };
    expect(image.$type).toBe("image");
    expect(image.src).toBeUndefined();
    expect(image.size).toEqual({ width: 4000, height: 3000 });
  });

  it("emits an ImageNode with src + asset entry for in-bounds images", async () => {
    const root = layoutNode([
      imageNode("thumb", { width: 200, height: 200 }, PNG_A),
    ]);
    const payload = await runFromRaw(root, null, META);
    expect(payload.assets).toHaveLength(1);
    expect(payload.assets[0]?.path).toMatch(/^images\/thumb-[0-9a-f]{6}\.png$/);
    const image = (payload.spec.root as { children: unknown[] })
      .children[0] as {
      $type: string;
      src: string;
    };
    expect(image.$type).toBe("image");
    expect(image.src).toBe(payload.assets[0]?.path);
  });
});
