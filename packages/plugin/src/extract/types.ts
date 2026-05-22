export type RawVariableAlias = {
  type: "VARIABLE_ALIAS";
  id: string;
  name: string;
  collection?: string;
};

export type RawPaint =
  | {
      type: "SOLID";
      color: { r: number; g: number; b: number };
      opacity?: number;
      boundVariable?: RawVariableAlias;
    }
  | {
      type: Exclude<Paint["type"], "SOLID">;
    };

export type RawAutoLayout = {
  mode: BaseFrameMixin["layoutMode"] | "WRAP";
  itemSpacing?: number;
  itemSpacingVar?: RawVariableAlias;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingVars?: {
    top?: RawVariableAlias;
    right?: RawVariableAlias;
    bottom?: RawVariableAlias;
    left?: RawVariableAlias;
  };
  primaryAxisAlign?: BaseFrameMixin["primaryAxisAlignItems"];
  counterAxisAlign?: BaseFrameMixin["counterAxisAlignItems"];
  wrap?: boolean;
};

export type RawCornerRadius = {
  uniform?: number;
  topLeft?: number;
  topRight?: number;
  bottomLeft?: number;
  bottomRight?: number;
  boundVariable?: RawVariableAlias;
};

export type RawTypography = {
  fontName: { family: string; style: string };
  fontSize: number;
  fontWeight?: number;
  lineHeight?: LineHeight;
  letterSpacing?: number;
  textStyleId?: string;
  textStyleName?: string;
  boundVariable?: RawVariableAlias;
};

export type RawSize = {
  width: number;
  height: number;
  horizontalSizing?: "FIXED" | "HUG" | "FILL";
  verticalSizing?: "FIXED" | "HUG" | "FILL";
};

export type RawNode = {
  id: string;
  name: string;
  type: SceneNode["type"];
  visible: boolean;
  size?: RawSize;
  autoLayout?: RawAutoLayout;
  fills?: RawPaint[];
  fillStyleName?: string;
  strokes?: RawPaint[];
  strokeStyleName?: string;
  strokeWeight?: number;
  corners?: RawCornerRadius;
  text?: {
    content: string;
    typography: RawTypography;
  };
  instance?: {
    mainComponentName: string;
    componentSetName?: string;
    variantProperties?: Record<string, string>;
    componentProperties?: Record<string, { type: string; value: unknown }>;
  };
  children?: RawNode[];
};
