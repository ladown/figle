---
name: figle
description: Generate a Vue 3 + TypeScript + Tailwind SFC from the Figma selection currently active in the Figma desktop app. Uses the Figma Dev Mode MCP server and Filesystem MCP to read both the design and the project, then produces a single `.vue` file following figle's prompt rules. Invoke when the user asks to turn a Figma frame into a component, references a Figma URL or selection, or says something like "/figle".
---

# figle — Figma to Vue SFC

You are turning a Figma selection into a Vue 3 SFC. The Figma side is read via the Figma Dev Mode MCP server; the project side is read via the Filesystem MCP. **You do not write code yourself yet** — first you gather, then you generate.

## Required MCP servers

- **Figma Dev Mode MCP** (`mcp__Figma__*`) — the user has the Figma desktop app open with Dev Mode MCP enabled. If `get_design_context` returns an instructional message instead of real data, tell the user to enable the toggle and restart you. Do not try to recover further.
- **Filesystem MCP** (or your built-in Read/Glob tools) — to read project files.

## Output rules

- Emit one `.vue` file. Use `<script setup lang="ts">`.
- Use the project's existing component aliases and token system.
- Never inline a raw hex when a token reference is available.
- For Figma variables/styles with no project mapping, fall back to the literal value reported by Figma (it is embedded in `var(--name, value)` inline classes and listed in `get_variable_defs`).
- Annotate the SFC with `<!-- TODO: ... -->` near every Figma node that uses an ad-hoc (unbound) color, typography, spacing, or radius value.

## Pipeline

### Step 1 — read the Figma selection

Call these tools on the user's current Figma selection. If they paste a Figma URL, extract the `node-id` from it and pass as `nodeId`:

- `mcp__Figma__get_design_context` — main signal: generated JSX + Tailwind for the selection.
- `mcp__Figma__get_variable_defs` — flat map of Figma variable paths to their resolved values.
- `mcp__Figma__get_metadata` — XML overview of the node tree (use to distinguish instances from frames).
- `mcp__Figma__get_screenshot` — only fetch if you need to disambiguate something visually. Otherwise skip — it costs tokens.

### Step 2 — resolve the component map (tiered)

Try in order, stop at the first hit:

1. **`figle.config.ts`** in the project root. If it exists, read it as plain text (do not execute). Its `components: { ... }` block is the canonical Figma-name → project-component map, and its `tokens: { ... }` block is the canonical Figma-variable → project-token-path map. Same file the figle plugin uses — see `docs/BRIDGE_CONFIG.md` in the figle repo.
2. **`mcp__Figma__get_code_connect_map`** — if the user has a paid Figma Developer seat, this returns a Code Connect mapping. Use it for component identification. (If it errors with "Developer seat" message, skip.)
3. **`.figle/components-index.json`** — a cache you maintain. If the file exists and was written less than 24 hours ago AND no `src/components/**/*.vue` file has an `mtime` newer than the cache, use it as-is. Otherwise re-scan: glob `src/components/**/*.vue` (or whatever the project uses), read each, extract `name`, `path`, and `defineProps` signature. Write the index back. Format:
   ```json
   {
     "version": "0.1",
     "scannedAt": "<ISO-8601>",
     "components": [
       {
         "name": "UiButton",
         "path": "@/components/UiButton.vue",
         "props": [
           "variant: 'primary' | 'secondary'",
           "size: 'sm' | 'md' | 'lg'"
         ]
       }
     ]
   }
   ```
4. **No mapping** — emit a `<!-- TODO: figma component "X" has no project mapping -->` comment and use the Figma name as the local component identifier.

### Step 3 — read minimal project context

- `tailwind.config.*` (only the `theme` section is useful).
- `CLAUDE.md` (root or any per-folder one in the target file's directory).
- The specific component file(s) you'll import in the output — read them once to confirm prop signatures.

Do not read the entire `src/components/` directory in this step — the index from Step 2 already covers signatures.

### Step 4 — translate to a SFC

- Parse the JSX from `get_design_context` to build the component tree. The JSX uses `<div>` wrappers everywhere with `data-node-id` and `data-name` attributes — those are your stable identifiers.
- Replace generated `<div data-name="...">` for Figma instances with the mapped project component (from Step 2). Pass variant props from the original Figma variantProperties; the JSX `data-*` attributes are your hints but the truth is `get_metadata` + `figle.config.ts`.
- For className-embedded `var(--path, value)` tokens: resolve via the project's token system. Prefer the token (`bg-primary-500`) over the literal (`bg-[#ff8452]`).
- For every Figma variable referenced in the design but absent from `tailwind.config.*` (project does not expose it), use the literal value and add a TODO comment.
- For text content: take from the `<p>...</p>` bodies in `get_design_context`.
- For layout: `flex-col` vs `flex-row` based on the JSX class structure (`flex flex-col gap-N p-N`).

### Step 5 — write the file

- Default location: `src/components/<PascalCaseName>.vue` where `<Name>` comes from the Figma node name or the user's instruction.
- After writing, **output the path of the generated file and nothing else**. Do not print the SFC body to chat — the user will open the file.

## Token budget hints

- Cache `.figle/components-index.json` is the single biggest token saver. Refresh only when stale.
- Do **not** call `get_screenshot` unless the design is ambiguous in code alone.
- Do **not** re-read project files you've already read in this session.

## Failure modes

- **Figma MCP not enabled**: detect the instructional message in the tool response → tell the user to enable Dev Mode MCP Server in Figma preferences and restart this session.
- **No Figma selection**: ask the user to select a frame in Figma, then re-invoke.
- **JSX in `get_design_context` is empty or contains only assets**: tell the user the selection is too large or too small to materialize as a single component; suggest selecting a smaller frame.
- **Project not a Vue 3 + Tailwind app**: ask the user to confirm the target stack. The skill is tuned for `vue3-ts-tailwind` (per figle's V1 scope).
