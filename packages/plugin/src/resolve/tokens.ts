import type { TokenRef } from "@figle/spec-schema";
import type { RawVariableAlias } from "../extract/index.js";
import type { ResolveContext } from "./context.js";

export function lookupVariable(
  ctx: ResolveContext,
  alias: RawVariableAlias,
): TokenRef | null {
  const key = canonicalVariableKey(alias);
  const path = ctx.config.tokens[key] ?? ctx.config.tokens[alias.name];
  if (!path) return null;
  return { $token: path };
}

export function lookupStyle(
  ctx: ResolveContext,
  styleName: string,
): TokenRef | null {
  const path = ctx.config.tokens[styleName];
  if (!path) return null;
  return { $token: path };
}

function canonicalVariableKey(alias: RawVariableAlias): string {
  if (!alias.collection) return alias.name;
  return `${alias.collection}/${alias.name}`;
}
