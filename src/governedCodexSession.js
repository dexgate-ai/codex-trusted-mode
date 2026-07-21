import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { evaluateAppServerApprovalRequest } from './appServerBridge.js';
import {
  buildCodexAppServerSpawn,
  buildInitializeRequest,
  buildThreadStartRequest,
  buildTurnStartRequest,
  summarizeDynamicToolCallParams,
  collectPostHocCommandExecutions,
  extractCompletedAgentMessage,
} from './appServerSession.js';

const APPROVAL_METHODS = new Set([
  'item/commandExecution/requestApproval',
  'item/fileChange/requestApproval',
  'execCommandApproval',
  'applyPatchApproval',
]);

/**
 * Multi-turn Codex session over app-server with DexGate SDE approval gating.
 * This is the interactive surface for the governed runner path (not OpenAI's TUI).
 */
export class GovernedCodexSession {
  constructor({
    cwd = process.cwd(),
    overrides = {},
    turnTimeoutMs = 120000,
    onEvent = null,
  } = {}) {
    this.cwd = cwd;
    this.overrides = overrides;
    this.turnTimeoutMs = turnTimeoutMs;
    this.onEvent = typeof onEvent === 'function' ? onEvent : () => {};
    this.child = null;
    this.rl = null;
    this.nextId = 1;
    this.threadId = '';
    this.ready = false;
    this.closed = false;
    this.turnWaiter = null;
    this.initWaiter = null;
    this.sessionApprovals = [];
    this.sessionToolCalls = [];
    this._lineHandler = null;
  }

  emit(type, payload = {}) {
    this.onEvent({ type, ts: new Date().toISOString(), ...payload });
  }

  async start() {
    if (this.ready) return this;
    if (this.closed) throw new Error('Session already closed');

    const codexLaunch = buildCodexAppServerSpawn();
    this.child = spawn(codexLaunch.command, codexLaunch.args, {
      cwd: this.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });

    this.child.stderr.on('data', (chunk) => {
      this.emit('stderr', { text: String(chunk) });
    });

    this.child.on('error', (error) => {
      this.emit('error', { error: String(error.message || error) });
      this._failWaiters(error);
    });

    this.child.on('exit', (code, signal) => {
      this.closed = true;
      this.ready = false;
      this.emit('exit', { exitCode: code, signal });
      this._failWaiters(new Error(`Codex app-server exited (code=${code}, signal=${signal})`));
    });

    this.rl = readline.createInterface({
      input: this.child.stdout,
      crlfDelay: Infinity,
    });

    this.initWaiter = this._createWaiter('initialize/thread');
    this.rl.on('line', (line) => {
      void this._onLine(line);
    });

    this._send(buildInitializeRequest(`init-${this.nextId++}`));
    await this.initWaiter.promise;
    this.ready = true;
    this.emit('ready', { threadId: this.threadId, cwd: this.cwd });
    return this;
  }

  async prompt(text, { timeoutMs } = {}) {
    if (!this.ready || this.closed) {
      throw new Error('Session is not ready. Call start() first.');
    }
    if (this.turnWaiter) {
      throw new Error('A turn is already in progress.');
    }

    const promptText = String(text || '').trim();
    if (!promptText) throw new Error('Prompt must be non-empty.');

    const turnTimeout = Number.isFinite(timeoutMs) ? timeoutMs : this.turnTimeoutMs;
    const turnId = `turn-start-${this.nextId++}`;
    const approvals = [];
    const toolCalls = [];
    const agentMessages = [];
    const postHocCommandExecutions = [];
    const observedMethods = new Set();

    this.turnWaiter = this._createWaiter('turn', turnTimeout);
    this.turnWaiter.context = {
      approvals,
      toolCalls,
      agentMessages,
      postHocCommandExecutions,
      observedMethods,
      prompt: promptText,
    };

    this.emit('turn_start', { prompt: promptText, turnId });
    this._send(buildTurnStartRequest(turnId, this.threadId, promptText, this.cwd));

    try {
      await this.turnWaiter.promise;
      const result = {
        status: 'completed',
        prompt: promptText,
        threadId: this.threadId,
        approvalHandled: approvals.length > 0,
        approvalRequests: approvals,
        toolCallHandled: toolCalls.length > 0,
        toolCallRequests: toolCalls,
        postHocCommandExecutionDetected: postHocCommandExecutions.length > 0,
        postHocCommandExecutions,
        governanceGapDetected:
          postHocCommandExecutions.length > 0 && approvals.length === 0 && toolCalls.length === 0,
        agentMessages,
        observedMethods: Array.from(observedMethods),
      };
      if (result.governanceGapDetected) {
        result.status = 'completed_with_governance_gap';
        result.warnings = [
          'Codex reported command execution without a pre-execution approval/tool-call hook for this turn.',
        ];
      }
      this.emit('turn_complete', result);
      return result;
    } finally {
      this.turnWaiter = null;
    }
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    this.ready = false;
    try {
      if (this.rl) this.rl.close();
    } catch {
      /* ignore */
    }
    try {
      if (this.child && !this.child.killed) this.child.kill();
    } catch {
      /* ignore */
    }
    this.emit('closed', {});
  }

