# ToonFetch

Type-safe OpenAPI clients for Ory services with an MCP server for AI-driven API exploration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.15-orange.svg)](https://pnpm.io/)

## Features

- **Type-Safe API Clients** - Fully typed OpenAPI clients for Ory Kratos and Hydra using `apiful`
- **MCP Server** - Model Context Protocol server for Claude and other AI assistants to introspect and generate code for APIs
- **TOON Format** - Compressed OpenAPI specs (40-45% smaller) using TOON format for efficient token usage
- **Auto-Discovery** - Automatic service detection and type generation from OpenAPI specifications
- **Modern TypeScript** - Built with TypeScript 5.7, strict mode, and ESNext features

## Installation

```bash
# Using pnpm (recommended)
pnpm add toonfetch

# Using npm
npm install toonfetch

# Using yarn
yarn add toonfetch
```

## Quick Start

### Using the Type-Safe API Client

```typescript
import { createClient, kratos } from 'toonfetch/ory'

// Create a typed client for Ory Kratos
const client = createClient({
  baseURL: 'https://your-kratos-instance.com',
}).with(kratos)

// Fully typed requests and responses
const schema = await client('/schemas/{id}', {
  method: 'GET',
  path: { id: 'default' },
})

// Create an identity
const identity = await client('/admin/identities', {
  method: 'POST',
  body: {
    schema_id: 'default',
    traits: {
      email: 'user@example.com',
    },
  },
})
```

### Using the MCP Server

The MCP server allows Claude and other AI assistants to explore and generate code for your APIs.

#### 1. Build the Project

```bash
pnpm build
```

#### 2. Configure Claude Desktop

Add to your Claude Desktop configuration:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "toonfetch": {
      "command": "node",
      "args": ["/absolute/path/to/toonfetch/dist/mcp-server.js"]
    }
  }
}
```

#### 3. Restart Claude Desktop

The MCP server provides these tools:
- `list_apis` - List all available APIs
- `get_api_info` - Get API metadata
- `search_endpoints` - Search endpoints by path/method/description
- `get_endpoint_details` - Get detailed endpoint information
- `get_schema_details` - Get schema/model definitions
- `generate_code_example` - Generate TypeScript code examples
- `get_quickstart` - Generate quickstart guides

## Available APIs

### Ory Kratos
Identity and user management API.

```typescript
import { createClient, kratos } from 'toonfetch/ory'
```

### Ory Hydra
OAuth 2.0 and OpenID Connect server.

```typescript
import { createClient, hydra } from 'toonfetch/ory'
```

## Development

### Prerequisites

- Node.js 18+ (20+ recommended)
- pnpm 9.15+

### Setup

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run type checking
pnpm test:types

# Run linter
pnpm lint

# Fix linting issues
pnpm lint:fix
```

### Build Pipeline

The build process runs these steps in order:

1. **`convert:toon`** - Convert JSON specs to TOON format
2. **`update:exports`** - Auto-update package.json exports
3. **`tsdown`** - Bundle TypeScript and generate declarations
4. **`copy:types`** - Copy type definitions to dist/
5. **`add:refs`** - Add type references to compiled files

```bash
pnpm build              # Run full pipeline
pnpm convert:toon       # Only convert to TOON
pnpm generate:types     # Only generate types
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Local Development

The `playground/` directory contains examples for testing:

```bash
cd playground
tsx index.ts
```

## Project Structure

```
toonfetch/
├── src/
│   └── mcp-server.ts          # MCP server implementation
├── scripts/
│   ├── convert-to-toon.ts     # TOON conversion script
│   ├── generate-types.ts      # Type generation script
│   └── ...                    # Other build scripts
├── openapi-specs/
│   └── ory/
│       ├── kratos.json        # Ory Kratos OpenAPI spec
│       ├── kratos.toon        # Compressed TOON version
│       ├── hydra.json         # Ory Hydra OpenAPI spec
│       ├── hydra.toon         # Compressed TOON version
│       ├── apiful.config.ts   # Type generation config
│       └── index.ts           # Client exports
├── playground/
│   └── index.ts               # Usage examples
└── dist/                      # Compiled output
```

## Adding New APIs

1. Create a directory in `openapi-specs/{service-name}/`
2. Add your OpenAPI JSON specifications
3. Create `apiful.config.ts` and `index.ts` (use `ory/` as template)
4. Run `pnpm build`

The build system will automatically:
- Convert JSON to TOON format
- Generate TypeScript types
- Update package.json exports
- Bundle for distribution

## Why TOON Format?

TOON (Tree Object Oriented Notation) compresses OpenAPI specs by ~40-45%:

- **Ory Kratos:** ~134k tokens (JSON) → ~73k tokens (TOON) = 45.2% savings
- **Ory Hydra:** ~69k tokens (JSON) → ~40k tokens (TOON) = 42.0% savings

This matters for:
- MCP server context windows
- Embedding specs in AI prompts
- Faster spec loading and parsing

## Documentation

For detailed documentation, see:
- [CLAUDE.md](./CLAUDE.md) - Comprehensive project documentation
- [Ory Kratos API Docs](https://www.ory.sh/docs/kratos)
- [Ory Hydra API Docs](https://www.ory.sh/docs/hydra)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `pnpm lint:fix` and `pnpm test`
5. Submit a pull request

## License

MIT © 2025

## Acknowledgments

- [apiful](https://github.com/lisnote/apiful) - Type-safe OpenAPI client generator
- [TOON Format](https://github.com/toon-format/toon) - Efficient spec compression
- [Ory](https://www.ory.sh/) - Open source identity infrastructure
- [Model Context Protocol](https://modelcontextprotocol.io/) - AI assistant integration standard
