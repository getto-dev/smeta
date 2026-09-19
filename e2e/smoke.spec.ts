import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test('catalog → estimate → quantity → discount → autosave → reload → clear', async ({ page }) => {
  await page.goto('./');

  await expect(page.getByText('СметаПро', { exact: true })).toBeVisible();
  const addButton = page.getByRole('button', { name: 'В смету' }).first();
  await expect(addButton).toBeVisible();
  await addButton.click();

  const mobileEstimateTab = page.getByRole('button', { name: /^Смета \(1\)$/ });
  if (await mobileEstimateTab.isVisible().catch(() => false)) await mobileEstimateTab.click();

  await expect(page.getByRole('heading', { name: 'Позиции сметы' })).toBeVisible();
  const estimateQuantity = page.locator('input[title^="Количество"]:visible').first();
  await expect(estimateQuantity).toHaveValue('1');
  await estimateQuantity.fill('2.5');
  await estimateQuantity.blur();
  await expect(estimateQuantity).toHaveValue('2.5');

  await page.getByRole('button', { name: '10%', exact: true }).click();
  await expect(page.getByText('скидка 10%', { exact: false })).toBeVisible();
  await expect(page.getByText('Сохранено', { exact: true })).toBeVisible();

  await page.reload();
  const reloadedEstimateQuantity = page.locator('input[title^="Количество"]:visible').first();
  if (await mobileEstimateTab.isVisible().catch(() => false)) await mobileEstimateTab.click();
  await expect(page.getByRole('heading', { name: 'Позиции сметы' })).toBeVisible();
  await expect(reloadedEstimateQuantity).toHaveValue('2.5');
  await expect(page.getByText('скидка 10%', { exact: false })).toBeVisible();

  await page.getByRole('button', { name: 'Очистить смету', exact: true }).click();
  const confirmYes = page.getByRole('button', { name: 'Да', exact: true }).last();
  await expect(confirmYes).toBeVisible();
  await confirmYes.click();
  await expect(page.getByRole('heading', { name: 'Смета пока пуста' })).toBeVisible();
});

test('settings opens and contains install action and Telegram contact', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Настройки' }).click();

  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Установка приложения/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Связаться в Telegram' })).toBeVisible();
});


test('profile switching changes the catalog and preserves the current estimate', async ({ page }) => {
  await page.goto('./');

  const addButton = page.getByRole('button', { name: 'В смету' }).first();
  await expect(addButton).toBeVisible();
  await addButton.click();

  await page.getByRole('button', { name: 'Сменить профиль каталога' }).click();
  await expect(page.getByRole('heading', { name: 'Профили деятельности' })).toBeVisible();
  await page.getByText('Электрика', { exact: true }).click();

  await expect(page.getByRole('button', { name: 'Сменить профиль каталога' })).toContainText('Электрика');

  const mobileEstimateTab = page.getByRole('button', { name: /^Смета \(1\)$/ });
  if (await mobileEstimateTab.isVisible().catch(() => false)) {
    await mobileEstimateTab.click();
  }
  await expect(page.getByRole('heading', { name: 'Позиции сметы' })).toBeVisible();

  await page.getByRole('button', { name: 'Сменить профиль каталога' }).click();
  await page.getByText('Сантехника', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Сменить профиль каталога' })).toContainText('Сантехника');
});


test('mobile editing keeps values on blur and supports full item edit and undo', async ({ page }) => {
  await page.goto('./');

  await page.getByRole('button', { name: 'В смету' }).first().click();
  const mobileEstimateTab = page.getByRole('button', { name: /^Смета \(1\)$/ });
  if (await mobileEstimateTab.isVisible().catch(() => false)) await mobileEstimateTab.click();

  const quantity = page.locator('input[title^="Количество"]:visible').first();
  await quantity.fill('2.5');
  await quantity.blur();
  await expect(quantity).toHaveValue('2.5');

  const priceButton = page.getByRole('button', { name: /Изменить цену:/ }).first();
  await priceButton.click();
  const priceInput = page.locator('input[title="Цена за единицу"]').first();
  await expect(priceInput).toBeFocused();
  await priceInput.fill('123.45');
  await priceInput.blur();
  await expect(page.getByText(/123,45/).first()).toBeVisible();

  const itemEditButton = page.getByRole('button', { name: /Редактировать позицию:/ }).first();
  await itemEditButton.click();
  await expect(page.getByRole('heading', { name: 'Редактировать позицию' })).toBeVisible();
  const editedName = 'Проверка мобильного редактора';
  await page.locator('#edit-item-name').fill(editedName);
  await page.getByRole('button', { name: 'Сохранить', exact: true }).last().click();
  await expect(page.getByText(editedName, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Удалить позицию:/ }).first().click();
  await expect(page.getByRole('button', { name: /Отменить/ }).last()).toBeVisible();
  await page.getByRole('button', { name: /Отменить/ }).last().click();
  await expect(page.getByText(editedName, { exact: true })).toBeVisible();
});

test('custom item form discards draft on cancel and returns to a clean state', async ({ page }) => {
  await page.goto('./');

  const customButton = page.getByRole('button', { name: /\+ Своя позиция/ }).first();
  await customButton.click();
  await expect(page.getByRole('heading', { name: 'Добавить свою позицию' })).toBeVisible();
  await page.locator('#custom-item-name').fill('Черновая позиция');
  await page.getByRole('button', { name: 'Отмена', exact: true }).last().click();

  await customButton.click();
  await expect(page.locator('#custom-item-name')).toHaveValue('');
  await expect(page.locator('#custom-item-quantity')).toHaveValue('1');
});

test('customer form uses Next navigation instead of accidental submit', async ({ page }) => {
  await page.goto('./');

  await page.getByRole('button', { name: 'В смету' }).first().click();
  const mobileEstimateTab = page.getByRole('button', { name: /^Смета \(1\)$/ });
  if (await mobileEstimateTab.isVisible().catch(() => false)) await mobileEstimateTab.click();

  await page.getByRole('button', { name: /\+ Указать|Указать/ }).click();
  await expect(page.getByRole('heading', { name: 'Параметры сметы' })).toBeVisible();

  const customer = page.locator('#estimate-customer');
  await customer.fill('Иванов Иван');
  await customer.press('Enter');
  await expect(page.locator('#estimate-company')).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Параметры сметы' })).toBeVisible();
});

test('landscape viewport has no horizontal overflow', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'mobile-landscape') return;
  await page.goto('./');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('escape closes mobile dialogs', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeHidden();
});
