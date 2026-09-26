import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting Onix Apparel Full Stack Development Environment...');
console.log('   1. Vertex AI Commerce Search Proxy (Port 3001)');
console.log('   2. Vite React Frontend (Port 5173)');
console.log('------------------------------------------------------------\n');

// 1. Start Vertex AI Proxy Server
const proxy = spawn(process.execPath, [path.resolve(rootDir, 'server/proxy.mjs')], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env
});

// 2. Start Vite Frontend
const viteBin = path.resolve(rootDir, 'node_modules/.bin/vite');
const vite = spawn(viteBin, ['--host', '--port', '5173'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env
});

function cleanup() {
  console.log('\n🛑 Shutting down Onix Apparel dev processes...');
  try { proxy.kill('SIGTERM'); } catch {}
  try { vite.kill('SIGTERM'); } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
proxy.on('exit', (code) => {
  if (code !== 0 && code !== null) console.error(`Proxy exited with code ${code}`);
});
vite.on('exit', (code) => {
  if (code !== 0 && code !== null) console.error(`Vite exited with code ${code}`);
});
