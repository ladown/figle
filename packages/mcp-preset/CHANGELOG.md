## [@figle/mcp-preset-v1.0.0-beta.3](https://github.com/ladown/figle/compare/@figle/mcp-preset@1.0.0-beta.2...@figle/mcp-preset@1.0.0-beta.3) (2026-06-24)

### Bug Fixes

* rewrite workspace deps before publish via exec, not prepack ([725df0b](https://github.com/ladown/figle/commit/725df0b101cf34538f385da8fc590c8dfe655fb0))

## [@figle/mcp-preset-v1.0.0-beta.2](https://github.com/ladown/figle/compare/@figle/mcp-preset@1.0.0-beta.1...@figle/mcp-preset@1.0.0-beta.2) (2026-06-24)

### Bug Fixes

* resolve workspace deps to concrete versions when publishing ([d2c26ab](https://github.com/ladown/figle/commit/d2c26abc11cfe8295843492f9bedc71b46d7a8bb))

### Documentation

* **mcp-preset:** correct local MCP server enable steps ([7ad850e](https://github.com/ladown/figle/commit/7ad850edc10c3826ed6ad299032d45f08ea5672e))

## @figle/mcp-preset-v1.0.0-beta.1 (2026-06-03)

### Features

* add @figle/mcp-preset (Phase 10) as skill, not adapter ([5cef0c6](https://github.com/ladown/figle/commit/5cef0c67b94536db36b8db0c04a386926033ef4e))
* extract component state snapshots from Figma variant sets ([737b005](https://github.com/ladown/figle/commit/737b0058397163c169c0fdd0ade025c8fd0cad3b))
* **mcp-preset:** detect figma mcp variant in skill ([17a3dd6](https://github.com/ladown/figle/commit/17a3dd63fce54647bacdee6ea718aed012a0013e))

### Bug Fixes

* **mcp-preset:** document local vs remote figma mcp variants ([754bebb](https://github.com/ladown/figle/commit/754bebb941715820cefa7ac4895952bec978c5eb))

### Documentation

* add CODE_OF_CONDUCT, CONTRIBUTING, and per-package LICENSE ([16d8dd6](https://github.com/ladown/figle/commit/16d8dd64836d3b1c592322e8900a34d8e20cc47b))

# @figle/mcp-preset

## 0.1.0-beta.2

### Patch Changes

- Make the `figle` skill work with both Figma MCP flavours. The skill now detects whether the local Dev Mode MCP (`mcp__Figma__*`, selection-aware) or the remote/plugin MCP (`mcp__plugin_figma_figma__*`, requires `fileKey` + `nodeId`) is connected and adapts its call shape. Adds a post-install checklist printed by `figle-mcp install` that explains how to enable Figma's local MCP server and register it with Claude Code.

## 0.1.0-beta.1

### Patch Changes

- Republish using `pnpm publish` so `workspace:*` dependency specifiers are resolved to actual versions. The 0.1.0-beta.0 publish was done with `npm publish` which left `workspace:*` literally in the published `package.json` files, causing `EUNSUPPORTEDPROTOCOL` when consumers tried `npx @figle/cli@beta` or `npm install`.

- Updated dependencies []:
  - @figle/spec-schema@0.1.0-beta.1

## 0.1.0-beta.0

### Minor Changes

- [`01f613f`](https://github.com/ladown/figle/commit/01f613ffaf579bd0aeb838f676e088ed90fcc09a) Thanks [@ladown](https://github.com/ladown)! - Initial public beta of figle — a Figma → structured Spec → IDE agent toolkit for Vue 3 + TypeScript + Tailwind.

  - **`@figle/spec-schema`** — canonical `Spec` and `BridgeConfig` schemas (zod), agent prompt template, shared between the Figma plugin and the MCP skill.
  - **`@figle/cli`** — `figle init` / `figle sync` / `figle paste` commands. Bootstraps a project config, syncs it to the plugin via clipboard, materializes extracted Specs into `.figle/specs/`, `.figle/assets/`, and `.figle/PROMPT.md`. Configurable output directory.
  - **`@figle/mcp-preset`** — `figle-mcp install` ships a Claude Code Skill that orchestrates Figma Dev Mode MCP + Filesystem MCP to generate Vue SFCs end-to-end.

  Highlights of the underlying pipeline:

  - **Config-optional plugin** — works in zero-config mode by passing through Figma-side names; richer with a `figle.config.ts` that maps Figma components and variables to project aliases.
  - **Asset export** — vector icons emit as SVG, raster fills as PNG (downscaled to fit 1024 px on the longest side, deduped by SHA-256).
  - **Multi-frame extract** — toggle in Settings; selects multiple frames at once and bundles them into one paste.
  - **Component states** — Figma variant property `State` (case-insensitive) is extracted as a `states` block on `ComponentRef` so the agent can emit `hover:`, `focus:`, `disabled:` Tailwind variants.
  - **MCP skill** — tiered component mapping (`figle.config.ts` → `get_code_connect_map` → cached project index → raw Figma name).

### Patch Changes

- Updated dependencies [[`01f613f`](https://github.com/ladown/figle/commit/01f613ffaf579bd0aeb838f676e088ed90fcc09a)]:
  - @figle/spec-schema@0.1.0-beta.0
