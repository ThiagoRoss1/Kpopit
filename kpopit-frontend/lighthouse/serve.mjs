// lhci starts one command, so this runs both the test backend and vite preview, whose proxy
// forwards /api to :5000.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startBackend, stopProcess, waitFor } from './backend.mjs';

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const win = process.platform === 'win32';

const children = [];
function stopAll() {
  for (const c of children) stopProcess(c);
}
process.on('SIGINT', () => { stopAll(); process.exit(0); });
process.on('SIGTERM', () => { stopAll(); process.exit(0); });
process.on('exit', stopAll);

children.push(await startBackend());
children.push(spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', shell: win }));
await waitFor('http://localhost:4173/api/gamemodes-count');
console.log('LIGHTHOUSE_SERVER_READY');
setInterval(() => {}, 1 << 30);
