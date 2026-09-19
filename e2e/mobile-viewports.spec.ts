import { test, expect } from '@playwright/test';

test('mobile viewport has no horizontal overflow and keeps primary controls visible', async ({ page }) => {
  await page.goto('./');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('#catalog-search-input')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Выбрать раздел каталога' })).toBeVisible();
  await expect(page.getByRole('button', { name: /\+ Своя позиция/ }).first()).toBeVisible();
});
