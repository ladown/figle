# Roadmap

Scope of the current version and explicit non-goals. When scope expands beyond what is listed here, push back or document the change here first.

For full implementation phases and timing, see [`../PLAN.md`](../PLAN.md).

## V1 (MVP) — scope

The MVP target is the smallest end-to-end demo that proves the architecture. Fixture: a Figma frame `DemoCard` containing a `Card` instance, a tokenized text node, and a nested `Button` instance — see `PLAN.md` § Verification.

In scope for V1:

- `packages/spec-schema` — `Spec`, `BridgeConfig`, agent prompt template, Zod schemas
- `packages/plugin` (Branch A) — Figma plugin with `extract → resolve → serialize` pipeline
- `packages/bridge` — `@figle/cli`: `defineConfig` helper, `figle sync` and `figle paste` CLI commands
- Token resolution via Figma variables and styles
- Component resolution via component instances and variant property mapping
- Designer-hygiene warnings: `UNBOUND_COLOR`, `UNBOUND_TYPOGRAPHY`, `UNBOUND_SPACING`, `UNBOUND_RADIUS`, `UNKNOWN_COMPONENT`, `UNMAPPED_TOKEN`, `AMBIGUOUS_VARIANT`
- Plugin UI: Spec panel (pretty-printed JSON) + warnings panel + Copy button
- Bridge config delivery via one-time paste into `figma.clientStorage`
- Spec materialization into `.figle/last-spec.json` + `.figle/PROMPT.md` via `figle paste`
- One `examples/demo-vue-app` reference consumer that contains the canonical fixture, generated end-to-end with Claude Code

## V1 — explicit non-goals

The following are out of scope for V1. Do not start work on them. Do not write speculative abstractions to "leave room" for them.

- Screenshot or visual-diff testing of generated output
- MDX-driven component state specs (hover, focus, disabled, error states)
- Component aspect ratios beyond what Figma variants encode
- React, Svelte, or any other output stack besides Vue 3 + TS + Tailwind
- Multi-stack switching machinery (config field works as a literal `'vue3-ts-tailwind'` only)
- Auto-sync of bridge config (no HTTP server, no webhook, no polling)
- Batch export of multiple frames in one extraction
- Design-lint mode (reporting warnings without generating code)
- CI integration of any kind
- Hosted backend, server-side proxy, or any infrastructure beyond the plugin itself and the user's local project
- A bridge config UI editor inside the plugin — the config is edited in the user's code editor
- Direct LLM-provider integration (Anthropic / OpenAI / others) — code generation runs in the user's IDE agent (Claude Code, Cursor, …), not in this project
- API-key handling of any kind — there are no keys to store because there are no outbound API calls
- Outbound network traffic from the plugin — `manifest.json` declares `networkAccess: { allowedDomains: ["none"] }`

## Post-MVP — phases

Listed in expected order. Each phase becomes scope once the previous one is stable on real designs.

### Phase 10 — MCP preset (Branch B)

Skill / slash command for Claude Code or Cursor, powered by Figma Dev Mode MCP server and a Filesystem MCP. Requires a Figma Dev seat. Reuses `spec-schema` and the agent prompt template. See `PLAN.md` § Phase 10 and [`./ARCHITECTURE.md`](./ARCHITECTURE.md) § Branch B.

### Phase 11 — Component state specs

Extract states (hover, focus, active, disabled, loading, error) from one of: Figma variant properties named according to a convention, layer-level annotations, or MDX docs colocated with the component in the user's project. State data joins the `Spec` and informs Tailwind variant class generation.

### Phase 12 — Visual diff testing

Local Playwright server alongside the plugin. After the IDE agent emits an SFC, the server renders it in a headless browser and compares against the PNG export of the source Figma frame. Reports pixel diff and structural diff.

### Phase 13 — Additional output stacks

React + TS + Tailwind, then Svelte. Requires extracting the agent prompt template into stack-specific variants and adding `stack` discriminator handling in the plugin UI.

### Phase 14 — Design-lint mode

A separate plugin entry that runs only the `extract → resolve` portion and shows warnings without producing a `Spec` for the agent. Designed for use during design review, not code generation. Possibly a separate tab in the same plugin.

## What this roadmap deliberately does not commit to

- A public release date
- Marketing positioning or naming
- License selection (current: MIT)
