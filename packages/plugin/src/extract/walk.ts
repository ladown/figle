import type {
  RawAutoLayout,
  RawCornerRadius,
  RawNode,
  RawPaint,
  RawSize,
  RawStateSnapshot,
  RawTypography,
  RawVariableAlias,
} from "./types.js";

export async function walkNode(node: SceneNode): Promise<RawNode> {
  const raw: RawNode = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
  };

  if ("width" in node && "height" in node) {
    raw.size = extractSize(node);
  }

  if (isAutoLayoutNode(node)) {
    raw.autoLayout = extractAutoLayout(node);
  }

  if ("fills" in node && Array.isArray(node.fills)) {
    raw.fills = extractPaints(node, node.fills as readonly Paint[], "fills");
    const fillStyleName = await readStyleName(node.fillStyleId);
    if (fillStyleName) raw.fillStyleName = fillStyleName;
  }

  if ("strokes" in node && Array.isArray(node.strokes)) {
    raw.strokes = extractPaints(
      node,
      node.strokes as readonly Paint[],
      "strokes",
    );
    if ("strokeWeight" in node && typeof node.strokeWeight === "number") {
      raw.strokeWeight = node.strokeWeight;
    }
    const strokeStyleName = await readStyleName(node.strokeStyleId);
    if (strokeStyleName) raw.strokeStyleName = strokeStyleName;
  }

  if ("cornerRadius" in node) {
    raw.corners = extractCornerRadius(node);
  }

  if (node.type === "TEXT") {
    raw.text = await extractText(node);
  }

  if (node.type === "INSTANCE") {
    raw.instance = await extractInstance(node);
  }

  if (node.type === "COMPONENT_SET" && (await extractComponentSet(node, raw))) {
    return raw;
  }

  if (await tryExtractIcon(node, raw)) {
    return raw;
  }

  if (await tryExtractImage(node, raw)) {
    return raw;
  }

  if ("children" in node && Array.isArray(node.children)) {
    raw.children = await Promise.all(node.children.map(walkNode));
  }

  return raw;
}

const IMAGE_TARGET_SIZE = 1024;
const ICON_MAX_BYTES = 100 * 1024;
const IMAGE_MAX_BYTES = 500 * 1024;

async function tryExtractIcon(node: SceneNode, raw: RawNode): Promise<boolean> {
  if (!isIconCandidate(node, raw)) return false;
  try {
    const bytes = await node.exportAsync({ format: "SVG" });
    if (bytes.byteLength > ICON_MAX_BYTES) {
      // Probably an illustration, not an icon — fall through to layout.
      return false;
    }
    raw.asset = { kind: "icon", format: "svg", bytes };
    return true;
  } catch {
    return false;
  }
}

async function tryExtractImage(
  node: SceneNode,
  raw: RawNode,
): Promise<boolean> {
  if (!isImageNode(node)) return false;
  const width = "width" in node ? node.width : 0;
  const height = "height" in node ? node.height : 0;
  if (!width || !height) {
    raw.imageOversize = { width, height };
    return true;
  }
  const scale =
    Math.max(width, height) > IMAGE_TARGET_SIZE
      ? IMAGE_TARGET_SIZE / Math.max(width, height)
      : 1;
  try {
    const bytes = await node.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: scale },
    });
    if (bytes.byteLength > IMAGE_MAX_BYTES) {
      raw.imageOversize = { width, height };
      return true;
    }
    raw.asset = { kind: "image", format: "png", bytes };
    return true;
  } catch {
    raw.imageOversize = { width, height };
    return true;
  }
}

export function isIconCandidate(node: SceneNode, raw: RawNode): boolean {
  // Leaf vector shapes are always icons.
  if (node.type === "VECTOR" || node.type === "BOOLEAN_OPERATION") return true;

  // Never flatten a composite into a single icon: an auto-layout frame or
  // anything containing text is a layout/component — e.g. a button variant
  // named "…Icon only=Off…" — not a glyph, even if the name mentions "icon".
  if (raw.autoLayout) return false;
  if (hasTextDescendant(node)) return false;

  if (/icon/i.test(node.name)) return true;
  if (
    node.type === "INSTANCE" &&
    raw.instance &&
    /icon/i.test(raw.instance.mainComponentName)
  ) {
    return true;
  }
  return false;
}

function hasTextDescendant(node: SceneNode): boolean {
  if (node.type === "TEXT") return true;
  if ("children" in node && Array.isArray(node.children)) {
    return node.children.some((child) => hasTextDescendant(child));
  }
  return false;
}

function isImageNode(node: SceneNode): boolean {
  if (!("fills" in node) || !Array.isArray(node.fills)) return false;
  return (node.fills as readonly Paint[]).some((p) => p.type === "IMAGE");
}

function extractSize(
  node: SceneNode & { width: number; height: number },
): RawSize {
  const size: RawSize = { width: node.width, height: node.height };
  if ("layoutSizingHorizontal" in node) {
    size.horizontalSizing = node.layoutSizingHorizontal;
  }
  if ("layoutSizingVertical" in node) {
    size.verticalSizing = node.layoutSizingVertical;
  }
  return size;
}

