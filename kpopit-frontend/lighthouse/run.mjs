// Builds with the API base on the local preview so the build never calls production,
// then runs mobile and desktop separately (one lighthouserc can't hold both presets).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeDir, toMarkdown } from './summarize.mjs';
import { startBackend, stopProcess } from './backend.mjs';

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, env = {}) =>
  execSync(cmd, { cwd: FRONTEND, stdio: 'inherit', env: { ...process.env, ...env } });

// The build prerenders from the test backend; lhci then starts its own (serve.mjs).
const backend = await startBackend();
try {
  run('npm run build', { VITE_API_URL: 'http://localhost:4173', VITE_COLLECTION_ENABLED: 'true' });
} finally {
  stopProcess(backend);
}
await new Promise((r) => setTimeout(r, 2_000)); // let :5000 close before serve.mjs reopens it

const rows = [];
for (const device of ['mobile', 'desktop']) {
  const out = path.join(FRONTEND, '.lighthouseci', device);
  fs.rmSync(out, { recursive: true, force: true }); // previous run's reports
  const preset = device === 'desktop' ? ' --settings.preset=desktop' : '';
  run(`npx lhci collect --config=lighthouserc.cjs${preset}`);
  run('npx lhci assert --config=lighthouserc.cjs');
  run(`npx lhci upload --config=lighthouserc.cjs --outputDir=${JSON.stringify(path.join(out, 'reports'))}`);
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(path.join(FRONTEND, '.lighthouseci'))) {
    if (/^lhr-.*\.(json|html)$/.test(f)) fs.renameSync(path.join(FRONTEND, '.lighthouseci', f), path.join(out, f));
  }
  rows.push(...summarizeDir(out));
}
console.log(`\n${toMarkdown(rows)}`);
