# harness-replay

**Zero-telemetry, local-first session replay and token/cache optimization viewer for AI coding harnesses.**

Inspect what your coding agents (**Claude Code**, **Codex CLI**, **OpenCode**, **Antigravity**) actually did step by step—without sending a single byte of your logs, prompts, or file paths to any external server.

---

## Why `harness-replay`?

Modern AI coding harnesses execute dozens of tool calls, read files repeatedly, and rely heavily on prompt caching to keep costs down. Terminal scrollback makes it hard to answer simple questions:

- **How effective is prompt caching?** How many tokens and dollars did `cache_read` actually save in this session?
- **Where are tokens being wasted?** Did the agent read the same large file 4 times in a single task?
- **What happened at step 14?** Which tool call failed, how long did it take, and how much did that turn cost?

`harness-replay` parses `.jsonl` session transcripts locally in your browser and gives you a clean, inspectable replay timeline.

## Features

- **100% Local & Zero Telemetry:** No analytics, no auth-file fingerprinting, no remote servers. Drop a `.jsonl` file in the browser or explore built-in demo sessions.
- **Multi-Harness Normalization:** Built-in parsers for Claude Code, Codex CLI, and generic/Antigravity JSONL session logs.
- **Cache Hit & Savings Analytics:** Calculates `input`, `output`, `cache_read`, and `cache_write` breakdowns alongside estimated dollar savings from prompt caching.
- **Waste & Optimization Insights:** Automatically flags repeated file reads, high-token tool outputs, and expensive turns.
- **Step-by-Step Replay Timeline:** Filter steps by type (prompts, tool calls, errors) and inspect expandable tool arguments and outputs.

## Tech Stack

- **Framework:** Next.js (App Router) + React + TypeScript (`strict: true`)
- **Styling:** Tailwind CSS + `lucide-react` + `motion/react`

## Getting Started

```bash
git clone https://github.com/yamisagi/harness-replay.git
cd harness-replay
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Project Structure

```text
app/                  # Lean App Router layout & SSR entry
src/
├── types/            # NormalizedSession & analytics TypeScript contracts
├── data/             # Built-in demo sessions for instant exploration
├── lib/
│   ├── parsers/      # Harness .jsonl log parsers
│   ├── analytics/    # Token, cache-hit, and waste-detection calculators
│   └── pricing.ts    # Model token pricing table
├── hooks/            # Client state management (useReplayWorkspace)
└── components/       # Modular UI components & style dictionaries
```

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request—especially for additional harness log parsers (Cursor, Kiro, Pi, etc.).

## License

MIT
