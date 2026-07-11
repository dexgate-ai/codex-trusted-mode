import { createHash } from 'node:crypto';

const DEFAULT_TELEMETRY_URL = 'https://dexgate.ai/api/telemetry/adapter-events/';
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function isTruthy(value) {
  return TRUE_VALUES.has(String(value || '').trim().toLowerCase());
}

function boundedString(value, maxLength = 128) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function hashIdentifier(value) {
  const normalized = boundedString(value, 256);
  if (!normalized) return '';
  return createHash('sha256').update(normalized).digest('hex').slice(0, 24);
}

export function telemetryEnabled(overrides = {}) {
  if (typeof overrides.telemetryOptIn === 'boolean') return overrides.telemetryOptIn;
  return isTruthy(process.env.DEXGATE_TELEMETRY_OPT_IN || process.env.DEXGATE_TELEMETRY);
}

export function buildTelemetryConfig(overrides = {}) {
  return {
    telemetryOptIn: telemetryEnabled(overrides),
    telemetryUrl:
      boundedString(overrides.telemetryUrl, 512) ||
      boundedString(process.env.DEXGATE_TELEMETRY_URL, 512) ||
      DEFAULT_TELEMETRY_URL,
    telemetryInstallId:
      boundedString(overrides.telemetryInstallId, 128) ||
      boundedString(process.env.DEXGATE_TELEMETRY_INSTALL_ID, 128),
    telemetryTimeoutMs: Number.isFinite(overrides.telemetryTimeoutMs)
      ? Math.max(100, Math.min(overrides.telemetryTimeoutMs, 5000))
      : 1500,
  };
}

export function buildTelemetryPayload(config, eventName, fields = {}) {
  return {
    eventName: boundedString(eventName, 96),
    packageName: '@dexgate/codex-trusted-mode',
    packageVersion: boundedString(config.packageVersion || '0.1.8', 32),
    adapter: 'codex',
    installId: boundedString(config.telemetryInstallId, 128),
    tenantHash: hashIdentifier(config.tenantId),
    gatewayHash: hashIdentifier(config.gatewayId),
    environment: boundedString(config.environment, 64),
    mode: boundedString(fields.mode || config.toolPolicyMode, 64),
    source: boundedString(fields.source, 64),
    decision: boundedString(fields.decision, 64),
    reasonCode: boundedString(fields.reasonCode, 96),
    governed: typeof fields.governed === 'boolean' ? fields.governed : null,
    simulated: fields.simulated === true,
    metadata: {
      status: boundedString(fields.status, 64),
      certificationStatus: boundedString(config.certificationStatus, 64),
      nodeVersion: boundedString(process.version, 32),
    },
  };
}

export async function sendTelemetryEvent(config, eventName, fields = {}) {
  if (!config.telemetryOptIn) return { sent: false, reason: 'disabled' };
  if (typeof fetch !== 'function') return { sent: false, reason: 'fetch-unavailable' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.telemetryTimeoutMs || 1500);
  try {
    const response = await fetch(config.telemetryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dexgate-Telemetry-Opt-In': 'true',
      },
      body: JSON.stringify(buildTelemetryPayload(config, eventName, fields)),
      signal: controller.signal,
    });
    return { sent: response.ok, status: response.status };
  } catch (error) {
    return { sent: false, reason: error?.name === 'AbortError' ? 'timeout' : 'network-error' };
  } finally {
    clearTimeout(timeout);
  }
}
