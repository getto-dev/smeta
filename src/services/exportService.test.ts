import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, generateStandaloneHTML } from './exportService';
import { createEmptyEstimate, recalculateEstimate } from '../domain/estimate/model';
import { normalizeEstimateItem } from '../domain/estimate/model';

function makeEstimate() {
  const estimate = createEmptyEstimate('plumbing', 'Сантехника');
  return recalculateEstimate(estimate, [
    normalizeEstimateItem({
      id: 'item-1',
      name: 'Монтаж смесителя',
      category: 'Работы',
      categoryId: 'works',
      unit: 'шт',
      price: 12550,
      quantity: 2,
      total: 0,
      type: 'work',
    }),
  ], 10);
}

test('formatCurrency renders integer kopecks as Russian rubles', () => {
  assert.equal(formatCurrency(12550), '125,50 ₽');
});

test('standalone HTML contains canonical estimate totals', () => {
  const html = generateStandaloneHTML(makeEstimate());
  assert.match(html, /125,50/);
  assert.match(html, /25,10/);
});
