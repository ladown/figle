# figle — Figma → Spec → IDE agent: plugin MVP

## Context

The user's goal is **automating UI coding via an AI agent that already lives in their IDE** (Claude Code, Cursor, etc.). The agent has the project context — `CLAUDE.md`, existing components, conventions, tokens — that an external LLM call would have to rebuild from scratch each time.

So this project does **not** call any LLM provider directly. It produces a structured, semantically rich `Spec` (JSON) from Figma and hands it to the agent on the user's machine. The agent owns code generation; we own the quality of the `Spec`.

The plugin's value is in the JSON: resolving tokens into references to project tokens, resolving instances into references to actual project components, and emitting clear warnings when the designer breaks discipline.

V1 target stack: Vue 3 + TypeScript + TailwindCSS. The architecture is extensible to other stacks later, but stack selection lives in the agent's prompt, not in the plugin's output.

## Architecture

### Repository — pnpm monorepo

```
figle/
  packages/
    spec-schema/            # SHARED CONTRACT: TS types + zod schemas for Spec, BridgeConfig, agent prompt template
    plugin/                 # Branch A: Figma plugin (create-figma-plugin) — works without a Dev seat
    bridge/                 # @figle/cli — npm package for user projects (config sync + spec materialization)
    mcp-preset/             # Branch B (post-MVP): Skill/slash command for Claude Code — requires Dev seat
  examples/
    demo-vue-app/           # reference consumer + e2e fixture
```

**Two consumption branches, one shared contract.** `spec-schema` is the single canonical contract. Both branches produce the same `Spec` and surface the same agent prompt template. Branch A (plugin) ships first, because without a Dev seat it is the only available path and the plugin will force us to bring the `Spec` to boring-level completeness. Branch B (MCP) is a thin wrapper added later.

Why monorepo: `spec-schema` is the contract between plugin and project. Duplicating types across separate repos guarantees drift. One PR can evolve the spec atomically.

### Inside the plugin — three modules + an orchestrator

- **`extract/`** — Figma tree traversal. `walkNode(node) → RawNode[]`. No interpretation; preserves every binding, variant prop, and style as-is.
- **`resolve/`** — `RawNode + BridgeConfig → ResolvedNode`. The algorithm from the section below lives here. Accumulates `Warning[]`.
- **`serialize/`** — `ResolvedNode → Spec` + Zod-schema validation.
- **`orchestrator.ts`** — wires `extract → resolve → serialize`. There is no AI call.

### Bridge config in the user's project

The file `figle.config.ts` in the user's project is the single source of truth for mapping:

```ts
import { defineConfig } from "@figle/cli";

export default defineConfig({
  stack: "vue3-ts-tailwind",
  tokens: {
    "color/primary/500": "colors.primary.500",
    "typography/heading/lg": "typography.heading.lg",
  },
  components: {
    Button: {
      import: "@/components/UiButton.vue",
      as: "UiButton",
      propMap: { Variant: "variant", Size: "size" },
    },
    Card: { import: "@/components/UiCard.vue", as: "UiCard" },
  },
});
```

### How the config reaches the plugin

The plugin sandbox cannot read the filesystem or make arbitrary `fetch` calls. We choose **one-time paste in Settings + storage in `figma.clientStorage`**.

Flow: in the user's project, `npx figle sync` serializes the config into a JSON blob and copies it to the clipboard; the user pastes it into the plugin once. The config hash is shown in the UI header; when the config changes, a "config out of date" banner appears. A local HTTP server in the project was rejected as an extra process and a port-conflict footgun; clipboard reads inside Figma are gesture-gated and unreliable.

### How the Spec reaches the agent

The plugin sandbox also cannot write to the filesystem. We mirror the config flow in reverse:

