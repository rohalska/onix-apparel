import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const deployEnvYml = fs.readFileSync(
  path.resolve(rootDir, '.github', 'workflows', 'deploy-env.yml'),
  'utf8',
);

// The two expressions in deploy-env.yml that decide what a promotion would
// change, pulled out of the workflow rather than copied, so this cannot pass
// while the workflow does something else.
function expression(name: 'changed' | 'summarised'): string {
  const re =
    name === 'changed'
      ? /^\s*(changed="\$\(sed[\s\S]*?\| sort -u\)")\s*$/m
      : /^\s*(summarised="\$\([\s\S]*?\)")\s*$/m;
  const m = deployEnvYml.match(re);
  assert.ok(m, `deploy-env.yml no longer contains a '${name}=' expression in the expected form`);
  // Join the shell line continuations only. Stripping backslashes generally
  // would eat the escapes inside the sed script and the expression would match
  // nothing, which is a test that passes for the wrong reason.
  return m[1].replace(/\\\n\s*/g, ' ').trim();
}

// The stack the apply is allowed to touch, also read from the workflow.
function appliable(): string {
  const m = deployEnvYml.match(/^\s*APPLIABLE: (\S+)$/m);
  assert.ok(m, 'deploy-env.yml must declare APPLIABLE');
  return m[1];
}

