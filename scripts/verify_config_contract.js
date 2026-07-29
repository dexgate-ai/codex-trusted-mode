import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(path.join(root, 'codex.integration.json'), 'utf8'));
const pluginPath = path.join(
  root,
  'plugins',
  'dexgate-codex-trusted-mode',
  '.codex-plugin',
  'plugin.json'
);
const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));

const packageVersion = String(pkg.version || '').trim();
assert.ok(packageVersion, 'package.json version must be set');

assert.equal(
  String(config.version || '').trim(),
  packageVersion,
  `codex.integration.json version (${config.version}) must match package.json (${packageVersion})`
);
assert.equal(
  String(plugin.version || '').trim(),
  packageVersion,
  `plugins/.../plugin.json version (${plugin.version}) must match package.json (${packageVersion})`
);

assert.equal(config.configSchema.toolPolicyMode.default, 'ALLOWLIST_ONLY');
assert.deepEqual(config.configSchema.allowedTools.default, [
  'functions.shell_command',
  'functions.update_plan',
  'functions.view_image',
]);
assert.deepEqual(config.configSchema.allowedShellCommandPrefixes.default, [
  'Get-ChildItem',
  'Get-Content',
  'rg',
  'git status',
  'git diff',
  'git show',
  'pwd',
  'ls',
  'cat',
]);
assert.deepEqual(config.configSchema.highRiskTools.default, [
  'functions.apply_patch',
  'functions.shell_command',
]);

console.log(`Config contract verified (version ${packageVersion}).`);