1. Plugin runs `extract → resolve → serialize` on the current selection.
2. Plugin UI shows the `Spec` (pretty-printed JSON), the warnings panel, and a **Copy** button. The Copy button puts a single JSON blob on the clipboard.
3. In the user's project, `npx figle paste` reads the clipboard, validates against `SpecSchema`, and writes:
   - `.figle/last-spec.json` — the validated Spec
   - `.figle/PROMPT.md` — a ready-to-paste instruction for the IDE agent ("Generate a Vue 3 SFC from `.figle/last-spec.json` following project conventions in `CLAUDE.md` and existing components in `src/components/`")
4. The user opens Claude Code (or Cursor) in the project and either pastes `.figle/PROMPT.md` content or runs a project-level slash command that loads it. The agent reads the Spec, the project files, and emits the SFC.

The plugin never invokes an LLM. The agent never invokes Figma. The `Spec` is the only thing crossing the boundary.

### Spec schema (key shapes)

```ts
type Spec = {
  version: '0.1'
  root: SpecNode
  warnings: Warning[]
  meta: { figmaFileKey: string; extractedAt: string }
}

type SpecNode = ComponentRef | LayoutNode | TextNode

type TokenRef = { $token: string; fallback?: string }

type ComponentRef = {
  $component: string
  importPath: string
  props: Record<string, string | number | boolean | TokenRef>
  children?: SpecNode[]
  slots?: Record<string, SpecNode[]>
}

type LayoutNode = {
  $type: 'layout'
  semantic?: 'card' | 'section' | 'list' | 'header' | null
  layout: { direction: 'row' | 'col'; gap?: TokenRef | number; padding?: ...; align?: ...; justify?: ... }
  background?: TokenRef | string
  border?: { color: TokenRef | string; width: number; radius: TokenRef | number }
  children: SpecNode[]
}

type TextNode = {
  $type: 'text'
  content: string
  typography?: TokenRef
  color?: TokenRef | string
  semantic?: 'heading-1' | 'heading-2' | 'body' | 'caption' | null
}

type Warning = {
  nodeId: string
  nodePath: string
  code: 'UNBOUND_COLOR' | 'UNBOUND_TYPOGRAPHY' | 'UNKNOWN_COMPONENT' | 'UNMAPPED_TOKEN'
  message: string
}
```

### Resolution algorithm (per node, in this order)

1. **Component Instance?** Read `mainComponent.name` (+ the component set name for variants). Hit in `config.components` → assemble `props` from `node.variantProperties` via `propMap`, recurse only into child slots marked as slots; otherwise stop — the final Vue component owns its internals.
2. **Instance with no mapping** → warning `UNKNOWN_COMPONENT` + fall back to layout extraction (never silent!).
3. **Bound variable** for fill/stroke/typography/spacing → `config.tokens[name]`. Hit → `TokenRef`. Miss → `UNMAPPED_TOKEN` + raw value.
4. **Bound style** (paint/text style by name) → same lookup table.
5. **Raw value** → literal + `UNBOUND_*` warning. This is the "designer is breaking discipline" signal.
6. **Semantic hint** by name and structure (`/card/i`, `/btn|button/i`, a single text child with a large font → heading). Hint, not authoritative.

Risk: deep instance nesting → many `getMainComponentAsync` calls. Mitigation: a `Map<componentId, ResolvedComponent>` cache scoped to a single extraction.

### Agent prompt template

`spec-schema` exports a single string constant — the prompt template the IDE agent should follow when materializing a `Spec` into a SFC. The template is stack-aware via a small placeholder set:

- Stack-specific style rules (Vue 3 + TS + Tailwind for V1).
- Output rules: one SFC, `<script setup lang="ts">`, no inline color hexes when a token is available, components referenced by their `as:` alias from the config.
- A note that warnings in `spec.warnings` describe designer-hygiene issues; the agent should annotate the SFC with `<!-- TODO: ... -->` comments rather than silently fixing them.

The template is plain text, not interpolated server-side. The `bridge` CLI substitutes the placeholders when generating `.figle/PROMPT.md`.

### Manifest

`packages/plugin/manifest.json` declares `networkAccess: { allowedDomains: ["none"] }`. The plugin makes zero external requests by design — this is enforced at manifest level so a reviewer can confirm at a glance that no data leaves the sandbox.

