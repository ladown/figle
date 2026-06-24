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

export type RawAsset = {
  kind: "icon" | "image";
  format: "svg" | "png";
  bytes: Uint8Array;
};

export type RawStateSnapshot = {
  opacity?: number;
  fills?: RawPaint[];
  fillStyleName?: string;
  strokes?: RawPaint[];
  strokeStyleName?: string;
  strokeWeight?: number;
  corners?: RawCornerRadius;
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
    states?: Record<string, RawStateSnapshot>;
  };
  asset?: RawAsset;
  imageOversize?: { width: number; height: number };
  // Present only on a COMPONENT_SET whose variant axes were read from Figma's
  // `componentPropertyDefinitions`. When absent, a COMPONENT_SET resolves to a
  // plain layout (the zero-variant fallback).
  componentSet?: {
    axes: Record<string, string[]>;
  };
  // Present on each COMPONENT child of such a set: its parsed variant name
  // (e.g. { Style: "primary", Size: "sm", State: "default" }).
  variantKey?: Record<string, string>;
  children?: RawNode[];
};
