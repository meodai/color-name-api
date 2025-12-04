# Development Guide

Guide for setting up and developing the Color Name API locally.

## Prerequisites

- Node.js >= 20.11.0 **OR** [Bun](https://bun.sh) >= 1.0
- Git

> **Note:** This project supports both Node.js and Bun runtimes. Default scripts use `tsx` (Node-compatible), with `:bun` variants available for Bun users.

## Quick Start

### With npm (Node.js)

```bash
# Clone the repository
git clone https://github.com/meodai/color-name-api.git
cd color-name-api

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server with hot reload
npm run dev
```

### With Bun

```bash
# Clone the repository
git clone https://github.com/meodai/color-name-api.git
cd color-name-api

# Install dependencies
bun install

# Copy environment template
cp .env.example .env

# Start development server with hot reload
bun run dev:bun
```

The API will be available at `http://localhost:8080`.

---

## Development Scripts

### Runtime Options

| Task | Node.js (tsx) | Bun |
|------|---------------|-----|
| Dev server | `npm run dev` | `bun run dev:bun` |
| Start TypeScript | `npm run start:ts` | `bun run start:bun` |
| Run all tests | `npm run test` | `bun run test:bun` |

### All Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload (tsx) |
| `bun run dev:bun` | Start dev server with hot reload (Bun) |
| `npm run start` | Start production server (Node.js, JavaScript) |
| `npm run start:ts` | Start TypeScript server (tsx) |
| `bun run start:bun` | Start TypeScript server (Bun) |
| `npm run test` | Run all tests (tsx) |
| `bun run test:bun` | Run all tests (Bun) |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix linting issues |
| `npm run format` | Format code with Prettier |

---

## Testing

### Run All Tests

```bash
# With Node.js (tsx)
npm run test

# With Bun
bun run test:bun
```

### Individual Test Suites

Each test has both a Node.js and Bun variant:

| Test | Node.js (tsx) | Bun |
|------|---------------|-----|
| Core API | `npm run test:local` | `bun run test:local:bun` |
| VP-Tree | `npm run test:vptree` | `bun run test:vptree:bun` |
| Palette names | `npm run test:palette-name` | `bun run test:palette-name:bun` |
| Compare API | `npm run test:compare-api` | `bun run test:compare-api:bun` |
| Gzip headers | `npm run test:gzip-headers` | `bun run test:gzip-headers:bun` |
| Concurrent users | `npm run test:concurrent` | `bun run test:concurrent:bun` |
| Live API | `npm run test:live` | `bun run test:live:bun` |

### Writing Tests

Tests are located in the `test/` directory. Tests are simple TypeScript files that work with both tsx and Bun.

Example test:
```typescript
// test/example.test.ts

const response = await fetch("http://localhost:8080/v1/?values=ff0000");
const data = await response.json();

if (data.colors.length !== 1) {
  throw new Error("Expected 1 color");
}

if (!data.colors[0].name) {
  throw new Error("Color name missing");
}

console.log("✅ Test passed");
```

---

## Project Structure

```
color-name-api/
├── src/
│   ├── index.ts          # Entry point
│   ├── app.ts            # Hono app configuration
│   ├── lib/              # Core libraries
│   │   ├── FindColors.ts # Color matching logic
│   │   └── VPTree.ts     # VP-Tree implementation
│   ├── middleware/       # Custom middleware
│   │   ├── logger.ts
│   │   └── rateLimit.ts
│   ├── routes/           # API routes
│   │   ├── colors.ts     # Main color lookup
│   │   ├── names.ts      # Name search
│   │   ├── lists.ts      # Color list info
│   │   └── swatch.ts     # SVG swatch generation
│   ├── services/         # Business logic
│   │   ├── colorService.ts
│   │   ├── cacheService.ts
│   │   ├── socketService.ts
│   │   └── geoipService.ts
│   └── types/            # TypeScript types
├── test/                 # Test files
├── docs/                 # Documentation
├── .env.example          # Environment template
└── package.json
```

---

## Environment Setup

### Minimal Development Setup

For basic development, you don't need a database:

```bash
# .env
NODE_ENV=development
PORT=8080
NODB=true
```

### Full Development Setup

For testing all features including database:

```bash
# .env
NODE_ENV=development
PORT=8080
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SOCKET=true
```

---

## API Endpoints

### Color Lookup
```bash
# Single color
curl "http://localhost:8080/v1/?values=ff0000"

# Multiple colors
curl "http://localhost:8080/v1/?values=ff0000,00ff00,0000ff"

# With options
curl "http://localhost:8080/v1/?values=ff0000&list=bestOf&noduplicates=true"
```

### Name Search
```bash
curl "http://localhost:8080/v1/names/blue"
curl "http://localhost:8080/v1/names/?name=ocean&maxResults=10"
```

### Color Lists
```bash
curl "http://localhost:8080/v1/lists/"
```

### SVG Swatch
```bash
curl "http://localhost:8080/v1/swatch/?color=ff0000"
```

---

## Debugging

### Enable Debug Logging

```bash
DEBUG=true bun run dev
```

### VS Code Launch Config

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "bun",
      "request": "launch",
      "name": "Debug API",
      "program": "${workspaceFolder}/src/index.ts",
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "true"
      }
    }
  ]
}
```

---

## Code Style

The project uses:
- **ESLint** for linting
- **Prettier** for formatting
- **Biome** for additional checks

```bash
# Check formatting
bun run format:check

# Fix formatting
bun run format

# Lint
bun run lint

# Fix lint issues
bun run lint:fix
```

---

## Type Checking

```bash
bun run typecheck
```

This runs TypeScript in check mode without emitting files.

---

## Common Development Tasks

### Adding a New Route

1. Create route file in `src/routes/`
2. Export and add to `src/routes/index.ts`
3. Mount in `src/app.ts`

### Adding a New Environment Variable

1. Add to `.env.example` with documentation
2. Update `docs/CONFIGURATION.md`
3. Use with fallback: `process.env.VAR_NAME || "default"`

### Updating Color Data

Color data comes from the `color-name-list` npm package:
```bash
bun update color-name-list
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8080
lsof -i :8080

# Kill it
kill -9 <PID>
```

### TypeScript Errors

```bash
# Clear cache and reinstall
rm -rf node_modules/.cache
npm install  # or: bun install
```

### Tests Failing

Make sure the dev server is running:
```bash
# Terminal 1 (Node.js)
npm run dev

# Terminal 2
npm run test:local
```

Or with Bun:
```bash
# Terminal 1
bun run dev:bun

# Terminal 2
bun run test:local:bun
```

### Runtime Detection

The server auto-detects the runtime environment:
- Running with tsx/Node: Shows `Runtime: Node vX.X.X`
- Running with Bun: Shows `Runtime: Bun X.X.X`