## MVP scope

**IN**: TS scaffold via create-figma-plugin · the `extract/resolve/serialize` pipeline · token and component resolution · `clientStorage` for the bridge config · warnings panel · Spec panel with Copy button · `npx figle sync` and `npx figle paste` CLI commands · one demo app · ready-to-paste agent prompt template.

**Explicitly deferred**: screenshot testing (Playwright server), MDX-driven state specs, React/Svelte support, auto-sync of the config, batch export of multiple frames, design-lint mode, CI integration, hosted backend, any direct LLM-provider integration (the IDE agent is the LLM consumer).

## Critical files

- `packages/spec-schema/src/spec.ts` — Spec/SpecNode/Warning types
- `packages/spec-schema/src/config.ts` — BridgeConfig types + Zod schema + `defineConfig` helper
- `packages/spec-schema/src/prompt-template.ts` — the agent prompt template constant
- `packages/plugin/manifest.json` — `networkAccess: none`
- `packages/plugin/src/main.ts` — Figma sandbox entry
- `packages/plugin/src/extract/index.ts` — `walkNode`, `RawNode`
- `packages/plugin/src/resolve/index.ts` — resolution algorithm, cache
- `packages/plugin/src/serialize/index.ts` — Spec finalization
- `packages/plugin/src/orchestrator.ts` — pipeline wiring
- `packages/plugin/src/ui/App.tsx` — UI (Preact): Settings/Extract tabs, Spec panel, Copy button
- `packages/bridge/src/cli.ts` — `figle sync`, `figle paste`
- `packages/bridge/src/defineConfig.ts` — typed helper for user projects
- `examples/demo-vue-app/figle.config.ts` — reference config
- `examples/demo-vue-app/src/components/UiButton.vue`, `UiCard.vue` — fixture

## Verification — minimal e2e

> **Status: PASSED** on 2026-05-23. The Figma plugin produced the expected `Spec`, `npx figle paste` materialized it, and Claude Code generated [`examples/demo-vue-app/src/components/DemoCard.vue`](./examples/demo-vue-app/src/components/DemoCard.vue) — imports correct, props passed, token+fallback used, warnings surfaced as `<!-- TODO -->` comments.

The smallest demo that proves the architecture:

**Figma file**: one `DemoCard` Frame containing:

- An instance of the `Card` component (variant `elevated=true`)
- A Text `"Welcome"` with a text-style bound to the variable `typography/heading/lg`
- An instance of the `Button` component (variants `variant=primary`, `size=md`) with the label `"Get started"`

**Bridge config**: maps `Card → UiCard`, `Button → UiButton`, `typography/heading/lg → typography.heading.lg`.

**Expected Spec** — exactly this:

```json
{
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
}
```

**Expected agent output** (verified manually in V1, with Claude Code in `examples/demo-vue-app`): a `DemoCard.vue` SFC that imports `UiCard` and `UiButton`, with zero inline Tailwind for colors/typography (only token-based classes), and `<UiButton variant="primary" size="md">Get started</UiButton>`.

**Pass criteria**:

1. The Spec matches byte-for-byte after key sorting.
2. After running `npx figle paste` and asking Claude Code to materialize `.figle/last-spec.json`, the generated SFC compiles in `examples/demo-vue-app`.
3. Replacing the Card's background with an unbound hex produces exactly one `UNBOUND_COLOR` warning in the spec, and the agent annotates the generated SFC with a corresponding `<!-- TODO -->` comment.

If all three hold, the resolution algorithm and the agent prompt are validated. Everything beyond that (more components, more tokens, states) is data, not architecture.

## Implementation order

