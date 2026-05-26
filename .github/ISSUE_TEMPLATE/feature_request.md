---
name: Feature request
about: Suggest a new capability for figle
title: ""
labels: enhancement
assignees: ""
---

<!--
Please read docs/ROADMAP.md and docs/ARCHITECTURE.md before opening a
request. Most "obvious" missing features are deliberate non-goals
documented there.
-->

## The problem

Describe the use case. What are you trying to build, and what gets in the way? Focus on the situation, not the proposed solution.

## Why existing APIs are insufficient

Briefly note what you tried with the current API and where it fell short:

- What command / plugin button did you use?
- What output did you get?
- What was missing or wrong?

## Possible direction (optional)

If you have ideas for how this could work, share them — but keep the discussion open. The maintainers may suggest a different shape.

## Affected surface

<!-- Tick what would change. Helps scope the work. -->

- [ ] `Spec` schema (`@figle/spec-schema`) — note this is a contract change shared by both branches.
- [ ] `BridgeConfig` schema.
- [ ] Plugin UI / behaviour.
- [ ] `extract` / `resolve` / `serialize` pipeline inside the plugin.
- [ ] `@figle/cli` (`init` / `sync` / `paste`).
- [ ] `@figle/mcp-preset` skill text or `figle-mcp install` CLI.
- [ ] Agent prompt template.
- [ ] Documentation only.

## Alignment with figle's principles

Confirm the request is consistent with the core invariants in [`AGENTS.md`](../../AGENTS.md) and [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md):

- [ ] The plugin does **not** generate code — that is the IDE agent's job.
- [ ] No LLM provider SDK is introduced (no Anthropic / OpenAI / others).
- [ ] No outbound network traffic from the plugin — `manifest.json` `allowedDomains` stays `["none"]`.
- [ ] No API-key handling anywhere.
- [ ] `Spec` schema changes are additive (or behind a major version bump).
- [ ] In scope for the current version, or for a documented later phase in [`docs/ROADMAP.md`](../../docs/ROADMAP.md).

Requests that don't align with these principles may be declined, but the discussion is still welcome — sometimes the right answer is to update the docs to clarify the boundary.

## Priority (your subjective)

- [ ] Blocker — I can't use figle without this.
- [ ] Important — workable now, but limits real adoption.
- [ ] Nice-to-have.
