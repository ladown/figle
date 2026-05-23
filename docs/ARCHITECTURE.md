# Architecture

This document describes the mid-level architecture. For the full implementation plan with phases and timing, see [`../PLAN.md`](../PLAN.md).

## One-paragraph summary

A Figma selection is turned into a Vue 3 SFC by an AI agent that already runs in the user's IDE (Claude Code, Cursor, etc.) — the agent has the project context (`CLAUDE.md`, existing components, conventions) and the user's existing AI subscription. The figle project never calls an LLM provider itself. Two independent consumption paths exist: **Branch A** is a Figma plugin that produces a structured `Spec` (JSON), materialized on disk in the user's project (`.figle/last-spec.json` + `PROMPT.md`) and consumed by the agent. **Branch B** is a Skill for Claude Code / Cursor that orchestrates the Figma Dev Mode MCP server and the Filesystem MCP directly — no intermediate `Spec`. Both branches share one cross-branch contract: the agent prompt template (`PROMPT_TEMPLATE` in `@figle/spec-schema`). Both also share the optional user-side `figle.config.ts` for component and token mappings.

## The pipeline

```
              ┌────────────────────────────────────────────┐
              │                spec-schema                 │
              │ (PROMPT_TEMPLATE, BridgeConfig, Spec types)│
              └────────┬─────────────────────────┬─────────┘
                       │                         │
                  prompt + Spec             prompt only
                       │                         │
              ┌────────▼─────────┐     ┌─────────▼────────┐
              │    Branch A      │     │     Branch B     │
              │  Figma plugin    │     │   MCP preset     │
              │  (no Dev seat)   │     │  (Dev seat)      │
              └────────┬─────────┘     └─────────┬────────┘
                       │                         │
            extract ─► resolve ─► serialize      Figma MCP +
                       │                         Filesystem MCP
                       ▼                         │
            .figle/last-spec.json                │
                + PROMPT.md                      │
                       │                         │
                       └────────────┬────────────┘
                                    ▼
                  IDE agent (Claude Code / Cursor / …)
                                    │
                                    ▼
                                 Vue SFC
```

Note the agent box. Code generation is **not** part of this project. It happens in the user's IDE, with project context the agent already has — and with the user's existing AI subscription. Branch A hands the agent a pre-resolved `Spec` because the plugin has no LLM of its own; Branch B's agent reads Figma MCP responses directly and follows the same prompt rules.

## Branch A: Figma plugin

Runs inside Figma. Three internal modules plus an orchestrator:

| Module            | Input                    | Output                     | Responsibility                                                                                |
| ----------------- | ------------------------ | -------------------------- | --------------------------------------------------------------------------------------------- |
| `extract/`        | Figma node tree          | `RawNode[]`                | Pure traversal. No interpretation. Preserves every binding, variant prop, style, paint as-is. |
| `resolve/`        | `RawNode + BridgeConfig` | `ResolvedNode + Warning[]` | The 6-step resolution algorithm (see [`./RESOLUTION.md`](./RESOLUTION.md)).                   |
| `serialize/`      | `ResolvedNode`           | `Spec` (validated)         | Strips Figma-specific IDs, normalizes, validates against the Zod schema.                      |
| `orchestrator.ts` | Figma selection          | `Spec` shown in UI         | Wires the pipeline. No AI call.                                                               |

Why three modules instead of one big function: `extract` is the only module that touches the Figma API; the rest are pure. This makes `resolve` and `serialize` trivial to unit-test against synthetic `RawNode` inputs.

The plugin UI ends at the `Spec` panel with a **Copy** button. Nothing leaves the sandbox over the network. `manifest.json` sets `networkAccess: { allowedDomains: ["none"] }`.

## Branch B: MCP preset

A Skill for Claude Code / Cursor / Windsurf that does not run inside Figma. The pipeline becomes:

1. Agent calls the official **Figma Dev Mode MCP server** to read the currently-selected frame (`get_design_context`, `get_variable_defs`, `get_metadata`).
2. Agent resolves component mapping via a **tiered fallback**: `figle.config.ts` → `get_code_connect_map` → an agent-maintained `.figle/components-index.json` cache → raw Figma names with a TODO.
3. Agent uses a **Filesystem MCP** (or its built-in file tools) to read minimum-necessary project files — `tailwind.config.*`, `CLAUDE.md`, the specific component file(s) it imports.
4. The same `PROMPT_TEMPLATE` from `@figle/spec-schema` guides SFC generation.

This branch produces no intermediate `Spec`. The agent consumes the Figma MCP output directly. See [`../PLAN.md`](../PLAN.md) § Phase 10 for why an adapter would be the wrong shape.

This branch requires a paid Figma Developer seat (the Dev Mode MCP server is gated). Users without the seat use Branch A.

## The contracts: `spec-schema`

`packages/spec-schema` contains two distinct contracts that branches share differently:

**Cross-branch contract — the agent prompt template.** Both Branch A and Branch B produce a Vue SFC by following the same rules from `PROMPT_TEMPLATE`. The cross-branch invariant is _"given equivalent input, both branches' agents should emit comparable SFCs"_. The template is the only artifact both branches reach for.

