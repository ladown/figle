# Contributing to figle

Thanks for taking an interest. This is a small project with a focused scope — read the docs first, then file an issue or open a PR.

## Read these first

- [`README.md`](./README.md) — what figle is, who it's for.
- [`AGENTS.md`](./AGENTS.md) — entry point for contributors and AI agents. Points to the canonical docs in [`docs/`](./docs/).
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — the two-branch design (plugin + MCP skill).
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — what's in scope, what's out.
- [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md) — stack, code style, commits, testing.

## Local setup

- **Node** ≥ 24.15.0 (see [`.nvmrc`](./.nvmrc)).
- **pnpm** (the version pinned in `package.json` `packageManager`). With Corepack: `corepack enable`.

```bash
git clone git@github.com:ladown/figle.git
cd figle
pnpm install
```

## Day-to-day commands

```bash
pnpm typecheck     # tsc --noEmit across packages
pnpm test          # vitest (unit tests)
pnpm lint          # oxlint
pnpm fmt           # oxfmt write
pnpm fmt:check     # oxfmt --check (what CI runs)
pnpm build         # build all packages
```

CI runs the same five checks on every push and pull request — make sure they pass locally before pushing.

## Branching and releases

- **`master`** — stable. Publishes to `npm` with the `latest` dist-tag.
- **`beta`** — pre-release. Publishes with the `beta` dist-tag.

Day-to-day work goes through PRs into `beta`. When a batch of changes is stable, `beta` is merged into `master` for the next stable release.

Releases are driven by [Changesets](https://github.com/changesets/changesets). The flow:

1. Make your changes on a feature branch, open a PR into `beta`.
2. Run `pnpm changeset` — pick the affected packages and the bump kind (patch / minor / major). It writes a markdown file under `.changeset/`.
3. Commit that file alongside your code change. CI ensures every non-chore PR carries at least one changeset.
4. On merge into `master` or `beta`, the `changesets/action` workflow opens (or updates) a **Release PR**. Merging that PR publishes the affected packages to npm with the right dist-tag (`latest` from `master`, `beta` from `beta`).

You usually do not write versions by hand — `pnpm version-packages` (run by the bot) applies the bumps from the queued changesets.

### Pre-release period

The repo is currently in changesets' `pre` mode (see `.changeset/pre.json`). Every release out of `master` or `beta` is a `1.0.0-beta.N` until we explicitly exit pre mode. To leave it before the first stable release: `pnpm changeset pre exit`, then merge the resulting Release PR — that ships `1.0.0` to the `latest` dist-tag.

## Commit style

Conventional commit prefixes are not required by the release tool, but we use them for readability:

- `feat: …` — new feature.
- `fix: …` — bug fix.
- `chore: …`, `docs: …`, `test: …`, `refactor: …`, `style: …` — non-feature work.

Other rules (from [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md)):

- English only.
- Imperative mood (`add`, not `added`).
- Subject ≤ 72 characters total, lowercase after the colon, no trailing period.
- No `Co-authored-by` or AI-attribution lines.

The bump kind (patch / minor / major) is decided in the changeset file, not from the commit message.

## What's in scope

See [`docs/ROADMAP.md`](./docs/ROADMAP.md) for V1 scope and explicit non-goals. The biggest hard rules:

- The plugin does **not** generate code — that's the IDE agent's job.
- No LLM provider SDKs, no API keys, no outbound network from the plugin.
- `spec-schema` is the canonical contract; both branches share it.

If your idea lives outside the roadmap, please open an issue describing the use case before sending a PR.

## Code of Conduct

By participating in this project, you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md).