function isAutoLayoutNode(node: SceneNode): node is SceneNode & BaseFrameMixin {
  return (
    "layoutMode" in node &&
    (node.layoutMode === "HORIZONTAL" || node.layoutMode === "VERTICAL")
  );
}

function extractAutoLayout(node: SceneNode & BaseFrameMixin): RawAutoLayout {
  const bound = node.boundVariables ?? {};
  const auto: RawAutoLayout = {
    mode: node.layoutWrap === "WRAP" ? "WRAP" : node.layoutMode,
    itemSpacing: node.itemSpacing,
    paddingTop: node.paddingTop,
    paddingRight: node.paddingRight,
    paddingBottom: node.paddingBottom,
    paddingLeft: node.paddingLeft,
    primaryAxisAlign: node.primaryAxisAlignItems,
    counterAxisAlign: node.counterAxisAlignItems,
    wrap: node.layoutWrap === "WRAP",
  };

  const itemSpacingVar = aliasFromBound(bound.itemSpacing);
  if (itemSpacingVar) auto.itemSpacingVar = itemSpacingVar;

  const paddingVars: RawAutoLayout["paddingVars"] = {};
  const top = aliasFromBound(bound.paddingTop);
  const right = aliasFromBound(bound.paddingRight);
  const bottom = aliasFromBound(bound.paddingBottom);
  const left = aliasFromBound(bound.paddingLeft);
  if (top) paddingVars.top = top;
  if (right) paddingVars.right = right;
  if (bottom) paddingVars.bottom = bottom;
  if (left) paddingVars.left = left;
  if (Object.keys(paddingVars).length > 0) auto.paddingVars = paddingVars;

  return auto;
}

function extractPaints(
  node: SceneNode,
  paints: readonly Paint[],
  field: "fills" | "strokes",
): RawPaint[] {
  const bound = "boundVariables" in node ? (node.boundVariables ?? {}) : {};
  const boundList = (bound[field] ?? []) as readonly VariableAlias[];

  return paints.map((paint, index): RawPaint => {
    if (paint.type === "SOLID") {
      const out: RawPaint = {
        type: "SOLID",
        color: paint.color,
      };
      if (typeof paint.opacity === "number") out.opacity = paint.opacity;
      const alias = boundList[index];
      const aliasRaw = aliasFromBound(alias);
      if (aliasRaw) out.boundVariable = aliasRaw;
      return out;
    }
    return { type: paint.type };
  });
}

function extractCornerRadius(
  node: SceneNode & Partial<CornerMixin>,
): RawCornerRadius {
  const corners: RawCornerRadius = {};
  const cornerRadius = (node as Partial<CornerMixin>).cornerRadius;
  if (typeof cornerRadius === "number") corners.uniform = cornerRadius;

  if ("topLeftRadius" in node && typeof node.topLeftRadius === "number") {
    corners.topLeft = node.topLeftRadius;
  }
  if ("topRightRadius" in node && typeof node.topRightRadius === "number") {
    corners.topRight = node.topRightRadius;
  }
  if ("bottomLeftRadius" in node && typeof node.bottomLeftRadius === "number") {
    corners.bottomLeft = node.bottomLeftRadius;
  }
  if (
    "bottomRightRadius" in node &&
    typeof node.bottomRightRadius === "number"
  ) {
    corners.bottomRight = node.bottomRightRadius;
  }

  if ("boundVariables" in node) {
    const alias = aliasFromBound(
      (node.boundVariables ?? {}).topLeftRadius ??
        (node.boundVariables ?? {}).bottomLeftRadius ??
        (node.boundVariables ?? {}).topRightRadius ??
        (node.boundVariables ?? {}).bottomRightRadius,
    );
    if (alias) corners.boundVariable = alias;
  }

  return corners;
}

async function extractText(
  node: TextNode,
): Promise<NonNullable<RawNode["text"]>> {
  const typography: RawTypography = {
    fontName: node.fontName as { family: string; style: string },
    fontSize: node.fontSize as number,
  };
  if (typeof node.fontWeight === "number") {
    typography.fontWeight = node.fontWeight;
  }
  if (node.lineHeight && typeof node.lineHeight === "object") {
    typography.lineHeight = node.lineHeight;
  }
  if (typeof node.letterSpacing === "object" && "value" in node.letterSpacing) {
    typography.letterSpacing = node.letterSpacing.value;
  }
  const styleName = await readStyleName(node.textStyleId);
  if (styleName) {
    typography.textStyleId = String(node.textStyleId);
    typography.textStyleName = styleName;
  }
  const bound = node.boundVariables ?? {};
  const alias = aliasFromBound(
    (bound as Record<string, unknown>).fontFamily as VariableAlias | undefined,
  );
  if (alias) typography.boundVariable = alias;

  return {
    content: node.characters,
    typography,
  };
}

