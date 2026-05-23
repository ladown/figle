# Spec Format

The `Spec` is the canonical JSON contract between extractors (plugin or MCP preset) and the IDE agent. This document describes its shape and the rules every producer must follow.

The authoritative definition is the Zod schema in `packages/spec-schema/src/spec.ts`. This document explains it; the schema enforces it.

## Top level

```ts
type Spec = {
  version: "0.1";
  root: SpecNode;
  warnings: Warning[];
  meta: {
    figmaFileKey: string;
    extractedAt: string; // ISO 8601
  };
};
```

- **`version`** — schema version. Bumped on breaking changes. Producers must emit the version they were built against; consumers may reject mismatches.
- **`root`** — the top-level node of the extracted selection. Exactly one. If the user selects multiple frames, the producer wraps them in a synthetic `LayoutNode` with `semantic: null`.
- **`warnings`** — flat array of warnings emitted during resolution. Order matches traversal order. Never `null` — an empty array means "clean".
- **`meta`** — extraction provenance. Not consumed by the IDE agent but useful for debugging and caching keys.

## Nodes

```ts
type SpecNode = ComponentRef | LayoutNode | TextNode;
```

Discriminated by the presence of `$component` (ComponentRef) or by `$type` (`'layout'` or `'text'`).

### `ComponentRef`

A Figma component instance.

```ts
type ComponentRef = {
  $component: string; // e.g. 'UiButton' (mapped) or 'Button' (zero-config)
  importPath?: string; // e.g. '@/components/UiButton.vue'; omitted in zero-config mode
  props: Record<string, PropValue>;
  children?: SpecNode[]; // direct text children, when applicable
  slots?: Record<string, SpecNode[]>; // named slots, when the bridge config marks them
};

type PropValue = string | number | boolean | TokenRef;
```

Rules:

- `$component` is the **project-side** name (the `as:` field in the bridge config) when the config maps the instance, otherwise the **Figma-side** component (or component-set) name.
- `importPath` is **only emitted** when the bridge config provides a mapping. Without a mapping the field is absent and the IDE agent picks an import based on the project's existing components.
- `props` keys are project-side prop names after `propMap` translation when mapped; in zero-config mode they are the raw Figma `variantProperties` keys.
- `children` is reserved for the default slot when the bridge config marks it (typical case: a button label). In zero-config mode the producer treats every direct child of the instance as a default-slot child.
- `slots` is for components with multiple named slots. Each entry maps a slot name (project-side) to an array of nodes.
- With a config, the producer must NOT recurse into instance internals beyond declared slots. The internals belong to the project component.

### `LayoutNode`

A plain frame, group, or anything that didn't resolve to a project component.

```ts
type LayoutNode = {
  $type: "layout";
  semantic?: "card" | "section" | "list" | "header" | "footer" | "nav" | null;
  layout: {
    direction: "row" | "col";
    gap?: TokenRef | number;
    padding?: {
      top: TokenRef | number;
      right: TokenRef | number;
      bottom: TokenRef | number;
      left: TokenRef | number;
    };
    align?: "start" | "center" | "end" | "stretch" | "baseline";
    justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
    wrap?: boolean;
  };
  background?: TokenRef | string; // hex string when unbound
  border?: {
    color: TokenRef | string;
    width: number;
    radius: TokenRef | number;
  };
  size?: {
    width?: number | "fill" | "hug";
    height?: number | "fill" | "hug";
  };
  children: SpecNode[];
};
```

Rules:

- `semantic` is an optional, opt-in hint. The plugin **does not** emit it by default (no name-regex or font-size heuristics — see [`./RESOLUTION.md`](./RESOLUTION.md) § Semantic hints). The field stays in the schema for future config-driven hints.
- `layout.direction` is required even when there's only one child — the IDE agent uses it to decide flex vs block.
- Numeric values are always in pixels. Token references should be preferred whenever a bound variable exists.

### `TypographyProps`

Raw font properties, emitted on `TextNode.typography` when no Figma variable or text style is bound. Same union pattern as `LayoutNode.background` (`TokenRef | string`).

