import type {
  RawAutoLayout,
  RawCornerRadius,
  RawNode,
  RawPaint,
  RawSize,
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

  if ("children" in node && Array.isArray(node.children)) {
    raw.children = await Promise.all(node.children.map(walkNode));
  }

  return raw;
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

async function extractInstance(
  node: InstanceNode,
): Promise<NonNullable<RawNode["instance"]>> {
  const mainComponent = await node.getMainComponentAsync();
  const mainComponentName = mainComponent?.name ?? "";
  const componentSetName =
    mainComponent?.parent?.type === "COMPONENT_SET"
      ? mainComponent.parent.name
      : undefined;

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
  return out;
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
