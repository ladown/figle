---
name: figle
description: Generate a Vue 3 + TypeScript + Tailwind SFC from the Figma selection currently active in the Figma desktop app. Uses the Figma Dev Mode MCP server and Filesystem MCP to read both the design and the project, then produces a single `.vue` file following figle's prompt rules. Invoke when the user asks to turn a Figma frame into a component, references a Figma URL or selection, or says something like "/figle".
---

# figle — Figma to Vue SFC

You are turning a Figma selection into a Vue 3 SFC. The Figma side is read via the Figma Dev Mode MCP server; the project side is read via the Filesystem MCP. **You do not write code yourself yet** — first you gather, then you generate.

## Required MCP servers

You need exactly one Figma MCP connected. Two flavours exist; **detect which one is registered in the current session by scanning the available tool names**, then follow that flavour's call shape.

| Flavour                            | Tool prefix you'll see                                          | Selection-aware (no args needed)                                     | Where it runs                                     |
| ---------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| **Local Dev Mode MCP** (preferred) | `mcp__Figma__*` (e.g. `mcp__Figma__get_design_context`)         | ✅ yes — reads the user's current selection in the Figma desktop app | `http://127.0.0.1:3845/mcp`, inside Figma desktop |
| **Remote / plugin Figma MCP**      | `mcp__plugin_figma_figma__*` (or any other `*_figma_*` variant) | ❌ no — requires explicit `fileKey` + `nodeId` on every call         | Figma cloud / OAuth                               |

Detection rule: if any tool named `mcp__Figma__get_design_context` is available → **local** mode. Else if any `*figma*get_design_context` tool is available → **remote** mode. Else → no Figma MCP, stop and instruct the user (see Failure modes).

- **Local mode**: call the tools with no `nodeId`/`fileKey` — they implicitly target the current Figma selection. This is the smooth path; recommend it to the user.
- **Remote mode**: every call needs `fileKey` and `nodeId`. **Ask the user for a Figma link to the selection** before doing anything else (Figma desktop → right-click the frame → "Copy link to selection"). Parse `fileKey` from `/design/<fileKey>/...` and `nodeId` from the `node-id` query param, converting `-` back to `:` (e.g. `1-23` → `1:23`).

If both flavours are connected simultaneously, prefer the local one — it gives selection-aware UX and is what figle's docs target.

- **Filesystem MCP** (or your built-in Read/Glob tools) — to read project files.

## Output rules

- Emit one `.vue` file. Use `<script setup lang="ts">`.
- Use the project's existing component aliases and token system.
- Never inline a raw hex when a token reference is available.
- For Figma variables/styles with no project mapping, fall back to the literal value reported by Figma (it is embedded in `var(--name, value)` inline classes and listed in `get_variable_defs`).
- Annotate the SFC with `<!-- TODO: ... -->` near every Figma node that uses an ad-hoc (unbound) color, typography, spacing, or radius value.

## Pipeline

### Step 1 — read the Figma selection

First, follow the detection rule in "Required MCP servers" to decide whether you're in **local** or **remote** mode. In remote mode, ask for the link before calling any tool; in local mode, just call.

Use the tools below — the names shown use the local prefix; substitute `mcp__plugin_figma_figma__*` (or your detected variant) if you're in remote mode, and pass `fileKey` + `nodeId` parsed from the link.

- `…get_design_context` — main signal: generated JSX + Tailwind for the selection.
- `…get_variable_defs` — flat map of Figma variable paths to their resolved values.
- `…get_metadata` — XML overview of the node tree (use to distinguish instances from frames).
- `…get_screenshot` — only fetch if you need to disambiguate something visually. Otherwise skip — it costs tokens.

You'll need `fileKey` + a top-level `nodeId` regardless of mode for Tier 2 of component mapping. In local mode, `fileKey` is in the `meta` block of `get_design_context`'s response and node ids appear as `data-node-id` in the returned JSX.

### Step 2 — resolve the component map (tiered)

Build a single component-map for this run by **layering all sources you can reach, in priority order**. Earlier sources win on conflict; later sources fill the gaps. Each map entry maps a Figma identifier (component name or node id, depending on source) to `{ as, importPath }`.

#### Tier 1 — `figle.config.ts` in the project root (highest priority)

If it exists, read it as plain text (do not execute). Its `components: { ... }` block is the canonical Figma-name → project-component map; its `tokens: { ... }` block is the canonical Figma-variable → project-token-path map. Same file the figle plugin uses — see `docs/BRIDGE_CONFIG.md` in the figle repo.

The `figle.config.ts` represents the user's **explicit decision** about how a Figma component maps to a project component. Treat it as authoritative — never override it with a different source.

#### Tier 2 — `…get_code_connect_map` (Figma Code Connect)

If the user has a paid Figma Developer seat with Code Connect set up, this tool returns a map of Figma node ids to their connected codebase components.

**Call shape:**