  _send(message) {
    if (!this.child?.stdin?.writable) {
      throw new Error('Codex app-server stdin is not writable');
    }
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
    this.emit('client_message', { message });
  }

  _createWaiter(label, timeoutMs = 60000) {
    const waiter = {
      label,
      resolve: null,
      reject: null,
      timer: null,
      promise: null,
      context: null,
    };
    waiter.promise = new Promise((resolve, reject) => {
      waiter.resolve = resolve;
      waiter.reject = reject;
      waiter.timer = setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    waiter.promise.finally(() => {
      if (waiter.timer) clearTimeout(waiter.timer);
    });
    return waiter;
  }

  _failWaiters(error) {
    if (this.initWaiter?.reject) {
      this.initWaiter.reject(error);
      this.initWaiter = null;
    }
    if (this.turnWaiter?.reject) {
      this.turnWaiter.reject(error);
      this.turnWaiter = null;
    }
  }

  async _onLine(line) {
    const trimmed = String(line || '').trim();
    if (!trimmed) return;

    let message;
    try {
      message = JSON.parse(trimmed);
    } catch {
      this.emit('server_raw', { text: trimmed });
      return;
    }

    this.emit('server_message', { message });

    if (typeof message.method === 'string' && this.turnWaiter?.context?.observedMethods) {
      this.turnWaiter.context.observedMethods.add(message.method);
    }

    // Initialize response → start thread
    if (message.id && message.result?.userAgent && this.initWaiter && !this.threadId) {
      this._send(buildThreadStartRequest(`thread-start-${this.nextId++}`, this.cwd));
      return;
    }

    // Thread started → session ready
    if (
      typeof message.id !== 'undefined' &&
      String(message.id).startsWith('thread-start-') &&
      message.result?.thread?.id
    ) {
      this.threadId = message.result.thread.id;
      if (this.initWaiter?.resolve) {
        this.initWaiter.resolve({ threadId: this.threadId });
        this.initWaiter = null;
      }
      return;
    }

    // Approval / tool gates
    if (APPROVAL_METHODS.has(message.method) || message.method === 'item/tool/call') {
      try {
        const result = await evaluateAppServerApprovalRequest(message, this.overrides);
        const entry = {
          method: message.method,
          toolName: result.event?.toolName || '',
          decision: result.evaluation?.decision || '',
          reasonCode: result.evaluation?.reasonCode || '',
          response: result.response,
        };
        if (message.method === 'item/tool/call') {
          Object.assign(entry, summarizeDynamicToolCallParams(message.params));
          this.sessionToolCalls.push(entry);
          this.turnWaiter?.context?.toolCalls.push(entry);
        } else {
          this.sessionApprovals.push(entry);
          this.turnWaiter?.context?.approvals.push(entry);
        }
        this.emit('governance', entry);
        this._send({ id: message.id, result: result.response });
      } catch (error) {
        this.emit('error', { error: String(error.message || error), phase: 'governance' });
        this._send({
          id: message.id,
          error: { code: -32000, message: String(error.message || error) },
        });
      }
      return;
    }

    const postHoc = collectPostHocCommandExecutions(message);
    if (postHoc.length > 0 && this.turnWaiter?.context) {
      for (const execution of postHoc) {
        const key = JSON.stringify(execution);
        if (!this.turnWaiter.context.postHocCommandExecutions.some((e) => JSON.stringify(e) === key)) {
          this.turnWaiter.context.postHocCommandExecutions.push(execution);
        }
      }
    }

    const agentMessage = extractCompletedAgentMessage(message);
    if (agentMessage) {
      this.turnWaiter?.context?.agentMessages.push(agentMessage);
      this.emit('agent_message', { text: agentMessage });
      return;
    }

    if (message.method === 'turn/completed' && this.turnWaiter?.resolve) {
      this.turnWaiter.resolve(true);
    }
  }
}
