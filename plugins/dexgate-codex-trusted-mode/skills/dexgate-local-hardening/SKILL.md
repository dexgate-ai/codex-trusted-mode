---
name: dexgate-local-hardening
description: Install and prove the free DexGate Codex local hard gate (no Passport, no paid PDP required).
---

# DexGate free local hardening (Codex)

## Goal

Get a **free first-success** proof on this machine with the public MIT adapter.
This path **never mints a Passport** and does not grant SDE runtime access.

## Prerequisites

- Node.js 20+
- Network access to registry.npmjs.org

## Steps

1. Create a clean working folder and install the published package (not git path installs for customers):

```bash
mkdir dexgate-codex-first-success
cd dexgate-codex-first-success
npm init -y
npm install @dexgate/codex-trusted-mode
```

2. Run the free local check:

```bash
npx codex-local-hardening-check
```

3. Confirm the report includes:

- `status: "PASS"`
- `governed: false`
- `source: "local-hardening"`
- `profile: "developer_free"`
- high-consequence actions (for example `git push` / `git commit`) denied with upgrade guidance
- pricing / upgrade URL pointing at https://dexgate.ai/pricing/

## Free allow vs block (high level)

| Allow | Block (upgrade path) |
|-------|----------------------|
| readonly shell prefixes, constrained test/dev commands | `git push` / `git commit`, deploy-class |
| limited `apply_patch` for local edits | unrestricted shell launchers / hard control operators |

## Optional telemetry

```bash
DEXGATE_TELEMETRY_OPT_IN=true npx codex-local-hardening-check
```

## Claims discipline

- Free install = local hard gate only.
- Do **not** claim Passport minting, certified production GA, or OpenAI endorsement.
- Hosted Codex builds may have governance gaps on some readonly paths after completion when no pre-execution hook exists ΓÇö that is a host boundary, not a broken free install.

Docs: https://dexgate.ai/docs/codex/quickstart/ and package `START_HERE.md`.
