import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConfig } from '../src/config.js';
import { buildTelemetryPayload, sendTelemetryEvent } from '../src/telemetry.js';

test('telemetry is disabled by default', () => {
  const config = buildConfig();
  assert.equal(config.telemetryOptIn, false);
});

test('telemetry payload hashes tenant and gateway identifiers', () => {
  const config = buildConfig({
    telemetryOptIn: true,
    telemetryInstallId: 'install-123',
    tenantId: 'tenant-secret',
    gatewayId: 'gateway-secret',
    environment: 'dev',
  });
  const payload = buildTelemetryPayload(config, 'adapter.evaluation', {
    mode: 'ALLOWLIST_ONLY',
    decision: 'deny',
    reasonCode: 'LOCAL_ALLOWLIST_BLOCK',
    source: 'local',
    governed: false,
  });

  assert.equal(payload.packageName, '@dexgate/codex-trusted-mode');
  assert.equal(payload.adapter, 'codex');
  assert.equal(payload.installId, 'install-123');
  assert.equal(payload.governed, false);
  assert.notEqual(payload.tenantHash, 'tenant-secret');
  assert.notEqual(payload.gatewayHash, 'gateway-secret');
  assert.equal(JSON.stringify(payload).includes('tenant-secret'), false);
  assert.equal(JSON.stringify(payload).includes('gateway-secret'), false);
});

test('sendTelemetryEvent posts only when opted in', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 202 };
  };
  try {
    const disabled = await sendTelemetryEvent(buildConfig(), 'adapter.evaluation');
    assert.deepEqual(disabled, { sent: false, reason: 'disabled' });
    assert.equal(calls.length, 0);

    const enabled = await sendTelemetryEvent(
      buildConfig({ telemetryOptIn: true, telemetryUrl: 'https://telemetry.test/events' }),
      'adapter.evaluation',
      { governed: false, source: 'local' }
    );
    assert.deepEqual(enabled, { sent: true, status: 202 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://telemetry.test/events');
    assert.equal(calls[0].options.headers['X-Dexgate-Telemetry-Opt-In'], 'true');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
