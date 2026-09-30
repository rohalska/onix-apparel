import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// The Conventional Commits check exists twice: the commit-msg hook in
// lefthook.yml vets every local commit subject, and the pr-title job in
// .github/workflows/ci.yml vets the pull request title, because a squash-merge
// makes that title the subject on main and release automation reads the version
// bump from it.
//
// Both copies are shell, in two different files, and neither can import the
// other. Comments in both say "keep these identical", which is worth exactly
// nothing once someone loosens one of them. So this asserts it instead: if the
// two drift, the suite fails and names the difference. Sharing one file between
// a workflow step and a lefthook command would mean a script, a path and a
// portability question, which is more machinery than the problem is worth.

const HOOK = 'lefthook.yml';
const WORKFLOW = '.github/workflows/ci.yml';

/** The `types='...'` alternation list assigned in a shell snippet. */
function typeList(file: string): string {
  const match = readFileSync(file, 'utf8').match(/^\s*types='([^']*)'/m);
  expect(match, `expected a types='...' assignment in ${file}`).not.toBeNull();
  return match![1];
}

/** The pattern passed to `grep -qE "..."` in a shell snippet. */
function grepPattern(file: string): string {
  const match = readFileSync(file, 'utf8').match(/grep -qE "([^"]*)"/);
  expect(match, `expected a grep -qE "..." call in ${file}`).not.toBeNull();
  return match![1];
}

describe('the Conventional Commits gate agrees across the hook and CI', () => {
  it('uses the same list of commit types in both places', () => {
    expect(typeList(WORKFLOW)).toBe(typeList(HOOK));
  });

  it('uses the same grep pattern in both places', () => {
    expect(grepPattern(WORKFLOW)).toBe(grepPattern(HOOK));
  });

  // Identical patterns that both accept everything would pass the two
  // assertions above, so pin what the shared pattern is for. The `types`
  // placeholder is expanded by the shell at run time; expand it here the same
  // way to get the regex the gate actually applies.
  it('accepts a conventional subject and rejects a bare one', () => {
    const pattern = new RegExp(grepPattern(HOOK).replace('${types}', typeList(HOOK)));

    expect(pattern.test('feat: add fuzzy matching')).toBe(true);
    expect(pattern.test('fix(server): drain oversized bodies')).toBe(true);
    expect(pattern.test('feat!: drop the v1 endpoint')).toBe(true);

    expect(pattern.test('Repo foundation')).toBe(false);
    expect(pattern.test('feat add fuzzy matching')).toBe(false);
    expect(pattern.test('feat:')).toBe(false);
  });
});
