import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { evaluateCodexEvent } from '../src/index.js';

function validPassport(overrides = {}) {
  return {
    status: 'issued',
    passport_id: 'pass-test-001',
    schema_id: 'passport.schema.coding.prod_change.v1',
    decision_sku: 'codex.trusted_mode.authorize.v1',
    tenant_id: 'trial-tenant',
    authority: { authorized_action: 'functions.shell_command' },
    scope: { target: 'Get-Content README.md', environment: 'dev' },
    expires_at: '2999-01-01T00:00:00Z',
    revocation_status: 'not_revoked',
    proof: { signature_status: 'unsigned' },
    verify_contract: { failure_behavior: 'refuse' },
    ...overrides,
  };
}

function startMockServer(statusCode, body, contentType = 'application/json') {
  const server = http.createServer((req, res) => {
    res.writeHead(statusCode, { 'content-type': contentType });
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}/v1/authorize`,
      });
    });
  });
}

test('free mode allows readonly shell commands', async () => {
  const result = await evaluateCodexEvent({ toolName: 'functions.shell_command', command: 'Get-Content README.md' });
  assert.equal(result.decision, 'allow');
  assert.equal(result.reasonCode, 'LOCAL_READONLY_SHELL_ALLOW');
  assert.equal(result.governed, false);
  assert.equal(result.trace.source, 'local-hardening');
});

test('free mode blocks non-allowlisted shell commands', async () => {
  const result = await evaluateCodexEvent({ toolName: 'functions.shell_command', command: 'git commit -m test' });
  assert.equal(result.decision, 'deny');
  assert.equal(result.reasonCode, 'LOCAL_READONLY_SHELL_BLOCK');
  assert.equal(result.governed, false);
});

test('free mode blocks shell control operators even when the prefix looks readonly', async () => {
  const result = await evaluateCodexEvent({
    toolName: 'functions.shell_command',
    command: 'Get-Content README.md; Remove-Item .\\tmp.txt',
  });
  assert.equal(result.decision, 'deny');
  assert.equal(result.reasonCode, 'LOCAL_SHELL_CONTROL_OPERATOR_BLOCK');
});

test('free mode blocks broad interpreters even when shell_command is allowed', async () => {
  const result = await evaluateCodexEvent({
    toolName: 'functions.shell_command',
    command: 'python script.py',
  });
  assert.equal(result.decision, 'deny');
  assert.equal(result.reasonCode, 'LOCAL_BROAD_INTERPRETER_BLOCK');
});

test('free mode blocks apply_patch', async () => {
  const result = await evaluateCodexEvent({ toolName: 'functions.apply_patch' });
  assert.equal(result.decision, 'deny');
});

test('paid mode fails closed when pdp is unavailable', async () => {
  const result = await evaluateCodexEvent(
    { toolName: 'functions.shell_command', command: 'Get-Content README.md' },
    { toolPolicyMode: 'PDP', pdpUrl: 'http://127.0.0.1:9/v1/authorize', failClosed: true, pdpAuthToken: 'test-token' }
  );
  assert.equal(result.decision, 'deny');
  assert.equal(result.reasonCode, 'PDP_UNAVAILABLE_FAIL_CLOSED');
});

test('paid mode fails closed before PDP call when auth token is missing', async () => {
  const result = await evaluateCodexEvent(
    { toolName: 'functions.shell_command', command: 'Get-Content README.md' },
    { toolPolicyMode: 'PDP', pdpUrl: 'http://127.0.0.1:9/v1/authorize', failClosed: true }
  );
  assert.equal(result.decision, 'deny');
  assert.equal(result.reasonCode, 'PDP_AUTH_TOKEN_REQUIRED');
  assert.match(result.error, /PDP_AUTH_TOKEN/);
});

test('paid mode fails closed on non-2xx PDP JSON responses', async () => {
  const { server, url } = await startMockServer(403, { error: 'forbidden', message: 'tenant blocked' });
  try {
    const result = await evaluateCodexEvent(
      { toolName: 'functions.shell_command', command: 'Get-Content README.md' },
      { toolPolicyMode: 'PDP', pdpUrl: url, failClosed: true, pdpAuthToken: 'test-token' }
    );
    assert.equal(result.decision, 'deny');
    assert.equal(result.reasonCode, 'PDP_UNAVAILABLE_FAIL_CLOSED');
    assert.match(result.error, /PDP unreachable \(403\): tenant blocked/);
  } finally {
    server.close();
  }
});

test('paid mode fails closed on non-2xx PDP non-JSON responses', async () => {
  const { server, url } = await startMockServer(500, 'upstream failure', 'text/plain');
  try {
    const result = await evaluateCodexEvent(
      { toolName: 'functions.shell_command', command: 'Get-Content README.md' },
      { toolPolicyMode: 'PDP', pdpUrl: url, failClosed: true, pdpAuthToken: 'test-token' }
    );
    assert.equal(result.decision, 'deny');
    assert.equal(result.reasonCode, 'PDP_UNAVAILABLE_FAIL_CLOSED');
    assert.match(result.error, /PDP unreachable \(500\): upstream failure/);
  } finally {
    server.close();
  }
});

test('paid mode marks mock PDP responses as simulated, not governed', async () => {
  const { server, url } = await startMockServer(200, {
    decision: 'allow',
    reasonCode: 'PDP_ALLOW',
    simulated: true,
    passport: validPassport(),
    trace: { source: 'mock-pdp' },
  });
  try {
    const result = await evaluateCodexEvent(
      { toolName: 'functions.shell_command', command: 'Get-Content README.md' },
      { toolPolicyMode: 'PDP', pdpUrl: url, failClosed: true, pdpAuthToken: 'test-token' }
    );
    assert.equal(result.decision, 'allow');
    assert.equal(result.source, 'pdp');
    assert.equal(result.governed, false);
    assert.equal(result.simulated, true);
    assert.equal(result.trace.source, 'mock-pdp');
  } finally {
    server.close();
  }
});

test('paid mode fails closed when PDP allow omits passport', async () => {
  const { server, url } = await startMockServer(200, {
    decision: 'allow',
    reasonCode: 'PDP_ALLOW',
    trace: { source: 'pdp' },
  });
  try {
    const result = await evaluateCodexEvent(
      { toolName: 'functions.shell_command', command: 'Get-Content README.md' },
      { toolPolicyMode: 'PDP', pdpUrl: url, failClosed: true, pdpAuthToken: 'test-token' }
    );
    assert.equal(result.decision, 'deny');
    assert.equal(result.reasonCode, 'PDP_PASSPORT_INVALID_FAIL_CLOSED');
    assert.match(result.error, /passport/);
  } finally {
    server.close();
  }
});

test('paid mode allows explicit monitor-mode bypass without Passport', async () => {
  const { server, url } = await startMockServer(200, {
    decision: 'allow',
    reasonCode: 'MONITOR_MODE_ALLOW',
    enforcement_mode: 'monitor',
    enforcement_bypassed: true,
    would_have_decision: 'deny',
    would_have_deny_code: 'PDP_PATCH_DENY',
    would_have_deny_reason: 'Patch requires review.',
    monitor_mode: { scope_id: 'trusted-dev-workstation', status: 'active' },
    passport: {
      status: 'not_issued',
      reason: 'monitor_mode_bypass_no_passport',
    },
    trace: { source: 'pdp', monitor_mode: { scope_id: 'trusted-dev-workstation' } },
  });
  try {
    const result = await evaluateCodexEvent(
      { toolName: 'functions.apply_patch' },
      { toolPolicyMode: 'PDP', pdpUrl: url, failClosed: true, pdpAuthToken: 'test-token' }
    );
    assert.equal(result.decision, 'allow');
    assert.equal(result.reasonCode, 'MONITOR_MODE_ALLOW');
    assert.equal(result.governed, false);
    assert.equal(result.enforcementMode, 'monitor');
    assert.equal(result.enforcementBypassed, true);
    assert.equal(result.wouldHaveDecision, 'deny');
    assert.equal(result.wouldHaveDenyCode, 'PDP_PATCH_DENY');
    assert.equal(result.passport.status, 'not_issued');
  } finally {
    server.close();
  }
});

test('paid mode surfaces SDE guidance when using the local fallback PDP without SDE', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('fetch failed'); };
  try {
    const result = await evaluateCodexEvent(
      { toolName: 'functions.shell_command', command: 'Get-Content README.md' },
      { toolPolicyMode: 'PDP', failClosed: true, pdpAuthToken: 'test-token' }
    );
    assert.equal(result.decision, 'deny');
    assert.equal(result.reasonCode, 'PDP_UNAVAILABLE_FAIL_CLOSED');
    assert.match(result.error, /licensed SDE runtime/);
    assert.match(result.error, /ALLOWLIST_ONLY/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
