---
name: Bug report
about: Report a defect in figle
title: ""
labels: bug
assignees: ""
---

<!--
Replace this comment with your report.

Please fill in every section that applies. Issues without enough
information to reproduce the defect may be closed.
-->

## Affected branch

<!-- Tick the one that applies. -->

- [ ] **Branch A** — Figma plugin + `@figle/cli`
- [ ] **Branch B** — `@figle/mcp-preset` skill in Claude Code / Cursor

## Affected packages

<!-- Tick all that apply, fill in the installed versions. -->

- [ ] `@figle/plugin` (Figma plugin) — version visible in Figma plugin manifest, e.g. `0.1.0-beta.0`
- [ ] `@figle/cli` — `npx @figle/cli --help` or check `package.json`
- [ ] `@figle/spec-schema`
- [ ] `@figle/mcp-preset`

Versions:

- `@figle/plugin`:
- `@figle/cli`:
- `@figle/spec-schema`:
- `@figle/mcp-preset`:

## Environment

- **OS**: e.g. macOS 15.2, Windows 11, Ubuntu 24.04
- **Node**: output of `node -v`
- **Package manager**: npm / pnpm / yarn + version
- **Figma**: desktop / web; build/version if known
- **IDE agent**: Claude Code / Cursor / Windsurf / other; version
- **Project stack** (if relevant): Vue 3 + TS + Tailwind versions

## Reproduction

A minimal reproduction is required. Best options ordered by preference:

1. A link to a public Figma file with the offending node selected.
2. A redacted `Spec` JSON attached to the issue (paste below or attach as a file).
3. A screenshot of the Figma frame + the resulting `.figle/specs/*.json`.

The plugin extraction is deterministic given the same input — without the input, we can't reproduce.

<details>
<summary>Spec or input snippet</summary>

```json
// paste here
```

</details>

## Expected behavior

What you expected to happen.

## Actual behavior

What happened instead. Include:

- Error messages and stack traces **verbatim** (from the plugin's devtools console: Plugins → Development → Open console; or from your terminal for CLI errors).
- Generated `.vue` SFC content if the bug is in agent output quality.

## Additional context

- Your `figle.config.ts` (redact private paths if needed).
- Relevant warnings from `spec.warnings`.
- Screenshots / screen recordings.
- Anything else.
