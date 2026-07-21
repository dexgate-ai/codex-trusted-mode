# Start Here

**Product:** [dexgate.ai](https://dexgate.ai) · **Quickstart:** [Codex docs](https://dexgate.ai/docs/codex/quickstart/) · **Console:** [dexgate.ai/console](https://dexgate.ai/console/) · **GitHub:** [dexgate-ai/codex-trusted-mode](https://github.com/dexgate-ai/codex-trusted-mode) · **X:** [@dexgateAI](https://x.com/dexgateAI)

This repo supports two distinct customer paths:

- npm-installed adapter with useful standalone hardening (`@dexgate/codex-trusted-mode`, `latest` only)
- separately licensed SDE-backed governed mode obtained through the **DexGate customer console**

## Objective

Start with a useful free Codex hardening posture. Add SDE only when you need governed authorization, evidence, and certification.

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
node scripts/run_free_demo.js
```

## Paid Governed Path

Use this path only after you have licensed access to SDE through DexGate. The public npm package is the adapter layer; the [customer console](https://dexgate.ai/console/) is the supported way to obtain the governed runtime, deployment materials, and instructions.

Use the current package from `latest` (same install as free mode):

```bash
npm install @dexgate/codex-trusted-mode
```

Switch `toolPolicyMode` to `PDP` only after:
- the SDE PDP endpoint is available
- `pdpAuthToken` or `PDP_AUTH_TOKEN` is configured for licensed PDP authentication
- the decision contract is agreed
- fail-safe posture is explicitly chosen
- you accept the current Codex boundary for readonly actions on supported builds

**Not the paid path:** plain interactive `codex` (including Full Access / user-approved shell) does not intercept through SDE by itself. Adapter config in `~/.codex/config.toml` feeds the hosted runner and bridge; it does not silently govern a normal TUI session.

For the supported package-level governed validation path, use the hosted runner that ships with the npm package:

```bash
codex-trusted-mode-run-turn --prompt "Delete package.json." --json
```

Current expected result on supported Codex builds:
- destructive actions can be governed live through native approval callbacks **via the hosted runner / bridge**
- readonly actions that do not emit a pre-execution hook are returned as `completed_with_governance_gap`

Repo-level deeper checks remain available with:

```bash
node scripts/verify_pdp_request_shape.js
node scripts/mock_pdp.js
node scripts/run_governed_example.js
```

## Next Documents

- [README.md](./README.md)
- [DECISION_CONTRACT.md](./DECISION_CONTRACT.md)
- [COMPATIBILITY_MATRIX.md](./COMPATIBILITY_MATRIX.md)
- [RELEASE_EVIDENCE_TEMPLATE.md](./RELEASE_EVIDENCE_TEMPLATE.md)

## Codex marketplace

See [CODEX_MARKETPLACE.md](./CODEX_MARKETPLACE.md).