1. `spec-schema` package — types and Zod schemas, agent prompt template (1 day).
2. `bridge` package — `defineConfig` + `figle sync` and `figle paste` CLI (1 day).
3. Plugin scaffold via `create-figma-plugin`, manifest, UI shell (half a day).
4. `extract` module — tree traversal, no interpretation (1 day).
5. `resolve` module — algorithm steps 1–6, cache, warnings (2 days).
6. `serialize` + the e2e fixture from the verification section (1 day).
7. Settings tab: paste config into `clientStorage`; Spec tab: pretty-print + Copy (half a day).
8. End-to-end run on the fixture: extract in plugin → `figle paste` in demo app → Claude Code generates SFC → iterate on the prompt template until pass criteria turn green (1–2 days).

After MVP — pilot on real designs, collect cases where resolution breaks, and only then take on: states via MDX, screenshot diffing, multi-stack support.

## Phase 10 — MCP preset as a second branch

Alternative consumption path for users who have a **paid Figma Developer seat** and work from Claude Code / Cursor / Windsurf with the official Figma Dev Mode MCP server enabled.

**Context.** The Figma Dev Mode MCP server is a localhost service launched from the Figma desktop app. It exposes generated code (`get_design_context`), variable values (`get_variable_defs`), and structure metadata (`get_metadata`) about the selected frame. It requires a paid Developer seat + Figma desktop. For users without the seat, Branch A (plugin) remains the only path.

**Architectural pivot (vs the original plan).** The original Phase 10 design called for an adapter `figma-mcp-json → Spec`. After capturing real MCP responses we determined this is the wrong shape. The Figma Dev Mode MCP returns:

- `get_design_context` — a generated React + Tailwind code **string** (not a tree), with token bindings only visible as `var(--name, value)` inside `className` strings.
- `get_metadata` — a shallow XML overview (one top-level node, geometry only, no children, no bindings).
- `get_variable_defs` — a flat map of used variables to resolved values.
- `get_code_connect_map` — gated behind a paid Developer seat.

Producing a structured `Spec` from this would require real JSX parsing (Babel-level), AST walking, cross-referencing with `get_metadata`, and parsing `Font(...)` typography values from `get_variable_defs`. That is **thicker than Branch A's entire `extract → resolve → serialize` pipeline**, not thinner, and it re-implements work the IDE agent is already designed to do — interpret rendered code in context.

So `Spec` is now treated as **Branch A's internal contract**, not the cross-branch contract. The cross-branch contract is the **prompt template** (`@figle/spec-schema/prompt-template`). Both branches produce SFCs following the same rules; what they hand the agent is a per-branch detail.

**What lives in `packages/mcp-preset/`:**

- [`skill/SKILL.md`](./packages/mcp-preset/skill/SKILL.md) — the actual skill body for Claude Code. Tells the agent which MCP tools to call, how to resolve component mapping in tiers, and how to translate the result into a Vue SFC using figle's prompt rules.
- [`src/cli.ts`](./packages/mcp-preset/src/cli.ts) — `npx @figle/mcp-preset install` copies `SKILL.md` into `~/.claude/skills/figle/`.

**Tiered component mapping** (skill instructs the agent to try in order):

1. `figle.config.ts` in project root — same file Branch A's plugin reads. **`figle.config.ts` is the shared contract; only the delivery differs** (plugin gets it via clipboard paste; MCP skill reads it via Filesystem MCP).
2. `get_code_connect_map` — if Code Connect is set up.
3. `.figle/components-index.json` — agent-maintained cache (mtime-based invalidation). First invocation populates it by scanning `src/components/**/*.vue`.
4. Fallback — emit the raw Figma component name with a TODO comment.

**Reused:** `PROMPT_TEMPLATE` from `@figle/spec-schema`; `figle.config.ts` schema. **Not reused:** plugin UI, `clientStorage`, paste flow, warnings panel.

**Pass criteria:** the same `DemoCard` (or another real frame) produces a Vue SFC of comparable quality to Branch A. The contract is the prompt rules — output should follow them regardless of consumption path. Diffing the SFCs from both branches should be a small delta (component-instance handling, the main divergence point).

**Token-cost note:** Branch B is structurally more expensive per use than Branch A (the agent does the digestion that the plugin pre-computes). The `figle.config.ts` and the components-index cache are the main mitigations. Anthropic prompt caching helps on top of that.
