import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Vitest transforms proxy.mjs before running it, which hides errors that plain
// Node rejects at load time. A duplicate export passed every suite here and
// still kept the container from starting on Cloud Run. Import the file in a
// plain Node process instead, so parse errors, unresolved imports and missing
// named exports all fail here. NODE_ENV=test stops it binding a port.
describe('server/proxy.mjs under plain node', () => {
  it('loads', () => {
    const url = pathToFileURL(path.resolve(__dirname, '../../server/proxy.mjs')).href;
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', `await import(${JSON.stringify(url)})`],
      { encoding: 'utf-8', env: { ...process.env, NODE_ENV: 'test' }, timeout: 20_000 },
    );
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr ?? '').toBe(0);
  });
});
