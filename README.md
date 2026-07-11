# DexGate Codex Adapter Package

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

This package is a Codex adapter and integration helper for DexGate-governed workflows.

Current public product boundary:
- the public npm package provides adapter code, local dry-run/evaluation helpers, and mock request examples
- active protected execution depends on an authorized DexGate service, configured policy, entitlement, and runtime checks
- adapter installation does not by itself indicate active enforcement, customer entitlement, or policy-preserving context curation
- runtime hook coverage depends on the Codex runtime surface available at execution time

## Capability Kernel role

This package is a PEP adapter for the SDE / DexGate Capability Kernel
(`PROPOSE -> OBSERVE -> UPDATE -> BOUND -> DECIDE -> ACT -> LEARN`). It
normalizes Codex tool and approval events into Proposals, applies a free local
hard gate or paid PDP evaluation, and refuses paid execution when the PDP auth
token or scoped Passport contract is missing or invalid. It is not the kernel
runtime; `npm install` alone does not grant SDE or passport authority.

## npm Package

Install the public MIT adapter package with:

```bash
npm install @dexgate/codex-trusted-mode
```

For internal evaluation of the current hosted validation path, use the beta tag only when that path has been authorized for your environment:

```bash
npm install @dexgate/codex-trusted-mode@beta
```

Packaged commands:
- `codex-trusted-mode-bridge` for Codex app-server approval callback integration over stdio JSON-RPC
- `codex-trusted-mode-run-turn` for hosted validation flow evaluation
- `codex-local-hardening-check` for a no-network free-mode proof-of-value report

The adapter commands read values from `$CODEX_HOME/config.toml` / `~/.codex/config.toml` by default, or from `--codex-config <path>`.

## What `npm install` gives you

`npm install @dexgate/codex-trusted-mode` gives you the MIT adapter layer, local hardening path, and mock-PDP examples only. It does not grant access to the proprietary SDE runtime, enterprise evidence packs, or commercial governed entitlements.

Public adapter availability does not by itself indicate:
- active protected execution
- active DexGate policy enforcement
- active customer entitlement
- active context curation
- deployment assurance, validation status, or approval of a deployment

## Need DexGate service-backed operation?

If you want DexGate service-backed operation, compare plans at <https://dexgate.ai/pricing/> or download your licensed runtime and deployment instructions from <https://dexgate.ai/console/downloads/>. The public npm package is the adapter install surface; the customer console is the licensed-runtime delivery surface.

Service-backed operation may support:
- policy decision requests before selected actions execute, when runtime hooks are available and configured
- decision records and trace IDs
- tenant entitlements, gateway/environment limits, and rollout evidence
- licensed runtime bundles and supportable deployment instructions

Service-backed config must include:
- `pdpUrl`
- `tenantId`
- `gatewayId`
- `environment`

Those values let DexGate match the correct workspace and environment host.

For licensed deployments, also configure a PDP bearer token with either:
- `pdpAuthToken` in the Codex adapter config block
- `PDP_AUTH_TOKEN` or `DEXGATE_PDP_AUTH_TOKEN` in the process environment

When present, the adapter sends `Authorization: Bearer <token>` on PDP requests.

The npm package is intentionally limited to the installable adapter surface:
- runtime source in `src/`
- baseline configs
- core docs needed to use the MIT adapter

It does not include the proprietary SDE runtime, enterprise packs, or full engineering evidence tree.

## Integration Status

The current Codex adapter path is an evaluation/integration path, not full parity with every supported runtime.

What current internal evidence covers:
- Codex app-server approval callback handling for selected destructive-action requests such as command execution and file changes
- bridge logic that maps those approval requests into DexGate decision responses
- hosted-runner dry-run denial behavior through service-backed policy checks
- explicit gap detection when readonly execution is only surfaced after completion

What is not claimed on current Codex builds:
- full pre-execution governance parity for readonly actions
- deployment assurance, guarantee, or runtime-wide protected execution across all Codex builds or platforms

## Free Mode

