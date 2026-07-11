# npm Publishing Checklist

## Package

- npm package name: `@dexgate/codex-trusted-mode`
- license: `MIT`
- proprietary SDE runtime: not included

## Before Publish

1. Run the local verification suite:

```bash
node --test
node scripts/verify_config_contract.js
node scripts/verify_local_hardening.js
node scripts/verify_pdp_request_shape.js
node scripts/verify_certification_gate.js  # internal release-gate script name; not public approval wording
```

2. Inspect the tarball contents:

```bash
npm pack --dry-run
```

3. Confirm the published surface is still intentionally limited to:
- `src/`
- baseline configs
- install/use docs

4. Confirm the public claim boundary still matches the docs:
- MIT adapter package only
- proprietary SDE runtime sold separately
- any public status wording has explicit counsel approval and supporting evidence

## Publish Notes

- Publish only the MIT adapter package to npm.
- Do not publish enterprise packs, release-evidence artifacts, or internal test scaffolding in the npm tarball unless you deliberately expand the public surface later.
- Keep the npm package focused on the installable adapter and baseline local hardening experience.

## Publish Command

```bash
npm publish --access public
```
