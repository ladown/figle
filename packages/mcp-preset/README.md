# @figle/mcp-preset

Skill for Claude Code (and compatible IDE agents) that generates a Vue 3 + TypeScript + Tailwind SFC from the currently-selected Figma node — using the Figma Dev Mode MCP server and your project's filesystem.

This is **Branch B** of figle. Branch A is the Figma plugin in `packages/plugin/` — same goal, different consumption path. See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for the two-branch design.

## When to use this vs the plugin

|                            | Plugin (Branch A)                                             | MCP skill (Branch B)                                                               |
| -------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Requires**               | Figma account, figle plugin imported once                     | Figma desktop **with paid Dev seat**, Claude Code / Cursor / compatible MCP client |
| **Flow**                   | Plugin UI inside Figma → Copy → `npx figle paste` → IDE agent | `/figle` in your IDE → agent reaches into Figma directly                           |
| **Steps in your workflow** | 4 (run plugin, copy, paste, prompt agent)                     | 1 (invoke skill)                                                                   |
| **Token cost per use**     | Low — Spec is small and pre-resolved                          | Higher — the agent does the digestion (mitigated by component-index cache)         |

Both produce a Vue SFC. Both respect `figle.config.ts` when present. Pick by what you have access to.

## Prerequisites

- **Figma desktop app** with **Dev Mode MCP Server** enabled:
  - Figma menu (top-left burger) → Preferences → check "Enable Dev Mode MCP Server".
  - You need a paid **Developer seat** in an Organization or Enterprise plan.
- **Claude Code** (or any MCP-compatible agent) configured with one of the two Figma MCP flavours:
  - **Local Dev Mode MCP** (recommended) — `http://127.0.0.1:3845/mcp`, runs inside Figma desktop, reads the current selection without arguments. Register it with `claude mcp add --transport http figma-dev-mode http://127.0.0.1:3845/mcp`.
  - **Remote / plugin Figma MCP** — Figma's cloud OAuth MCP. Works too, but every call needs an explicit `fileKey` + `nodeId`, so the skill will ask for a Figma link to the selection each time.
- A Filesystem MCP server, or the built-in Read/Glob tools, for the agent to read your project files.

## Install

```bash
npx @figle/mcp-preset install
```

Copies `SKILL.md` into `~/.claude/skills/figle/`. Restart Claude Code and the skill becomes available by name `figle`.

To install to a custom location:

```bash
npx @figle/mcp-preset install --dest ~/somewhere-else/figle
```

## Use

In Claude Code, with a Figma frame selected in Figma desktop:

```
/figle generate src/components/DemoCard.vue from the current selection
```

Or just `/figle` and let it default to a name based on the Figma node.

The skill orchestrates Figma MCP calls + project reads + figle's prompt rules. Output: one `.vue` file at the path you (or the skill) chose.

## How it works

See [`skill/SKILL.md`](./skill/SKILL.md) for the full skill text. High level:

1. Reads `get_design_context`, `get_variable_defs`, `get_metadata` on the Figma selection.
2. Resolves component mapping in this order: `figle.config.ts` → Code Connect → `.figle/components-index.json` cache → raw Figma name with a TODO.
3. Reads only the project files it needs (target component file, `tailwind.config.*`, `CLAUDE.md`).
4. Generates the SFC following the same prompt rules as Branch A's `PROMPT_TEMPLATE` (from `@figle/spec-schema`).

## What lives where

- [`skill/SKILL.md`](./skill/SKILL.md) — the actual skill body the agent reads.
- [`src/cli.ts`](./src/cli.ts) — the `figle-mcp install` CLI.
- See [`PLAN.md`](../../PLAN.md) § Phase 10 for why we deliberately do not ship a `figma-mcp-json → Spec` adapter — the original Phase 10 plan turned out to be the wrong shape after we captured real MCP responses.
