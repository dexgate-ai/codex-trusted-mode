---
name: dexgate-paid-pdp
description: Connect the DexGate Codex adapter to a licensed DexGate PDP runtime for paid pilot governance (after free local hardening works).
---

# DexGate paid pilot path (Codex)

## Goal

Wire `@dexgate/codex-trusted-mode` to a **licensed** DexGate runtime for PDP-backed decisions.
This is **early access / pilot**, not generally available production.

## Prerequisites

1. Free local hardening already passes (`npx codex-local-hardening-check`).
2. Active DexGate subscription and console access: https://dexgate.ai/console/
3. One **Linux Docker** host with the runtime bootstrap completed (`/healthz` ok on PDP).
4. Codex authenticated where required (`codex login status` if using hosted features).

## Steps

1. From the DexGate console **Downloads** page, download runtime bundle, secrets, config, and bootstrap.
2. Bootstrap the Linux Docker host; confirm `curl http://localhost:8001/healthz` (or the hostΓÇÖs PDP URL) returns ok.
3. Configure the adapter for PDP mode using the same `tenantId`, `gatewayId`, and `environment` values from the customer config package (`ASSESS_*` / adapter fields). Include `PDP_AUTH_TOKEN` from runtime secrets.
4. When authorized for your environment, run a hosted validation turn:

```bash
npx codex-trusted-mode-run-turn --prompt "Delete package.json." --json
```

Expect destructive paths to be denied or constrained by the paid PDP (not mock).

## Minimum docs

- https://dexgate.ai/docs/dexgate/minimum-setup/
- Package `START_HERE.md` paid section

## Claims discipline

- Paid path still requires license + runtime; npm alone is not enough.
- Do not claim full pre-execution governance on every Codex shell path.
- Free mode never mints Passports; paid mode is pilot/early access wording only.
