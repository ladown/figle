# AGENTS.md

Entry point for agents working on figle. `CLAUDE.md` is a symlink to this file.

## Read these files in order

1. [`README.md`](./README.md) — what the project is, status, repository layout
2. [`PLAN.md`](./PLAN.md) — full implementation plan with phases
3. [`docs/ROADMAP.md`](./docs/ROADMAP.md) — current scope and explicit non-goals
4. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — pipeline, packages, two consumption branches, dependency rules
5. [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md) — stack, code style, commits, testing, language

Read the rest when relevant to the task:

- [`docs/SPEC_FORMAT.md`](./docs/SPEC_FORMAT.md) — when working on the `Spec` shape, serialization, or validation
- [`docs/RESOLUTION.md`](./docs/RESOLUTION.md) — when working on token or component resolution
- [`docs/BRIDGE_CONFIG.md`](./docs/BRIDGE_CONFIG.md) — when working on the project-side config file or its CLI

## Behaviour expectations

This documentation is the source of truth. It is written for both human contributors and AI agents — there is no separate "agent doc" with hidden rules. If something is not in `docs/`, it has not been decided. Do not invent answers from general knowledge.

When a decision is needed and the path forward is ambiguous:

1. Choose the option that preserves the project's core invariants (plugin does not generate code; `spec-schema` is the single contract; both branches produce identical `Spec`) — see `docs/ARCHITECTURE.md`.
2. Choose the option with the smaller scope.
3. Document the decision in the appropriate file under `docs/`.

When scope expands beyond what is documented, push back. The MVP target is the smallest end-to-end demo in `PLAN.md` § Verification — anything beyond that is a later phase.

## What to never do

- Generate Vue/JSX/HTML code from inside the plugin or the MCP preset — code generation is the IDE agent's job
- Add a dependency on any LLM provider SDK (Anthropic / OpenAI / etc.) — this project never calls an LLM
- Add outbound network access to the plugin — `manifest.json` `allowedDomains` must remain `["none"]`
- Handle API keys anywhere — there are no keys to handle
- Add features not listed in `docs/ROADMAP.md` for the current version
- Duplicate types between packages — import from `packages/spec-schema`
- Modify the `Spec` schema in a non-additive way without explicit approval
- Use `any`, `@ts-ignore`, or unrestricted type assertions without a justifying comment
- Throw on designer-hygiene issues (unbound colors, unknown components) — emit a `Warning` and continue
- Add `Co-authored-by` or any AI-attribution lines to commit messages

Everything else follows from the documented conventions.
