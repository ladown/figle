## [@figle/spec-schema-v1.0.0-beta.3](https://github.com/ladown/figle/compare/@figle/spec-schema@1.0.0-beta.2...@figle/spec-schema@1.0.0-beta.3) (2026-06-24)

### Features

* **spec:** export component sets as ComponentSetNode with camelCase axes ([1e6cb65](https://github.com/ladown/figle/commit/1e6cb653d696a9a5f8d3783a1acffe835c511214))

## [@figle/spec-schema-v1.0.0-beta.2](https://github.com/ladown/figle/compare/@figle/spec-schema@1.0.0-beta.1...@figle/spec-schema@1.0.0-beta.2) (2026-06-24)

### Features

* choose paste output folder via plugin field or --pick ([2570b83](https://github.com/ladown/figle/commit/2570b83f8191f00539498de3e67aaeb851b8cd79))

## @figle/spec-schema-v1.0.0-beta.1 (2026-06-03)

### Features

* add serialize, orchestrator, and DemoCard e2e fixture ([b87d4bf](https://github.com/ladown/figle/commit/b87d4bf58dea6c178b8ecc68148cebf88a713a82))
* always populate TokenRef.fallback with resolved value ([1fc4270](https://github.com/ladown/figle/commit/1fc42702514b48a4c831c4827964dee60b1b9cd7))
* customizable output dir for figle paste ([da685db](https://github.com/ladown/figle/commit/da685db7a232b6136e749b6c0a54fd4671fe7f26))
* emit raw font props and text color when unbound ([a5bd33c](https://github.com/ladown/figle/commit/a5bd33c8b633b4dabc73ba14c2efae1bdaeaa158))
* export icons and images as bundled assets, with downscale fallback ([3d9aa6b](https://github.com/ladown/figle/commit/3d9aa6b778fe53649965b93b116acd36cd21d8d9))
* extract component state snapshots from Figma variant sets ([737b005](https://github.com/ladown/figle/commit/737b0058397163c169c0fdd0ade025c8fd0cad3b))
* multi-frame extract — one payload with multiple specs ([e716d46](https://github.com/ladown/figle/commit/e716d46b363ce8fa2cb8d999f90d035e51e927a3))

### Bug Fixes

* prompt template renderer and tighten output rules ([852fa1b](https://github.com/ladown/figle/commit/852fa1b29ac7ae4a8c7979f4c4defed6096a9ae3))

### Refactoring

* zero-config mode and UX polish ([5ad8164](https://github.com/ladown/figle/commit/5ad8164ab51095aeddeb8905441aa60f830f8de5))

### Documentation

* add CODE_OF_CONDUCT, CONTRIBUTING, and per-package LICENSE ([16d8dd6](https://github.com/ladown/figle/commit/16d8dd64836d3b1c592322e8900a34d8e20cc47b))

# @figle/spec-schema

## 0.1.0-beta.1

### Patch Changes

- Republish using `pnpm publish` so `workspace:*` dependency specifiers are resolved to actual versions. The 0.1.0-beta.0 publish was done with `npm publish` which left `workspace:*` literally in the published `package.json` files, causing `EUNSUPPORTEDPROTOCOL` when consumers tried `npx @figle/cli@beta` or `npm install`.

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
