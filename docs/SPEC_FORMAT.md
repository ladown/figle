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

A Figma component instance that resolved to a project component.

```ts
type ComponentRef = {
  $component: string; // e.g. 'UiButton'
  importPath: string; // e.g. '@/components/UiButton.vue'
  props: Record<string, PropValue>;
  children?: SpecNode[]; // direct text children, when applicable
  slots?: Record<string, SpecNode[]>; // named slots, when the bridge config marks them
};

type PropValue = string | number | boolean | TokenRef;
```

Rules:

- `$component` is the **project-side** name (the `as:` field in the bridge config), not the Figma component name.
- `props` keys are project-side prop names (after `propMap` translation).
- `children` is reserved for the default slot only and only when the producer can confidently identify a single content slot (typical case: a button label).
- `slots` is for components with multiple named slots. Each entry maps a slot name (project-side) to an array of nodes.
- The producer must NOT recurse into instance internals beyond declared slots. The internals belong to the project component.

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

- `semantic` is a soft hint based on naming and structure. Never authoritative. The IDE agent may use it for HTML element selection (e.g., `semantic: 'nav'` → `<nav>`).
- `layout.direction` is required even when there's only one child — the IDE agent uses it to decide flex vs block.
- Numeric values are always in pixels. Token references should be preferred whenever a bound variable exists.

### `TextNode`

```ts
type TextNode = {
  $type: "text";
  content: string;
  typography?: TokenRef;
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
- `typography` references a bound text style or composite typography variable.
- If both `typography` and individual properties (font size, weight, etc.) are needed, prefer `typography` alone — individual properties go in the bridge config behind the token.

## Token references

```ts
type TokenRef = {
  $token: string; // project-side token path
  fallback?: string; // raw value, included when designer set both var + override
};
```

- `$token` is the **project-side** path (the value in `BridgeConfig.tokens`), not the Figma variable name. Translation happens during resolution.
- `fallback` appears only when the Figma node has both a bound variable and a non-default override applied (rare but legal).

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
        "typography": { "$token": "typography.heading.lg" },
        "semantic": "heading-2"
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
