import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Spawn the bridge with an isolated CODEX_HOME so the suite never inherits the
 * developer's personal ~/.codex/config.toml (which may be PDP/governed).
 */
function runBridge(lines, { env: envOverrides = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(process.cwd(), 'bin', 'codex-trusted-mode-bridge.js')], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Isolate from developer PDP tokens and personal codex config.
        PDP_AUTH_TOKEN: '',
        DEXGATE_PDP_AUTH_TOKEN: '',
        ...envOverrides,
      },
    });

    const stdout = [];
    const stderr = [];

    child.stdout.on('data', (chunk) => stdout.push(String(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(String(chunk)));
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`bridge exited ${code}: ${stderr.join('')}`));
        return;
      }
      resolve(stdout.join('').trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)));
    });

    child.stdin.write(`${lines.join('\n')}\n`);
    child.stdin.end();
  });
}

function withEmptyCodexHome(fn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-tm-bridge-'));
  return Promise.resolve()
    .then(() => fn(tempDir))
    .finally(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
}

test('bridge binary responds to initialize and approval requests', async () => {
  await withEmptyCodexHome(async (codexHome) => {
    // Empty CODEX_HOME → no config.toml → free ALLOWLIST_ONLY defaults.
    const responses = await runBridge(
      [
        JSON.stringify({ id: 'init-1', method: 'initialize', params: { clientInfo: { name: 'test', version: '1.0.0' } } }),
        JSON.stringify({
          id: 'req-1',
          method: 'item/commandExecution/requestApproval',
          params: {
            itemId: 'item-1',
            threadId: 'thread-1',
            turnId: 'turn-1',
            command: 'Get-Content README.md',
            cwd: 'C:\\dev\\codex-trusted-mode',
          },
        }),
      ],
      { env: { CODEX_HOME: codexHome } }
    );

    assert.equal(responses[0].id, 'init-1');
    assert.match(responses[0].result.userAgent, /^codex-trusted-mode-bridge\//);
    assert.deepEqual(responses[1], { id: 'req-1', result: { decision: 'accept' } });
  });
});

test('bridge ignores developer governed config when CODEX_HOME is isolated', async () => {
  await withEmptyCodexHome(async (codexHome) => {
    // Explicit free-mode config inside the temp home (deterministic, not host-dependent).
    fs.writeFileSync(
      path.join(codexHome, 'config.toml'),
      `
[apps.codex-trusted-mode]
enabled = true
toolPolicyMode = "ALLOWLIST_ONLY"
`
    );

    const responses = await runBridge(
      [
        JSON.stringify({ id: 'init-2', method: 'initialize', params: { clientInfo: { name: 'test', version: '1.0.0' } } }),
        JSON.stringify({
          id: 'req-2',
          method: 'item/commandExecution/requestApproval',
          params: {
            itemId: 'item-2',
            threadId: 'thread-1',
            turnId: 'turn-1',
            command: 'Get-Content README.md',
            cwd: 'C:\\dev\\codex-trusted-mode',
          },
        }),
      ],
      { env: { CODEX_HOME: codexHome } }
    );

    assert.equal(responses[0].id, 'init-2');
    assert.deepEqual(responses[1], { id: 'req-2', result: { decision: 'accept' } });
  });
});
