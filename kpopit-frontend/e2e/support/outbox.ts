import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';
import { EMAIL_OUTBOX_DIR } from './env';

export type OutboxEmail = { to: string; subject: string; html: string; link: string | null; sent_at: number };

// Files are named <time_ns>-<rand>.json, so a name sort is a time sort.
export function emailsTo(address: string): OutboxEmail[] {
  if (!fs.existsSync(EMAIL_OUTBOX_DIR)) return [];
  return fs
    .readdirSync(EMAIL_OUTBOX_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(EMAIL_OUTBOX_DIR, f), 'utf-8')) as OutboxEmail)
    .filter((m) => m.to === address);
}

/** Newest action link sent to `address`; with `after`, waits until more than that many emails arrived. */
export async function latestLink(address: string, after = 0): Promise<string> {
  await expect.poll(() => emailsTo(address).length, { message: `email to ${address}` }).toBeGreaterThan(after);
  const link = emailsTo(address).at(-1)?.link;
  if (!link) throw new Error(`newest email to ${address} has no action link`);
  return link;
}

/** The link as an app path (`/verify-email?token=…`), so tests stay on the local dev server. */
export function appPath(link: string): string {
  const url = new URL(link);
  return `${url.pathname}${url.search}`;
}
