#!/usr/bin/env node
/**
 * Build and deploy the site from ONE explicitly selected, committed revision
 * (docs/28_A2_DEPLOYMENT_RUNBOOK.md, "Deploying the site").
 *
 * Why: the Pages project is Direct Upload (no Git integration), and the old
 * `npm run deploy` built whatever happened to be in the working tree —
 * including uncommitted work. This tool never reads the working tree:
 *
 *   1. resolves --commit to a full SHA (and, for production, proves it is on
 *      the pushed --from-branch);
 *   2. checks it out into a fresh, detached `git worktree` in a temp dir;
 *   3. there: `npm ci`, unit tests, Pages Function tests, production build;
 *   4. proves the worktree is still clean (the build wrote only ignored files);
 *   5. only with --deploy: runs `wrangler pages deploy` FROM that worktree, so
 *      the uploaded static files AND the /api Function are exactly the commit's;
 *   6. always removes the temp worktree.
 *
 * Without --deploy it is a full rehearsal that uploads nothing and prints the
 * exact wrangler command it would run. Production additionally requires
 * --confirm <full-sha>.
 *
 * Usage:
 *   node tools/deploy-from-commit.mjs --target preview --label a2-preview --commit <sha> [--allow-unpushed] [--deploy]
 *   node tools/deploy-from-commit.mjs --target production --commit <sha> --from-branch origin/<branch> [--deploy --confirm <full-sha>]
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isValidPreviewLabel } from './validate-preview-label.mjs';

export const PROJECT = 'psgim-ecell';
export const PRODUCTION_LABEL = 'ECell';
export const BUILD_DIR = 'web/dist/web/browser';
const FULL_SHA = /^[0-9a-f]{40}$/;
const REF = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

export class DeployError extends Error {}

/** Strict flag parser: unknown flags and missing values are errors, never ignored. */
export function parseArgs(argv) {
  const flags = new Set(['--deploy', '--allow-unpushed', '--keep-worktree', '--help']);
  const valued = new Set(['--target', '--label', '--commit', '--from-branch', '--confirm']);
  const out = { deploy: false, allowUnpushed: false, keepWorktree: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (flags.has(arg)) {
      out[arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = true;
    } else if (valued.has(arg)) {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) throw new DeployError(`${arg} needs a value.`);
      out[arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
    } else {
      throw new DeployError(`Unknown argument: ${arg}`);
    }
  }
  return out;
}

/**
 * Validates options against facts gathered from git (no I/O here, so it is
 * unit-testable). `facts`: { sha, subject, remoteBranchesContaining: string[] }.
 * Returns the plan, or throws DeployError explaining the refusal.
 */
export function validateCommitArg(commit) {
  if (!commit) throw new DeployError('--commit is required: name the exact revision to deploy.');
  if (!REF.test(commit)) throw new DeployError('--commit must be a commit SHA or plain ref.');
}

export function planDeploy(opts, facts) {
  validateCommitArg(opts.commit);
  if (!FULL_SHA.test(facts.sha ?? '')) throw new DeployError(`Could not resolve ${opts.commit} to a commit.`);
  const pushed = facts.remoteBranchesContaining ?? [];

  if (opts.target === 'preview') {
    if (!isValidPreviewLabel(opts.label)) {
      throw new DeployError("--label must match ^[a-z0-9-]+$ and must not be the production label 'ECell' in any spelling.");
    }
    if (opts.confirm) throw new DeployError('--confirm is only for production deployments.');
    if (opts.fromBranch) throw new DeployError('--from-branch is only for production deployments.');
    if (pushed.length === 0 && !opts.allowUnpushed) {
      throw new DeployError(`${facts.sha} is not on any pushed branch. Push it, or pass --allow-unpushed for a preview.`);
    }
    return { target: 'preview', label: opts.label, sha: facts.sha, subject: facts.subject, pushedOn: pushed, deploy: opts.deploy };
  }

  if (opts.target === 'production') {
    if (opts.label) throw new DeployError(`Production always uses the label ${PRODUCTION_LABEL}; do not pass --label.`);
    if (opts.allowUnpushed) throw new DeployError('--allow-unpushed is never allowed for production.');
    if (!opts.fromBranch || !opts.fromBranch.startsWith('origin/') || !REF.test(opts.fromBranch)) {
      throw new DeployError('Production requires --from-branch origin/<branch>: the pushed branch the commit must be on.');
    }
    if (!pushed.includes(opts.fromBranch)) {
      throw new DeployError(`${facts.sha} is not on ${opts.fromBranch}. Push it there first (pushing does not deploy).`);
    }
    if (opts.deploy && opts.confirm !== facts.sha) {
      throw new DeployError(`Production deploy needs --confirm ${facts.sha} (the full SHA, typed out).`);
    }
    return {
      target: 'production', label: PRODUCTION_LABEL, sha: facts.sha, subject: facts.subject,
      pushedOn: pushed, fromBranch: opts.fromBranch, deploy: opts.deploy,
    };
  }

  throw new DeployError('--target must be "preview" or "production".');
}

/** The exact wrangler invocation for a plan (argument array — no shell). */
export function wranglerArgs(plan) {
  const message = `${plan.target} ${plan.sha.slice(0, 12)}: ${plan.subject}`.slice(0, 380);
  return [
    'pages', 'deploy', BUILD_DIR,
    '--project-name', PROJECT,
    '--branch', plan.label,
    '--commit-hash', plan.sha,
    '--commit-message', message,
    '--commit-dirty=false',
  ];
}

// --- I/O ---------------------------------------------------------------------

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function run(cmd, args, cwd, env = process.env) {
  const where = path.basename(cwd) === 'tree' ? 'worktree' : 'repo';
  console.log(`\n$ (${where}) ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit', env });
}

export function gitFacts(repo, commit) {
  let sha;
  try {
    sha = git(['rev-parse', '--verify', '--end-of-options', `${commit}^{commit}`], repo);
  } catch {
    throw new DeployError(`Could not resolve ${commit} to a commit.`);
  }
  const subject = git(['log', '-1', '--format=%s', sha], repo);
  const remoteBranchesContaining = git(['branch', '-r', '--contains', sha, '--format=%(refname:short)'], repo)
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !s.endsWith('/HEAD'));
  return { sha, subject, remoteBranchesContaining };
}

async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(fileURLToPath(import.meta.url).replace(/.*\//, '') + ': see the header comment / docs/28_A2_DEPLOYMENT_RUNBOOK.md');
    return;
  }
  const repo = git(['rev-parse', '--show-toplevel'], process.cwd());
  validateCommitArg(opts.commit); // before git sees it
  const plan = planDeploy(opts, gitFacts(repo, opts.commit));

  console.log(`Target:   ${plan.target} (Pages label "${plan.label}", project ${PROJECT})`);
  console.log(`Commit:   ${plan.sha}  ${plan.subject}`);
  console.log(`Pushed:   ${plan.pushedOn.length ? plan.pushedOn.join(', ') : 'NOT PUSHED (preview only)'}`);
  console.log(`Mode:     ${plan.deploy ? 'DEPLOY' : 'rehearsal — builds and tests, uploads nothing'}`);

  const work = mkdtempSync(path.join(tmpdir(), 'ecell-deploy-'));
  const tree = path.join(work, 'tree');
  try {
    run('git', ['worktree', 'add', '--detach', tree, plan.sha], repo);
    if (git(['rev-parse', 'HEAD'], tree) !== plan.sha) throw new DeployError('Worktree is not at the selected commit.');

    run('npm', ['ci', '--prefix', 'web', '--no-audit', '--no-fund'], tree);
    run('npm', ['--prefix', 'web', 'run', 'test:ci'], tree);
    run('npm', ['run', 'test:functions'], tree);
    run('npm', ['--prefix', 'web', 'run', 'build'], tree);

    const dirty = git(['status', '--porcelain'], tree);
    if (dirty) throw new DeployError(`The build modified tracked files; refusing to deploy:\n${dirty}`);
    if (!existsSync(path.join(tree, BUILD_DIR, 'index.html'))) throw new DeployError(`No build output at ${BUILD_DIR}.`);
    if (!existsSync(path.join(tree, 'functions', 'api'))) throw new DeployError('The commit has no functions/api proxy.');

    const args = wranglerArgs(plan);
    if (!plan.deploy) {
      console.log('\nRehearsal complete. To deploy exactly this, rerun with --deploy' +
        (plan.target === 'production' ? ` --confirm ${plan.sha}` : '') + '. The upload would be:');
      console.log(`  (in a worktree at ${plan.sha.slice(0, 12)}) npx wrangler ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`);
      return;
    }
    // From the worktree: wrangler picks up functions/ relative to its cwd, so
    // the deployed /api Function is the commit's, not the working tree's.
    run('npx', ['wrangler', ...args], tree);
    console.log(`\nDeployed ${plan.sha} to ${plan.target}. Run the post-deploy checklist (docs/28).`);
  } finally {
    if (opts.keepWorktree) {
      console.log(`\nKept worktree at ${tree} (remove with: git worktree remove --force ${tree}).`);
    } else {
      try {
        git(['worktree', 'remove', '--force', tree], repo);
      } catch {
        /* already gone */
      }
      rmSync(work, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`\n${err instanceof DeployError ? 'Refused' : 'Failed'}: ${err.message}`);
    process.exit(1);
  });
}
