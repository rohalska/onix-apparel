import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const workflowsDir = path.resolve(rootDir, '.github', 'workflows');
const promoteYml = fs.readFileSync(path.join(workflowsDir, 'promote.yml'), 'utf8');
const deployEnvYml = fs.readFileSync(path.join(workflowsDir, 'deploy-env.yml'), 'utf8');
const catalogImportYml = fs.readFileSync(path.join(workflowsDir, 'catalog-import.yml'), 'utf8');
const infraPlanYml = fs.readFileSync(path.join(workflowsDir, 'infra-plan.yml'), 'utf8');

// The block of a workflow belonging to one job, from its key up to the next
// job key at the same indentation. Enough to assert which job carries the
// environment gate without pulling in a YAML parser.
// HCL with comment lines removed, so an assertion cannot match a commented-out
// or example block. env-facts.sh anchors its own reads for the same reason.
function liveHcl(env: string): string {
  return fs
    .readFileSync(path.resolve(rootDir, 'infra', 'live', env, 'env.hcl'), 'utf8')
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
}

function environments(): string[] {
  const liveDir = path.resolve(rootDir, 'infra', 'live');
  return fs
    .readdirSync(liveDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(liveDir, e.name, 'env.hcl')))
    .map((e) => e.name);
}

function facts(env: string): Record<string, string> {
  const out = execSync(`infra/scripts/env-facts.sh ${env}`, { cwd: rootDir, encoding: 'utf8' });
  return Object.fromEntries(
    out
      .trim()
      .split('\n')
      .map((line) => {
        const i = line.indexOf('=');
        return [line.slice(0, i), line.slice(i + 1)];
      }),
  );
}

function promotableEnvironments(): string[] {
  const options = promoteYml.slice(
    promoteYml.indexOf('options:'),
    promoteYml.indexOf('\nconcurrency:'),
  );
  return [...options.matchAll(/^ {10}- (\S+)$/gm)].map((m) => m[1]);
}

// The environment infra-plan.yml plans on pull requests, read from the workflow
// rather than assumed, so these assertions follow it if it ever moves.
function planOnPullRequestEnvironment(): string {
  const m = infraPlanYml.match(/^ {6}ENVIRONMENT: (\S+)$/m);
  assert.ok(m, 'infra-plan.yml must name the environment it plans');
  return m[1];
}

