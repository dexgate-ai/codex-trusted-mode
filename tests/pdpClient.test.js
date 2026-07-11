import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConfig } from '../src/config.js';
import { normalizeCodexEvent } from '../src/normalize.js';
import { buildPdpHeaders, buildPdpPayload, hasPdpAuthToken } from '../src/pdpClient.js';

test('buildPdpPayload emits the SDE authorize envelope for Codex', () => {
  const config = buildConfig({ toolPolicyMode: 'PDP', tenantId: 'trial-tenant', environment: 'prod' });
  const request = normalizeCodexEvent({
    toolName: 'functions.shell_command',
    command: 'Get-Content README.md',
    workingDirectory: 'C:\\dev\\codex-trusted-mode',
    environment: 'prod',
  });

  const payload = buildPdpPayload(config, request);

  assert.deepEqual(payload, {
    decision_sku: 'codex.trusted_mode.authorize.v1',
    policy_variant: 'codex-guard.v0.1.0',
    tenant_id: 'trial-tenant',
    gateway_id: '',
    environment: 'prod',
    inputs: {
      request,
    },
  });
});

test('normalizeCodexEvent includes origin metadata for SDE request tracking', () => {
  const request = normalizeCodexEvent({
    toolName: 'functions.apply_patch',
    workingDirectory: 'C:\\dev\\repo',
    sessionId: 'thread-1',
    username: 'alice',
    machineId: 'devbox-01',
    repoContext: {
      repoUrl: 'https://github.com/example/repo',
      branch: 'main',
      commitSha: 'abc123',
    },
  });

  assert.equal(request.origin.user, 'alice');
  assert.equal(request.origin.machine_id, 'devbox-01');
  assert.equal(request.origin.repo_url, 'https://github.com/example/repo');
  assert.equal(request.origin.branch, 'main');
  assert.equal(request.origin.commit_sha, 'abc123');
  assert.equal(request.origin.adapter, 'codex-trusted-mode');
  assert.equal(request.origin.session_id, 'thread-1');
});

test('buildPdpHeaders adds bearer auth when pdpAuthToken is configured', () => {
  assert.deepEqual(buildPdpHeaders({ pdpAuthToken: ' runtime-token ' }), {
    'content-type': 'application/json',
    authorization: 'Bearer runtime-token',
  });
});

test('buildPdpHeaders omits bearer auth when pdpAuthToken is absent', () => {
  assert.deepEqual(buildPdpHeaders({}), {
    'content-type': 'application/json',
  });
});

test('hasPdpAuthToken requires a nonblank token', () => {
  assert.equal(hasPdpAuthToken({ pdpAuthToken: ' runtime-token ' }), true);
  assert.equal(hasPdpAuthToken({ pdpAuthToken: '   ' }), false);
  assert.equal(hasPdpAuthToken({}), false);
});