**Branch A's internal contract — the `Spec`.** The plugin runs without an LLM and therefore needs to hand the IDE agent a pre-resolved, validated structure. `Spec` exists for that. Branch B has the agent in the loop from the start; it does not need an intermediate structured form. (Earlier drafts of Phase 10 planned a `figma-mcp-json → Spec` adapter for Branch B; we dropped it after seeing the real MCP output — see [`../PLAN.md`](../PLAN.md) § Phase 10.)

**Shared user-side config — `figle.config.ts`.** Same file schema, two delivery paths: Branch A receives it via clipboard paste into `clientStorage`; Branch B reads it directly via Filesystem MCP. Both branches make the config optional; both run in zero-config mode without it. See [`./BRIDGE_CONFIG.md`](./BRIDGE_CONFIG.md).

`packages/spec-schema` therefore contains:

- TypeScript types and Zod schemas for `Spec`, `SpecNode` (`ComponentRef | LayoutNode | TextNode`), `TokenRef`, `Warning`, `BridgeConfig`.
- The agent prompt template as a string constant.
- A `defineConfig(...)` helper for typed config files in user projects.

If Branch A's producer cannot make its output validate against `SpecSchema.parse(...)`, that's a contract violation — fail loudly, don't paper over it. (Branch B does not produce a `Spec` at all.)

See [`./SPEC_FORMAT.md`](./SPEC_FORMAT.md) for the full schema reference.

## Bridge: `@figle/cli`

The bridge package lives in the user's project and does two things:

- **`figle sync`** — reads `figle.config.ts`, validates it, embeds a content hash, and puts a JSON blob on the clipboard. The user pastes it once into the plugin's Settings tab. The hash drives the "config out of date" banner.
- **`figle paste`** — reads the clipboard, validates the payload against `SpecSchema`, and writes `.figle/last-spec.json` plus `.figle/PROMPT.md` (the populated agent prompt template) into the project. The IDE agent reads these files.

`@figle/cli` also exports `defineConfig(...)` for typed config files.

**Branch A** uses both commands. **Branch B** uses neither — the agent reads `figle.config.ts` directly via Filesystem MCP, and produces the SFC without going through `Spec`.

## Bridge config

Lives in the user's project as `figle.config.ts`. Maps:

- **Tokens**: Figma variable/style names → project token paths (e.g., Tailwind config paths or CSS variable names).
- **Components**: Figma component (and variant set) names → project component imports and prop maps.

See [`./BRIDGE_CONFIG.md`](./BRIDGE_CONFIG.md) for the full schema.

**The config is optional.** Without it the plugin still produces a valid `Spec`: Figma-side names (variable paths, component names) are preserved as-is and the IDE agent resolves them against the project. Warnings are not emitted in this mode — without a config the plugin has no opinion to enforce. With a config the plugin pre-translates names into project-side aliases and emits both mapping warnings (`UNKNOWN_COMPONENT`, `UNMAPPED_TOKEN`) and hygiene warnings (`UNBOUND_*`).

**Branch A** delivers the config via a one-time paste into `figma.clientStorage`. A version hash in the config surfaces "config out of date" banners in the plugin UI.

**Branch B** does not use this config at all — the agent reads project files directly via Filesystem MCP.

## Agent prompt template

`spec-schema` exports a single string constant — the prompt template the IDE agent should follow when materializing a `Spec` into an SFC. The template covers:

- Stack-specific style rules (Vue 3 + TS + Tailwind in V1).
- Output rules: one SFC, `<script setup lang="ts">`, no inline color hexes when a token is available, components referenced by their `as:` alias from the config.
- A note that warnings in `spec.warnings` describe designer-hygiene issues; the agent should annotate the generated SFC with `<!-- TODO: ... -->` comments rather than silently fixing them.

The template has a small placeholder set. The `bridge` CLI substitutes the placeholders when generating `.figle/PROMPT.md`.

The project does not call any LLM provider. Prompt caching, streaming, retries, token-cost optimization — all of those are the IDE agent's concern.

## Key types

```ts
type Spec = {
  version: "0.1";
  root: SpecNode;
  warnings: Warning[];
  meta: { figmaFileKey: string; extractedAt: string };
};

type SpecNode = ComponentRef | LayoutNode | TextNode;
type TokenRef = { $token: string; fallback?: string };
```

Full shapes in [`./SPEC_FORMAT.md`](./SPEC_FORMAT.md).

## What is explicitly NOT in the architecture

- **No code generation in the plugin.** The plugin must not contain Vue/JSX/HTML string templates beyond what's needed for its own UI. All output code originates from the IDE agent.
- **No direct LLM-provider integration.** No Anthropic SDK, no OpenAI SDK, no API keys handled by this project. Code generation happens in the user's IDE agent with the user's existing subscription.
- **No outbound network traffic from the plugin.** `manifest.json` `allowedDomains` is `["none"]`. The plugin is a pure pipeline: Figma in, `Spec` out.
- **No local HTTP server for Branch A.** Tried; rejected because it adds a process the user must run.
- **No bridge config in `clientStorage` for Branch B.** It's redundant when the agent has FS access.
- **No multi-stack code in V1.** Vue + TS + Tailwind only. The prompt template and a few config fields will become stack-aware later, but don't introduce stack-switching machinery before it's needed.
- **No screenshot diffing in MVP.** It's a Phase-3 goal; the architecture leaves room (a Playwright-driven server alongside the plugin), but nothing is built for it yet.
