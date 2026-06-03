## @figle/cli-v1.0.0-beta.1 (2026-06-03)

### Features

* add @figle/cli with sync and paste commands ([e278740](https://github.com/ladown/figle/commit/e2787402673975799b073838b3d8b58a4a8de0b0))
* add serialize, orchestrator, and DemoCard e2e fixture ([b87d4bf](https://github.com/ladown/figle/commit/b87d4bf58dea6c178b8ecc68148cebf88a713a82))
* **bridge:** add `figle init` to bootstrap figle.config.ts ([99c0426](https://github.com/ladown/figle/commit/99c042626caf0ff67d7d100a0a98379db4c14caa))
* **bridge:** humane error messages on invalid figle.config.ts ([fcece3a](https://github.com/ladown/figle/commit/fcece3a330a1c1f57bc361625344ae43127bc6c9))
* customizable output dir for figle paste ([da685db](https://github.com/ladown/figle/commit/da685db7a232b6136e749b6c0a54fd4671fe7f26))
* export icons and images as bundled assets, with downscale fallback ([3d9aa6b](https://github.com/ladown/figle/commit/3d9aa6b778fe53649965b93b116acd36cd21d8d9))
* multi-frame extract — one payload with multiple specs ([e716d46](https://github.com/ladown/figle/commit/e716d46b363ce8fa2cb8d999f90d035e51e927a3))

### Documentation

* add CODE_OF_CONDUCT, CONTRIBUTING, and per-package LICENSE ([16d8dd6](https://github.com/ladown/figle/commit/16d8dd64836d3b1c592322e8900a34d8e20cc47b))

# @figle/cli

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
