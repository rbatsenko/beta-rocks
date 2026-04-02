# beta.rocks MCP Server

[![npm](https://img.shields.io/npm/v/beta-rocks-mcp)](https://www.npmjs.com/package/beta-rocks-mcp)

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives AI assistants direct access to the [beta.rocks](https://beta.rocks) climbing API.

## Tools

| Tool | Description |
|------|-------------|
| `search_crags` | Search climbing crags by name |
| `get_crag` | Get crag detail by ID (sectors, rock type, location) |
| `find_nearby_crags` | Find crags near coordinates |
| `get_crag_reports` | Get community reports for a crag |
| `submit_report` | Submit a community report (requires sync_key) |

## Installation

### Claude.ai (Remote)

Add as an MCP integration in Claude.ai settings using the server URL:

```
https://beta.rocks/api/mcp
```

No installation needed — works directly in the browser.

### Claude Code

```bash
claude mcp add beta-rocks -- npx beta-rocks-mcp
```

### Claude Desktop

Add to your config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "beta-rocks": {
      "command": "npx",
      "args": ["beta-rocks-mcp"]
    }
  }
}
```

### Cursor

Open Settings > MCP Servers > Add new MCP server:

```json
{
  "mcpServers": {
    "beta-rocks": {
      "command": "npx",
      "args": ["beta-rocks-mcp"]
    }
  }
}
```

### Windsurf

Open Settings > MCP > Add server > Add custom server:

```json
{
  "mcpServers": {
    "beta-rocks": {
      "command": "npx",
      "args": ["beta-rocks-mcp"]
    }
  }
}
```

### Cline (VS Code)

Open Cline settings > MCP Servers > Add:

```json
{
  "mcpServers": {
    "beta-rocks": {
      "command": "npx",
      "args": ["beta-rocks-mcp"]
    }
  }
}
```

### Any MCP-compatible client

The config is the same for any client that supports MCP:

```json
{
  "mcpServers": {
    "beta-rocks": {
      "command": "npx",
      "args": ["beta-rocks-mcp"]
    }
  }
}
```

### From source

```bash
git clone https://github.com/rbatsenko/beta-rocks
cd beta-rocks/mcp
npm install && npm run build
```

Then use the local path:

```json
{
  "mcpServers": {
    "beta-rocks": {
      "command": "node",
      "args": ["/path/to/beta-rocks/mcp/dist/index.js"]
    }
  }
}
```

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `BETA_ROCKS_API_URL` | `https://beta.rocks` | API base URL |

## Usage

Once connected, you can ask your AI assistant things like:

- "Search for climbing crags near Munich"
- "What's the rock type at Frankenjura?"
- "Find crags within 10km of 49.7, 11.3"
- "Show me recent condition reports for Frankenjura"
- "Are there any safety reports for this crag?"

## API

This MCP server wraps the [beta.rocks public API v1](https://beta.rocks/docs/api). Full API reference available at [beta.rocks/llms-full.txt](https://beta.rocks/llms-full.txt).
