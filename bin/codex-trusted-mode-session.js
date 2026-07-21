#!/usr/bin/env node
/**
 * Interactive multi-turn governed Codex session (DexGate product surface).
 *
 * This is NOT OpenAI's interactive `codex` TUI. It is a DexGate REPL that:
 *   user prompt → Codex app-server turn → approval callbacks → SDE → continue
 *
 * Usage:
 *   codex-trusted-mode-session [--cwd <path>] [--codex-config <path>] [--timeout-ms 120000]
 *
 * Commands inside the session:
 *   /help   /quit   /cwd   /json on|off
 */
import path from 'node:path';
import readline from 'node:readline';
import { loadBridgeOverrides } from '../src/codexConfigFile.js';
import { GovernedCodexSession } from '../src/governedCodexSession.js';

function getFlag(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return '';
  return process.argv[index + 1] || '';
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const cwd = path.resolve(getFlag('--cwd') || process.cwd());
const timeoutMs = Number.parseInt(getFlag('--timeout-ms') || '120000', 10);
const quiet = hasFlag('--quiet');
let jsonSummaries = hasFlag('--json-summaries');

const overrides = loadBridgeOverrides({
  configPath: getFlag('--codex-config'),
  overridePath: getFlag('--config'),
  appId: getFlag('--app-id') || 'codex-trusted-mode',
});

function printBanner() {
  console.log('');
  console.log('DexGate governed Codex session');
  console.log('  (interactive runner — not the OpenAI `codex` TUI)');
  console.log(`  cwd: ${cwd}`);
  console.log(`  pdp: ${overrides.pdpUrl || '(from config)'} mode=${overrides.toolPolicyMode || 'n/a'}`);
  console.log('  type a prompt, or /help  /quit');
  console.log('');
}

function formatGovernance(entry) {
  const decision = entry.decision || entry.response?.decision || 'unknown';
  const reason = entry.reasonCode || '';
  return `[governance] ${entry.method} → ${decision}${reason ? ` (${reason})` : ''}`;
}

async function main() {
  printBanner();

  const session = new GovernedCodexSession({
    cwd,
    overrides,
    turnTimeoutMs: timeoutMs,
    onEvent: (event) => {
      if (quiet) return;
      if (event.type === 'governance') {
        console.log(formatGovernance(event));
      } else if (event.type === 'agent_message' && event.text) {
        // printed after turn as well; skip mid-stream spam for now
      } else if (event.type === 'error') {
        console.error(`[error] ${event.error}`);
      } else if (event.type === 'ready') {
        console.log(`[ready] thread=${event.threadId}`);
      }
    },
  });

  try {
    process.stdout.write('Starting Codex app-server… ');
    await session.start();
    console.log('ok');
  } catch (error) {
    console.error(`\nFailed to start governed session: ${error.message || error}`);
    console.error('Check: codex is installed, `codex login status`, and VPN/PDP if toolPolicyMode=PDP.');
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  const ask = (q) =>
    new Promise((resolve) => {
      rl.question(q, resolve);
    });

  let turn = 0;
  while (!session.closed) {
    const line = await ask('you> ');
    const text = String(line || '').trim();
    if (!text) continue;

    if (text === '/quit' || text === '/exit') {
      break;
    }
    if (text === '/help') {
      console.log('Commands: /help  /quit  /json on|off  /cwd');
      console.log('Anything else is sent as a governed Codex turn (SDE gates approvals).');
      continue;
    }
    if (text === '/cwd') {
      console.log(cwd);
      continue;
    }
    if (text.startsWith('/json ')) {
      jsonSummaries = text.slice(6).trim() === 'on';
      console.log(`json summaries: ${jsonSummaries ? 'on' : 'off'}`);
      continue;
    }

    turn += 1;
    process.stdout.write(`[turn ${turn}] running…\n`);
    try {
      const result = await session.prompt(text);
      if (result.agentMessages?.length) {
        console.log('');
        console.log(result.agentMessages[result.agentMessages.length - 1]);
        console.log('');
      }
      if (result.approvalRequests?.length) {
        for (const a of result.approvalRequests) {
          console.log(formatGovernance(a));
        }
      }
      if (result.governanceGapDetected) {
        console.log('[warning] governance gap: command execution without pre-exec approval hook');
      }
      if (jsonSummaries) {
        console.log(
          JSON.stringify(
            {
              status: result.status,
              approvalHandled: result.approvalHandled,
              approvalRequests: result.approvalRequests,
              governanceGapDetected: result.governanceGapDetected,
            },
            null,
            2,
          ),
        );
      }
      console.log(`[turn ${turn}] ${result.status}`);
    } catch (error) {
      console.error(`[turn ${turn}] failed: ${error.message || error}`);
    }
  }

  rl.close();
  await session.close();
  console.log('Session closed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
