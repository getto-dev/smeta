import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyEstimate, normalizeEstimateItem, recalculateEstimate } from './model';

const baseItem = {
  id: 'item-1',
  name: 'Монтаж',
  category: 'Работы',
  categoryId: 'works',
  unit: 'шт',
  price: 19999,
  quantity: 1.5,
  total: 0,
  type: 'work' as const,
};

test('createEmptyEstimate creates a canonical empty estimate', () => {
  const estimate = createEmptyEstimate('plumbing', 'Сантехника');
  assert.equal(estimate.schemaVersion, 1);
  assert.equal(estimate.profileId, 'plumbing');
  assert.deepEqual(estimate.items, []);
  assert.equal(estimate.total, 0);
});

test('normalizeEstimateItem keeps money in integer kopecks and recalculates the line total', () => {
  const item = normalizeEstimateItem(baseItem);
  assert.equal(item.price, 19999);
  assert.equal(item.quantity, 1.5);
  assert.equal(item.total, 29999);
});

test('recalculateEstimate derives all totals from items and discount', () => {
  const estimate = createEmptyEstimate();
  const updated = recalculateEstimate(estimate, [
    normalizeEstimateItem(baseItem),
    normalizeEstimateItem({ ...baseItem, id: 'item-2', type: 'material', category: 'Материалы', categoryId: 'materials', price: 50025, quantity: 1, total: 0 }),
  ], 10);

  assert.equal(updated.subtotal, 80024);
  assert.equal(updated.servicesSubtotal, 29999);
  assert.equal(updated.materialsSubtotal, 50025);
  assert.equal(updated.discount, 10);
  assert.equal(updated.total, 77024);
});
