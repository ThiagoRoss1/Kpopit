import { test, expect, tagApiRequests } from './support/fixtures';
import { answerAlbum, answerIdol, guessAlbum, guessIdol, openGame, userToken, victoryMarker, wrongAlbums, wrongIdols } from './support/game';

test.describe('Data transfer', () => {
  test('export a code in one anonymous browser and import it in another', async ({ browser, baseURL }) => {
    const a = await browser.newContext({ baseURL });
    const b = await browser.newContext({ baseURL });
    await tagApiRequests(a, '10.250.0.1');
    await tagApiRequests(b, '10.250.0.2');
    const pageA = await a.newPage();
    const pageB = await b.newPage();

    await openGame(pageA, 'classic');
    await guessIdol(pageA, 'classic', await answerIdol(pageA, 'classic'));
    await expect(victoryMarker(pageA, 'classic')).toBeVisible({ timeout: 45_000 });
    const tokenA = await userToken(pageA);

    await pageA.getByRole('img', { name: 'Stats' }).first().click();
    await pageA.getByRole('button', { name: 'Transfer data' }).click();
    await pageA.getByRole('button', { name: 'Export data' }).click();
    const codeLocator = pageA.getByText(/^[0-9A-F]{3}-[0-9A-F]{3}$/);
    await expect(codeLocator).toBeVisible({ timeout: 20_000 });
    const code = (await codeLocator.textContent())!.trim();

    await openGame(pageB, 'classic');
    const tokenBefore = await userToken(pageB);
    expect(tokenBefore).not.toBe(tokenA);
    await pageB.getByRole('img', { name: 'Stats' }).first().click();
    await pageB.getByRole('button', { name: 'Transfer data' }).click();
    await pageB.getByRole('button', { name: 'Import data' }).click();
    await pageB.getByPlaceholder('123-ABC').fill(code);
    await pageB.getByPlaceholder('123-ABC').locator('xpath=following::button[1]').click();
    await pageB.waitForEvent('load');

    await expect.poll(() => userToken(pageB)).toBe(tokenA);
    await openGame(pageB, 'classic');
    await expect(victoryMarker(pageB, 'classic')).toBeVisible();

    await a.close();
    await b.close();
  });

  test("an import replaces this device's day in every mode", async ({ browser, baseURL }) => {
    const a = await browser.newContext({ baseURL });
    const b = await browser.newContext({ baseURL });
    await tagApiRequests(a, '10.250.0.3');
    await tagApiRequests(b, '10.250.0.4');
    const pageA = await a.newPage();
    const pageB = await b.newPage();
    const guessCount = (page: typeof pageB, key: string) =>
      page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey) || '[]').length, key);

    // A guesses twice per mode, B once (other idols/albums): B must end with A's two.
    for (const mode of ['classic', 'blurry'] as const) {
      await openGame(pageA, mode);
      const answer = await answerIdol(pageA, mode);
      for (const idol of await wrongIdols(pageA, mode, answer.id, 2)) await guessIdol(pageA, mode, idol);
      await openGame(pageB, mode);
      for (const idol of await wrongIdols(pageB, mode, answer.id, 1, 4)) await guessIdol(pageB, mode, idol);
    }
    await openGame(pageA, 'pixelated');
    const albums = await wrongAlbums(pageA, (await answerAlbum(pageA)).id, 3);
    for (const album of albums.slice(0, 2)) await guessAlbum(pageA, album);
    await openGame(pageB, 'pixelated');
    await guessAlbum(pageB, albums[2]);

    await openGame(pageA, 'classic');
    await pageA.getByRole('img', { name: 'Stats' }).first().click();
    await pageA.getByRole('button', { name: 'Transfer data' }).click();
    await pageA.getByRole('button', { name: 'Export data' }).click();
    const codeLocator = pageA.getByText(/^[0-9A-F]{3}-[0-9A-F]{3}$/);
    await expect(codeLocator).toBeVisible({ timeout: 20_000 });
    const code = (await codeLocator.textContent())!.trim();

    await openGame(pageB, 'classic');
    await pageB.getByRole('img', { name: 'Stats' }).first().click();
    await pageB.getByRole('button', { name: 'Transfer data' }).click();
    await pageB.getByRole('button', { name: 'Import data' }).click();
    await pageB.getByPlaceholder('123-ABC').fill(code);
    await pageB.getByPlaceholder('123-ABC').locator('xpath=following::button[1]').click();
    await pageB.waitForEvent('load');
    await expect.poll(() => userToken(pageB)).toBe(await userToken(pageA));

    for (const [mode, key] of [['classic', 'todayGuessesDetails'], ['blurry', 'blurryGuessesDetails'], ['pixelated', 'pixelatedGuessesDetails']] as const) {
      await openGame(pageB, mode);
      await expect.poll(() => guessCount(pageB, key), { message: mode }).toBe(2);
    }

    await a.close();
    await b.close();
  });

  test('an invalid code shows an error', async ({ page }) => {
    await openGame(page, 'classic');
    await page.getByRole('img', { name: 'Stats' }).first().click();
    await page.getByRole('button', { name: 'Transfer data' }).click();
    await page.getByRole('button', { name: 'Import data' }).click();
    await page.getByPlaceholder('123-ABC').fill('000-ZZZ');
    await page.getByPlaceholder('123-ABC').locator('xpath=following::button[1]').click();
    await expect(page.getByText(/invalid|expired|not found/i).first()).toBeVisible();
  });
});
