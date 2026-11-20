import { test, expect, type Page } from './support/fixtures';
import { DATE_KEY, escapeRe, idolsList, searchInput, serverDate, userToken, type IdolEntry } from './support/game';
import { dailyPick, ensurePastPick, idolName, inkitDraftSize, inkitPhotoPath, userIdByToken } from './support/db';

const INKIT_ON = { INKIT_ENABLED: 'true', CALENDAR_ENABLED: 'true' };

const minusDays = (iso: string, n: number) => {
  const day = new Date(`${iso}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - n);
  return day.toISOString().slice(0, 10);
};

test.beforeAll(async ({ backend }) => {
  await backend.restart(0, INKIT_ON);
});
test.afterAll(async ({ backend }) => {
  await backend.restart(0, {});
});

const sheet = (page: Page) => page.getByTestId('inkit-sheet');
const inkLeft = async (page: Page) => Number(await page.getByTestId('inkit-ink').getAttribute('data-ink'));

async function openInkIt(page: Page, path = '/inkit'): Promise<void> {
  await page.goto(path);
  await expect(sheet(page)).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
}

/** A stroke across the sheet, in steps, so the engine sees a real drag. */
async function draw(page: Page, from: [number, number], to: [number, number], steps = 20): Promise<void> {
  const box = (await sheet(page).boundingBox())!;
  const at = ([x, y]: [number, number]) => [box.x + box.width * x, box.y + box.height * y] as const;
  await page.mouse.move(...at(from));
  await page.mouse.down();
  await page.mouse.move(...at(to), { steps });
  await page.mouse.up();
}

/** The sheet's RGB pixels, as drawn on the canvas. */
async function sheetPixels(page: Page): Promise<number[]> {
  await page.waitForTimeout(300);
  return page.getByTestId('inkit-sheet').evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    return Array.from(data.filter((_, index) => index % 4 !== 3));
  });
}

async function guess(page: Page, idol: IdolEntry): Promise<void> {
  const reply = page.waitForResponse((r) => /\/api\/(game\/inkit|calendar\/inkit\/[\d-]+)\/guess/.test(r.url()) && r.request().method() === 'POST');
  const input = searchInput(page, 'inkit');
  await input.fill(idol.artist_name);
  // Like Classic and Blurry: a click picks the idol ("Name (Group)"), Enter sends it.
  // Two idols can share a name (two Yujins): the group picks the right one.
  await page.getByTestId('inkit-suggestion').filter({ hasText: idol.artist_name }).filter({ hasText: idol.active_group || 'Soloist' }).first().click();
  await expect(input).toHaveValue(new RegExp(`^${escapeRe(idol.artist_name)} \\(`));
  await input.press('Enter');
  expect((await reply).status()).toBe(200);
  await expect(page.getByTestId('inkit-guess-row').filter({ hasText: idol.artist_name })).toBeVisible();
}

async function todaysAnswer(page: Page): Promise<{ answer: IdolEntry; wrong: IdolEntry[]; today: string }> {
  await page.waitForFunction((key) => !!localStorage.getItem(key), DATE_KEY.inkit, { timeout: 30_000 });
  const today = await serverDate(page, 'inkit');
  const answerId = await dailyPick('inkit', today);
  const idols = await idolsList(page);
  const answer = idols.find((idol) => idol.id === answerId)!;
  // Unique names only: the suggestion filter picks by name.
  const names = new Set<string>();
  const wrong = idols.filter((idol) => {
    if (idol.id === answerId || !idol.has_inkit_photo || names.has(idol.artist_name) || idol.artist_name === answer.artist_name) return false;
    names.add(idol.artist_name);
    return true;
  }).slice(0, 10);
  return { answer, wrong, today };
}

test.describe('inkit', () => {
  test('the day payload never names the answer', async ({ page, consoleErrors }) => {
    const replies: string[] = [];
    page.on('response', async (reply) => {
      if (reply.url().includes('/api/game/inkit/')) replies.push(await reply.text().catch(() => ''));
    });
    await openInkIt(page);
    const { answer, wrong } = await todaysAnswer(page);
    for (const idol of wrong.slice(0, 2)) await guess(page, idol);

    const photo = await inkitPhotoPath(answer.id);
    expect(photo).toMatch(/^\/images\/inkit\/[0-9a-f]{32}\.webp$/);
    for (const body of replies) {
      expect(body).not.toContain(`"artist_name":"${answer.artist_name}"`);
      expect(body).not.toMatch(new RegExp(`"(answer_id|idol_id)":\\s*${answer.id}\\b`));
    }
    expect(consoleErrors.list).toEqual([]);
  });

  test('drawing spends ink, runs out, and a wrong guess refills and unlocks tools', async ({ page, consoleErrors }) => {
    await openInkIt(page);
    const { wrong } = await todaysAnswer(page);
    await expect(page.getByTestId('inkit-invite')).toBeVisible();

    await draw(page, [0.1, 0.2], [0.9, 0.3]);
    const afterStroke = await inkLeft(page);
    expect(afterStroke).toBeLessThan(100);
    await expect(page.getByTestId('inkit-invite')).toHaveCount(0);

    for (let row = 0; row < 12 && (await inkLeft(page)) > 0; row++) {
      await draw(page, [0.05, 0.1 + row * 0.07], [0.95, 0.12 + row * 0.07], 30);
    }
    expect(await inkLeft(page)).toBe(0);
    await draw(page, [0.2, 0.9], [0.8, 0.9]);
    await expect(page.getByTestId('inkit-out-of-ink')).toBeVisible();

    await expect(page.getByTestId('inkit-tool-pen')).toHaveAttribute('data-locked', 'true');
    await expect(page.getByTestId('inkit-tool-paint')).toHaveAttribute('data-locked', 'true');
    await expect(page.getByTestId('inkit-tool-pen')).toBeDisabled();
    await guess(page, wrong[0]);
    expect(await inkLeft(page)).toBe(100);

    // A guessed idol leaves the suggestions, as in Classic and Blurry.
    await searchInput(page, 'inkit').fill(wrong[0].artist_name);
    await expect(page.getByTestId('inkit-suggestion').filter({ has: page.getByText(wrong[0].artist_name, { exact: true }) })).toHaveCount(0);
    await searchInput(page, 'inkit').fill('');
    await expect(page.getByTestId('inkit-tool-pen')).toHaveAttribute('data-locked', 'true');

    await guess(page, wrong[1]);
    await expect(page.getByTestId('inkit-tool-pen')).toHaveAttribute('data-locked', 'false');
    await expect(page.getByTestId('inkit-tool-pen')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('inkit-tool-paint')).toHaveAttribute('data-locked', 'true');

    for (const idol of wrong.slice(2, 4)) await guess(page, idol);
    await expect(page.getByTestId('inkit-tool-paint')).toHaveAttribute('data-locked', 'false');
    expect(consoleErrors.list).toEqual([]);
  });

  test('hint 1 from guess 5, the group from guess 8, then the win reveal and card', async ({ page, consoleErrors }) => {
    await openInkIt(page);
    const { answer, wrong } = await todaysAnswer(page);
    const inkHint = page.getByTestId('inkit-hint-ink');
    const groupHint = page.getByTestId('inkit-hint-group');

    for (const idol of wrong.slice(0, 3)) await guess(page, idol);
    await expect(inkHint).toHaveAttribute('data-state', 'locked');
    await expect(inkHint).toBeDisabled();

    await guess(page, wrong[3]);
    await expect(inkHint).toHaveAttribute('data-state', 'idle');
    await draw(page, [0.1, 0.5], [0.9, 0.5]);
    const before = await inkLeft(page);
    await inkHint.click();
    await expect(inkHint).toHaveAttribute('data-state', 'used', { timeout: 5_000 });
    await expect(page.getByTestId('inkit-hint-ink-result')).toContainText('Max ink');
    expect(await inkLeft(page)).toBeGreaterThan(before);

    for (const idol of wrong.slice(4, 6)) await guess(page, idol);
    await expect(groupHint).toHaveAttribute('data-state', 'locked');
    await guess(page, wrong[6]);
    await groupHint.click();
    await expect(groupHint).toHaveAttribute('data-state', 'used', { timeout: 5_000 });

    await guess(page, answer);
    await expect(page.getByTestId('inkit-guess-row').filter({ hasText: answer.artist_name })).toHaveAttribute('data-correct', 'true');
    const card = page.getByTestId('inkit-victory');
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('inkit-answer-name')).toHaveText(answer.artist_name);
    await expect(page.getByTestId('inkit-stat-guesses')).toContainText('8');
    await expect(page.getByTestId('inkit-share')).toBeVisible();
    for (const mode of ['classic', 'blurry', 'pixelated']) {
      await expect(page.getByTestId(`inkit-other-${mode}`)).toHaveAttribute('href', `/${mode}`);
    }
    await expect(searchInput(page, 'inkit')).toHaveCount(0);
    // Like Blurry and Pixelated, the hints leave once the victory card is up.
    await expect(inkHint).toHaveCount(0);
    await expect(groupHint).toHaveCount(0);

    // A reload shows the finished game, not a new one.
    await openInkIt(page);
    await expect(page.getByTestId('inkit-victory')).toBeVisible();
    await expect(inkHint).toHaveCount(0);
    expect(consoleErrors.list).toEqual([]);
  });

  test('a reload mid-game restores the guesses and the saved drawing', async ({ page }) => {
    await openInkIt(page);
    const { wrong, today } = await todaysAnswer(page);
    await draw(page, [0.1, 0.3], [0.9, 0.6]);
    await guess(page, wrong[0]);
    await guess(page, wrong[1]);

    const userId = await userIdByToken(await userToken(page));
    expect(await inkitDraftSize(userId, today)).toBeGreaterThan(0);
    const before = await sheetPixels(page);

    // A fresh browser state with the same player: everything comes back from the server.
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) if (key.startsWith('inkit')) localStorage.removeItem(key);
    });
    await openInkIt(page);
    await expect(page.getByTestId('inkit-guess-row')).toHaveCount(2);
    await expect(page.getByTestId('inkit-invite')).toHaveCount(0);
    await expect(page.getByTestId('inkit-tool-pen')).toHaveAttribute('data-locked', 'false');

    // The same sheet: only the saved drawing's 4-bit rounding at soft brush edges may differ.
    const after = await sheetPixels(page);
    let total = 0;
    for (let index = 0; index < before.length; index++) total += Math.abs(before[index] - after[index]);
    expect(total / before.length).toBeLessThan(1.5);
  });

  test('leaving the page and coming back keeps the guesses, the drawing and the search focus', async ({ page }) => {
    await openInkIt(page);
    const { wrong } = await todaysAnswer(page);
    await draw(page, [0.1, 0.3], [0.9, 0.6]);
    await guess(page, wrong[0]);
    // The field stays focused, so the next guess needs no click.
    await expect(searchInput(page, 'inkit')).toBeFocused();
    await guess(page, wrong[1]);
    const before = await sheetPixels(page);

    // A client navigation away and back: the page mounts again from the cached day.
    await page.getByRole('link', { name: 'Calendar' }).first().click();
    await expect(page).toHaveURL(/\/calendar/);
    await page.goBack();
    await expect(sheet(page)).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });

    await expect(page.getByTestId('inkit-guess-row')).toHaveCount(2);
    await expect(page.getByTestId('inkit-invite')).toHaveCount(0);
    await expect(page.getByTestId('inkit-tool-pen')).toHaveAttribute('data-locked', 'false');

    const after = await sheetPixels(page);
    let total = 0;
    for (let index = 0; index < before.length; index++) total += Math.abs(before[index] - after[index]);
    expect(total / before.length).toBeLessThan(1.5);
  });

  test('reduced motion: the win shows the photo and the card at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openInkIt(page);
    const { answer } = await todaysAnswer(page);
    await guess(page, answer);
    await expect(page.getByTestId('inkit-victory')).toBeVisible({ timeout: 3_000 });
  });

  test('a win from another tab lays the photo on this tab\'s sheet', async ({ page, context }) => {
    await openInkIt(page);
    const { answer } = await todaysAnswer(page);

    const other = await context.newPage();
    await openInkIt(other);
    await guess(other, answer);
    await expect(other.getByTestId('inkit-victory')).toBeVisible({ timeout: 15_000 });
    await other.close();

    // The first tab learns about the win the way a returning tab does: a refetch on visibility.
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
    await expect(page.getByTestId('inkit-page')).toHaveAttribute('data-phase', 'won', { timeout: 15_000 });

    // Blank paper is nearly flat; the photo has real contrast.
    const pixels = await sheetPixels(page);
    const mean = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;
    const spread = Math.sqrt(pixels.reduce((sum, value) => sum + (value - mean) ** 2, 0) / pixels.length);
    expect(spread).toBeGreaterThan(25);
  });

  test('a past day plays from the calendar under its own title', async ({ page }) => {
    await openInkIt(page);
    const { today } = await todaysAnswer(page);
    const yesterday = minusDays(today, 1);
    await ensurePastPick('inkit', yesterday, today);
    const pastAnswer = await dailyPick('inkit', yesterday);

    await openInkIt(page, `/inkit?date=${yesterday}`);
    await expect(page).toHaveTitle(/^InkIt · Day \d+ – KpopIt$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/inkit$/);

    const idols = await idolsList(page);
    await guess(page, idols.find((idol) => idol.id === pastAnswer)!);
    await expect(page.getByTestId('inkit-answer-name')).toHaveText(await idolName(pastAnswer), { timeout: 15_000 });
    await expect(page.getByTestId('inkit-stat-position')).toHaveCount(0);
  });
});

test.describe('inkit across the site', () => {
  test('the navbar, home and calendar lead to InkIt', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await nav.getByRole('button', { name: 'Games', exact: true }).click();
    const row = nav.getByRole('menuitem', { name: /InkIt/ });
    await expect(row).toHaveAttribute('href', '/inkit');
    await page.keyboard.press('Escape');
    await expect(page.locator('main a[href="/inkit"]').first()).toBeVisible();

    await openInkIt(page);
    await page.goto('/calendar?mode=inkit');
    await expect(page.getByRole('tab', { name: /InkIt/ })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('inkit on a phone @mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'Drawing mode is the phone layout.');

  test('drawing mode keeps the page still and closes with Done', async ({ page, consoleErrors }) => {
    await openInkIt(page);
    await expect(page.getByTestId('inkit-tool-pencil')).toHaveCount(0);
    await expect(searchInput(page, 'inkit')).toBeInViewport();

    await page.getByTestId('inkit-open-drawing').click();
    await expect(page.getByTestId('inkit-drawing-mode')).toBeVisible();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const inkBefore = await inkLeft(page);

    const box = (await sheet(page).boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await draw(page, [0.1, 0.5], [0.9, 0.5]);
    expect(await inkLeft(page)).toBeLessThan(inkBefore);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');

    await page.getByTestId('inkit-done').click();
    await expect(page.getByTestId('inkit-drawing-mode')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    expect(consoleErrors.list).toEqual([]);
  });
});

test.describe('inkit layers in every engine @mobile', () => {
  // Safari ignores the canvas `filter`; a layer built with it came out blank and the pen only erased.
  test('the pen line art and the pencil sketch are drawn, not blank paper', async ({ page }) => {
    await page.goto('/');
    const darkness = await page.evaluate(async () => {
      const source = document.createElement('canvas');
      source.width = source.height = 500;
      const paint = source.getContext('2d')!;
      paint.fillStyle = '#f2d6c9';
      paint.fillRect(0, 0, 500, 500);
      paint.fillStyle = '#3b2a2a';
      paint.beginPath();
      paint.arc(250, 220, 110, 0, Math.PI * 2);
      paint.fill();
      paint.fillRect(120, 380, 260, 40);

      const image = new Image();
      image.src = source.toDataURL();
      await image.decode();

      // Loaded from the Vite dev server inside the page, not by the test runner.
      const layersModule = '/src/features/inkit/layers.ts';
      const { buildLayers } = await import(/* @vite-ignore */ layersModule);
      const layers: { pen: Float32Array; pencil: Float32Array } = buildLayers(image, 7);
      const mean = (values: Float32Array) => values.reduce((sum, value) => sum + value, 0) / values.length;
      const at = (values: Float32Array, x: number, y: number) => values[y * 500 + x];

      return { pen: mean(layers.pen), pencil: mean(layers.pencil), penEdge: at(layers.pen, 250, 110), penFlat: at(layers.pen, 40, 40) };
    });

    expect(darkness.pen).toBeGreaterThan(0.01);
    expect(darkness.pencil).toBeGreaterThan(0.01);
    expect(darkness.penEdge).toBeGreaterThan(0.3);
    expect(darkness.penFlat).toBeLessThan(0.05);
  });
});

test.describe('inkit flag off', () => {
  test.beforeAll(async ({ backend }) => {
    await backend.restart(0, {});
  });
  test.afterAll(async ({ backend }) => {
    await backend.restart(0, INKIT_ON);
  });

  test('the page is the 404 and the navbar row stays "soon"', async ({ page }) => {
    await page.goto('/inkit');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
    expect((await page.request.get('/api/game/inkit/daily')).status()).toBe(404);
  });
});
