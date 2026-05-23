# figle

Figma → structured `Spec` → IDE agent → Vue/TS/Tailwind code.

> Status: **MVP complete.** The end-to-end pipeline (Figma plugin → `Spec` → `npx figle paste` → IDE agent → Vue SFC) is verified on the `DemoCard` fixture; the generated reference SFC lives at [`examples/demo-vue-app/src/components/DemoCard.vue`](./examples/demo-vue-app/src/components/DemoCard.vue). See [`PLAN.md`](./PLAN.md) for the original plan and [`docs/ROADMAP.md`](./docs/ROADMAP.md) for post-MVP phases.

## What this is

A toolkit that turns a Figma selection into a semantically rich, structured `Spec` (JSON) and hands it to the AI agent that already lives in your IDE — Claude Code, Cursor, and so on. The agent uses your project context (`CLAUDE.md`, existing components, conventions) to generate production-quality Vue 3 + TypeScript + TailwindCSS code from the `Spec`.

This project does **not** call any LLM provider directly. It does not handle API keys. Its only job is to produce a `Spec` rich enough that the agent doesn't have to guess: tokens resolved to project tokens, Figma component instances resolved to actual project component imports, designer-hygiene warnings emitted when discipline breaks.

The hard part — and the value of this project — is the spec extraction.

## Why

Most Figma → code tools flatten the design: every frame becomes a generic `<div>`, every color becomes a literal hex value, and the resulting code is unusable in real projects. They ignore:

- The project's existing design tokens (Tailwind config, CSS variables).
- The project's existing components (`<UiButton>`, `<UiCard>`).
- Component variants and states.
- Designer hygiene signals (which colors/typography are bound vs ad-hoc).

This project treats the gap between Figma and a real codebase as the central problem. And it offloads code generation to the IDE agent, which already understands your codebase — instead of rebuilding that context inside a Figma plugin.

## End-to-end flow

1. In your project: `npx figle sync` → copies your `figle.config.ts` blob to clipboard.
2. In Figma: paste once into the plugin's Settings tab.
3. In Figma: select a frame → run the plugin → review the `Spec` and warnings → click **Copy**.
4. In your project: `npx figle paste` → writes `.figle/last-spec.json` and `.figle/PROMPT.md`.
5. In your IDE: open Claude Code (or Cursor) and apply `.figle/PROMPT.md` — the agent reads the Spec, your project, and emits the SFC.

The plugin never makes a network call. The agent never touches Figma. The `Spec` is the only thing crossing the boundary.

## Architecture in one paragraph

A pnpm monorepo. The `spec-schema` package is the canonical contract — TypeScript types and Zod schemas for the spec, plus the agent prompt template. Two consumption branches produce the same `Spec`:

- **Branch A — Figma plugin** (`packages/plugin`): runs inside Figma. Needed when the user does not have a Figma Dev seat. Designer-friendly UI with warnings panel and a Copy button.
- **Branch B — MCP preset** (`packages/mcp-preset`, post-MVP): a Skill / slash command for Claude Code or Cursor, powered by the official Figma Dev Mode MCP server + a filesystem MCP. Requires a Figma Dev seat.

The `bridge` package (`@figle/cli`) sits in the user's project and provides `figle sync` (config → clipboard) and `figle paste` (clipboard → `.figle/last-spec.json` + `PROMPT.md`).

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Repository structure

```
figle/
  PLAN.md                       # full implementation plan
  README.md                     # you are here
  AGENTS.md                     # rules for AI agents working in this repo
  CLAUDE.md                     # symlink → AGENTS.md
  docs/                         # deeper documentation
    ROADMAP.md                  # current scope and explicit non-goals
    ARCHITECTURE.md             # pipeline, packages, two consumption branches
    CONVENTIONS.md              # stack, code style, commits, testing
    SPEC_FORMAT.md              # the Spec JSON contract
    RESOLUTION.md               # token & component resolution algorithm
    BRIDGE_CONFIG.md            # project-side config file schema
  packages/                     # not created yet
    spec-schema/                # canonical Spec + BridgeConfig + agent prompt template
    plugin/                     # Branch A: Figma plugin
    bridge/                     # @figle/cli — config sync + spec materialization
    mcp-preset/                 # Branch B (post-MVP)
  examples/
    demo-vue-app/               # reference consumer + e2e fixture
```

## Documentation

- [`PLAN.md`](./PLAN.md) — full architectural plan and implementation order
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — current scope and explicit non-goals
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — pipeline, branches, key types
- [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md) — stack, code style, commits, testing
- [`docs/SPEC_FORMAT.md`](./docs/SPEC_FORMAT.md) — the `Spec` JSON reference
- [`docs/RESOLUTION.md`](./docs/RESOLUTION.md) — token & component resolution algorithm
- [`docs/BRIDGE_CONFIG.md`](./docs/BRIDGE_CONFIG.md) — project-side config file
- [`AGENTS.md`](./AGENTS.md) — thin entry point for AI agents (Claude Code, Cursor, etc.)

## Status & roadmap

Personal pet project. **MVP is complete** — the smallest end-to-end demo described in `PLAN.md` § Verification (a `DemoCard` Figma frame with a tokenized text node and a nested `Button` instance) produces a clean Vue SFC via Claude Code. The generated reference output is committed at [`examples/demo-vue-app/src/components/DemoCard.vue`](./examples/demo-vue-app/src/components/DemoCard.vue).

Next:

- **Phase 10** — MCP preset (Branch B) for users with a Figma Dev seat — see [`docs/ROADMAP.md`](./docs/ROADMAP.md).
- Pilot on real designs, harden the resolution algorithm against edge cases.
- Component state specs via MDX docs ingestion (Phase 11).
- Visual diff testing via Playwright (Phase 12).
- Additional target stacks — React, Svelte (Phase 13).

## License

MIT.
