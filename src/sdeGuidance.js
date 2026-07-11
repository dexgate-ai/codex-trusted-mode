const LOCAL_PDP_HOSTS = new Set(['localhost', '127.0.0.1']);
const CONNECTIVITY_PATTERNS = [
  /fetch failed/i,
  /timeout/i,
  /aborted/i,
  /econnrefused/i,
  /ehostunreach/i,
  /etimedout/i,
  /network/i,
];
const ACCESS_DENIED_PATTERNS = [
  /pdp unreachable \(401\)/i,
  /pdp unreachable \(403\)/i,
  /pdp unreachable \(404\)/i,
];

export function isLocalPdpUrl(pdpUrl) {
  try {
    const url = new URL(pdpUrl);
    return LOCAL_PDP_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function buildSdeRuntimeGuidance() {
  return [
    'Governed mode requires a licensed SDE runtime; the public npm package installs the adapter only.',
    'If you only need standalone hardening, stay on ALLOWLIST_ONLY.',
    'If you want governed mode, compare plans at https://dexgate.ai/pricing/ or download your licensed runtime materials from https://dexgate.ai/console/downloads/, then point pdpUrl at your licensed SDE environment and configure PDP_AUTH_TOKEN.',
  ].join(' ');
}

export function buildGovernedAccessGuidance() {
  return [
    'dexgate is reachable but denied this governed request.',
    'Confirm this workspace has a licensed dexgate runtime and that tenantId, gatewayId, environment, and PDP_AUTH_TOKEN match the runtime configuration.',
  ].join(' ');
}

export function maybeAppendSdeRuntimeGuidance(detail, pdpUrl) {
  const message = String(detail || '').trim();
  if (!message) return message;
  if (!isLocalPdpUrl(pdpUrl)) return message;
  if (message.includes('licensed SDE runtime')) return message;
  if (ACCESS_DENIED_PATTERNS.some((pattern) => pattern.test(message))) {
    const normalized = /[.!?]$/.test(message) ? message.slice(0, -1) : message;
    return `${normalized}. ${buildGovernedAccessGuidance()}`;
  }
  if (!CONNECTIVITY_PATTERNS.some((pattern) => pattern.test(message))) return message;
  const normalized = /[.!?]$/.test(message) ? message.slice(0, -1) : message;
  return `${normalized}. ${buildSdeRuntimeGuidance()}`;
}

export function buildMissingPdpConfigIssue() {
  return [
    'PDP mode requires pdpUrl.',
    'PDP mode also requires tenantId and gatewayId so dexgate can match the right workspace and environment host.',
    'Governed mode uses a separately licensed SDE runtime.',
    'If you only need standalone hardening, stay on ALLOWLIST_ONLY.',
    'Otherwise compare plans at https://dexgate.ai/pricing/ or obtain SDE runtime, PDP_AUTH_TOKEN, and deployment instructions from https://dexgate.ai/console/downloads/.',
  ].join(' ');
}
