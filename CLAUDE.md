# claude-plugins

Monorepo marketplace for Claude Code plugins. Each plugin lives in its own subdirectory.

## Structure

```
.claude-plugin/marketplace.json   # Registry — lists all plugins with source paths
solve/                            # Structured problem-solving plugin
relay/                            # Session continuity plugin
```

Each plugin has its own `.claude-plugin/plugin.json` with metadata, hooks, MCP servers, etc.

## Adding a plugin

1. Create a new directory with a `.claude-plugin/plugin.json`.
2. Add an entry to `.claude-plugin/marketplace.json` pointing `"source"` at the directory.

## Versioning

When updating a plugin, bump `"version"` in its `.claude-plugin/plugin.json`.

## Install

Users add this repo as a marketplace source, then install individual plugins:

```
/plugin marketplace add Phaen/claude-plugins
/plugin install solve@Phaen
/plugin install relay@Phaen
```