// Reads a component set's variant axes from Figma's variant property
// definitions and walks its variant children, tagging each with its parsed
// variant key. Returns false when the set declares no variant axes, so the
// caller falls back to treating it as a plain layout.
async function extractComponentSet(
  node: ComponentSetNode,
  raw: RawNode,
): Promise<boolean> {
  let axes: Record<string, string[]>;
  try {
    const defs = node.componentPropertyDefinitions;
    axes = {};
    for (const [key, def] of Object.entries(defs)) {
      if (
        def.type === "VARIANT" &&
        Array.isArray(def.variantOptions) &&
        def.variantOptions.length > 0
      ) {
        axes[key] = def.variantOptions;
      }
    }
  } catch {
    return false;
  }

  if (Object.keys(axes).length === 0) return false;

  raw.componentSet = { axes };
  raw.children = await Promise.all(
    node.children.map(async (child) => {
      const childRaw = await walkNode(child);
      const key = parseVariantName(child.name);
      if (Object.keys(key).length > 0) childRaw.variantKey = key;
      return childRaw;
    }),
  );
  return true;
}

async function extractInstance(
  node: InstanceNode,
): Promise<NonNullable<RawNode["instance"]>> {
  const mainComponent = await node.getMainComponentAsync();
  const mainComponentName = mainComponent?.name ?? "";
  const parentSet =
    mainComponent?.parent?.type === "COMPONENT_SET"
      ? mainComponent.parent
      : null;
  const componentSetName = parentSet?.name;

  const out: NonNullable<RawNode["instance"]> = {
    mainComponentName,
  };
  if (componentSetName) out.componentSetName = componentSetName;
  if (node.variantProperties) out.variantProperties = node.variantProperties;
  if (node.componentProperties) {
    out.componentProperties = node.componentProperties as Record<
      string,
      { type: string; value: unknown }
    >;
  }

  if (parentSet && node.variantProperties) {
    const states = extractStates(parentSet, node.variantProperties);
    if (states) out.states = states;
  }

  return out;
}

function extractStates(
  set: ComponentSetNode,
  currentVariantProps: Record<string, string>,
): Record<string, RawStateSnapshot> | undefined {
  const definitions = set.componentPropertyDefinitions;
  const stateKey = Object.keys(definitions).find((k) => /^state$/i.test(k));
  if (!stateKey) return undefined;

  const otherKeys = Object.keys(currentVariantProps).filter(
    (k) => k !== stateKey,
  );
  const result: Record<string, RawStateSnapshot> = {};

  for (const variant of set.children) {
    if (variant.type !== "COMPONENT") continue;
    const variantProps = parseVariantName(variant.name);
    if (!variantProps[stateKey]) continue;
    const matchesOthers = otherKeys.every(
      (k) => variantProps[k] === currentVariantProps[k],
    );
    if (!matchesOthers) continue;

    const stateName = variantProps[stateKey];
    const snapshot = snapshotState(variant);
    if (snapshot) result[stateName] = snapshot;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function parseVariantName(name: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of name.split(",")) {
    const [k, v] = part.split("=").map((s) => s.trim());
    if (k && v) out[k] = v;
  }
  return out;
}

function snapshotState(node: ComponentNode): RawStateSnapshot | null {
  const snapshot: RawStateSnapshot = {};
  if (
    "opacity" in node &&
    typeof node.opacity === "number" &&
    node.opacity < 1
  ) {
    snapshot.opacity = node.opacity;
  }
  if ("fills" in node && Array.isArray(node.fills)) {
    const fills = extractPaints(node, node.fills as readonly Paint[], "fills");
    if (fills.length > 0) snapshot.fills = fills;
  }
  if (
    "strokes" in node &&
    Array.isArray(node.strokes) &&
    node.strokes.length > 0
  ) {
    snapshot.strokes = extractPaints(
      node,
      node.strokes as readonly Paint[],
      "strokes",
    );
    if ("strokeWeight" in node && typeof node.strokeWeight === "number") {
      snapshot.strokeWeight = node.strokeWeight;
    }
  }
  if ("cornerRadius" in node) {
    const corners = extractCornerRadius(node);
    if (Object.keys(corners).length > 0) snapshot.corners = corners;
  }
  return Object.keys(snapshot).length > 0 ? snapshot : null;
}

function aliasFromBound(
  alias: VariableAlias | undefined | symbol | unknown,
): RawVariableAlias | undefined {
  if (!alias || typeof alias !== "object") return undefined;
  const a = alias as VariableAlias;
  if (a.type !== "VARIABLE_ALIAS" || typeof a.id !== "string") return undefined;
  const variable = figma.variables.getVariableById(a.id);
  if (!variable) return undefined;
  const collection = figma.variables.getVariableCollectionById(
    variable.variableCollectionId,
  );
  const out: RawVariableAlias = {
    type: "VARIABLE_ALIAS",
    id: a.id,
    name: variable.name,
  };
  if (collection?.name) out.collection = collection.name;
  return out;
}

async function readStyleName(
  styleId: string | symbol | undefined,
): Promise<string | undefined> {
  if (!styleId || typeof styleId !== "string") return undefined;
  const style = await figma.getStyleByIdAsync(styleId);
  return style?.name;
}
