import { test, expect, tagApiRequests } from './support/fixtures';
import { answerIdol, guessIdol, openGame, userToken, victoryMarker } from './support/game';

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
