---
"@figle/spec-schema": patch
"@figle/cli": patch
"@figle/mcp-preset": patch
---

Republish using `pnpm publish` so `workspace:*` dependency specifiers are resolved to actual versions. The 0.1.0-beta.0 publish was done with `npm publish` which left `workspace:*` literally in the published `package.json` files, causing `EUNSUPPORTEDPROTOCOL` when consumers tried `npx @figle/cli@beta` or `npm install`.
