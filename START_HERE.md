# Start Here

This repo supports two distinct customer paths:

- npm-installed adapter with useful standalone hardening
- separately licensed SDE-backed governed mode obtained through the dexgate customer console

## Objective

Start with a useful free Codex hardening posture. Add SDE only when you need service-backed authorization, rollout records, and reviewed operating evidence.

## Free Standalone Path

Install the public adapter with:

```bash
npm install @dexgate/codex-trusted-mode
```

You can stay on this path indefinitely if you only need local hardening.

1. Keep `toolPolicyMode` set to `ALLOWLIST_ONLY`
2. Allow only:
   - `functions.shell_command` with read-only prefixes
   - `functions.update_plan`
   - `functions.view_image`
3. Confirm high-risk tools remain blocked:
   - `functions.apply_patch`
   - `functions.shell_command` when used for mutating commands such as `git commit`

Run:

```bash
node scripts/verify_config_contract.js
node scripts/verify_local_hardening.js
npm run local-hardening-check
node scripts/run_free_demo.js
```

The local hardening report should say `governed: false` and `source: "local-hardening"`. That is the expected free-tier proof: it shows safer local defaults without claiming SDE-backed governance.

Optional telemetry is off by default. To help dexgate improve the free-to-paid path, set `DEXGATE_TELEMETRY_OPT_IN=true` before running checks. Telemetry records coarse events only; it does not send prompts, commands, file paths, tool parameters, or PDP payloads.

## Paid Governed Path

Use this path only after you have licensed access to SDE through dexgate. The public npm package is the adapter layer; <https://dexgate.ai/console/downloads/> is the supported way to obtain the governed runtime, deployment materials, PDP auth token, and instructions.

For the current controlled-rollout governed runner path, install the beta tag:

```bash
npm install @dexgate/codex-trusted-mode@beta
```

Switch `toolPolicyMode` to `PDP` only after:
- the SDE PDP endpoint is available
- `pdpAuthToken` or `PDP_AUTH_TOKEN` is configured for licensed PDP authentication
- the decision contract is agreed
- fail-safe posture is explicitly chosen
- you accept the current Codex boundary for readonly actions on supported builds

For the supported package-level governed validation path, use the hosted runner that ships with the npm package:

```bash
codex-trusted-mode-run-turn --prompt "Delete package.json." --json
```

Current expected result on supported Codex builds:
- selected destructive-action requests can be routed through native approval callbacks
- readonly actions that do not emit a pre-execution hook are returned as `completed_with_governance_gap`

Repo-level deeper checks remain available with:

```bash
node scripts/verify_pdp_request_shape.js
node scripts/mock_pdp.js
node scripts/run_governed_example.js
```

The mock PDP path is explicitly simulated. Use it to validate adapter behavior and request shape only. Use the dexgate customer console runtime bundle and PDP auth token for authorized service-backed policy decisions and rollout records.

## Next Documents

- [README.md](./README.md)
- [DECISION_CONTRACT.md](./DECISION_CONTRACT.md)
- [COMPATIBILITY_MATRIX.md](./COMPATIBILITY_MATRIX.md)
- [RELEASE_EVIDENCE_TEMPLATE.md](./RELEASE_EVIDENCE_TEMPLATE.md)
