import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import { BACKEND_DIR, BACKEND_PYTHON, testBackendEnv } from './env';

export function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const finish = (open: boolean) => { socket.destroy(); resolve(open); };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(1_000, () => finish(false));
  });
}

// Direct children only: no shell/reloader means stop() owns and waits for the actual server.
export class LocalServer {
  private proc: ChildProcess | null = null;

  constructor(readonly port: number, private command: string, private args: string[],
    private cwd: string, private env: Record<string, string | undefined>, private healthPath = '/') {}

  protected childEnv() { return this.env; }

  async start(): Promise<void> {
    if (this.proc || await portOpen(this.port)) throw new Error(`refusing to reuse a server on :${this.port}`);
    const proc = spawn(this.command, this.args, { cwd: this.cwd, env: this.childEnv(), stdio: 'ignore', shell: false });
    this.proc = proc;
    let startError: Error | null = null;
    proc.once('error', (error) => { startError = error; });
    const deadline = Date.now() + 60_000;
    try {
      while (Date.now() < deadline) {
        if (startError) throw startError;
        if (proc.exitCode !== null || proc.signalCode !== null) throw new Error(`server on :${this.port} exited before readiness`);
        try {
          const res = await fetch(`http://127.0.0.1:${this.port}${this.healthPath}`, { signal: AbortSignal.timeout(1_000) });
          if (res.ok) return;
        } catch { /* not ready yet */ }
        await new Promise((r) => setTimeout(r, 250));
      }
      throw new Error(`server on :${this.port} did not start`);
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    const proc = this.proc;
    if (!proc) return;
    if (proc.pid && proc.exitCode === null && proc.signalCode === null) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`server on :${this.port} did not stop`)), 15_000);
        proc.once('exit', () => { clearTimeout(timer); resolve(); });
        if (!proc.kill('SIGTERM')) { clearTimeout(timer); reject(new Error(`could not stop :${this.port}`)); }
      });
    }
    this.proc = null;
    const deadline = Date.now() + 15_000;
    while (await portOpen(this.port)) {
      if (Date.now() >= deadline) throw new Error(`server on :${this.port} is still listening after stop()`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

// Restart one backend on the same port for every simulated day; tokens keep the real clock.
export class OffsetBackend extends LocalServer {
  constructor(public offset = 0, port = 5000) {
    super(port, BACKEND_PYTHON, ['-m', 'flask', '--app', 'app', 'run', '--port', String(port), '--no-reload'],
      BACKEND_DIR, {}, '/api/gamemodes-count');
  }

  protected childEnv() {
    return { ...process.env, ...testBackendEnv({ TEST_DATE_OFFSET: String(this.offset) }) };
  }

  async restart(offset: number): Promise<void> {
    await this.stop();
    this.offset = offset;
    await this.start();
  }
}
