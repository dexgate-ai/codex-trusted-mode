import http from 'node:http';
import { evaluateReadonlyShellCommand } from '../src/shellPolicy.js';

const PORT = Number(process.env.MOCK_PDP_PORT || 8011);

function json(res, statusCode, body) {
  res.writeHead(statusCode, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body, null, 2));
}

function decide(request) {
  const toolName = request?.toolName || '';
  const command = String(request?.command || '').trim().toLowerCase();

  if (toolName === 'functions.apply_patch') {
    return {
      decision: 'deny',
      reasonCode: 'PDP_PATCH_DENY',
      simulated: true,
      governed: false,
      source: 'mock-pdp',
      trace: {
        traceId: 'trace-codex-patch-deny-001',
        contractId: 'codex-tool-governance',
        contractVersion: '0.1.0',
        policyPackVersion: 'codex-tool-governance-pack.0.1.0',
        decision: 'deny',
        reasonCode: 'PDP_PATCH_DENY',
        simulated: true,
        governed: false,
        source: 'mock-pdp',
        timestampUtc: new Date().toISOString(),
      },
    };
  }

  if (toolName === 'functions.shell_command') {
    const readonlyPrefixes = [
      'Get-ChildItem',
      'Get-Content',
      'rg',
      'git status',
      'git diff',
      'git show',
      'pwd',
      'ls',
      'cat',
    ];

    const shellDecision = evaluateReadonlyShellCommand(command, readonlyPrefixes);
    if (!shellDecision.allowed && shellDecision.denyKind === 'control_operator') {
      return {
        decision: 'deny',
        reasonCode: 'PDP_SHELL_CONTROL_OPERATOR_DENY',
        simulated: true,
        governed: false,
        source: 'mock-pdp',
        trace: {
          traceId: 'trace-codex-shell-deny-operators-001',
          contractId: 'codex-tool-governance',
          contractVersion: '0.1.0',
          policyPackVersion: 'codex-tool-governance-pack.0.1.0',
          decision: 'deny',
          reasonCode: 'PDP_SHELL_CONTROL_OPERATOR_DENY',
          simulated: true,
          governed: false,
          source: 'mock-pdp',
          timestampUtc: new Date().toISOString(),
        },
      };
    }

    if (!shellDecision.allowed && shellDecision.denyKind === 'broad_interpreter') {
      return {
        decision: 'deny',
        reasonCode: 'PDP_BROAD_INTERPRETER_DENY',
        simulated: true,
        governed: false,
        source: 'mock-pdp',
        trace: {
          traceId: 'trace-codex-shell-deny-interpreter-001',
          contractId: 'codex-tool-governance',
          contractVersion: '0.1.0',
          policyPackVersion: 'codex-tool-governance-pack.0.1.0',
          decision: 'deny',
          reasonCode: 'PDP_BROAD_INTERPRETER_DENY',
          simulated: true,
          governed: false,
          source: 'mock-pdp',
          timestampUtc: new Date().toISOString(),
        },
      };
    }

    if (shellDecision.allowed) {
      return {
        decision: 'allow',
        reasonCode: 'PDP_READONLY_SHELL_ALLOW',
        simulated: true,
        governed: false,
        source: 'mock-pdp',
        passport: {
          status: 'issued',
          passport_id: 'pass-mock-codex-readonly',
          schema_id: 'passport.schema.coding.prod_change.v1',
          decision_sku: 'codex.trusted_mode.authorize.v1',
          tenant_id: 'mock-tenant',
          authority: { authorized_action: 'functions.shell_command' },
          scope: {
            target: command || 'readonly-shell',
            environment: 'dev',
          },
          expires_at: '2999-01-01T00:00:00Z',
          revocation_status: 'not_revoked',
          proof: { signature_status: 'mock' },
          verify_contract: { failure_behavior: 'refuse' },
        },
        trace: {
          traceId: 'trace-codex-shell-allow-001',
          contractId: 'codex-tool-governance',
          contractVersion: '0.1.0',
          policyPackVersion: 'codex-tool-governance-pack.0.1.0',
          decision: 'allow',
          reasonCode: 'PDP_READONLY_SHELL_ALLOW',
          simulated: true,
          governed: false,
          source: 'mock-pdp',
          timestampUtc: new Date().toISOString(),
        },
      };
    }

    return {
      decision: 'deny',
      reasonCode: 'PDP_MUTATING_SHELL_DENY',
      simulated: true,
      governed: false,
      source: 'mock-pdp',
      trace: {
        traceId: 'trace-codex-shell-deny-001',
        contractId: 'codex-tool-governance',
        contractVersion: '0.1.0',
        policyPackVersion: 'codex-tool-governance-pack.0.1.0',
        decision: 'deny',
        reasonCode: 'PDP_MUTATING_SHELL_DENY',
        simulated: true,
        governed: false,
        source: 'mock-pdp',
        timestampUtc: new Date().toISOString(),
      },
    };
  }

  return {
    decision: 'deny',
    reasonCode: 'PDP_UNSUPPORTED_TOOL_DENY',
    simulated: true,
    governed: false,
    source: 'mock-pdp',
    trace: {
      traceId: 'trace-codex-unsupported-001',
      contractId: 'codex-tool-governance',
      contractVersion: '0.1.0',
      policyPackVersion: 'codex-tool-governance-pack.0.1.0',
      decision: 'deny',
      reasonCode: 'PDP_UNSUPPORTED_TOOL_DENY',
      simulated: true,
      governed: false,
      source: 'mock-pdp',
      timestampUtc: new Date().toISOString(),
    },
  };
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/v1/authorize') {
    json(res, 404, { error: 'not_found' });
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const result = decide(parsed.inputs?.request || {});
      json(res, 200, result);
    } catch (error) {
      json(res, 400, { error: 'invalid_json', message: String(error.message || error) });
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock PDP listening on http://127.0.0.1:${PORT}/v1/authorize`);
  console.log('SIMULATED ONLY: this mock PDP is not the licensed dexgate SDE runtime and does not produce governed evidence.');
});
