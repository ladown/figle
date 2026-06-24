# Bridge Config

The bridge config is the user project's mapping file. It tells the resolver:

- How Figma variable/style names correspond to project token paths.
- How Figma component names correspond to project component imports and props.
- Which target stack the project uses.

**The config is optional and shared by both branches.** Without it both branches still work — Figma-side names are kept as-is and the IDE agent resolves them against the project. With it the producer pre-translates names into project-side aliases (and Branch A's plugin additionally emits mapping warnings — `UNKNOWN_COMPONENT`, `UNMAPPED_TOKEN` — when the design references something the config doesn't cover). See [`./RESOLUTION.md`](./RESOLUTION.md) § Config-optional mode.

**Delivery differs by branch:**

- **Branch A (plugin)** reads it from `clientStorage`, populated by a one-time `npx figle sync` clipboard paste in the plugin's Settings tab.
- **Branch B (MCP skill)** reads it directly from the file via Filesystem MCP at every `/figle` invocation.

The authoritative schema is in `packages/spec-schema/src/config.ts`. This document explains it.

## File location

In the user's project:

```
<user-project>/
  figle.config.ts
```

The file uses the `defineConfig` helper from `@figle/cli` for type checking.

## Shape

```ts
import { defineConfig } from "@figle/cli";

export default defineConfig({
  stack: "vue3-ts-tailwind",
  tokens: {
    "color/primary/500": "colors.primary.500",
    "color/surface/elevated": "colors.surface.elevated",
    "typography/heading/lg": "typography.heading.lg",
    "spacing/4": "spacing.4",
    "radius/md": "borderRadius.md",
  },
  components: {
    Button: {
      import: "@/components/UiButton.vue",
      as: "UiButton",
      propMap: { Variant: "variant", Size: "size", State: "state" },
      slots: { default: "auto-text" },
    },
    Card: {
      import: "@/components/UiCard.vue",
      as: "UiCard",
      propMap: { Variant: "variant" },
      slots: { default: "auto-children" },
    },
  },
});
```

## Fields

### `stack` (required)

Target stack identifier. V1 supports only `'vue3-ts-tailwind'`. Future values: `'react-ts-tailwind'`, `'svelte-ts-tailwind'`, etc.

Used by:

- The system prompt to select the right code-generation rules.
- The serializer in minor ways (e.g., default file extension for `importPath`).

### `tokens` (required, may be empty)

A flat map from Figma variable/style names → project token paths.

- **Key**: the Figma-side name, including the variable's collection path with `/` separators. For example, a variable inside collection `color`, group `primary`, name `500` becomes `color/primary/500`.
- **Value**: the project-side path. For Tailwind, this is the dotted path in `tailwind.config.ts` theme (e.g., `colors.primary.500`). For CSS-in-JS or vanilla CSS, this is whatever path your token system uses (e.g., `--color-primary-500`).

Resolution falls back to a warning (`UNMAPPED_TOKEN`) if a bound Figma variable isn't in this table.

The IDE agent uses these values to choose Tailwind class names. The agent prompt template explains the conversion: `colors.primary.500` → `bg-primary-500` / `text-primary-500` based on context.

### `components` (required, may be empty)

A map from Figma component (or component set) names → project component descriptors.

- **Key**: the Figma component name. For component sets (those with variants), use the set's name; the resolver reads variants automatically.
- **Value**: a descriptor object.

#### Component descriptor

```ts
type ComponentDescriptor = {
  import: string; // module specifier for the import
  as: string; // local name used in generated code
  propMap?: Record<string, string>; // Figma variant prop → project prop
  slots?: Record<string, SlotMode>; // see slot extraction modes
};

type SlotMode =
  | "auto-text" // first TEXT descendant
  | "auto-children" // all direct children
  | { named: Record<string, "first-icon" | "last-icon" | "first-text"> };
```

**`import`** — exact string used in the generated `import` statement. Aliases like `@/` are kept as-is.

**`as`** — the identifier the agent uses in JSX/template. Convention: PascalCase, prefixed with the project's component prefix (e.g., `Ui`).

**`propMap`** — Figma variant names are typically PascalCase (`Variant`, `Size`); project props are typically camelCase (`variant`, `size`). The map translates. Unmapped variant props are passed through with their Figma name; if a variant value is not a valid prop value, the resolver emits `AMBIGUOUS_VARIANT`.

**`slots`** — declares which parts of the instance should be extracted as children. See [`./RESOLUTION.md`](./RESOLUTION.md) § Slot recursion. If `slots` is omitted, the resolver treats the component as opaque (no children extracted).

### `output` (optional)

```ts
output?: {
  dir: string; // project-relative folder, e.g. "src/components/figma"
};
```

Where `figle paste` writes `specs/`, `assets/`, and `PROMPT.md`. The destination is resolved from these sources, highest priority first:

1. `figle paste --pick` — opens a native folder dialog (Finder on macOS via `osascript`, Explorer on Windows, `zenity` on Linux) and uses the selected folder. Interactive, per-run. `--pick` and `--out` cannot be combined.
2. The `--out <dir>` flag passed to `figle paste` (per-run override).
3. The `outputDir` embedded in the copied payload — the **Output folder** field in the plugin's Settings tab (a per-extract designer choice, persisted in `clientStorage`).
4. `output.dir` from this config (the project default).
5. The built-in default `.figle`.

All of them go through the same safety validation: the path must be project-relative, must not escape the project (`..`), and must not live under `node_modules`. A folder picked via `--pick` is relativized to the project first, so selecting a folder outside the project is rejected. An invalid value aborts the paste with an error.

The native dialog runs only in the CLI (Node on the user's machine). The plugin itself never opens a dialog or touches the filesystem and keeps `allowedDomains: ["none"]`.

The plugin cannot write to disk itself (sandboxed, `allowedDomains: ["none"]`), so the Output folder field is advisory: it travels inside the payload and `figle paste` performs the actual write.

## Versioning and hashes

The CLI (`npx figle sync`) computes a hash of the resolved config and embeds it in the serialized blob. Branch A (the plugin) displays this hash in its header. When the hash changes, the plugin shows a banner: "config out of date — re-paste".

## Per-project conventions

- One bridge config per project. Keep it in version control.
- Token keys mirror Figma's variable structure 1:1. If you rename a Figma variable, update the key.
- Component keys are case-sensitive and must match Figma exactly.
- The token map and the project's actual token system (Tailwind config / CSS variables) must agree. If `colors.primary.500` doesn't exist in `tailwind.config.ts`, the IDE agent will hallucinate a class name. There is no automatic verification in V1 — discipline is on the user.

## What the bridge config does NOT do

- It does not declare component **states** (hover, focus, disabled). State extraction is a post-MVP feature driven by MDX docs or Figma annotations, not by this config.
- It does not declare component **slots' default content**. The project component owns its defaults.
- It does not declare **layout rules** for plain frames. Layout is extracted from Figma per-node.
- It does not contain **secrets** (API keys, tokens). There is no API key anywhere in this project — code generation runs in the user's IDE agent with the user's existing subscription.

## Example minimal config

For someone starting fresh with no design tokens or components yet:

```ts
import { defineConfig } from "@figle/cli";

export default defineConfig({
  stack: "vue3-ts-tailwind",
  tokens: {},
  components: {},
});
```

This is valid. Every Figma node will resolve as a `LayoutNode` or `TextNode`, every color will produce an `UNBOUND_COLOR` warning, and the IDE agent will fall back to literal Tailwind classes. Useful as a starting point — fill in the config as the design system grows.
