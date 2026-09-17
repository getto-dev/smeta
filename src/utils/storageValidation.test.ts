import test from 'node:test';
import assert from 'node:assert/strict';
import { filterValidEstimates, isValidEstimate } from './validation';
import { createEmptyEstimate, recalculateEstimate, normalizeEstimateItem } from '../domain/estimate/model';

const makeEstimate = () => recalculateEstimate(
  createEmptyEstimate(),
  [normalizeEstimateItem({
    id: 'item-1',
    name: 'Монтаж',
    category: 'Работы',
    categoryId: 'works',
    unit: 'шт',
    price: 10000,
    quantity: 2,
    total: 0,
    type: 'work',
  })],
  0,
);

test('stored estimate must match the current schema and derived totals', () => {
  const estimate = makeEstimate();
  assert.equal(isValidEstimate(estimate), true);
  assert.equal(isValidEstimate({ ...estimate, schemaVersion: 0 }), false);
  assert.equal(isValidEstimate({ ...estimate, total: estimate.total + 1 }), false);
  assert.deepEqual(filterValidEstimates([estimate, { ...estimate, total: 1 }]).map((item) => item.id), [estimate.id]);
});
