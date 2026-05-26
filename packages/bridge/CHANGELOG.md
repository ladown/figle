# @figle/cli

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
