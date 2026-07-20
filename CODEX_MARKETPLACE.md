# Codex marketplace packaging for DexGate

Codex discovers third-party plugins through **marketplaces** (JSON catalogs), not
through npm alone. This repo ships a marketplace entry plus a skill-based plugin
that points users at the public MIT npm adapter.

## What this is

| Piece | Path | Purpose |
|-------|------|---------|
| Plugin | `plugins/dexgate-codex-trusted-mode/` | Codex plugin with skills for free + paid paths |
| Manifest | `plugins/dexgate-codex-trusted-mode/.codex-plugin/plugin.json` | Plugin identity + install-surface metadata |
| Marketplace | `.agents/plugins/marketplace.json` | Catalog Codex can load from this repo |
| Runtime adapter | npm `@dexgate/codex-trusted-mode` | Actual local hard gate + PDP bridge (unchanged) |

The Codex plugin **does not re-implement** policy enforcement. Skills instruct
install of the published npm package and first-success commands.

## User: add this marketplace from the CLI

```bash
# Track this GitHub repo as a Codex plugin marketplace
codex plugin marketplace add dexgate-ai/codex-trusted-mode
# optional pin:
# codex plugin marketplace add dexgate-ai/codex-trusted-mode --ref main

codex plugin marketplace list
```

Then install/enable **DexGate Codex Trusted Mode** from the Plugins Directory
(ChatGPT desktop / Codex UI), or follow the free skill:

```bash
npm install @dexgate/codex-trusted-mode
npx codex-local-hardening-check
```

Local checkout testing:

```bash
codex plugin marketplace add ./   # from this repo root (marketplace at .agents/plugins/)
```

## Maintainer notes

1. Keep `plugin.json` `version` aligned with the npm adapter when you cut a release.
2. Skills must stay claim-safe (free = no Passport; paid = pilot / licensed runtime).
3. Optional later: submit the plugin through OpenAIΓÇÖs public plugin submission
   portal for the **official** Plugins Directory ΓÇö that is a separate review
   process from this self-hosted marketplace.

## Claims discipline

- Marketplace listing Γëá OpenAI endorsement.
- Free skill path never claims Passport minting.
- Prefer OpenClaw for the recommended free path when users can choose.
