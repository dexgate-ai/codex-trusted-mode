# Architecture

## Capability Kernel role

Codex Trusted Mode is a **PEP adapter** (Policy Enforcement Point) for the
SDE / DexGate **Capability Kernel**. It is not the kernel runtime.

```text
PROPOSE → OBSERVE → UPDATE → BOUND → DECIDE → ACT → LEARN
```

| Path | Behavior |
| --- | --- |
| **Free** | Local hard gate (allowlist / conservative defaults). No SDE PDP. |
| **Paid** | Normalize host tool/approval events into a **Proposal**, send to SDE PDP for passport-schema evaluation, enforce allow / deny / constrain before side effects. Fail-closed for protected actions by default. |

Model intent is never machine authority. The adapter enforces decisions before
shell, patch, or other high-impact tools run.

## V1 Shape

Codex Trusted Mode is intentionally split into layers:

1. `normalize`
   - converts raw Codex tool events into a stable request contract (**Proposal**)
2. `engine`
   - applies local hardening or PDP-backed authorization (**DECIDE** path)
3. `trace`
   - emits the minimum evidence needed for local review or governed operation
4. `appServerBridge`
   - maps native Codex app-server approval requests into trusted-mode decisions and protocol responses

## Why This Shape

The Codex-native extension surface is still a validation task. Building the contract and enforcement core first avoids shipping marketing claims ahead of the real runtime behavior.

## Free Path

- `ALLOWLIST_ONLY`
- local decision source
- conservative defaults
- no dependency on external services
- hard gate only (not full passport minting)

## Paid Path

- `PDP`
- normalized Proposal request to SDE
- decision contract / Decision SKU as **passport schema**
- fail-closed for protected actions by default
- future hooks for tenant/license entitlement checks
- reason codes and decision evidence for audit / LEARN

## Current Native Step

The repo now includes a thin native adapter for the validated app-server approval request surface:
- `item/commandExecution/requestApproval`
- `item/fileChange/requestApproval`
- `execCommandApproval`
- `applyPatchApproval`

## Remaining Native Step

Validate a live Codex app-server session that:
- sends a real approval request to the bridge
- accepts the returned decision
- produces evidence tying the native request, bridge response, and final runtime behavior together

## Related docs

- [PRODUCT_DEFINITION.md](./PRODUCT_DEFINITION.md)
- [DECISION_CONTRACT.md](./DECISION_CONTRACT.md) (passport schema shape for this PEP)
- SDE: `sde-enterprise/docs/dexgate_control_stack_overview.md`
