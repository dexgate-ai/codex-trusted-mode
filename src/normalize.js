import os from 'node:os';

const ACTION_TYPE_MAP = new Map([
  ['functions.view_image', 'read'],
  ['functions.update_plan', 'meta'],
  ['functions.shell_command', 'execute'],
  ['functions.apply_patch', 'write'],
  ['functions.request_user_input', 'interaction'],
]);

export function normalizeActionType(toolName) {
  const normalized = String(toolName || '').trim().toLowerCase();
  return ACTION_TYPE_MAP.get(normalized) || 'unknown';
}

export function normalizeCodexEvent(event = {}) {
  const toolName = String(event.toolName || '').trim();
  const repoContext = event.repoContext || {};
  const origin = {
    user: event.user || event.username || process.env.USERNAME || process.env.USER || '',
    user_id: event.userId || event.user_id || '',
    machine_id: event.machineId || event.machine_id || os.hostname(),
    hostname: event.hostname || os.hostname(),
    os: `${os.platform()} ${os.release()}`,
    repo_url: repoContext.repoUrl || repoContext.remoteUrl || repoContext.repositoryUrl || '',
    repo_path: repoContext.repoPath || event.workingDirectory || '',
    branch: repoContext.branch || '',
    commit_sha: repoContext.commitSha || repoContext.sha || '',
    workspace: event.workingDirectory || '',
    agent: 'codex',
    agent_version: event.runtimeVersion || '',
    adapter: 'codex-trusted-mode',
    adapter_version: process.env.CODEX_TRUSTED_MODE_VERSION || '0.1.8',
    session_id: event.sessionId || '',
    idempotency_key: event.idempotencyKey || event.idempotency_key || '',
  };
  return {
    runtime: 'codex',
    runtimeVersion: event.runtimeVersion || '',
    sessionId: event.sessionId || '',
    toolName,
    actionType: normalizeActionType(toolName),
    targetPath: event.targetPath || '',
    command: event.command || '',
    arguments: event.arguments || {},
    workingDirectory: event.workingDirectory || '',
    repoContext,
    environment: event.environment || 'dev',
    tenantId: event.tenantId || '',
    userRole: event.userRole || '',
    origin: Object.fromEntries(Object.entries(origin).filter(([, value]) => String(value || '').trim())),
  };
}
