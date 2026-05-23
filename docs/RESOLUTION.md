# Resolution Algorithm

This document specifies how each Figma node is turned into a `SpecNode`. The algorithm runs in `packages/plugin/src/resolve/`. Branch B (MCP preset) implements the same rules in its adapter.

The input is a `RawNode` (the IR produced by `extract/`) plus an **optional** `BridgeConfig`. The output is a `ResolvedNode` and zero or more `Warning`s appended to a shared accumulator.

## Config-optional mode

Bridge config is optional. Without it the plugin still produces a valid `Spec`:

- **Component instances** become `ComponentRef`s whose `$component` is the raw Figma component (or component-set) name, with `importPath` omitted. `props` carry the Figma `variantProperties` unchanged.
- **Bound variables / styles** become `TokenRef`s whose `$token` is the full Figma path (e.g. `color/primary/500`).
- **No warnings are emitted.** Without a config the plugin has no opinion on what should be bound to what, so neither mapping warnings (`UNKNOWN_COMPONENT`, `UNMAPPED_TOKEN`, `AMBIGUOUS_VARIANT`) nor hygiene warnings (`UNBOUND_*`) are useful — they would just add noise to a quick extraction.

With a config, the same steps below run end-to-end and produce project-side names instead of Figma-side ones.

## Order of checks (per node)

The order matters. Earlier matches win.

### 1. Component instance lookup

If the Figma node is a `INSTANCE` (`node.type === 'INSTANCE'`):

1. Read `mainComponent.name` and, if it's part of a component set, the set's name.
2. Look up the name in `config.components`. The lookup key is the component set name when variants exist, otherwise the component name.
3. **Hit** — the node resolves to a `ComponentRef`:
   - `$component` ← `config.components[name].as`
   - `importPath` ← `config.components[name].import`
   - `props` ← Figma's `node.variantProperties`, translated through `config.components[name].propMap`. Unmapped variant props are passed through unchanged.
   - `children` / `slots` ← see "Slot recursion" below.
   - **Stop traversal** for this branch. Do NOT walk the instance's internal children unless they're declared slots.
4. **Miss** — go to step 2.

### 2. Instance with no mapping → `UNKNOWN_COMPONENT`

If step 1 produced no hit:

- Emit warning `UNKNOWN_COMPONENT` with `message: "Figma component 'X' has no mapping in bridge config"`.
- Fall through to step 3+ (treat the instance as if it were a plain frame). Never silently drop the node.

### 3. Per-property: bound variable

For each style-relevant property (fill, stroke, text color, typography, spacing, corner radius):

1. Check `node.boundVariables[property]`. If present, read the variable's name.
2. Look up the variable name in `config.tokens`.
3. **Hit** — emit a `TokenRef` with `$token: config.tokens[varName]`.
4. **Miss** — emit warning `UNMAPPED_TOKEN` with the offending Figma variable name. Fall through to step 4 for this property.

### 4. Per-property: bound style

If no variable was bound, check `node.fillStyleId` / `node.textStyleId` / etc.

1. Read the style's name.
2. Look up in `config.tokens`. (Styles and variables share the same lookup table — names should be unique.)
3. Hit → `TokenRef`. Miss → `UNMAPPED_TOKEN` warning, fall through.

### 5. Per-property: raw value

If neither a variable nor a style is bound:

- Emit the literal value (hex for colors, number for spacing, font properties for typography).
- Emit one of: `UNBOUND_COLOR`, `UNBOUND_TYPOGRAPHY`, `UNBOUND_SPACING`, `UNBOUND_RADIUS`.

This is the **designer hygiene signal**. The spec still includes the value — the warning tells the designer (or the IDE agent) that this was ad-hoc.

### 6. Semantic hints — intentionally not inferred by the plugin

The plugin **does not** emit `semantic` on `LayoutNode` or `TextNode`. The field stays in the `Spec` schema as an optional opt-in (for future config-driven hints), but no regex over layer names and no font-size buckets are applied. Reasoning:

- Layer-naming conventions are project-specific. A hard-coded `/heading-1|h1/` regex would either misfire or be silently wrong on any other convention.
- Font-size → heading-level mapping imposes a type scale the plugin has no way of knowing.
- The IDE agent already has the project's `CLAUDE.md`, existing components, and real type scale. It is the right place to decide whether a text node is an `<h1>` or just emphasized body text.

If the user wants project-specific hints in the future, the path is a config-driven map (e.g. `semanticHints: { "heading-1": "Heading/XL" }`), added post-MVP.

## Slot recursion

By default, when an instance resolves (step 1, hit), the resolver does NOT walk into its children — the project component owns its internals.

Exception: when `config.components[name].slots` is declared.

```ts
'Button': {
  import: '@/components/UiButton.vue',
  as: 'UiButton',
  slots: { default: 'auto-text' }  // see options below
}
```

Slot extraction modes:

- `'auto-text'` — find the first `TEXT` child of the instance, extract it as a `TextNode`, and put it in `children` as the default slot content. Used for buttons with a label.
- `'auto-children'` — extract all top-level children of the instance and put them in `children`. Use sparingly — this is only correct when the project component truly passes children through unmodified.
- `{ named: { iconLeft: 'first-icon', iconRight: 'last-icon' } }` — specific extraction strategies per named slot.

If a slot mode would walk into another nested instance, that nested instance is itself resolved recursively (the full algorithm runs on it).

## Ambiguous variants

When a Figma instance has variant properties that aren't covered by `propMap` AND aren't pass-through-safe (e.g., they contain values that aren't valid prop values in the target stack), emit warning `AMBIGUOUS_VARIANT` and skip that prop in the output `props` object.

## Caching

Resolving the same component definition is expensive (async `getMainComponentAsync` calls). The resolver maintains a `Map<componentId, ResolvedComponentDef>` for the duration of a single extraction. The cache is dropped between extractions because the bridge config may have changed.

## Warning codes — full list

| Code                 | Triggered when                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `UNBOUND_COLOR`      | A fill or stroke uses a raw color value, with no Figma variable or style bound.                |
| `UNBOUND_TYPOGRAPHY` | A text node has ad-hoc font properties instead of a text style or typography variable.         |
| `UNBOUND_SPACING`    | Padding or gap is set as a literal pixel value with no spacing variable bound.                 |
| `UNBOUND_RADIUS`     | Corner radius is a literal pixel value with no variable.                                       |
| `UNKNOWN_COMPONENT`  | A Figma instance's component name is not in `config.components`.                               |
| `UNMAPPED_TOKEN`     | A Figma variable or style is bound, but its name is not in `config.tokens`.                    |
| `AMBIGUOUS_VARIANT`  | A variant property cannot be safely translated through `propMap` and is not pass-through-safe. |

All warnings include `nodeId`, `nodePath` (human-readable like `DemoCard > Card > Header > Title`), `code`, and `message`. Messages are English, present tense, single sentence.

## What the algorithm does NOT do

- It does not infer component-like behavior from raw frames (e.g., "this looks like a button"). Only declared components resolve. Use step 6 for soft hints only.
- It does not attempt to fix designer mistakes (e.g., suggest a nearby token for an unbound color). Just report.
- It does not optimize the tree (e.g., collapse wrapper frames). The IDE agent is responsible for HTML structure.
- It does not handle Figma effects (shadows, blurs) in V1. Effects are added later behind a separate token category.
