import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Shell Script Quality & GCP Retail Ingestion Invariants', () => {
  const importScriptPath = path.resolve(rootDir, 'scripts', 'importToGcpRetail.sh');

  it('scripts/importToGcpRetail.sh must exist and be executable', () => {
    assert.ok(fs.existsSync(importScriptPath), 'importToGcpRetail.sh must exist');
    const stats = fs.statSync(importScriptPath);
    // On Unix, check executable bit
    assert.ok((stats.mode & 0o111) !== 0, 'importToGcpRetail.sh must be executable');
  });

  it('all shell scripts in scripts/ must pass bash -n syntax check without error', () => {
    const scriptsDir = path.resolve(rootDir, 'scripts');
    const shellFiles = fs.readdirSync(scriptsDir).filter((f) => f.endsWith('.sh'));
    assert.ok(shellFiles.length > 0, 'At least one shell script should exist');

    for (const file of shellFiles) {
      const fullPath = path.join(scriptsDir, file);
      assert.doesNotThrow(() => {
        execSync(`bash -n "${fullPath}"`, { stdio: 'pipe' });
      }, `bash -n failed on ${file}`);
    }
  });

  it('scripts/importToGcpRetail.sh must use a valid Bash conditional and not JavaScript expressions', () => {
    const content = fs.readFileSync(importScriptPath, 'utf-8');

    // Must not contain JavaScript comparison operators in parameter expansions or conditionals
    assert.equal(
      /\$\{[^}]*===/.test(content),
      false,
      'Must not contain JavaScript triple equals in parameter expansions',
    );
    assert.equal(
      content.includes("? 'us-central1' :"),
      false,
      'Must not contain JavaScript ternary operator',
    );

    // Must contain bash conditional for location
    assert.ok(
      content.includes('if [ "${BUCKET_LOCATION}" = "global" ]') ||
        content.includes('if [ "$BUCKET_LOCATION" = "global" ]'),
      'Must contain standard Bash conditional mapping global to us-central1',
    );
  });

  it('scripts/importToGcpRetail.sh must ingest JSONL (.jsonl) catalog format', () => {
    const content = fs.readFileSync(importScriptPath, 'utf-8');

    // Documented Retail import requires JSON Lines
    assert.ok(
      content.includes('vertex-retail-catalog.jsonl'),
      'Must reference vertex-retail-catalog.jsonl',
    );
    assert.equal(
      content.includes('vertex-retail-catalog.json"'),
      false,
      'Must not target vertex-retail-catalog.json array',
    );
  });

  it('scripts/importToGcpRetail.sh must use gcloud storage instead of deprecated gsutil', () => {
    const content = fs.readFileSync(importScriptPath, 'utf-8');

    assert.equal(content.includes('gsutil'), false, 'Must not use deprecated gsutil');
    assert.ok(
      content.includes('gcloud storage buckets describe'),
      'Must use gcloud storage buckets describe',
    );
    assert.ok(
      content.includes('gcloud storage buckets create'),
      'Must use gcloud storage buckets create',
    );
    assert.ok(content.includes('gcloud storage cp'), 'Must use gcloud storage cp');
  });

  it('scripts/importToGcpRetail.sh must use curl --fail-with-body, poll operation, and enforce a timeout limit', () => {
    const content = fs.readFileSync(importScriptPath, 'utf-8');

    // Must use --fail-with-body
    assert.ok(content.includes('--fail-with-body'), 'Must use curl --fail-with-body');

    // Must poll the returned operation instead of unconditional success
    assert.ok(content.includes('OPERATION_NAME'), 'Must extract operation name');
    assert.ok(content.includes('POLL_TIMEOUT_SECS'), 'Must define POLL_TIMEOUT_SECS');
    assert.ok(content.includes('ELAPSED'), 'Must track elapsed polling time');
    assert.ok(content.includes('IS_DONE'), 'Must verify operation done state');
    assert.ok(content.includes('HAS_ERROR'), 'Must check for error before declaring success');
    assert.ok(content.includes('timed out after'), 'Must report timeout error if limit exceeded');
  });

  it('CI configurations must include shell script syntax check', () => {
    const cbPath = path.resolve(rootDir, 'cloudbuild.yaml');
    const cbContent = fs.readFileSync(cbPath, 'utf-8');
    assert.ok(cbContent.includes('bash -n'), 'cloudbuild.yaml must include bash -n syntax check');

    const ghPath = path.resolve(rootDir, '.github', 'workflows', 'ci.yml');
    assert.ok(fs.existsSync(ghPath), '.github/workflows/ci.yml must exist');
    const ghContent = fs.readFileSync(ghPath, 'utf-8');
    // Assert both halves of the contract, not a substring that a comment could
    // satisfy: CI invokes `make check`, and the Makefile's check target depends on
    // a shell-lint target. ShellCheck supersedes `bash -n` -- it reports everything
    // bash -n does and more -- so the tool is deliberately not asserted here.
    assert.match(ghContent, /run:\s*make check/, 'ci.yml must invoke make check');
    const mkContent = fs.readFileSync(path.resolve(rootDir, 'Makefile'), 'utf-8');
    assert.match(
      mkContent,
      /^check:[^\n]*\blint-shell\b/m,
      "the Makefile's check target must depend on lint-shell",
    );
    assert.match(mkContent, /^lint-shell:/m, 'the Makefile must define lint-shell');
  });
});
