import test from 'node:test';
import assert from 'node:assert/strict';
import { GovernedCodexSession } from '../src/governedCodexSession.js';

test('GovernedCodexSession is constructible without starting Codex', () => {
  const session = new GovernedCodexSession({ cwd: process.cwd(), overrides: { toolPolicyMode: 'ALLOWLIST_ONLY' } });
  assert.equal(session.ready, false);
  assert.equal(session.closed, false);
});
