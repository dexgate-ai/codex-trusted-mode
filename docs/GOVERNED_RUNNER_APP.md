# Governed Runner App (product architecture)

## Goal

Ship a **DexGate product** that feels interactive for governed agent work:

- multi-turn conversation
- every high-impact tool/shell action gated by **SDE PDP**
- first host: **Codex** (app-server + approval bridge)
- later hosts: **Grok, OpenClaw, Claude, Cursor, Copilot** via plug-in adapters

This is **not** OpenAI’s interactive `codex` TUI. That remains their product. We own the **governed session shell**.

## Layers

```
┌─────────────────────────────────────────────┐
│  Governed Runner App (UI / CLI / API)       │  DexGate product
│  - chat, history, cwd, host picker          │
└──────────────────┬──────────────────────────┘
                   │ session API
┌──────────────────▼──────────────────────────┐
│  Host adapter                               │
│  codex | grok | openclaw | …                │
│  - start/continue turn                      │
│  - map native approval / tool hooks         │
└──────────────────┬──────────────────────────┘
                   │ authorize
┌──────────────────▼──────────────────────────┐
│  SDE PDP  POST /v1/authorize                │  DexGate runtime
└─────────────────────────────────────────────┘
```

## MVP (shipped in this package)

| Piece | Status |
|--------|--------|
| One-shot runner `codex-trusted-mode-run-turn` | Existing |
| Multi-turn session `codex-trusted-mode-session` | **MVP in this package** |
| SDE gate on approval callbacks | Existing bridge |
| Desktop/web app shell | Future |
| Multi-host plugin registry | Future |

### CLI MVP usage

```bash
# VPN + SDE for paid mode; config.toml [apps.codex-trusted-mode] toolPolicyMode=PDP
codex-trusted-mode-session --cwd ~/project
```

Inside the session, type prompts as multi-turn chat. Approvals go through SDE when `toolPolicyMode=PDP`.

## Roadmap toward the app

### Phase 1 — Codex interactive session (now)

- [x] Extract multi-turn `GovernedCodexSession`
- [x] REPL CLI (`codex-trusted-mode-session`)
- [ ] Persist session transcript + decision log to disk
- [ ] Optional local HTTP API wrapping the session (for a future UI)

### Phase 2 — Governed Runner App (desktop or web)

- Thin UI: message list, prompt box, governance panel (allow/deny chips)
- Talks only to local session API (Phase 1)
- No host secrets in the UI layer beyond what adapters already use

### Phase 3 — Multi-host

| Host | Intercept surface | Adapter status |
|------|-------------------|----------------|
| Codex | app-server approval callbacks | Live |
| OpenClaw | plugin tool policy / PDP | Live (separate package) |
| Grok | host tool/approval hooks when certified | Planned |
| Claude / Cursor / Copilot | host-specific | Planned |

App shell stays host-agnostic; each host is a **capability adapter** implementing:

```ts
interface HostSession {
  start(options): Promise<void>
  prompt(text): Promise<TurnResult>
  close(): Promise<void>
}
```

## Claims discipline

Safe to claim:

- DexGate provides a **governed session / runner** for Codex that uses SDE on native approval callbacks
- Interactive multi-turn is available via **our** session CLI/app, not via silent wrap of OpenAI Full Access TUI

Do **not** claim:

- Plain interactive `codex` TUI is SDE-governed by config alone
- Every third-party agent UI is governed until that host is certified

## Relationship to packages

| Package | Role |
|---------|------|
| `@dexgate/codex-trusted-mode` | Codex adapter + one-shot + multi-turn session MVP |
| `@dexgate/openclaw-trusted-mode` | OpenClaw adapter |
| future `@dexgate/governed-runner` or app repo | Multi-host UI + session orchestrator |

SDE remains the single policy plane.
