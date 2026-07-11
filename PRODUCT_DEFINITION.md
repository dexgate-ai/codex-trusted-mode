# Product Definition

## Offering

Codex Trusted Mode is a governed tool-execution **PEP adapter** for Codex
sessions. It connects Codex tool and approval events to local hardening or to
the Strategic Decision Engine (SDE) Capability Kernel.

It does **not** include the proprietary SDE runtime. Adapter availability alone
does not mean active protected execution, tenant entitlement, or certification.

## V1 Target Use Case

Governed coding in regulated or production-bound repositories where shell, file mutation, and git-changing actions require explicit policy control.

## V1 Control Surface

Initial high-impact tools:
- `functions.shell_command`
- `functions.apply_patch`

Initial low-risk tools:
- `functions.update_plan`
- `functions.view_image`

## Free Tier

- standalone local hardening
- allowlist-only mode
- read-only shell prefixes plus conservative defaults
- no external dependency on the SDE PDP
- local **hard gate** only (not full passport lifecycle)

## Paid Tier

- SDE PDP-backed decisions (passport-schema evaluation)
- deterministic reason codes
- versioned decision contract (passport schema for this adapter)
- tenant/license entitlement hooks
- governed evidence and release validation
- native app-server approval bridge for Codex command and file-change approval requests
- fail-closed enforcement before side effects (PEP **ACT** boundary)

## Capability Kernel mapping

```text
PROPOSE → OBSERVE → UPDATE → BOUND → DECIDE → ACT → LEARN
```

- Codex tool/approval event → **Proposal** (normalize)
- Free engine or SDE PDP → **DECIDE**
- Adapter blocks or allows tool run → **ACT** enforcement
- Trace / decision evidence → audit inputs for **LEARN**

## Non-Goals For V1

- broad claims about every Codex capability
- cloud-hosted control plane
- end-user SSO
- native Codex UI integration beyond the validated app-server approval request surface
- claiming the adapter alone is the full Capability Kernel or “Trusted Mode” certification
