import { expect, test } from '@playwright/test';

for (const edition of ['java', 'bedrock'] as const) {
  test(`${edition} displays all vanilla thumbnails and distinct log faces`, async ({ page }) => {
    await page.goto('/');
    if (edition === 'bedrock') await page.getByLabel('Edition').selectOption('bedrock');
    const images = page.locator('.catalog-artwork img');
    await expect.poll(() => images.evaluateAll(nodes => nodes.length > 0 && nodes.every(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await expect(page.locator('.catalog .missing-texture-icon')).toHaveCount(edition === 'java' ? 1 : 0);
    if (edition === 'java') {
      await page.getByLabel('Search catalog').fill('yellow_poplar_leaves');
      await page.locator('.asset').click();
      await expect(page.locator('.editor-artwork')).toHaveAttribute('aria-label', 'Texture preview unavailable');
      await expect(page.getByLabel('Choose texture image')).toBeAttached();
    }
    await page.getByLabel('Search catalog').fill('Oak log');
    const rows = page.locator('.asset');
    await expect(rows).toHaveCount(2);
    expect(await rows.nth(0).locator('img').getAttribute('src')).not.toBe(await rows.nth(1).locator('img').getAttribute('src'));
    await rows.nth(1).click();
    await expect(page.locator('.editor-artwork img')).toHaveAttribute('alt', 'Oak log - top vanilla texture');
    await expect(page.getByLabel('Choose texture image')).toBeAttached();
  });
}

test('sound artwork and narrow layout stay usable, with no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Sounds' }).click();
  await page.locator('.asset').filter({ hasText: 'Chest opens' }).click();
  await expect(page.locator('.editor-artwork .speaker-icon')).toBeVisible();
  await expect(page.getByLabel('Choose MP3 or Ogg file')).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('a failed thumbnail has an explicit fallback and still allows replacement', async ({ page }) => {
  await page.route('**/previews/java-26.3/stone.png', route => route.abort());
  await page.goto('/');
  await page.locator('.asset').filter({ hasText: /^Stone/ }).first().click();
  await expect(page.locator('.editor-artwork')).toHaveAttribute('aria-label', 'Texture preview unavailable');
  await expect(page.getByLabel('Choose texture image')).toBeAttached();
});
