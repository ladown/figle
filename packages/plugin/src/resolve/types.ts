import type {
  ComponentRef,
  IconNode,
  ImageNode,
  LayoutNode,
  SpecNode,
  TextNode,
  Warning,
} from "@figle/spec-schema";
import type { RawAsset } from "../extract/index.js";

export type ResolveMeta = {
  nodeId: string;
  nodePath: string;
};

export type ResolvedComponentRef = Omit<ComponentRef, "children" | "slots"> & {
  _meta: ResolveMeta;
  children?: ResolvedNode[];
  slots?: Record<string, ResolvedNode[]>;
};
export type ResolvedLayoutNode = Omit<LayoutNode, "children"> & {
  _meta: ResolveMeta;
  children: ResolvedNode[];
};
export type ResolvedTextNode = TextNode & { _meta: ResolveMeta };

export type ResolvedIconNode = Omit<IconNode, "src"> & {
  _meta: ResolveMeta;
  _asset: RawAsset;
};

export type ResolvedImageNode = Omit<ImageNode, "src"> & {
  _meta: ResolveMeta;
  _asset?: RawAsset;
};

export type ResolvedNode =
  | ResolvedComponentRef
  | ResolvedLayoutNode
  | ResolvedTextNode
  | ResolvedIconNode
  | ResolvedImageNode;

export type ResolveResult = {
  root: ResolvedNode;
  warnings: Warning[];
};

export type StripMeta<T> = T extends { _meta: ResolveMeta }
  ? Omit<T, "_meta">
  : T;

export type SerializableNode = SpecNode;
