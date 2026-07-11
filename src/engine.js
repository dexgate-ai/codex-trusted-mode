import { buildConfig, normalizeCertificationStatus, normalizeToolPolicyMode } from './config.js';
import { normalizeCodexEvent } from './normalize.js';
import { evaluateReadonlyShellCommand } from './shellPolicy.js';
import { createLocalTrace } from './trace.js';
import { authorizeWithPdp, hasPdpAuthToken } from './pdpClient.js';
import { sendTelemetryEvent } from './telemetry.js';

function containsTool(list, toolName) {
  const target = String(toolName || '').trim().toLowerCase();
  return Array.isArray(list) && list.some((item) => String(item).trim().toLowerCase() === target);
}

function shouldBlockForCertification(config, toolName) {
  const status = normalizeCertificationStatus(config.certificationStatus);
  if (status === 'CERTIFIED_ENFORCED' || status === 'LOCKDOWN_ONLY') return false;
  return containsTool(config.highRiskTools, toolName);
}

function isShellCommandTool(toolName) {
  return String(toolName || '').trim().toLowerCase() === 'functions.shell_command';
}

function mapShellDenyKindToReasonCode(denyKind) {
  switch (denyKind) {
    case 'control_operator':
      return 'LOCAL_SHELL_CONTROL_OPERATOR_BLOCK';
    case 'broad_interpreter':
      return 'LOCAL_BROAD_INTERPRETER_BLOCK';
    default:
      return 'LOCAL_READONLY_SHELL_BLOCK';
  }
}

function getPassportField(passport, snakeName, camelName = null) {
  if (!passport || typeof passport !== 'object') return undefined;
  if (passport[snakeName] !== undefined) return passport[snakeName];
  return camelName ? passport[camelName] : undefined;
}

function isAuthorizingDecision(decision) {
  return decision === 'allow' || decision === 'constrain';
}

function isMonitorModeBypass(body) {
  return body?.enforcement_mode === 'monitor' && body?.enforcement_bypassed === true;
}

function validatePdpPassport(body) {
  const decision = body?.decision || 'deny';
  if (!isAuthorizingDecision(decision)) return { ok: true };
  if (isMonitorModeBypass(body)) return { ok: true, monitorBypass: true };

  const passport = body?.passport;
  if (!passport || typeof passport !== 'object') {
    return { ok: false, error: 'PDP allow/constrain response did not include a passport' };
  }

  const status = getPassportField(passport, 'status');
  const passportId = getPassportField(passport, 'passport_id', 'passportId');
  const schemaId = getPassportField(passport, 'schema_id', 'schemaId');
  const expiresAt = getPassportField(passport, 'expires_at', 'expiresAt');
  const revocationStatus = getPassportField(passport, 'revocation_status', 'revocationStatus');
  const proof = getPassportField(passport, 'proof');
  const verifyContract = getPassportField(passport, 'verify_contract', 'verifyContract');
  const scope = getPassportField(passport, 'scope');
  const authority = getPassportField(passport, 'authority');

  if (status !== 'issued') return { ok: false, error: `passport status is ${status || 'missing'}` };
  if (!passportId) return { ok: false, error: 'passport_id is missing' };
  if (schemaId !== 'passport.schema.coding.prod_change.v1') {
    return { ok: false, error: `unexpected passport schema_id ${schemaId || 'missing'}` };
  }
  if (!authority?.authorized_action && !authority?.authorizedAction) {
    return { ok: false, error: 'passport authority authorized_action is missing' };
  }
  if (!scope?.target) return { ok: false, error: 'passport scope.target is missing' };
  if (!scope?.environment) return { ok: false, error: 'passport scope.environment is missing' };
  if (!expiresAt || Number.isNaN(Date.parse(expiresAt))) {
    return { ok: false, error: 'passport expires_at is missing or invalid' };
  }
  if (Date.parse(expiresAt) <= Date.now()) {
    return { ok: false, error: 'passport is expired' };
  }
  if (revocationStatus && revocationStatus !== 'not_revoked') {
    return { ok: false, error: `passport revocation_status is ${revocationStatus}` };
  }
  if (!proof || typeof proof !== 'object' || !proof.signature_status) {
    return { ok: false, error: 'passport proof.signature_status is missing' };
  }
  if (verifyContract?.failure_behavior && verifyContract.failure_behavior !== 'refuse') {
    return { ok: false, error: 'passport verify_contract failure_behavior must be refuse' };
  }

  return { ok: true };
}

