import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConfig, validateConfig } from '../src/index.js';

test('validateConfig requires governed dexgate fields in PDP mode', () => {
  const config = buildConfig({
    toolPolicyMode: 'PDP',
    pdpUrl: '',
    pdpAuthToken: '',
    tenantId: '',
    gatewayId: '',
    environment: '',
  });

  const result = validateConfig(config);

  assert.equal(result.ok, false);
  assert.match(result.issues.join(' '), /PDP mode requires pdpUrl/);
  assert.match(result.issues.join(' '), /PDP mode requires pdpAuthToken/);
  assert.match(result.issues.join(' '), /PDP mode requires tenantId/);
  assert.match(result.issues.join(' '), /PDP mode requires gatewayId/);
  assert.match(result.issues.join(' '), /PDP mode requires environment/);
});

test('buildConfig carries approved beachhead profile and Passport schema defaults', () => {
  const config = buildConfig({});

  assert.equal(config.beachheadProfile, 'prod_change');
  assert.equal(config.passportSchemaId, 'passport.schema.coding.prod_change.v1');
  assert.deepEqual(config.highRiskTools, ['functions.apply_patch', 'functions.shell_command', 'git_push', 'deploy_class']);
});
