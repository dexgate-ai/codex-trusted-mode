export function createLocalTrace(config, request, decision, reasonCode) {
  return {
    traceId: `local-${request.toolName || 'unknown'}-${Date.now()}`,
    contractId: config.contractId,
    contractVersion: config.contractVersion,
    policyPackVersion: 'local-hardening',
    governed: false,
    source: 'local-hardening',
    decision,
    reasonCode,
    timestampUtc: new Date().toISOString(),
  };
}