export async function evaluateCodexEvent(event, overrides = {}) {
  const config = buildConfig(overrides);
  const request = normalizeCodexEvent({ ...event, environment: overrides.environment || event.environment });
  const mode = normalizeToolPolicyMode(config.toolPolicyMode);

  if (shouldBlockForCertification(config, request.toolName)) {
      const result = {
        decision: 'deny',
        reasonCode: 'CERT_LOCKDOWN_BLOCK',
        source: 'local',
        governed: false,
        request,
        trace: createLocalTrace(config, request, 'deny', 'CERT_LOCKDOWN_BLOCK'),
      };
      await sendTelemetryEvent(config, 'adapter.evaluation', {
        mode,
        decision: result.decision,
        reasonCode: result.reasonCode,
        source: result.source,
        governed: result.governed,
      });
      return result;
  }

  if (mode === 'ALLOWLIST_ONLY') {
    const allowed = containsTool(config.allowedTools, request.toolName);
    if (allowed && isShellCommandTool(request.toolName)) {
      const shellDecision = evaluateReadonlyShellCommand(request.command, config.allowedShellCommandPrefixes);
      const reasonCode = shellDecision.allowed
        ? 'LOCAL_READONLY_SHELL_ALLOW'
        : mapShellDenyKindToReasonCode(shellDecision.denyKind);
      const result = {
        decision: shellDecision.allowed ? 'allow' : 'deny',
        reasonCode,
        source: 'local',
        governed: false,
        request,
        trace: createLocalTrace(config, request, shellDecision.allowed ? 'allow' : 'deny', reasonCode),
      };
      await sendTelemetryEvent(config, 'adapter.evaluation', {
        mode,
        decision: result.decision,
        reasonCode: result.reasonCode,
        source: result.source,
        governed: result.governed,
      });
      return result;
    }
    const reasonCode = allowed ? 'LOCAL_ALLOWLIST_ALLOW' : 'LOCAL_ALLOWLIST_BLOCK';
    const result = {
      decision: allowed ? 'allow' : 'deny',
      reasonCode,
      source: 'local',
      governed: false,
      request,
      trace: createLocalTrace(config, request, allowed ? 'allow' : 'deny', reasonCode),
    };
    await sendTelemetryEvent(config, 'adapter.evaluation', {
      mode,
      decision: result.decision,
      reasonCode: result.reasonCode,
      source: result.source,
      governed: result.governed,
    });
    return result;
  }

  if (!hasPdpAuthToken(config)) {
    const result = {
      decision: 'deny',
      reasonCode: 'PDP_AUTH_TOKEN_REQUIRED',
      source: 'local',
      governed: false,
      request,
      trace: createLocalTrace(config, request, 'deny', 'PDP_AUTH_TOKEN_REQUIRED'),
      error: 'PDP_AUTH_TOKEN is required for paid dexgate PDP authorization',
    };
    await sendTelemetryEvent(config, 'adapter.evaluation', {
      mode,
      decision: result.decision,
      reasonCode: result.reasonCode,
      source: result.source,
      governed: result.governed,
    });
    return result;
  }

  try {
    const pdp = await authorizeWithPdp(config, request);
    const decision = pdp.body?.decision || 'deny';
    const reasonCode =
      pdp.body?.reasonCode ||
      pdp.body?.deny_code ||
      (decision === 'allow' ? 'PDP_ALLOW' : decision === 'constrain' ? 'PDP_CONSTRAIN' : 'PDP_DENY');
    const passportValidation = validatePdpPassport(pdp.body);
    if (!passportValidation.ok) {
      const result = {
        decision: 'deny',
        reasonCode: 'PDP_PASSPORT_INVALID_FAIL_CLOSED',
        source: 'pdp',
        governed: false,
        simulated: pdp.body?.simulated === true,
        request,
        constraints: pdp.body?.constraints || {},
        trace: pdp.body?.trace || null,
        pdpStatus: pdp.status,
        error: passportValidation.error,
      };
      await sendTelemetryEvent(config, 'adapter.evaluation', {
        mode,
        decision: result.decision,
        reasonCode: result.reasonCode,
        source: result.source,
        governed: result.governed,
        simulated: result.simulated,
      });
      return result;
    }
    const result = {
      decision,
      reasonCode,
      source: 'pdp',
      governed: pdp.body?.simulated === true || pdp.body?.enforcement_bypassed === true ? false : true,
      simulated: pdp.body?.simulated === true,
      enforcementMode: pdp.body?.enforcement_mode || 'enforce',
      enforcementBypassed: pdp.body?.enforcement_bypassed === true,
      wouldHaveDecision: pdp.body?.would_have_decision || null,
      wouldHaveDenyCode: pdp.body?.would_have_deny_code || null,
      wouldHaveDenyReason: pdp.body?.would_have_deny_reason || null,
      monitorMode: pdp.body?.monitor_mode || null,
      request,
      constraints: pdp.body?.constraints || {},
      passport: pdp.body?.passport || null,
      trace: pdp.body?.trace || null,
      pdpStatus: pdp.status,
    };
    await sendTelemetryEvent(config, 'adapter.evaluation', {
      mode,
      decision: result.decision,
      reasonCode: result.reasonCode,
      source: result.source,
      governed: result.governed,
      simulated: result.simulated,
      enforcementMode: result.enforcementMode,
      enforcementBypassed: result.enforcementBypassed,
      wouldHaveDecision: result.wouldHaveDecision,
      wouldHaveDenyCode: result.wouldHaveDenyCode,
    });
    return result;
  } catch (error) {
    if (config.failClosed) {
      const result = {
        decision: 'deny',
        reasonCode: 'PDP_UNAVAILABLE_FAIL_CLOSED',
        source: 'local',
        governed: false,
        request,
        trace: createLocalTrace(config, request, 'deny', 'PDP_UNAVAILABLE_FAIL_CLOSED'),
        error: String(error.message || error),
      };
      await sendTelemetryEvent(config, 'adapter.evaluation', {
        mode,
        decision: result.decision,
        reasonCode: result.reasonCode,
        source: result.source,
        governed: result.governed,
      });
      return result;
    }
    const result = {
      decision: 'allow',
      reasonCode: 'PDP_UNAVAILABLE_FAIL_OPEN',
      source: 'local',
      governed: false,
      request,
      trace: createLocalTrace(config, request, 'allow', 'PDP_UNAVAILABLE_FAIL_OPEN'),
      error: String(error.message || error),
    };
    await sendTelemetryEvent(config, 'adapter.evaluation', {
      mode,
      decision: result.decision,
      reasonCode: result.reasonCode,
      source: result.source,
      governed: result.governed,
    });
    return result;
  }
}
