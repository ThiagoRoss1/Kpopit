import { expect, type Page, type Locator } from '@playwright/test';
import { albumName, dailyPick, type ModeName } from './db';

export type IdolEntry = {
  id: number;
  artist_name: string;
  active_group: string | null;
  blur_image_path?: string | null;
};

export type AlbumEntry = { id: number; name: string; group_name: string };

/** localStorage key holding the server date each mode last saw. */
export const DATE_KEY: Record<ModeName, string> = {
  classic: 'gameDate',
  blurry: 'blurryGameDate',
  pixelated: 'pixelatedGameDate',
};

const SEARCH_PLACEHOLDER: Record<ModeName, string> = {
  classic: 'Search for an idol or group...',
  blurry: 'Search for an idol or group...',
  pixelated: 'Type an album or group…',
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const searchInput = (page: Page, mode: ModeName): Locator =>
  page.getByPlaceholder(SEARCH_PLACEHOLDER[mode]);

export const victoryMarker = (page: Page, mode: ModeName): Locator =>
  mode === 'pixelated'
    ? page.getByText('Score', { exact: true })
    : page.getByText('Share Results', { exact: true });

// Each mode's first visit of the day stores the server date and reloads once,
// so wait for the date key, then for the board or the victory card.
export async function openGame(page: Page, mode: ModeName): Promise<void> {
  await page.goto(`/${mode}`);
  await page.waitForFunction((key) => !!localStorage.getItem(key), DATE_KEY[mode], { timeout: 30_000 });
  await expect(searchInput(page, mode).or(victoryMarker(page, mode)).first()).toBeVisible({ timeout: 30_000 });
}

export async function serverDate(page: Page, mode: ModeName): Promise<string> {
  const date = await page.evaluate((key) => localStorage.getItem(key), DATE_KEY[mode]);
  if (!date) throw new Error(`${mode}: no server date in localStorage yet`);
  return date;
}

let idolsCache: IdolEntry[] | null = null;
let albumsCache: AlbumEntry[] | null = null;

export async function idolsList(page: Page): Promise<IdolEntry[]> {
  if (!idolsCache) {
    const res = await page.request.get('/api/idols-list');
    expect(res.ok()).toBeTruthy();
    idolsCache = (await res.json()) as IdolEntry[];
  }
  return idolsCache;
}

export async function albumsList(page: Page): Promise<AlbumEntry[]> {
  if (!albumsCache) {
    const res = await page.request.get('/api/game/pixelated/albums-list?gamemode_id=3');
    expect(res.ok()).toBeTruthy();
    albumsCache = (await res.json()) as AlbumEntry[];
  }
  return albumsCache;
}

// Resolved from the DB by server date, not from the API payload.
export async function answerIdol(page: Page, mode: 'classic' | 'blurry'): Promise<IdolEntry> {
  const id = await dailyPick(mode, await serverDate(page, mode));
  const idol = (await idolsList(page)).find((i) => i.id === id);
  if (!idol) throw new Error(`answer idol ${id} missing from /idols-list`);
  return idol;
}

export async function answerAlbum(page: Page): Promise<AlbumEntry> {
  const id = await dailyPick('pixelated', await serverDate(page, 'pixelated'));
  const album = (await albumsList(page)).find((a) => a.id === id);
  if (!album) throw new Error(`answer album ${id} (${await albumName(id)}) missing from albums-list`);
  return album;
}

const label = (i: IdolEntry) => `${i.artist_name} (${i.active_group || 'Soloist'})`;

// Unique labels keep the exact suggestion clickable; Blurry only lists idols with a blur image.
export async function wrongIdols(
  page: Page,
  mode: 'classic' | 'blurry',
  answerId: number,
  n: number,
  skip = 0,
): Promise<IdolEntry[]> {
  const all = await idolsList(page);
  const counts = new Map<string, number>();
  for (const i of all) counts.set(label(i), (counts.get(label(i)) ?? 0) + 1);
  const pool = all
    .filter((i) => i.id !== answerId && counts.get(label(i)) === 1)
    .filter((i) => mode !== 'blurry' || !!i.blur_image_path)
    .sort((a, b) => a.id - b.id);
  return pool.slice(skip, skip + n);
}

export async function wrongAlbums(page: Page, answerId: number, n: number): Promise<AlbumEntry[]> {
  const all = await albumsList(page);
  const names = new Map<string, number>();
  for (const a of all) names.set(a.name, (names.get(a.name) ?? 0) + 1);
  return all
    .filter((a) => a.id !== answerId && names.get(a.name) === 1)
    .sort((a, b) => a.id - b.id)
    .slice(0, n);
}

export async function guessIdol(page: Page, mode: 'classic' | 'blurry', idol: IdolEntry): Promise<void> {
  const input = searchInput(page, mode);
  await input.fill(idol.artist_name);
  const exact = new RegExp(`^\\s*${escapeRe(idol.artist_name)}\\s*\\(${escapeRe(idol.active_group || 'Soloist')}\\)\\s*$`);
  await page.locator('li').filter({ hasText: exact }).first().click();
  const response = page.waitForResponse(
    (r) => r.url().includes(`/api/game/${mode}/guess`) && r.request().method() === 'POST',
  );
  await input.press('Enter');
  expect((await response).ok()).toBeTruthy();
}

export async function guessAlbum(page: Page, album: AlbumEntry): Promise<void> {
  const input = searchInput(page, 'pixelated');
  await input.fill(album.name);
  await page
    .locator('li')
    .filter({ has: page.getByText(album.name, { exact: true }) })
    .filter({ has: page.getByText(album.group_name, { exact: true }) })
    .first()
    .click();
  const response = page.waitForResponse(
    (r) => r.url().includes('/api/game/pixelated/guess') && r.request().method() === 'POST',
  );
  await input.press('Enter');
  expect((await response).ok()).toBeTruthy();
}

export async function winGame(page: Page, mode: ModeName, wrong = 0): Promise<number> {
  await openGame(page, mode);
  if (mode === 'pixelated') {
    const answer = await answerAlbum(page);
    for (const a of await wrongAlbums(page, answer.id, wrong)) await guessAlbum(page, a);
    await guessAlbum(page, answer);
    await expect(victoryMarker(page, mode)).toBeVisible({ timeout: 45_000 });
    return answer.id;
  }
  const answer = await answerIdol(page, mode);
  for (const i of await wrongIdols(page, mode, answer.id, wrong)) await guessIdol(page, mode, i);
  await guessIdol(page, mode, answer);
  await expect(victoryMarker(page, mode)).toBeVisible({ timeout: 45_000 });
  return answer.id;
}

// Decrypts with the app's own AES helper, which Vite serves as a module in dev.
export async function userToken(page: Page): Promise<string> {
  await page.waitForFunction(() => !!localStorage.getItem('userToken'));
  const token = await page.evaluate(async () => {
    const mod = await import('../../src/utils/tokenEncryption');
    return mod.decryptToken(localStorage.getItem('userToken') || '');
  });
  if (!token) throw new Error('could not decrypt the user token');
  return token;
}

export async function closeModal(page: Page, title: string): Promise<void> {
  const header = page.getByRole('heading', { name: title, exact: true }).locator('xpath=..');
  await header.getByRole('button').last().click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeHidden();
}