```ts
type TypographyProps = {
  fontFamily: string; // e.g. 'Inter'
  fontStyle?: string; // e.g. 'Regular', 'Bold'
  fontWeight?: number; // numeric weight when reported by Figma
  fontSize: number; // px
  lineHeight?: number; // px, only when Figma reports PIXELS
  letterSpacing?: number; // px
};
```

Consumers discriminate `typography` against `TokenRef` by the presence of `$token`.

### `TextNode`

```ts
type TextNode = {
  $type: "text";
  content: string;
  typography?: TokenRef | TypographyProps;
  color?: TokenRef | string;
  semantic?:
    | "heading-1"
    | "heading-2"
    | "heading-3"
    | "heading-4"
    | "body"
    | "caption"
    | "label"
    | null;
};
```

Rules:

- `content` is the literal text. Multi-line text retains newlines as `\n`.
- `typography` is a `TokenRef` when a Figma variable or text style is bound; otherwise the producer emits raw `TypographyProps` so the IDE agent can still render the text with the correct font.
- `color` follows the same pattern as `LayoutNode.background`: `TokenRef` when bound, hex string when ad-hoc, omitted when no fill.

## Token references

```ts
type TokenRef = {
  $token: string; // project-side token path (or figma-side path in zero-config mode)
  fallback?: string | number | TypographyProps; // raw resolved value
};
```

- `$token` is the **project-side** path (the value in `BridgeConfig.tokens`) when the config maps the Figma variable/style; in zero-config mode it is the Figma-side path (e.g. `color/primary/500`).
- `fallback` is **always populated** by the plugin with the resolved value the Figma node was actually using. The IDE agent uses it as a safety net: if the project doesn't actually expose `$token`, the agent can still render with the raw value (hex for colors, number for spacing/radius, `TypographyProps` for typography). The shape of the fallback follows the value type — strings for colors, numbers for spacing/radius, structured `TypographyProps` for typography.

## Warnings

```ts
type Warning = {
  nodeId: string; // Figma node id
  nodePath: string; // e.g., 'DemoCard > Card > Header > Title'
  code: WarningCode;
  message: string; // human-readable, English
};

type WarningCode =
  | "UNBOUND_COLOR"
  | "UNBOUND_TYPOGRAPHY"
  | "UNBOUND_SPACING"
  | "UNBOUND_RADIUS"
  | "UNKNOWN_COMPONENT"
  | "UNMAPPED_TOKEN"
  | "AMBIGUOUS_VARIANT";
```

Each warning code's exact meaning is documented in [`./RESOLUTION.md`](./RESOLUTION.md).

Warnings are informational, not fatal. The spec extracts successfully regardless of warning count. The plugin UI shows them in a side panel; the MCP preset surfaces them in the chat response.

## Example

Bridge config:

```ts
{
  tokens: { 'typography/heading/lg': 'typography.heading.lg' },
  components: {
    'Card':   { import: '@/components/UiCard.vue',   as: 'UiCard' },
    'Button': { import: '@/components/UiButton.vue', as: 'UiButton',
                propMap: { Variant: 'variant', Size: 'size' } }
  }
}
```

Resulting `Spec` (for the `DemoCard` fixture in `PLAN.md` § Verification):

```json
{
  "version": "0.1",
  "root": {
    "$component": "UiCard",
    "importPath": "@/components/UiCard.vue",
    "props": { "variant": "elevated" },
    "children": [
      {
        "$type": "text",
        "content": "Welcome",
        "typography": { "$token": "typography.heading.lg" }
      },
      {
        "$component": "UiButton",
        "importPath": "@/components/UiButton.vue",
        "props": { "variant": "primary", "size": "md" },
        "children": [{ "$type": "text", "content": "Get started" }]
      }
    ]
  },
  "warnings": [],
  "meta": {
    "figmaFileKey": "abc123",
    "extractedAt": "2026-05-22T10:30:00.000Z"
  }
}
```

## Determinism

For the same input (Figma file + selection + bridge config), the producer must emit a byte-identical `Spec` after sorting object keys. The pass criterion #1 in `PLAN.md` § Verification depends on this.

Specifically:

- Object keys are sorted alphabetically by the serializer before JSON output.
- Array order follows traversal order (Figma child order, top-to-bottom).
- ISO timestamps in `meta` are excluded from determinism comparisons in tests.
