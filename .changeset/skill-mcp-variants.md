---
"@figle/mcp-preset": patch
---

Make the `figle` skill work with both Figma MCP flavours. The skill now detects whether the local Dev Mode MCP (`mcp__Figma__*`, selection-aware) or the remote/plugin MCP (`mcp__plugin_figma_figma__*`, requires `fileKey` + `nodeId`) is connected and adapts its call shape. Adds a post-install checklist printed by `figle-mcp install` that explains how to enable Figma's local MCP server and register it with Claude Code.
