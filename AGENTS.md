## Project Structure

Excalidraw is a **monorepo** with a clear separation between the core library and the application:

- **`packages/excalidraw/`** - Main React component library published to npm as `@excalidraw/excalidraw`
- **`excalidraw-app/`** - Full-featured web application (excalidraw.com) that uses the library
- **`packages/`** - Core packages: `@excalidraw/common`, `@excalidraw/element`, `@excalidraw/math`, `@excalidraw/utils`
- **`examples/`** - Integration examples (NextJS, browser script)

## Development Workflow

1. **Package Development**: Work in `packages/*` for editor features
2. **App Development**: Work in `excalidraw-app/` for app-specific features
3. **Testing**: Always run `yarn test:update` before committing
4. **Type Safety**: Use `yarn test:typecheck` to verify TypeScript

## Development Commands

```bash
yarn test:typecheck  # TypeScript type checking
yarn test:update     # Run all tests (with snapshot updates)
yarn fix             # Auto-fix formatting and linting issues
```

## Architecture Notes

### Package System

- Uses Yarn workspaces for monorepo management
- Internal packages use path aliases (see `vitest.config.mts`)
- Build system uses esbuild for packages, Vite for the app
- TypeScript throughout with strict configuration


---

## Minimal Canvas Extraction Agent Rules

### Prime Directive
This agent is authorized to directly modify the repository to extract a minimal, canvas-only application.
Execution takes precedence over explanation.

### Continuation
The agent must continue working across multiple turns until all success criteria are satisfied.
Do not stop early. Do not stop to summarize progress.

### Authority
The agent may:
- Delete files and directories
- Rewrite app entry points
- Modify Vite, TypeScript, and package configuration
- Remove dependencies and internal packages
- Refactor architecture to simplify

No user confirmation is required for these actions.

### Deletion Policy
If a feature is not required for core canvas rendering, it must be removed entirely.
Disabling or commenting out code is insufficient. Dead code must be deleted.

### Scope Enforcement
The final application must render only the canvas UI.
Features explicitly out of scope include:
- Collaboration or multiplayer
- Networking, servers, sockets, encryption
- Analytics or telemetry
- PWA, service workers, offline caching
- Authentication or accounts

### Phase Discipline
Work must proceed strictly in phases:
1. Dependency and import graph audit
2. App shell destruction
3. Feature pruning
4. State and context collapse
5. Build and runtime validation
6. Final hardening

A phase must be fully complete before advancing to the next.

### Output Discipline
All agent responses must use checklist-style progress reporting.
Narrative explanations and architectural essays are forbidden unless execution is blocked.

### Error Handling
TypeScript errors, build failures, or runtime crashes must be resolved immediately before proceeding.

### State Persistence
At the end of each execution step, the agent must emit a short state snapshot including:
- Current phase
- Files deleted
- Files modified
- Remaining blockers

The agent must resume from this snapshot on continuation.

### Stop Condition
The agent may stop only when:
- Dependencies install cleanly
- Dev server launches successfully
- Only the canvas UI renders
- No forbidden features remain in the codebase
- TypeScript has zero errors
