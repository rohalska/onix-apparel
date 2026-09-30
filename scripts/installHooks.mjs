// Installs the lefthook git hooks, unless installing them would write outside
// this repository.
//
// `lefthook install` writes to whatever git resolves as the hooks directory, and
// a global `core.hooksPath` in ~/.gitconfig redirects that out of the repo and
// into a directory that may already hold hooks some other mechanism owns. What
// lands there are lefthook's own stubs, so the overwrite leaves files that look
// healthy while the mechanism they replaced is simply gone -- in every
// repository on the machine, not just this one, and with nothing printed.
//
// So this installs automatically only when git's hooks directory is inside the
// repository, which is the ordinary case, and otherwise prints one line and
// stops.
//
// `--force` is never added on the script's own initiative. It reaches lefthook
// only when a human passed it, via `make hooks`, and when the hooks directory
// lies outside the repository it additionally needs
// LEFTHOOK_CLOBBER_GLOBAL_HOOKS=1 in the environment. A warning was not enough:
// --force also overwrites any existing <hook>.old, so the run that prints the
// warning is the same run that destroys the backup the warning points at, and a
// second run leaves nothing to recover from.

import { execFileSync, spawnSync } from 'child_process';
import path from 'path';

const force = process.argv.includes('--force');

/** Trimmed stdout of a git command, or '' if it fails for any reason. */
function git(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

const root = git(['rev-parse', '--show-toplevel']);

// No work tree: `npm ci` inside the Docker builder stage, where .dockerignore
// excludes .git, or an install from a tarball. There is nothing to install into
// and nothing worth saying about it.
if (root === '') {
  if (force) {
    console.error('Cannot install hooks: not inside a git work tree.');
    process.exit(1);
  }
  process.exit(0);
}

const hooksPath = git(['config', '--get', 'core.hooksPath']);

/** True when core.hooksPath resolves to the repository or somewhere under it. */
function hooksPathIsInsideRepo() {
  // git expands a leading ~ itself when it resolves the setting, so do the same
  // before deciding whether the path is ours.
  const expanded = hooksPath.startsWith('~')
    ? path.join(process.env.HOME ?? '', hooksPath.slice(1))
    : hooksPath;
  const resolved = path.resolve(root, expanded);
  return resolved === root || resolved.startsWith(root + path.sep);
}

const outsideRepo = hooksPath !== '' && !hooksPathIsInsideRepo();

if (outsideRepo && !force) {
  console.log(
    `lefthook install skipped: core.hooksPath is ${hooksPath}, outside this repository, and installing would overwrite whatever hooks already live there. \`make hooks\` explains what it would take to install there anyway.`,
  );
  process.exit(0);
}

// The one destructive combination, so it takes a second, deliberate token rather
// than a warning nobody can act on. Refusing here costs a contributor one
// environment variable; getting it wrong costs them their global hooks and the
// .old backups in the same breath.
if (outsideRepo && process.env.LEFTHOOK_CLOBBER_GLOBAL_HOOKS !== '1') {
  console.error(
    `Refusing to install hooks into ${hooksPath}, which is outside this repository.

Installing there replaces every hook in that directory with lefthook's stubs,
for every repository on this machine. lefthook renames what it displaces to
<hook>.old, but --force overwrites an existing <hook>.old too, so a second run
destroys the only copy of the original.

If that is what you want, say so explicitly:

  LEFTHOOK_CLOBBER_GLOBAL_HOOKS=1 make hooks

Back up ${hooksPath} first. If that directory already dispatches to lefthook,
this repository's lefthook.yml is picked up with no install at all and there is
nothing to do here.`,
  );
  process.exit(1);
}

// lefthook refuses to install into any custom core.hooksPath unless told to, so
// --force is what makes `make hooks` work at all in that case. Never
// --reset-hooks-path: that unsets the contributor's own git config.
const args = force ? ['install', '--force'] : ['install'];

// Say what is about to happen before it happens. lefthook reports the renames
// only afterwards, which is too late to be a warning.
if (hooksPath !== '' && force) {
  console.log(
    `Installing hooks into ${hooksPath}. Any hook already there is renamed to <hook>.old, so restore from those if something else owned it.`,
  );
}
const result = spawnSync('lefthook', args, { stdio: 'inherit' });

if (result.error || result.status !== 0) {
  // Two usual causes. A missing binary: npm 11 does not run install scripts by
  // default, so lefthook's postinstall may not have fetched one. Or a custom
  // core.hooksPath inside the repo, which lefthook declines to write to without
  // --force -- and adding --force on its behalf is exactly what this script does
  // not do, so `make hooks` is the way through. Never fail an install over
  // either; `make hooks` is where the failure should be loud.
  const reason = result.error ? result.error.message : `exit status ${result.status}`;
  console[force ? 'error' : 'log'](`lefthook install did not run (${reason}).`);
  if (!force && hooksPath !== '') {
    console.log(
      `core.hooksPath is ${hooksPath}. Run \`make hooks\` to install there deliberately.`,
    );
  }
  process.exit(force ? 1 : 0);
}
