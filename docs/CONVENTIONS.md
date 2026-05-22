# Conventions

Stack, code style, commit format, testing approach, language rules.

## Stack

- **Language**: TypeScript with strict mode. No vanilla `.js` files in `packages/`.
- **Package manager**: pnpm with workspaces.
- **Plugin scaffold**: `create-figma-plugin`. UI runs in Preact (provided by the scaffold).
- **Runtime validation**: Zod. Inferred types via `z.infer<typeof Schema>` — don't write parallel `type` definitions next to schemas.
- **No LLM SDK.** This project does not call any LLM provider. Code generation runs in the user's IDE agent (Claude Code, Cursor, …). If a PR introduces an Anthropic / OpenAI / similar SDK dependency, it is wrong — see [`./ARCHITECTURE.md`](./ARCHITECTURE.md) § What is explicitly NOT in the architecture.
- **Output target (V1)**: Vue 3 + TypeScript with `<script setup lang="ts">` + TailwindCSS. Stack-specific logic must be isolated; do not introduce abstract stack-switching machinery before a second target ships.

## Code style

- TypeScript strict mode. No `any`, no `@ts-ignore`, no unrestricted assertions. If a `as` cast is unavoidable, leave a one-line comment explaining why.
- Prefer narrow union types and discriminated unions over `boolean` flags plus optional fields.
- Default to writing **no comments**. Add one only when the _why_ is non-obvious (a hidden constraint, a subtle invariant, a workaround for a specific upstream bug). Names should make the _what_ obvious.
- No multi-line comment blocks. No JSDoc walls of text.
- No error handling for impossible cases. Trust internal code. Validate only at system boundaries: Figma API input, clipboard payloads (`figle paste`), user-provided config (`BridgeConfig`).
- No premature abstractions, no speculative interfaces, no "while I'm here" cleanups bundled into unrelated changes.
- Sort object keys before serializing `Spec` — determinism is a contract requirement (see [`./SPEC_FORMAT.md`](./SPEC_FORMAT.md) § Determinism).

## File and module organization

- One pure responsibility per module. `extract/`, `resolve/`, `serialize/` exist as separate modules precisely to keep traversal, interpretation, and validation independently testable.
- Public API of each package is the package root `index.ts`. Internal files do not need to be exported.
- `packages/spec-schema` has no runtime dependencies beyond Zod. It is consumed by both branches and the user's project.

## Commit messages

Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`, `style:`.

- English only.
- Imperative mood (`add`, not `added`).
- Subject ≤ 72 characters total, lowercase after the colon, no trailing period.
- Body only when extra context is needed; separated from subject by a blank line.
- No `Co-authored-by` lines, no `Generated with Claude`, no AI attribution of any kind.

Examples:

```
feat: add token resolution to bridge config lookup
fix: emit UNBOUND_COLOR when fill has no bound variable
docs: clarify slot recursion in resolution algorithm
refactor: split resolver into per-property functions
```

## Testing

Fixture-driven. The canonical fixture is `DemoCard` (described in `PLAN.md` § Verification). Three pass criteria:

1. The emitted `Spec` matches the expected JSON byte-for-byte after key sorting.
2. After `figle paste`, Claude Code (run in `examples/demo-vue-app`) materializes the `Spec` into an SFC that compiles.
3. An unbound color in the fixture produces exactly one `UNBOUND_COLOR` warning, and the agent annotates the generated SFC with a corresponding `<!-- TODO -->` comment.

Unit-test individual resolvers (`resolveBoundVariable`, `resolveComponentInstance`, etc.) against small synthetic `RawNode` inputs. Integration tests run the full pipeline on the fixture.

Do NOT mock the Figma API in unit tests. Resolvers consume the `RawNode` IR, not Figma SDK objects — call them with literal IR inputs. Mocking would test the mock, not the resolver.

## Language

Code, file names, comments, commit messages, and all documentation are **English only**. The maintainer's working language with the AI in conversation is Russian — that is conversation, not artifact.

## When in doubt — ask, don't guess

Ask the user before:

- Adding a new top-level package
- Adding a runtime dependency (especially anything that increases plugin bundle size)
- Touching `manifest.json` `allowedDomains` / `networkAccess` (must remain `["none"]`)
- Changing the `Spec` schema in a non-additive way
- Anything that affects the `examples/demo-vue-app` fixture — it is the contract test

Just do (no need to ask):

- Adding a unit test
- Refactoring a single file for clarity with no public-API change
- Adding a new `Warning` code when extending resolution
- Updating docs to reflect implementation reality
- Fixing typos
