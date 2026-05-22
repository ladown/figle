# Architecture

This document describes the mid-level architecture. For the full implementation plan with phases and timing, see [`../PLAN.md`](../PLAN.md).

## One-paragraph summary

A Figma selection is extracted into a structured `Spec` (JSON). The `Spec` is materialized on disk in the user's project and then consumed by an AI agent that already runs in the user's IDE (Claude Code, Cursor, etc.) — the agent has the project context (`CLAUDE.md`, existing components, conventions) and generates the Vue SFC from the `Spec`. The project itself never calls an LLM provider. Two independent producers can build the same `Spec`: a Figma plugin (for users without a Figma Dev seat) and an MCP-driven workflow (for users with one). Both share the same schema, the same agent prompt template, and the same fixture.

## The pipeline

```
                ┌────────────────────────────────────────────┐
                │                spec-schema                 │
                │   (Spec, BridgeConfig, prompt template)    │
                └───────────────┬────────────────────────────┘
                                │ contract
        ┌───────────────────────┼───────────────────────┐
        │                                               │
 ┌──────▼────────┐                              ┌───────▼────────┐
 │   Branch A    │                              │    Branch B    │
 │ Figma plugin  │                              │  MCP preset    │
 │ (no Dev seat) │                              │  (Dev seat)    │
 └──────┬────────┘                              └───────┬────────┘
        │                                               │
   extract ─► resolve ─► serialize           Figma MCP ─► adapter
        │                                               │
        └──────────────────► Spec ◄────────────────────┘
                              │
                              ▼
                .figle/last-spec.json + PROMPT.md
                              │
                              ▼
                IDE agent (Claude Code / Cursor / …)
                              │
                              ▼
                          Vue SFC
```

Note the agent box. Code generation is **not** part of this project. It happens in the user's IDE, with project context the agent already has — and with the user's existing AI subscription.

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

## Branch B: MCP preset (post-MVP)

A Skill or slash command for Claude Code / Cursor that does not run inside Figma. The pipeline becomes:

1. Agent calls the official **Figma Dev Mode MCP server** to read the currently-selected frame.
2. A thin adapter (`figma-mcp-json → Spec`) reshapes the response into the canonical `Spec`. This adapter mirrors `extract + resolve + serialize` but is shorter because the MCP server has already done part of the work.
3. Agent uses a **Filesystem MCP** to read the project's `tailwind.config.ts` and `src/components/*` — this replaces the bridge-config-paste step from Branch A.
4. The same agent prompt template guides SFC generation.

This branch is post-MVP because it depends on a paid Dev seat. The MVP must work without it.

## The contract: `spec-schema`

`packages/spec-schema` is the only package both branches depend on. It contains:

- TypeScript types for `Spec`, `SpecNode` (`ComponentRef | LayoutNode | TextNode`), `TokenRef`, `Warning`.
- TypeScript types for `BridgeConfig` (tokens table + components table + stack identifier).
- Zod schemas for both, with type inference (`z.infer<typeof SpecSchema>`).
- The agent prompt template as a string constant.
- A `defineConfig(...)` helper for typed config files in user projects.

If a producer cannot make its output validate against `SpecSchema.parse(...)`, that's a contract violation — fail loudly, don't paper over it.

See [`./SPEC_FORMAT.md`](./SPEC_FORMAT.md) for the full schema reference.

## Bridge: `@figle/cli`

The bridge package lives in the user's project and does two things:

- **`figle sync`** — reads `figle.config.ts`, validates it, embeds a content hash, and puts a JSON blob on the clipboard. The user pastes it once into the plugin's Settings tab. The hash drives the "config out of date" banner.
- **`figle paste`** — reads the clipboard, validates the payload against `SpecSchema`, and writes `.figle/last-spec.json` plus `.figle/PROMPT.md` (the populated agent prompt template) into the project. The IDE agent reads these files.

`@figle/cli` also exports `defineConfig(...)` for typed config files.

**Branch A** uses both commands. **Branch B** uses neither — the agent reads project files directly via Filesystem MCP.

## Bridge config

Lives in the user's project as `figle.config.ts`. Maps:

- **Tokens**: Figma variable/style names → project token paths (e.g., Tailwind config paths or CSS variable names).
- **Components**: Figma component (and variant set) names → project component imports and prop maps.

See [`./BRIDGE_CONFIG.md`](./BRIDGE_CONFIG.md) for the full schema.

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