Default free posture:
- `ALLOWLIST_ONLY`
- allows `functions.shell_command` only for single-command read-only programs and subcommands
- allows `functions.update_plan` and `functions.view_image`
- blocks `functions.apply_patch`, shell chaining/redirection, broad interpreters, and mutating shell commands by default

This makes the standalone offering useful before any SDE deployment.

Run the free-mode proof-of-value check:

```bash
npm run local-hardening-check
# or, after package install:
npx codex-local-hardening-check
```

Expected report fields include `governed: false` and `source: "local-hardening"`. That is intentional: free mode demonstrates local hardening behavior, not active DexGate service-backed operation.

## Optional Telemetry

Telemetry is disabled by default. If you opt in, the adapter sends coarse usage events to dexgate so we can understand where free users succeed, where upgrade friction appears, and which runtime path needs better guidance.

Opt in with:

```bash
DEXGATE_TELEMETRY_OPT_IN=true npm run local-hardening-check
```

Telemetry does not include prompts, commands, file paths, tool parameters, PDP payloads, or policy contents. Tenant and gateway identifiers are hashed before transmission. You can set `DEXGATE_TELEMETRY_INSTALL_ID` to a non-secret identifier if you want repeated checks from the same environment grouped together.

## Licensed DexGate Service Mode

When `toolPolicyMode` is set to `PDP`, the adapter can send a normalized request to an SDE PDP and apply:
- `allow`
- `deny`
- `constrain`

Licensed service mode is where a configured deployment may add:
- PDP-backed authorization
- tenant and license entitlements
- compatibility review evidence
- decision traces and release evidence
- deeper DexGate shell argument validation and command-policy semantics

For the current supported validation path, run Codex through the packaged hosted session runner from the beta tag:

```bash
codex-trusted-mode-run-turn --prompt "Delete package.json." --json
```

Expected current boundary on supported Codex builds:
- selected destructive-action requests can trigger native approval callbacks and be routed through a decision path
- readonly actions that do not emit a pre-execution hook are returned as `completed_with_governance_gap`

## Quick Start

1. Review the baseline config in [codex.integration.json](./codex.integration.json)
2. Review the decision contract in [DECISION_CONTRACT.md](./DECISION_CONTRACT.md)
3. Run the local verification scripts:

```bash
node scripts/verify_config_contract.js
node scripts/verify_local_hardening.js
node scripts/verify_pdp_request_shape.js
```

4. Run the test suite:

```bash
node --test
```

5. Run the standalone free demo:

```bash
node scripts/run_free_demo.js
npm run local-hardening-check
```

6. Evaluate a single sample event:

```bash
node scripts/evaluate_event.js --event examples/readonly-shell-event.json --config codex.user-config.entry.example.json
```

7. Evaluate a native approval request:

```bash
node scripts/evaluate_app_server_request.js --input examples/native-command-approval-request.json
```

8. Run the hosted validation path through the packaged runner:

```bash
codex-trusted-mode-run-turn --prompt "Delete package.json." --json
```

Repo-level mock PDP examples are marked as simulated. They are useful for request-shape and adapter behavior checks, but they are not customer deployment evidence.

9. Review the compatibility and rollout boundary before describing service-backed behavior:

- [COMPATIBILITY_MATRIX.md](./COMPATIBILITY_MATRIX.md)
- [START_HERE.md](./START_HERE.md)
- [FREE_MODE.md](./FREE_MODE.md)

## Key Files

- [PRODUCT_DEFINITION.md](./PRODUCT_DEFINITION.md)
- [DECISION_CONTRACT.md](./DECISION_CONTRACT.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [FREE_MODE.md](./FREE_MODE.md)
- [OBSERVED_TOOL_SURFACE.md](./OBSERVED_TOOL_SURFACE.md)
- [LICENSING.md](./LICENSING.md)
- [src/appServerBridge.js](./src/appServerBridge.js)
- [NATIVE_HOOK_WORKFLOW.md](./NATIVE_HOOK_WORKFLOW.md)
- [COMPATIBILITY_MATRIX.md](./COMPATIBILITY_MATRIX.md)

## Licensing

This repo is MIT-licensed.

The SDE enterprise runtime used for the paid governance mode is proprietary commercial software and is not granted by this repo's MIT license.
