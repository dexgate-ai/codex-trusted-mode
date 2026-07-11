# Compatibility Matrix

## Purpose

Track internal review status for Codex versions and delivery surfaces. Do not treat this private matrix as public certification, customer assurance, or a security guarantee.

## Current State

The observed Codex tool surface and native app-server approval surface have been documented. The current public launch boundary is narrower than OpenClaw and should be read accordingly.

| Codex Surface / Version | Adapter Version | Internal Status | Notes |
| --- | --- | --- | --- |
| validated current workspace session | 0.1.8 | INTERNAL_EVIDENCE_REVIEWED | Observed current workspace session only; not public assurance wording. |
| next candidate version | 0.1.8 | LOCKDOWN_ONLY | Retest before broader public status wording. |
| latest (rolling) | 0.1.8 | UNVERIFIED | No public status wording is supported. |

## Policy

- `INTERNAL_EVIDENCE_REVIEWED` means internal evidence exists for the named surface, but public wording still requires separate counsel/CEO approval
- `LOCKDOWN_ONLY` means local hardening behavior is available, but broader public status wording is not made
- `UNVERIFIED` means no public status wording is supported

## Controlled-Rollout Release Gate

The current public Codex offering should not be described as full parity with OpenClaw.

Minimum bar for the current controlled rollout:
- destructive-action native approval callback evidence exists
- hosted-runner deny path is validated against the target SDE runtime
- readonly no-hook cases are surfaced as governance gaps rather than false green passes

Promotion beyond the current boundary requires:
- native readonly pre-execution hook validation on the claimed Codex build
- repeated evidence on the claimed host platforms
- a refreshed matrix row for the exact adapter/runtime combination being promoted

## Evidence

- [release-evidence/README.md](./release-evidence/README.md)
- [release-evidence/native-hook-evidence.json](./release-evidence/native-hook-evidence.json)
- [release-evidence/20260307-ubuntu-linux-validation-summary.md](./release-evidence/20260307-ubuntu-linux-validation-summary.md)
- [release-evidence/live-app-server-session-summary.json](./release-evidence/live-app-server-session-summary.json)

## Observed V1 Surface

Validated for initial repo assumptions:
- `functions.shell_command`
- `functions.apply_patch`
- `functions.update_plan`
- `functions.view_image`
