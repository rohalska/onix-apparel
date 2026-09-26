import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const testDir = path.resolve('tests');
const distDir = path.resolve('.test-dist');

const testFiles = fs.readdirSync(testDir)
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => path.join(testDir, f));

fs.mkdirSync(distDir, { recursive: true });

try {
  await esbuild.build({
    entryPoints: testFiles,
    outdir: distDir,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    packages: 'external',
  });

  const distFiles = fs.readdirSync(distDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(distDir, f));

  const child = spawn(process.execPath, ['--test', ...distFiles], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' }
  });

  child.on('exit', (code) => {
    try {
      fs.rmSync(distDir, { recursive: true, force: true });
    } catch {}
    process.exit(code || 0);
  });
} catch (err) {
  console.error('Test compilation error:', err);
  fs.rmSync(distDir, { recursive: true, force: true });
  process.exit(1);
}
