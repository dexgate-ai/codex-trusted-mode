#!/usr/bin/env node
import { evaluateCodexEvent } from '../src/index.js';
import { buildConfig } from '../src/config.js';
import { sendTelemetryEvent } from '../src/telemetry.js';

const scenarios = [
  {
    name: 'readonly_shell_allowed',
    expected: 'allow',
    event: {
      toolName: 'functions.shell_command',
      command: 'Get-Content README.md',
      workingDirectory: process.cwd(),
      environment: 'local',
    },
  },
  {
    name: 'mutating_shell_blocked',
    expected: 'deny',
    event: {
      toolName: 'functions.shell_command',
      command: 'git commit -m test',
      workingDirectory: process.cwd(),
      environment: 'local',
    },
  },
  {
    name: 'apply_patch_blocked',
    expected: 'deny',
    event: {
      toolName: 'functions.apply_patch',
      workingDirectory: process.cwd(),
      environment: 'local',
    },
  },
];

const checks = [];
for (const scenario of scenarios) {
  const result = await evaluateCodexEvent(scenario.event, { toolPolicyMode: 'ALLOWLIST_ONLY', telemetryOptIn: false });
  checks.push({
    name: scenario.name,
    ok: result.decision === scenario.expected && result.governed === false && result.source === 'local',
    expectedDecision: scenario.expected,
    decision: result.decision,
    reasonCode: result.reasonCode,
    governed: result.governed,
    source: 'local-hardening',
  });
}

const report = {
  status: checks.every((check) => check.ok) ? 'PASS' : 'FAIL',
  mode: 'ALLOWLIST_ONLY',
  governed: false,
  source: 'local-hardening',
  summary:
    'Free local hardening is active. This does not use the SDE PDP, does not create governed decision records, and does not prove paid dexgate enforcement.',
  upgrade:
    'Upgrade to dexgate when you need PDP-backed authorization, decision records, tenant entitlements, and rollout evidence.',
  checks,
};

console.log(JSON.stringify(report, null, 2));
await sendTelemetryEvent(buildConfig({ toolPolicyMode: 'ALLOWLIST_ONLY', environment: 'local' }), 'local-hardening-check', {
  mode: 'ALLOWLIST_ONLY',
  status: report.status,
  source: 'local-hardening',
  governed: false,
});
process.exit(report.status === 'PASS' ? 0 : 1);
