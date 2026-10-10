// Tests for tools/deploy-from-commit.mjs — the decision logic only (no git, no network).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DeployError, PRODUCTION_LABEL, parseArgs, planDeploy, worktreeEnv, wranglerArgs } from '../deploy-from-commit.mjs';

const SHA = 'a9988ddc72c50d977eaf66b6745082115c4f9b9e';
const facts = (over = {}) => ({ sha: SHA, subject: 'fix(events): states', remoteBranchesContaining: ['origin/ECell'], ...over });
const refuses = (fn, pattern) => assert.throws(fn, (e) => e instanceof DeployError && pattern.test(e.message));

// --- argument parsing --------------------------------------------------------

test('parses flags and values', () => {
  const o = parseArgs(['--target', 'production', '--commit', SHA, '--from-branch', 'origin/ECell', '--deploy', '--confirm', SHA]);
  assert.deepEqual(
    { ...o },
    { deploy: true, allowUnpushed: false, keepWorktree: false, help: false, target: 'production', commit: SHA, fromBranch: 'origin/ECell', confirm: SHA },
  );
});

test('rejects unknown flags and missing values instead of ignoring them', () => {
  refuses(() => parseArgs(['--prod']), /Unknown argument/);
  refuses(() => parseArgs(['--commit']), /needs a value/);
  refuses(() => parseArgs(['--commit', '--deploy']), /needs a value/);
  refuses(() => parseArgs(['--target', 'production', 'extra']), /Unknown argument/);
});

// --- common ------------------------------------------------------------------

test('a commit must be named explicitly', () => {
  refuses(() => planDeploy({ target: 'preview', label: 'x' }, facts()), /--commit is required/);
});

test('refuses refs that could be read as options or shell syntax', () => {
  for (const commit of ['-x', '--all', 'HEAD;rm', 'a b', '$(id)']) {
    refuses(() => planDeploy({ target: 'preview', label: 'x', commit }, facts()), /commit SHA or plain ref/);
  }
});

test('refuses when git could not resolve the commit', () => {
  refuses(() => planDeploy({ target: 'preview', label: 'x', commit: 'nope' }, facts({ sha: '' })), /Could not resolve/);
});

test('refuses an unknown target', () => {
  refuses(() => planDeploy({ target: 'staging', commit: SHA }, facts()), /--target must be/);
  refuses(() => planDeploy({ commit: SHA }, facts()), /--target must be/);
});

// --- preview -----------------------------------------------------------------

test('preview uses a validated label and never the production label', () => {
  const plan = planDeploy({ target: 'preview', label: 'a2-preview', commit: SHA }, facts());
  assert.equal(plan.label, 'a2-preview');
  for (const label of ['ECell', 'ecell', 'e-cell', 'Bad Label', '', undefined]) {
    refuses(() => planDeploy({ target: 'preview', label, commit: SHA }, facts()), /--label must match/);
  }
});

test('preview of an unpushed commit needs --allow-unpushed', () => {
  refuses(() => planDeploy({ target: 'preview', label: 'p', commit: SHA }, facts({ remoteBranchesContaining: [] })), /not on any pushed branch/);
  const plan = planDeploy({ target: 'preview', label: 'p', commit: SHA, allowUnpushed: true }, facts({ remoteBranchesContaining: [] }));
  assert.deepEqual(plan.pushedOn, []);
});

test('production-only flags are refused for previews', () => {
  refuses(() => planDeploy({ target: 'preview', label: 'p', commit: SHA, confirm: SHA }, facts()), /--confirm is only for production/);
  refuses(() => planDeploy({ target: 'preview', label: 'p', commit: SHA, fromBranch: 'origin/ECell' }, facts()), /--from-branch is only/);
});

// --- production --------------------------------------------------------------

test('production requires the commit to be on the named pushed branch', () => {
  refuses(() => planDeploy({ target: 'production', commit: SHA }, facts()), /requires --from-branch origin\//);
  refuses(() => planDeploy({ target: 'production', commit: SHA, fromBranch: 'ECell' }, facts()), /requires --from-branch origin\//);
  refuses(
    () => planDeploy({ target: 'production', commit: SHA, fromBranch: 'origin/main' }, facts()),
    /not on origin\/main/,
  );
  refuses(
    () => planDeploy({ target: 'production', commit: SHA, fromBranch: 'origin/ECell' }, facts({ remoteBranchesContaining: [] })),
    /not on origin\/ECell/,
  );
});

test('production never allows unpushed commits or a custom label', () => {
  refuses(() => planDeploy({ target: 'production', commit: SHA, fromBranch: 'origin/ECell', allowUnpushed: true }, facts()), /never allowed/);
  refuses(() => planDeploy({ target: 'production', commit: SHA, fromBranch: 'origin/ECell', label: 'x' }, facts()), /do not pass --label/);
});

test('a production rehearsal needs no confirmation; a production deploy needs the full SHA typed out', () => {
  const rehearsal = planDeploy({ target: 'production', commit: SHA, fromBranch: 'origin/ECell' }, facts());
  assert.equal(rehearsal.deploy, undefined);
  assert.equal(rehearsal.label, PRODUCTION_LABEL);
  refuses(() => planDeploy({ target: 'production', commit: SHA, fromBranch: 'origin/ECell', deploy: true }, facts()), /needs --confirm/);
  refuses(
    () => planDeploy({ target: 'production', commit: SHA, fromBranch: 'origin/ECell', deploy: true, confirm: SHA.slice(0, 7) }, facts()),
    /needs --confirm/,
  );
  const plan = planDeploy({ target: 'production', commit: SHA, fromBranch: 'origin/ECell', deploy: true, confirm: SHA }, facts());
  assert.equal(plan.deploy, true);
});

// --- wrangler invocation -----------------------------------------------------

test('wrangler args pin project, label, commit hash and a clean-tree flag', () => {
  const args = wranglerArgs({ target: 'production', label: PRODUCTION_LABEL, sha: SHA, subject: 'fix(events): states' });
  assert.deepEqual(args.slice(0, 3), ['pages', 'deploy', 'web/dist/web/browser']);
  assert.equal(args[args.indexOf('--project-name') + 1], 'psgim-ecell');
  assert.equal(args[args.indexOf('--branch') + 1], 'ECell');
  assert.equal(args[args.indexOf('--commit-hash') + 1], SHA);
  assert.match(args[args.indexOf('--commit-message') + 1], /^production a9988ddc72c5: fix\(events\)/);
  assert.ok(args.includes('--commit-dirty=false'));
});

test('a hostile commit subject stays a single argument (no shell is involved)', () => {
  const args = wranglerArgs({ target: 'preview', label: 'p', sha: SHA, subject: 'x"; rm -rf / #' });
  assert.equal(args.filter((a) => a.includes('rm -rf')).length, 1);
  assert.ok(args[args.indexOf('--commit-message') + 1].includes('rm -rf'));
});

test('worktree steps run with CI=true so Angular never writes its shared cache into the main checkout', () => {
  const base = { PATH: '/bin', HOME: '/h', CI: 'false' };
  const env = worktreeEnv(base);
  assert.equal(env.CI, 'true');
  assert.equal(env.PATH, '/bin');
  assert.equal(base.CI, 'false'); // caller's environment is not mutated
});
