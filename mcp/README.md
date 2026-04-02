# beta.rocks MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives Claude and other AI assistants direct access to the beta.rocks climbing API.

## Tools

| Tool | Description |
|------|-------------|
| `search_crags` | Search climbing crags by name |
| `get_crag` | Get crag detail by ID (sectors, rock type, location) |
| `find_nearby_crags` | Find crags near coordinates |
| `get_crag_reports` | Get community reports for a crag |
| `submit_report` | Submit a community report (requires sync_key) |

## Setup

### Claude Code

```bash
cd mcp
npm install
npm run build
```

Then add to your Claude Code MCP settings:

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

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

## Examples

Once connected, you can ask Claude things like:

- "Search for climbing crags near Munich"
- "What's the rock type at Frankenjura?"
- "Find crags within 10km of 49.7, 11.3"
- "Show me recent condition reports for Frankenjura"