- Required params: `nodeId` (e.g. `"1:2"`) and `fileKey`. Both come from the Figma URL the user opened, or from the `get_design_context` response (`fileKey` is in `meta`; node ids appear as `data-node-id` in the JSX).
- Optional `codeConnectLabel` — pass when the project's stack matches a specific Code Connect language (e.g. `"vue"`, `"react"`). If you don't know, omit and the server returns the default.

**Response shape:**

```jsonc
{
  "<figma-node-id>": {
    "codeConnectSrc": "https://github.com/foo/components/UiButton.vue",
    "codeConnectName": "UiButton",
  },
}
```

`codeConnectSrc` is a source URL (typically GitHub) — translate it to a project-relative `importPath` using the project's import alias conventions (read `tsconfig.json` `paths` if needed). `codeConnectName` is the export/component name. Both go into the map.

**How to use it:**

- Call once per top-level `data-node-id` you intend to render as a component. Don't call for every node — many are pure layout `<div>`s.
- If the call returns `{ error: "...Developer seat..." }` → user doesn't have the seat. Stop trying Tier 2, move on to Tier 3. Do not bother the user about it.
- Only fill gaps left by Tier 1. If a node is already mapped via `figle.config.ts`, keep that mapping.

#### Tier 3 — `.figle/components-index.json` (agent-maintained cache)

If the cache file exists and was written less than 24 hours ago AND no `src/components/**/*.vue` (or whatever the project uses) file has an `mtime` newer than the cache, use it as-is. Otherwise re-scan: glob component files, read each, extract `name`, `path`, and `defineProps` signature. Write the index back. Format:

```json
{
  "version": "0.1",
  "scannedAt": "<ISO-8601>",
  "components": [
    {
      "name": "UiButton",
      "path": "@/components/UiButton.vue",
      "props": ["variant: 'primary' | 'secondary'", "size: 'sm' | 'md' | 'lg'"]
    }
  ]
}
```

Match by name heuristically — Figma component names usually map to project component names with predictable transforms (e.g. `Button` → `UiButton`, `IconButton` → `UiIconButton`). When in doubt, ask the user.

#### Tier 4 — fall back to the raw Figma name

For any Figma component still unmapped after all three tiers, emit a `<!-- TODO: figma component "X" has no project mapping -->` comment and use the Figma name as the local component identifier in the SFC. Don't invent imports.

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
- **Component states**: if the component set in Figma has a `State` variant property (case-insensitive), look at the sibling variants in `get_metadata` — they describe `hover`, `focus`, `disabled`, etc. Each sibling's root-level visuals (background, border, opacity) become Tailwind state variants on the generated markup: `hover:bg-...`, `disabled:opacity-50`, `focus:ring-...`. The currently-selected state is the baseline.

### Step 5 — write the file

- Default location: `src/components/<PascalCaseName>.vue` where `<Name>` comes from the Figma node name or the user's instruction.
- After writing, **output the path of the generated file and nothing else**. Do not print the SFC body to chat — the user will open the file.

## Token budget hints

- Cache `.figle/components-index.json` is the single biggest token saver. Refresh only when stale.
- Do **not** call `get_screenshot` unless the design is ambiguous in code alone.
- Do **not** re-read project files you've already read in this session.

## Failure modes

- **No Figma MCP connected at all**: neither `mcp__Figma__*` nor `mcp__plugin_figma_figma__*` (or any `*figma*get_design_context`) tools are available. Tell the user to either (a) enable **Dev Mode MCP Server** in Figma desktop (Figma menu → Preferences → ✅ "Enable Dev Mode MCP Server"), then add it to Claude Code with `claude mcp add --transport http figma-dev-mode http://127.0.0.1:3845/mcp` and restart — recommended; or (b) connect Figma's remote/plugin MCP via OAuth. Then re-invoke the skill.
- **Local Figma MCP returns an instructional message instead of data**: the toggle is off or the file isn't a Design file in Dev Mode. Tell the user to enable the toggle, open a Design file, and restart this session.
- **Remote Figma MCP but no link provided**: ask the user once for the Figma link to the selection (right-click → "Copy link to selection"). Do not guess `fileKey` or `nodeId`.
- **No Figma selection** (local mode): ask the user to select a frame in Figma, then re-invoke.
- **JSX in `get_design_context` is empty or contains only assets**: tell the user the selection is too large or too small to materialize as a single component; suggest selecting a smaller frame.
- **Project not a Vue 3 + Tailwind app**: ask the user to confirm the target stack. The skill is tuned for `vue3-ts-tailwind` (per figle's V1 scope).
- **Code Connect: developer seat required**: when `get_code_connect_map` returns an error containing "Developer seat" or similar, silently skip Tier 2 — don't surface this to the user. Continue with Tiers 3 and 4.
- **Code Connect: missing entry for a node**: a node is not connected via Code Connect even though others are. Treat as "no Tier-2 mapping" — fall through to Tier 3/4 for that specific node.
- **Code Connect: framework mismatch**: `get_code_connect_map` with a `codeConnectLabel` returns no entries but a call without the label returns some. Use the unlabelled response and trust the user that the mapping is right for the project.
