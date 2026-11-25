# Contributing to `harness-replay`

Thank you for your interest in contributing to `harness-replay`! We welcome bug reports, documentation improvements, UI refinements, and especially **new AI coding harness parsers** (e.g., Cursor, Windsurf, Kiro, Cline, Roo Code, Aider, Pi).

## Privacy & Security Principles

`harness-replay` is strictly **local-first and zero-telemetry**. All contributions must uphold these principles:

- **No external telemetry or analytics:** Never add tracking pixels, analytics SDKs, or outbound requests from the client or server.
- **No credential or secret access:** Local filesystem scanning must remain strictly opt-in and scoped to user-selected or preset session directories, with path-traversal protection (`isPathInsideRoots`) and sensitive directories (such as `.ssh`, `.git`, `node_modules`) excluded.
- **Never commit real personal logs:** When adding test fixtures or demo sessions, use sanitized or synthetic `.jsonl` transcripts with no API keys, tokens, emails, or private file paths.

## Development Setup

### Prerequisites

- **Node.js** 20+
- **npm** 10+

### Running Locally

```bash
git clone https://github.com/yamisagi/harness-replay.git
cd harness-replay
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Verification

Before opening a pull request, verify that both linting and the production build pass:

```bash
npm run lint
npm run build
```

## Project Architecture

```text
app/                      # Next.js App Router (layout, page, globals.css, local API routes)
src/
├── types/                # NormalizedSession, SessionStep, ToolCall, and analytics types
├── data/                 # Built-in demo sessions for instant exploration
├── lib/
│   ├── parsers/          # Modular .jsonl parsers (Claude Code, Codex CLI, OpenCode, Antigravity)
│   ├── server/           # Opt-in local filesystem session scanner
│   ├── analytics/        # Token/cost calculator, 8-rule waste detector, context graph builder
│   ├── storage/          # Browser localStorage persistence with quota handling
│   ├── pricing.ts        # Model token pricing table (input, output, cache read/write)
│   └── quota.ts          # 5H / 7D subscription quota impact estimator
├── hooks/                # Client state hooks (useReplayWorkspace, useLocalSessions)
└── components/           # Swarm Mission Control UI & *Styles.ts dictionaries
```

## Coding Conventions

- **Language:** All UI copy, code, comments, and commit messages should be in **English**.
- **File Size:** Keep source files concise and modular (**max 200 lines per file**). Split large parsers or components into focused helpers.
- **Styling:** Isolate Tailwind CSS class dictionaries in dedicated `*Styles.ts` files (`SwarmStyles.ts`, `ReplayStyles.ts`).
- **TypeScript:** Keep strict typing intact; avoid `any` and validate untrusted JSON/JSONL records with explicit type guards.

## Adding a New Harness Parser

1. **Inspect the log format:** Document the `.jsonl` record structure (role, timestamps, token usage fields, tool calls, model name) in your PR description.
2. **Add a parser/adapter:** Create or extend a module in `src/lib/parsers/` (for example, `harnessAdapters.ts`) that normalizes records into `NormalizedSession` and `SessionStep[]`.
3. **Register detection:** Wire strict record validation into `src/lib/parsers/jsonlParser.ts` so unrelated JSON files are rejected cleanly.
4. **Update harness metadata:** Add the harness identifier to `HarnessType` in `src/types/session.ts`, display labels in `src/components/SwarmHeader.tsx` / `SessionSidebar.tsx`, and optional preset paths in `src/lib/server/localSessionScanner.ts` + `src/lib/quota.ts`.
5. **Verify:** Test by dropping a sanitized `.jsonl` file into the UI and running `npm run build`.

## Submitting a Pull Request

1. Fork the repository and create a feature branch from `dev` (or `main` if `dev` is not present).
2. Keep your PR focused on a single feature or fix.
3. Run `npm run lint` and `npm run build` and include any relevant screenshots for UI changes.
