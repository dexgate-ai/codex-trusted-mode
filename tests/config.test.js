import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConfig, validateConfig } from '../src/index.js';

test('validateConfig requires governed dexgate fields in PDP mode', () => {
  const config = buildConfig({
    toolPolicyMode: 'PDP',
    pdpUrl: '',
    tenantId: '',
    gatewayId: '',
    environment: '',
  });

  const result = validateConfig(config);

  assert.equal(result.ok, false);
  assert.match(result.issues.join(' '), /PDP mode requires pdpUrl/);
  assert.match(result.issues.join(' '), /PDP mode requires tenantId/);
  assert.match(result.issues.join(' '), /PDP mode requires gatewayId/);
  assert.match(result.issues.join(' '), /PDP mode requires environment/);
});