function runGuard(fixture: string): { changed: string[]; summarised: number } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-guard-'));
  try {
    fs.copyFileSync(
      path.resolve(rootDir, 'tests', 'fixtures', fixture),
      path.join(dir, 'plan.txt'),
    );
    const script = `
      set -uo pipefail
      cd "${dir}"
      ${expression('changed')}
      ${expression('summarised')}
      printf 'CHANGED<%s>\\n' "$changed"
      printf 'SUMMARISED<%s>\\n' "$summarised"
    `;
    const out = execFileSync('bash', ['-c', script], { encoding: 'utf8' });
    const changedRaw = out.match(/CHANGED<([\s\S]*?)>\n/)?.[1] ?? '';
    const summarised = Number(out.match(/SUMMARISED<(\d+)>/)?.[1]);
    return {
      changed: changedRaw.split('\n').filter((l) => l.trim() !== ''),
      summarised,
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('deploy-env.yml plan guard, against real Terragrunt output', () => {
  it('reads the unit path relative to the working directory', () => {
    // If Terragrunt ever printed an absolute path or one prefixed with
    // infra/live/<env>/, APPLIABLE would never match and every promotion would
    // be refused. This is the assumption that fails silently until the first
    // real promotion, so pin it to captured output.
    const { changed } = runGuard('terragrunt-plan-cold.txt');
    assert.ok(changed.length > 0, 'the expression found no changed stacks in real output');
    for (const unit of changed) {
      assert.doesNotMatch(
        unit,
        /^\//,
        `unit path '${unit}' is absolute; APPLIABLE compares a relative path`,
      );
      assert.doesNotMatch(
        unit,
        /^infra\/live\//,
        `unit path '${unit}' carries the working directory prefix`,
      );
      assert.match(
        unit,
        /^[a-z0-9-]+(\/[a-z0-9-]+)*$/,
        `unit path '${unit}' is not the expected shape`,
      );
    }
    assert.ok(
      changed.includes(appliable()),
      `real output does not yield '${appliable()}', the one path the apply compares against; got: ${changed.join(', ')}`,
    );
  });

  it('accounts for every stack on a cold plan', () => {
    const { changed, summarised } = runGuard('terragrunt-plan-cold.txt');
    assert.equal(summarised, 11, 'the cold fixture has eleven stacks, each with a Plan: line');
    assert.equal(changed.length, 11, 'every stack changes on a cold plan');
  });

  it('passes a steady-state promotion, where only Cloud Run moves', () => {
    const { changed, summarised } = runGuard('terragrunt-plan-steady.txt');
    assert.equal(summarised, 11, 'every stack must be accounted for');
    assert.deepEqual(
      changed,
      [appliable()],
      'a promotion that only moves the image must show exactly the appliable stack as changed',
    );
  });

  it('does not treat an output-only Plan: 0 line as a change', () => {
    // tofu prints "Plan: 0 to add, 0 to change, 0 to destroy." for a difference
    // that changes no resource. Counting that as a change would refuse a
    // promotion that is fine.
    const fixture = fs.readFileSync(
      path.resolve(rootDir, 'tests', 'fixtures', 'terragrunt-plan-steady.txt'),
      'utf8',
    );
    assert.match(fixture, /artifact-registry\] tofu: Plan: 0 to add, 0 to change, 0 to destroy\./);
    const { changed } = runGuard('terragrunt-plan-steady.txt');
    assert.ok(
      !changed.includes('us-central1/artifact-registry'),
      'a zero-resource Plan: line must not count as a change',
    );
  });

  it('still names only the appliable stack when output is interleaved', () => {
    const { changed, summarised } = runGuard('terragrunt-plan-interleaved.txt');
    assert.equal(summarised, 11, 'every stack must be accounted for whatever the order');
    assert.deepEqual(
      changed.slice().sort(),
      ['global/wif-github', appliable()].sort(),
      'both genuinely changed stacks must be reported, so wif-github still blocks before the gate',
    );
  });

  it('counts a "No changes." stack as accounted for but not changed', () => {
    const { changed, summarised } = runGuard('terragrunt-plan-steady.txt');
    assert.ok(summarised > changed.length, 'unchanged stacks must still be counted as understood');
  });
});

// The condition that decides whether the live traffic split is the one the
// stack manages, pulled out of deploy-env.yml so this cannot pass while the
// workflow asks something else.
function trafficCondition(): string {
  const m = deployEnvYml.match(/jq -e '([^']*latestRevision[^']*)'/);
  assert.ok(m, 'deploy-env.yml no longer contains a jq condition mentioning latestRevision');
  return m[1];
}

function servingLatest(traffic: unknown): boolean {
  const res = execFileSync('jq', ['-e', trafficCondition()], {
    input: JSON.stringify(traffic),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
  return res === 'true';
}

function refuses(traffic: unknown): boolean {
  try {
    return !servingLatest(traffic);
  } catch {
    // jq -e exits non-zero for a false or null result, which is a refusal.
    return true;
  }
}

function checkStep(): string {
  return deployEnvYml.slice(
    deployEnvYml.indexOf('Check what this apply will overwrite'),
    deployEnvYml.indexOf('Fetch the approved plan'),
  );
}

describe('deploy-env.yml stack accounting guard', () => {
  it('refuses when no stack was found at all, not only when some are missing', () => {
    // The guard exists to notice a plan it could not read. With a zero unit
    // count, "summarised is not less than units" is satisfied by 0 and 0, so it
    // would pass having accounted for nothing.
    // Match whatever condition guards the accounting, not a particular spelling
    // of it, so a rewrite is exercised rather than merely reported missing.
    const m = deployEnvYml
      .split('\n')
      .map((l) => l.trim())
      .find((l) => /^if .*; then$/.test(l) && l.includes('$summarised') && l.includes('$units'));
    assert.ok(
      m,
      'deploy-env.yml no longer contains a condition comparing summarised against units',
    );

    const decide = (units: number, summarised: number) => {
      const script = `units=${units}; summarised=${summarised}\n${m} echo REFUSE; else echo PASS; fi`;
      return execFileSync('bash', ['-c', script], { encoding: 'utf8' }).trim();
    };
    assert.equal(decide(11, 11), 'PASS', 'every stack accounted for must proceed');
    assert.equal(decide(11, 1), 'REFUSE', 'a partially understood plan must refuse');
    assert.equal(decide(0, 0), 'REFUSE', 'finding no stacks at all must refuse');
    assert.equal(decide(0, 5), 'REFUSE', 'a zero unit count must refuse whatever was summarised');
  });
});

describe('deploy-env.yml traffic gate', () => {
  it('accepts the split the stack actually manages', () => {
    // One target, latest, all of it. This is what the live service reports.
    assert.ok(
      servingLatest([{ latestRevision: true, percent: 100, revisionName: 'r8' }]),
      'a single latest-at-100 target must not be treated as hand-made drift',
    );
  });

  it('refuses a partial split, which a latestRevision substring match would let through', () => {
    // Both of these mention latestRevision, so checking for that alone passed
    // them and the apply would have wiped an incident rollback silently.
    assert.ok(
      refuses([
        { latestRevision: true, percent: 90 },
        { percent: 10, revisionName: 'old' },
      ]),
      'a 90/10 canary must require acknowledgement',
    );
    assert.ok(
      refuses([
        { latestRevision: true, percent: 0 },
        { percent: 100, revisionName: 'old' },
      ]),
      'latest at zero percent with traffic elsewhere must require acknowledgement',
    );
  });

  it('refuses a fully pinned rollback', () => {
    assert.ok(refuses([{ percent: 100, revisionName: 'old-rev' }]));
  });

  it('refuses anything else unexpected rather than guessing', () => {
    assert.ok(refuses([]), 'no traffic targets at all must not read as healthy');
    assert.ok(
      refuses([{ latestRevision: true, percent: 50 }]),
      'latest at half must not read as healthy',
    );
    assert.ok(
      refuses([
        { latestRevision: true, percent: 50 },
        { latestRevision: true, percent: 50 },
      ]),
      'two latest targets must not read as healthy',
    );
  });

  it('decides whether the service exists by exit status, not by error text', () => {
    // `describe` prints "Cannot find service [x]" when a service is absent,
    // which no sensible pattern for "not found" matches, while some access
    // failures do say "not found" and would read as absent. Matching text got
    // this wrong in both directions: a first deploy always refused, and a
    // project-level access failure proceeded to overwrite a split it never
    // read. `list --filter` answers on exit status instead.
    const check = checkStep();
    assert.match(
      check,
      /gcloud run services list/,
      'existence must be decided by a command that can answer it',
    );
    assert.doesNotMatch(
      check,
      /NOT_FOUND\|not found\|does not exist/,
      'existence must not be classified by matching error text',
    );
    assert.match(check, /for attempt in 1 2 3/, 'a failure must be retried before it is believed');
    assert.match(
      check,
      /if \[ "\$exists" != yes \]; then[\s\S]{0,900}?exit 1/,
      'a service that cannot be reached must refuse, not proceed',
    );
    assert.doesNotMatch(
      check,
      /2>\/dev\/null/,
      'the read must not discard the error that explains why it failed',
    );
  });

  it('treats an unparseable response as fatal, not as an acknowledged pass', () => {
    // Without this the acknowledgement would let an unparsed response through,
    // which is deciding the split is fine because nothing could be learned
    // about it.
    const check = checkStep();
    const parseAt = check.indexOf('traffic is not an array');
    assert.ok(parseAt !== -1, 'the parse must assert the shape it expects');
    assert.ok(
      parseAt < check.lastIndexOf('$ACKNOWLEDGED'),
      'the parse must be settled before the acknowledgement is consulted',
    );

    const m = deployEnvYml.match(/jq -ce '(if \(\.status\.traffic[^']*)'/);
    assert.ok(m, 'deploy-env.yml no longer contains the traffic parse guard');
    const parses = (body: unknown) => {
      try {
        execFileSync('jq', ['-ce', m[1]], {
          input: JSON.stringify(body),
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        return true;
      } catch {
        return false;
      }
    };
    assert.ok(
      parses({ status: { traffic: [{ latestRevision: true, percent: 100 }] } }),
      'a normal response must parse',
    );
    assert.ok(!parses({ status: {} }), 'a missing traffic list must be fatal');
    assert.ok(
      !parses({ status: { traffic: { latestRevision: true } } }),
      'a traffic object must be fatal',
    );
    assert.ok(!parses({}), 'a response with no status must be fatal');
  });
});
