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

function firstString(...values) {
  for (const value of values) {
    const out = String(value ?? '').trim();
    if (out) return out;
  }
  return '';
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
    github_pr_url: firstString(repoContext.githubPrUrl, repoContext.pullRequestUrl, repoContext.prUrl, event.githubPrUrl, event.pullRequestUrl, event.prUrl),
    github_pr_number: firstString(repoContext.githubPrNumber, repoContext.pullRequestNumber, repoContext.prNumber, event.githubPrNumber, event.pullRequestNumber, event.prNumber),
    github_check_url: firstString(repoContext.githubCheckUrl, repoContext.checkRunUrl, repoContext.checkUrl, event.githubCheckUrl, event.checkRunUrl, event.checkUrl),
    github_check_run_id: firstString(repoContext.githubCheckRunId, repoContext.checkRunId, event.githubCheckRunId, event.checkRunId),
    github_workflow: firstString(repoContext.githubWorkflow, repoContext.workflow, event.githubWorkflow, event.workflow),
    github_run_id: firstString(repoContext.githubRunId, repoContext.workflowRunId, repoContext.runId, event.githubRunId, event.workflowRunId, event.runId),
    deployment_url: firstString(repoContext.deploymentUrl, event.deploymentUrl),
    deployment_id: firstString(repoContext.deploymentId, event.deploymentId),
    deployment_environment: firstString(repoContext.deploymentEnvironment, event.deploymentEnvironment),
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
