import { spawn, type ChildProcess } from 'node:child_process';
import type { Page } from '@playwright/test';
import { BACKEND_DIR, BACKEND_PYTHON, testBackendEnv } from './env';

// A second backend with TEST_DATE_OFFSET on the same database, so one page can play
// today against :5000 and then "tomorrow" against this one.
export class OffsetBackend {
  private proc: ChildProcess | null = null;
  readonly port: number;
  readonly offset: number;

  constructor(offset: number, port = 5000 + offset + 100) {
    this.offset = offset;
    this.port = port;
  }

  get origin() {
    return `http://127.0.0.1:${this.port}`;
  }

  async start(): Promise<void> {
    this.proc = spawn(
      BACKEND_PYTHON,
      ['-m', 'flask', '--app', 'app', 'run', '--port', String(this.port), '--no-reload'],
      {
        cwd: BACKEND_DIR,
        env: { ...process.env, ...testBackendEnv({ TEST_DATE_OFFSET: String(this.offset) }) },
        stdio: 'ignore',
        shell: process.platform === 'win32',
      },
    );
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${this.origin}/api/gamemodes-count`);
        if (res.ok) return;
      } catch {
        // not up yet
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`offset backend on :${this.port} did not start`);
  }

  async stop(): Promise<void> {
    if (!this.proc?.pid) return;
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(this.proc.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      this.proc.kill('SIGTERM');
    }
    this.proc = null;
  }

  async attach(page: Page): Promise<void> {
    await page.route('**/api/**', (route) => {
      const url = new URL(route.request().url());
      // fallback() keeps the context route that adds the test client IP.
      route.fallback({ url: `${this.origin}${url.pathname}${url.search}` });
    });
  }
}
