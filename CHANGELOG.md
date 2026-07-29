# Changelog

## 0.1.15
- Make the bridge CLI test suite hermetic: spawn with an empty temporary `CODEX_HOME` so tests do not inherit the developer’s personal governed `config.toml` (Ticket 5).
- Refresh `COMPATIBILITY_MATRIX.md` and Codex plugin manifest version pin to match package version (Ticket 6).
- Publish current mainline (governed session CLI + agentMessage capture) as the public `latest` pin.

## 0.1.14
- Fix agent reply capture: Codex app-server emits `item.type = "agentMessage"` (camelCase); extractor only matched `agent_message`, so interactive UI showed empty agent text.

## 0.1.13
- Add multi-turn **governed session** CLI: `codex-trusted-mode-session` (DexGate interactive runner, not OpenAI TUI).
- Add `GovernedCodexSession` for app-server multi-turn prompts with SDE approval gating.
- Document multi-host **Governed Runner App** roadmap in `docs/GOVERNED_RUNNER_APP.md`.

## 0.1.12
- Clarify claims boundary: plain interactive `codex` / Full Access is not the paid SDE enforcement path; `config.toml` alone does not intercept live TUI shell.
- Document that paid validation uses the hosted runner / native approval bridge (`codex-trusted-mode-run-turn`).

## 0.1.11
- Point README and START_HERE at dexgate.ai, GitHub org `dexgate-ai`, and X [@dexgateAI](https://x.com/dexgateAI).
- Document hosted Codex quickstart; marketplace install uses `dexgate-ai/codex-trusted-mode`.
- Remove `@beta` install path from onboarding; publish uses `latest` only (no `pilot` dist-tag).
- Fix Codex plugin manifest `repository` URL to `github.com/dexgate-ai/codex-trusted-mode`.

## 0.1.10
- Point npm `repository` metadata at `github.com/dexgate-ai/codex-trusted-mode`.

## 0.1.8

- detect post-hoc readonly execution from both `rawResponseItem/completed` local-shell items and completed thread commandExecution items
- mark the hosted runner turn as a governance gap on the current Codex readonly path more reliably

## 0.1.7

- fail hosted-runner validation loudly when Codex only surfaces readonly command execution after completion
- expose post-hoc commandExecution summaries and governance-gap warnings in hosted-runner JSON output

## 0.1.6

- enable raw app-server event capture in the hosted runner for readonly Codex turn debugging
- surface `item/tool/call` traffic, observed methods, and optional JSON traces from `codex-trusted-mode-run-turn`

## 0.1.5

- launch the packaged hosted runner through cmd.exe on Windows so local beta installs can spawn Codex app-server correctly
- surface spawn errors in the hosted runner summary for faster troubleshooting

## 0.1.4

- make the packaged hosted Codex runner request the native approval path explicitly
- align the hosted runner with the proven read-only app-server sandbox posture
- avoid the Windows shell deprecation warning by launching codex without shell mode

## 0.1.3

- add a fixed free-mode safety floor that blocks broad interpreters and shell launcher commands before any standalone allowlist match
- move richer per-command shell argument validation to the SDE Guard Pro pack so governed policy depth stays on the paid runtime side

## 0.1.1

- block shell commands that chain control operators or redirection behind an otherwise read-only prefix
- tighten local allowlist evaluation to exact program and subcommand matches instead of raw string prefix matching
- add PDP/mock-PDP regression coverage for chained shell command deny paths

## 0.1.0

- created the initial Codex Trusted Mode repo
- implemented standalone local hardening defaults
- implemented normalized Codex request contract
- implemented optional SDE PDP adapter
- added verification scripts and node:test coverage
- documented the free/paid product boundary
- aligned the repo to the observed Codex tool surface
- added a mock PDP, governed example flow, and initial release evidence artifacts