// One step of a job, from its `- name:` up to the next step at the same
// indentation. Needed so an assertion about one step does not match shell that
// belongs to the following step.
function stepBlock(jobYaml: string, nameFragment: string): string {
  const lines = jobYaml.split('\n');
  const start = lines.findIndex((l) => /^ {6}- name: /.test(l) && l.includes(nameFragment));
  assert.notEqual(start, -1, `job has no step whose name contains '${nameFragment}'`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^ {6}- (name|uses):/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function jobBlock(yaml: string, job: string): string {
  const lines = yaml.split('\n');
  const start = lines.findIndex((l) => l === `  ${job}:`);
  assert.notEqual(start, -1, `workflow has no job named '${job}'`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^ {2}\S/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

describe('Promotion pipeline invariants', () => {
  it('promote.yml is dispatch-only, so a tag can never trigger a deploy', () => {
    const triggers = promoteYml.slice(
      promoteYml.indexOf('\non:'),
      promoteYml.indexOf('\nconcurrency:'),
    );
    assert.match(triggers, /workflow_dispatch:/, 'promote.yml must be dispatchable');
    assert.doesNotMatch(triggers, /\bpush:/, 'a push or tag must not start a promotion');
    assert.doesNotMatch(triggers, /\btags:/, 'a tag must not start a promotion');
  });

  it('deploy-env.yml is callable only, so a deploy cannot bypass promotion', () => {
    const triggers = deployEnvYml.slice(
      deployEnvYml.indexOf('\non:'),
      deployEnvYml.indexOf('\nconcurrency:'),
    );
    assert.match(triggers, /workflow_call:/, 'deploy-env.yml must be a reusable workflow');
    assert.doesNotMatch(
      triggers,
      /workflow_dispatch:/,
      'deploy-env.yml must not be dispatchable directly',
    );
    assert.doesNotMatch(triggers, /\bpush:/, 'deploy-env.yml must not run on a push');
  });

  it('the gate sits on apply and not on plan, so an approver sees the plan first', () => {
    const apply = jobBlock(deployEnvYml, 'apply');
    const plan = jobBlock(deployEnvYml, 'plan');
    assert.match(
      apply,
      /^ {4}environment: \$\{\{ inputs\.environment \}\}$/m,
      'the apply job must be gated on the target GitHub Environment',
    );
    assert.doesNotMatch(
      plan,
      /^ {4}environment:/m,
      'the plan job must not be gated, or the plan cannot be read before approving',
    );
  });

  it('plan runs as the planner and apply as the deployer', () => {
    assert.match(
      jobBlock(deployEnvYml, 'plan'),
      /service_account: \$\{\{ steps\.facts\.outputs\.planner_sa \}\}/,
    );
    assert.match(
      jobBlock(deployEnvYml, 'apply'),
      /service_account: \$\{\{ steps\.facts\.outputs\.deployer_sa \}\}/,
    );
  });

  it('every job that deploys checks out the resolved commit, never a branch', () => {
    for (const job of ['plan', 'apply']) {
      const block = jobBlock(deployEnvYml, job);
      assert.match(
        block,
        /ref: \$\{\{ needs\.resolve\.outputs\.deploy_ref \}\}/,
        `the ${job} job must check out the pinned release commit`,
      );
    }
  });

  it('the promotion never rebuilds the image', () => {
    assert.doesNotMatch(
      deployEnvYml,
      /docker build|docker buildx build/,
      'promotion must copy the released digest, not build a new image',
    );
    assert.match(deployEnvYml, /crane copy/, 'promotion must copy the image by digest');
  });

  it('the copied digest is verified against the released one', () => {
    const apply = jobBlock(deployEnvYml, 'apply');
    assert.match(apply, /crane digest/, 'the apply must read the copied digest back');
    assert.match(
      apply,
      /expected \$\{WANT_DIGEST\}/,
      'the apply must fail when the digest changed in transit',
    );
  });

  it('crane is pinned with a checksum rather than fetched loose', () => {
    assert.match(deployEnvYml, /CRANE_VERSION: '[0-9]+\.[0-9]+\.[0-9]+'/);
    assert.match(deployEnvYml, /CRANE_SHA256: '[0-9a-f]{64}'/);
    assert.match(deployEnvYml, /sha256sum -c -/, 'the crane download must be checksum verified');
  });

  it('neither workflow uses pull_request_target, which would defeat the ref pin', () => {
    for (const [name, yaml] of [
      ['promote.yml', promoteYml],
      ['deploy-env.yml', deployEnvYml],
    ] as const) {
      assert.doesNotMatch(yaml, /pull_request_target/, `${name} must not use pull_request_target`);
    }
  });

  it('every environment promote.yml offers has live Terragrunt configuration', () => {
    const options = promoteYml.slice(
      promoteYml.indexOf('options:'),
      promoteYml.indexOf('\nconcurrency:'),
    );
    const envs = [...options.matchAll(/^ {10}- (\S+)$/gm)].map((m) => m[1]);
    assert.ok(envs.length > 0, 'promote.yml must offer at least one environment');
    for (const env of envs) {
      assert.ok(
        fs.existsSync(path.resolve(rootDir, 'infra', 'live', env, 'env.hcl')),
        `promote.yml offers '${env}' but infra/live/${env}/env.hcl does not exist`,
      );
    }
    assert.ok(
      !envs.includes('dev'),
      'dev is deployed by release.yml and must not be a promotion target',
    );
  });

  it('every environment catalog-import.yml offers has live Terragrunt configuration', () => {
    const options = catalogImportYml.slice(
      catalogImportYml.indexOf('options:'),
      catalogImportYml.indexOf('\npermissions:'),
    );
    const envs = [...options.matchAll(/^ {10}- (\S+)$/gm)].map((m) => m[1]);
    assert.ok(envs.length > 0, 'catalog-import.yml must offer at least one environment');
    for (const env of envs) {
      assert.ok(
        fs.existsSync(path.resolve(rootDir, 'infra', 'live', env, 'env.hcl')),
        `catalog-import.yml offers '${env}' but infra/live/${env}/env.hcl does not exist`,
      );
    }
    assert.match(
      catalogImportYml,
      /confirm must be the literal string 'import'/,
      'the confirmation guard must stay',
    );
  });

  it('the catalog import is gated by the environment it imports into', () => {
    // The import replaces catalog contents. The ref pin on the catalog identity
    // restricts which workflow code may run, not who may run it, so without
    // this a prd import would need no approval at all.
    assert.match(
      jobBlock(catalogImportYml, 'import'),
      /^ {4}environment: \$\{\{ inputs\.environment \}\}$/m,
      'the import job must declare the target environment so its reviewers apply',
    );
  });

  it('the pull request plan is credentialed for dev only', () => {
    // A plan executes the pull request's own Terragrunt configuration, and
    // Terragrunt runs commands at parse time through run_cmd, so whichever
    // environment this plans hands its planner credentials and its state to
    // unreviewed code. This is the security decision the dev-only plan rests
    // on; it lived only in prose, so nothing stopped it being undone.
    const liveDir = path.resolve(rootDir, 'infra', 'live');
    const nonDev = fs
      .readdirSync(liveDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && fs.existsSync(path.join(liveDir, e.name, 'env.hcl')))
      .map((e) => e.name)
      .filter((e) => e !== 'dev');
    assert.ok(nonDev.length > 0, 'expected at least one non-dev environment to guard against');

    assert.doesNotMatch(
      infraPlanYml,
      /strategy:|matrix:/,
      'infra-plan.yml must not fan out over environments; a credentialed plan runs unreviewed pull request code',
    );
    for (const env of nonDev) {
      assert.doesNotMatch(
        infraPlanYml,
        new RegExp(`infra/live/${env}\\b|ENVIRONMENT: ${env}\\b`),
        `infra-plan.yml must not plan '${env}': a pull request plan would run unreviewed code as that environment's planner`,
      );
    }
    assert.match(
      infraPlanYml,
      /^ {6}ENVIRONMENT: dev$/m,
      'infra-plan.yml must plan dev explicitly',
    );
  });

  it('the catalog import checks its confirmation before the approval, not after', () => {
    // The gate covers a whole job, so a confirmation check inside the gated job
    // would make a typo cost a production approval.
    assert.match(
      jobBlock(catalogImportYml, 'check'),
      /confirm must be the literal string 'import'/,
      'the confirmation must be checked in its own ungated job',
    );
    const importJob = jobBlock(catalogImportYml, 'import');
    assert.match(
      importJob,
      /^ {4}needs: check$/m,
      'the gated import job must depend on the confirmation check',
    );
    assert.doesNotMatch(
      importJob,
      /confirm must be the literal string/,
      'the confirmation must not be re-checked inside the gated job',
    );
  });

  it('the deploy checks the branch itself, not only through its caller', () => {
    // deploy-env.yml is a reusable workflow, so another caller would not
    // inherit promote.yml's guard. It matters more than it looks: a gated
    // environment's deployer is bound to an environment subject, and GitHub's
    // subject carries one context segment, so an environment-scoped sub has no
    // ref component and IAM is not checking the branch at all. GitHub's
    // deployment branch policy is, and that lives in repository settings a pull
    // request cannot edit. This is the in-repo half of that constraint.
    const resolve = jobBlock(deployEnvYml, 'resolve');
    assert.match(
      resolve,
      /DEPLOY_BRANCH: main/,
      'resolve must carry the branch the bindings expect',
    );
    assert.match(resolve, /REF: \$\{\{ github\.ref \}\}/, 'resolve must read the running ref');
    assert.match(
      resolve,
      /if \[ "\$REF" != "refs\/heads\/\$\{DEPLOY_BRANCH\}" \]; then[\s\S]{0,300}?exit 1/,
      'resolve must refuse a deploy running from any other ref',
    );
  });

  it('the promotion tag is only written for a commit that could be deployed', () => {
    // The tag job pushes with contents: write. The tag namespace is
    // unprotected, so a release tag can point at an unmerged commit; checking
    // ancestry only in the deploy would leave a provenance tag behind for
    // something that was then refused.
    const tag = jobBlock(promoteYml, 'tag');
    const ancestorAt = tag.indexOf('merge-base --is-ancestor');
    const tagAt = tag.indexOf('git tag -a');
    assert.ok(ancestorAt !== -1, 'the tag job must check the commit is on main');
    assert.ok(tagAt !== -1, 'the tag job must create the promotion tag');
    assert.ok(ancestorAt < tagAt, 'the ancestry check must run before the tag is written');
    // And the deploy must keep its own check: the tag could be moved after.
    assert.match(
      jobBlock(deployEnvYml, 'resolve'),
      /merge-base --is-ancestor/,
      'the deploy must re-check ancestry, since the tag could move between the two',
    );
  });

  it('every workflow that can spend an approval refuses a non-main dispatch first', () => {
    // The Workload Identity ref pin is the control, but it is checked at the
    // token exchange, which happens inside the gated job. Without an early
    // guard a dispatch from a branch waits on reviewers and fails only after
    // somebody has approved a run that could never have succeeded.
    for (const [name, yaml, job] of [
      ['promote.yml', promoteYml, 'tag'],
      ['catalog-import.yml', catalogImportYml, 'check'],
    ] as const) {
      const block = jobBlock(yaml, job);
      assert.match(
        block,
        /DEPLOY_REF: refs\/heads\/main/,
        `${name}'s '${job}' job must carry the literal ref the Workload Identity bindings use`,
      );
      assert.match(
        block,
        /if \[ "\$REF" != "\$DEPLOY_REF" \]; then[\s\S]{0,400}?exit 1/,
        `${name}'s '${job}' job must refuse a dispatch from any other ref`,
      );
      // The guard is useless after the thing it guards, so it must be first.
      const guardAt = block.indexOf('DEPLOY_REF: refs/heads/main');
      const checkoutAt = block.indexOf('actions/checkout@');
      if (checkoutAt !== -1) {
        assert.ok(guardAt < checkoutAt, `${name}'s guard must run before the checkout`);
      }
    }
  });

  it("nothing resolves the deploy ref from GitHub's default branch", () => {
    // Asking GitHub for the default branch diverges from the refs/heads/main
    // the bindings actually trust: a rename would let a guard pass and the run
    // would fail at the token exchange, after cutting a tag and spending an
    // approval.
    for (const [name, yaml] of [
      ['promote.yml', promoteYml],
      ['deploy-env.yml', deployEnvYml],
      ['catalog-import.yml', catalogImportYml],
    ] as const) {
      assert.doesNotMatch(
        yaml,
        /repository\.default_branch/,
        `${name} must use the literal ref the Workload Identity bindings carry, not GitHub's reported default branch`,
      );
    }
  });

  it('the apply refuses a pinned rollback nobody acknowledged', () => {
    // The saved plan does not protect against this. OpenTofu's stale check
    // compares the plan's prior state against the backend state, so a hand-made
    // change never moves the serial and the plan applies cleanly, sending
    // traffic = LATEST and reverting the pin. The traffic pin is the one
    // hand-made change that can be detected reliably, and the one
    // docs/promotion.md tells people to make, so it fails closed.
    const apply = jobBlock(deployEnvYml, 'apply');
    const check = stepBlock(apply, 'Check what this apply will overwrite');
    const applyAt = apply.indexOf('Apply the approved plan');
    const checkAt = apply.indexOf('Check what this apply will overwrite');
    assert.ok(
      checkAt !== -1 && applyAt !== -1,
      'the apply job must check the live service, then apply',
    );
    assert.ok(checkAt < applyAt, 'the check must come before the apply');

    assert.match(check, /status\.traffic/, 'the check must read the live traffic split');
    assert.match(
      check,
      /if \[ "\$ACKNOWLEDGED" != "true" \]; then[\s\S]{0,600}?exit 1/,
      'a pin must refuse unless the promotion acknowledged it',
    );
    // A service that genuinely does not exist is a first deploy and proceeds.
    // A read that merely fails must not be mistaken for that: it would proceed
    // to overwrite a split it could not read. Detailed coverage of both is in
    // tests/plan_guard.test.ts, which runs the workflow's own jq condition.
    assert.match(
      check,
      /does not exist yet[\s\S]{0,200}?exit 0/,
      'a genuinely absent service must proceed as a first deploy',
    );
    assert.match(
      check,
      /if \[ "\$exists" != yes \]; then[\s\S]{0,900}?exit 1/,
      'a service that cannot be reached must refuse rather than be assumed absent',
    );
    assert.doesNotMatch(
      check,
      /continue-on-error/,
      'the check is a gate, so it must be able to fail the job',
    );
  });

  it('a pinned rollback can be promoted out of deliberately', () => {
    // Refusing unconditionally would block the promotion that ends an incident,
    // which is the one time a pin exists.
    for (const [name, yaml] of [
      ['promote.yml', promoteYml],
      ['deploy-env.yml', deployEnvYml],
    ] as const) {
      assert.match(
        yaml,
        /acknowledge_traffic_pin:/,
        `${name} must offer a way to say that returning traffic is intended`,
      );
    }
    assert.match(
      promoteYml,
      /acknowledge_traffic_pin: \$\{\{ inputs\.acknowledge_traffic_pin \}\}/,
      'promote.yml must pass the acknowledgement through to the deploy',
    );
  });

  it('the appliable stack is declared once', () => {
    // It is read by the plan job's guard and by the apply's working directory.
    // Two copies could drift into comparing one stack while applying another.
    assert.match(
      deployEnvYml,
      /^ {2}APPLIABLE: \S+$/m,
      'APPLIABLE must be declared at workflow level',
    );
    assert.equal(
      [...deployEnvYml.matchAll(/^\s*APPLIABLE: /gm)].length,
      1,
      'APPLIABLE must be declared exactly once',
    );
    assert.match(
      jobBlock(deployEnvYml, 'apply'),
      /--working-dir "infra\/live\/\$\{ENVIRONMENT\}\/\$\{APPLIABLE\}"/,
      'the apply must use APPLIABLE rather than spelling the stack path again',
    );
  });

  it('shows the approver the saved plan, not only the whole-environment one', () => {
    // plan.txt and the saved plan are two separate computations: the first is
    // the whole environment, run earlier in the job for the unexpected-stack
    // guard. The checksum proves the saved file was not altered after it was
    // written, not that it matches what was displayed, so the saved plan has to
    // be the thing on screen.
    const plan = jobBlock(deployEnvYml, 'plan');
    assert.match(plan, /terragrunt show/, 'the plan job must render the saved plan');
    assert.match(
      plan,
      /The plan this deploy will apply[\s\S]{0,400}?GITHUB_STEP_SUMMARY/,
      'the rendered saved plan must reach the run summary an approver reads',
    );
    const readable = stepBlock(plan, 'Attach the plan to read');
    assert.match(
      readable,
      /appliable\.txt/,
      'the rendered saved plan must be attached for audit too',
    );
    assert.doesNotMatch(
      readable,
      /\.tfplan/,
      'the binary plan must stay out of the long-retention artifact',
    );
  });

  it('applies the plan that was approved, not a freshly computed one', () => {
    // The approval wait is unbounded. Recomputing the plan after it means
    // anything that changed the service in the meantime is applied unreviewed.
    // A saved plan makes OpenTofu refuse when the state has moved.
    const plan = jobBlock(deployEnvYml, 'plan');
    const apply = jobBlock(deployEnvYml, 'apply');

    assert.match(plan, /-out="\$PLAN_FILE"/, 'the plan job must save the plan it publishes');
    assert.match(
      plan,
      /sha256sum "\$PLAN_FILE"/,
      "the plan job must record the saved plan's checksum",
    );
    assert.match(
      deployEnvYml,
      /^ {6}plan_sha256: \$\{\{ steps\.saved\.outputs\.sha256 \}\}$/m,
      'the checksum must be a job output the apply can read',
    );

    assert.match(apply, /actions\/download-artifact@/, 'the apply must fetch the saved plan');
    assert.match(
      apply,
      /if \[ "\$got" != "\$WANT_SHA" \]; then[\s\S]{0,300}?exit 1/,
      'the apply must refuse a plan file whose checksum does not match',
    );
    assert.match(
      apply,
      /terragrunt apply[\s\S]{0,300}?appliable\.tfplan/,
      'the apply must execute the saved plan file',
    );
    assert.doesNotMatch(
      apply,
      /-auto-approve/,
      'applying a saved plan needs no -auto-approve, and must not compute a new one',
    );
    assert.match(
      apply,
      /Saved plan is stale/,
      "the apply should explain OpenTofu's stale-plan refusal rather than leaving a bare error",
    );
  });

  it('the binary plan is kept apart from the readable one and not kept long', () => {
    // A binary plan carries the unit's full prior state, and anything a
    // provider marks sensitive is in it in the clear. It exists only to hand
    // the approved plan across the gate inside one run, so it must not ride
    // along in the thirty-day audit artifact that anyone with repo read access
    // can download.
    const plan = jobBlock(deployEnvYml, 'plan');
    const readable = stepBlock(plan, 'Attach the plan to read');
    const handover = stepBlock(plan, 'Hand the approved plan to the apply');

    assert.match(readable, /^\s+plan\.txt$/m, 'the audit artifact must hold the readable plan');
    assert.doesNotMatch(readable, /\.tfplan/, 'the binary plan must not be in the audit artifact');

    assert.match(
      handover,
      /path: appliable\.tfplan/,
      'the handover artifact must hold the binary plan',
    );
    const retention = handover.match(/retention-days: (\d+)/);
    assert.ok(retention, 'the handover artifact must set an explicit retention');
    assert.ok(
      Number(retention[1]) <= 1,
      `the binary plan must not be retained longer than the run needs, got ${retention[1]} days`,
    );
    assert.notEqual(
      readable.match(/name: (\S+)/)?.[1],
      handover.match(/name: (\S+)/)?.[1],
      'the two artifacts must be separate, or retention cannot differ',
    );
  });

  it('the Cloud Run module carries no secret material into the plan', () => {
    // The handover artifact is only safe to treat as non-secret while this
    // holds. If the module gains Secret Manager env or volumes, the binary plan
    // starts carrying them and deploy-env.yml's handling has to be revisited.
    const moduleDir = path.resolve(rootDir, 'infra', 'modules', 'cloud-run-service');
    for (const file of ['main.tf', 'variables.tf']) {
      const body = fs.readFileSync(path.join(moduleDir, file), 'utf8');
      assert.doesNotMatch(
        body,
        /value_source|secret_key_ref|secretKeyRef|google_secret_manager/i,
        `${file} introduces secret material, which would be carried in the binary plan handed across the approval gate in .github/workflows/deploy-env.yml; encrypt or otherwise protect that artifact before adding this`,
      );
    }
  });

  it('the apply re-checks the source digest after the approval wait', () => {
    // The gate makes the wait unbounded and the source tag is mutable, so the
    // apply must prove the image is still the one that was planned.
    const apply = jobBlock(deployEnvYml, 'apply');

    // Assert the mechanism, not the wording: a prose match would still pass if
    // the comparison were commented out.
    assert.match(
      apply,
      /\bnow="\$\(crane digest "\$\{SOURCE_REPO\}:\$\{VERSION\}"\)"/,
      'the apply must re-resolve the source tag itself',
    );
    assert.match(
      apply,
      /if \[ "\$now" != "\$WANT_DIGEST" \]; then[\s\S]{0,400}?exit 1/,
      'the apply must compare the re-resolved digest against the planned one and exit non-zero',
    );
    // And the copy must take the digest, never the mutable tag.
    assert.match(
      apply,
      /crane copy "\$\{SOURCE_REPO\}@\$\{WANT_DIGEST\}"/,
      'the copy source must be digest-addressed',
    );
  });

  it('no workflow hardcodes a project id, project number or service account address', () => {
    const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.yml'));
    const offenders: string[] = [];
    for (const file of files) {
      // release.yml deploys dev and predates env-facts.sh; it is listed here so
      // that adding a new hardcoded reference elsewhere fails this test.
      if (file === 'release.yml') continue;
      const body = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
      for (const re of [
        /onx-(?:dev|prod)-int-shop-demo-[a-z0-9]+/,
        /\b\d{12}\b/,
        /gecx-shop-[a-z]+@/,
      ]) {
        const m = body.match(re);
        if (m) offenders.push(`${file}: ${m[0]}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `workflows must read these from infra/scripts/env-facts.sh: ${offenders.join(', ')}`,
    );
  });

  it('every environment under infra/live can be described by env-facts.sh', () => {
    const liveDir = path.resolve(rootDir, 'infra', 'live');
    const envs = fs
      .readdirSync(liveDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && fs.existsSync(path.join(liveDir, e.name, 'env.hcl')))
      .map((e) => e.name);
    assert.ok(envs.length >= 2, `expected dev and prd under infra/live, found: ${envs.join(', ')}`);

    for (const env of envs) {
      const out = execSync(`infra/scripts/env-facts.sh ${env}`, { cwd: rootDir, encoding: 'utf8' });
      const facts = Object.fromEntries(
        out
          .trim()
          .split('\n')
          .map((line) => {
            const i = line.indexOf('=');
            return [line.slice(0, i), line.slice(i + 1)];
          }),
      );
      for (const key of [
        'project_id',
        'project_number',
        'region',
        'wif_provider',
        'deployer_sa',
        'image_repo',
      ]) {
        assert.ok(facts[key], `env-facts.sh ${env} did not report ${key}`);
      }
      assert.match(facts.project_number, /^[0-9]+$/, `${env}: project_number must be numeric`);
      assert.ok(
        facts.deployer_sa.endsWith(`@${facts.project_id}.iam.gserviceaccount.com`),
        `${env}: the deployer must live in that environment's own project`,
      );
      assert.ok(
        facts.image_repo.startsWith(`${facts.region}-docker.pkg.dev/${facts.project_id}/`),
        `${env}: the image repository must be in that environment's own project`,
      );
    }
  });

  it('every registry reader is a real service account of some environment', () => {
    // env_inputs.registry_readers is written out by hand, so a typo in a project
    // id or a renamed account would only show up when an apply failed on a
    // nonexistent service account. Tie the literals to what env-facts.sh
    // derives from each environment's own env.hcl.
    const known = new Set<string>();
    for (const env of environments()) {
      const f = facts(env);
      for (const key of ['deployer_sa', 'planner_sa', 'catalog_sa']) {
        if (f[key]) known.add(f[key]);
      }
    }
    assert.ok(known.size >= 6, `expected at least two environments' accounts, got ${known.size}`);

    let checked = 0;
    for (const env of environments()) {
      const block = liveHcl(env).match(/^\s*registry_readers\s*=\s*\[([\s\S]*?)\]/m);
      assert.ok(block, `infra/live/${env}/env.hcl must declare registry_readers, even if empty`);
      for (const m of block[1].matchAll(/"serviceAccount:([^"]+)"/g)) {
        assert.ok(
          known.has(m[1]),
          `infra/live/${env}/env.hcl grants registry read to '${m[1]}', which is not a service account of any environment under infra/live`,
        );
        checked++;
      }
    }
    assert.ok(checked > 0, 'expected at least one registry reader grant to verify');
  });

  it('every promotable environment can read the registry it promotes from', () => {
    // The other direction, and the one that costs an approval: if a promotable
    // environment's deployer and planner are missing from the source
    // environment's registry_readers, the promotion fails partway through,
    // after a reviewer has approved it. Bring-up step 6 exists to prevent that;
    // this makes forgetting it a red pull request instead.
    const sourceEnv =
      deployEnvYml.match(/source_environment:[\s\S]*?default: (\S+)/)?.[1] ??
      assert.fail('deploy-env.yml must declare a default source_environment');

    const granted = new Set(
      [...liveHcl(sourceEnv).matchAll(/"serviceAccount:([^"]+)"/g)].map((m) => m[1]),
    );

    const promotable = promotableEnvironments();
    assert.ok(promotable.length > 0, 'promote.yml must offer at least one environment');
    for (const env of promotable) {
      const f = facts(env);
      for (const key of ['deployer_sa', 'planner_sa']) {
        assert.ok(
          granted.has(f[key]),
          `promoting to '${env}' copies an image out of '${sourceEnv}', but ${f[key]} is not in infra/live/${sourceEnv}/env.hcl env_inputs.registry_readers; the promotion would fail after approval`,
        );
      }
    }
  });

  it('the identities table does not claim a bare ref pin while an environment is gated', () => {
    // A security table gets skimmed, so a stale "Impersonable from
    // refs/heads/main" is read as "IAM enforces the branch", which is not true
    // for a gated environment. Once any environment sets gated_environment, no
    // row may claim a bare ref.
    const gated = environments().filter((e) => {
      const m = liveHcl(e).match(/^\s*gated_environment\s*=\s*(.+)$/m);
      return m && m[1].trim() !== 'null';
    });
    if (gated.length === 0) return;

    const readme = fs.readFileSync(path.resolve(rootDir, 'infra', 'README.md'), 'utf8');
    const rows = readme.split('\n').filter((l) => /^\| `gecx-shop-/.test(l));
    assert.ok(rows.length >= 4, `expected the accounts table, found ${rows.length} rows`);

    for (const row of rows) {
      const cells = row.split('|').map((c) => c.trim());
      const impersonableFrom = cells[cells.length - 2];
      assert.notEqual(
        impersonableFrom,
        '`refs/heads/main`',
        `the accounts table row ${cells[1]} says it is impersonable from refs/heads/main with no qualification, but ${gated.join(' and ')} is gated and binds by environment instead, where IAM does not check the branch`,
      );
    }
  });

  it('every promotable environment binds its deployer to the gate, not to a branch', () => {
    // A branch pin cannot express "an approval was given": every job on main
    // satisfies it, so any workflow on main could mint the credentials without
    // the gate being spent. The environment binding is what makes the approval
    // a control rather than a repository setting.
    for (const env of promotableEnvironments()) {
      const hcl = liveHcl(env);
      const m = hcl.match(/^\s*gated_environment\s*=\s*(.+)$/m);
      assert.ok(m, `infra/live/${env}/env.hcl must set gated_environment explicitly`);
      assert.equal(
        m[1].trim(),
        `"${env}"`,
        `infra/live/${env}/env.hcl must gate on its own name: deploy-env.yml uses one input for the directory and the environment, and the binding is built from this`,
      );
    }

    // The environment planned on pull requests must not be gated this way: its
    // deploy declares no environment, so the binding would never match.
    const planned = planOnPullRequestEnvironment();
    const plannedHcl = liveHcl(planned);
    const pm = plannedHcl.match(/^\s*gated_environment\s*=\s*(.+)$/m);
    assert.ok(pm, `infra/live/${planned}/env.hcl must set gated_environment explicitly`);
    assert.equal(
      pm[1].trim(),
      'null',
      `'${planned}' deploys without an approval, so it cannot be gate-bound`,
    );
  });

  it('the environment binding uses the subject prefix GitHub actually issues', () => {
    // With immutable subject claims on, the prefix carries numeric owner and
    // repository ids. The plain repo:<owner>/<repo> form would never match and
    // every gated deploy would fail at the token exchange, so this is read from
    // GitHub rather than composed.
    const envcommon = fs.readFileSync(
      path.resolve(rootDir, 'infra', 'live', '_envcommon', 'wif-github.hcl'),
      'utf8',
    );
    const m = envcommon.match(/^\s*subject_prefix\s*=\s*"([^"]+)"/m);
    assert.ok(m, '_envcommon/wif-github.hcl must set subject_prefix for the environment binding');
    assert.match(
      m[1],
      /^repo:[^/:]+@\d+\/[^/:]+@\d+$/,
      `subject_prefix '${m[1]}' is not the immutable form this repository issues; check gh api repos/<owner>/<repo>/actions/oidc/customization/sub`,
    );
    assert.doesNotMatch(
      m[1],
      /:environment:/,
      'the prefix must not already carry an environment; the module appends it',
    );
  });

  it('only the environment planned on pull requests may have a repository-wide planner', () => {
    // planner_ref is now the control that keeps prd out of reach of a pull
    // request, replacing a convention that had a test. Setting it back to null
    // passes fmt, lint, hcl validate and every other test here while silently
    // making that environment's planner impersonable from any branch.
    const planned = planOnPullRequestEnvironment();
    for (const env of environments()) {
      const m = liveHcl(env).match(/^\s*planner_ref\s*=\s*(.+)$/m);
      assert.ok(m, `infra/live/${env}/env.hcl must set planner_ref explicitly`);
      const value = m[1].trim();
      if (env === planned) {
        assert.equal(
          value,
          'null',
          `infra-plan.yml plans '${env}' on pull requests, which needs a repository-wide planner`,
        );
      } else {
        assert.match(
          value,
          /^"refs\/heads\/\S+"$/,
          `infra/live/${env}/env.hcl must pin planner_ref: '${env}' is not planned on pull requests, so a repository-wide planner would let anyone who can push a branch reach it`,
        );
      }
    }
  });

  it('all shell scripts under infra/scripts pass bash -n', () => {
    const dirs = [
      path.resolve(rootDir, 'infra', 'scripts'),
      path.resolve(rootDir, 'infra', 'scripts', 'tests'),
    ];
    let checked = 0;
    for (const dir of dirs) {
      for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sh'))) {
        const full = path.join(dir, file);
        assert.doesNotThrow(
          () => execSync(`bash -n "${full}"`, { stdio: 'pipe' }),
          `bash -n failed on ${file}`,
        );
        assert.ok((fs.statSync(full).mode & 0o111) !== 0, `${file} must be executable`);
        checked++;
      }
    }
    assert.ok(
      checked >= 2,
      `expected to check at least the bootstrap and env-facts scripts, checked ${checked}`,
    );
  });
});
