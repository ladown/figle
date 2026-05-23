import type { TokenRef, TypographyProps } from "@figle/spec-schema";
import type { RawVariableAlias } from "../extract/index.js";
import type { ResolveContext } from "./context.js";

export type Fallback = string | number | TypographyProps;

export function lookupVariable(
  ctx: ResolveContext,
  alias: RawVariableAlias,
  fallback?: Fallback,
): { ref: TokenRef; mapped: boolean } {
  const key = canonicalVariableKey(alias);
  if (!ctx.config) {
    return { ref: makeRef(key, fallback), mapped: true };
  }
  const path = ctx.config.tokens[key] ?? ctx.config.tokens[alias.name];
  if (path) {
    return { ref: makeRef(path, fallback), mapped: true };
  }
  return { ref: makeRef(key, fallback), mapped: false };
}

export function lookupStyle(
  ctx: ResolveContext,
  styleName: string,
  fallback?: Fallback,
): { ref: TokenRef; mapped: boolean } {
  if (!ctx.config) {
    return { ref: makeRef(styleName, fallback), mapped: true };
  }
  const path = ctx.config.tokens[styleName];
  if (path) {
    return { ref: makeRef(path, fallback), mapped: true };
  }
  return { ref: makeRef(styleName, fallback), mapped: false };
}

function makeRef(token: string, fallback: Fallback | undefined): TokenRef {
  if (fallback === undefined) return { $token: token };
  return { $token: token, fallback };
}

function canonicalVariableKey(alias: RawVariableAlias): string {
  if (!alias.collection) return alias.name;
  return `${alias.collection}/${alias.name}`;
}
