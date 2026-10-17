// Run files serially with fresh, owned servers and separate failure artifacts for each file.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'node_modules/@playwright/test/cli.js');
const files = fs.readdirSync(path.join(root, 'e2e')).filter((f) => f.endsWith('.spec.ts')).sort();

async function assertPortsClosed() {
  for (const port of [5000, 5101, 5102, 5103, 5104, 5173]) {
    const open = await new Promise((resolve) => {
      const socket = net.connect({ host: '127.0.0.1', port });
      const finish = (value) => { socket.destroy(); resolve(value); };
      socket.once('connect', () => finish(true));
      socket.once('error', () => finish(false));
      socket.setTimeout(1_000, () => finish(false));
    });
    if (open) throw new Error(`Port ${port} is still in use; stop its server before continuing.`);
  }
}

const failures = [];
await assertPortsClosed();
for (const file of files) {
  const name = file.replace('.spec.ts', '');
  console.log(`\nRunning ${file} (one worker, fresh backend + Vite)`);
  const result = spawnSync(process.execPath,
    [cli, 'test', `e2e/${file}`, ...process.argv.slice(2), '--workers=1', '--output', `test-results/${name}`], {
      cwd: root, stdio: 'inherit', shell: false,
      env: { ...process.env, PLAYWRIGHT_HTML_OUTPUT_DIR: `playwright-report/${name}` },
    });
  if (result.error) throw result.error;
  if (result.status !== 0) failures.push(file);
  await assertPortsClosed();
}
console.log(`\n${files.length} files run; ${failures.length} failed${failures.length ? `: ${failures.join(', ')}` : ''}. Server ports are closed.`);
process.exitCode = failures.length ? 1 : 0;
