import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidEstimate, isValidEstimateItem } from './validation';
import { ESTIMATE_SCHEMA_VERSION } from '../types';

const item = {
  id: 'item-1', name: 'Монтаж', category: 'Работы', categoryId: 'works', unit: 'шт',
  price: 19999, quantity: 1.5, total: 29999, type: 'work' as const,
};

const estimate = {
  schemaVersion: ESTIMATE_SCHEMA_VERSION,
  id: 'est-1', title: '', customer: '', companyName: '', date: '2026-09-16', phone: '', address: '', notes: '',
  profileId: 'plumbing', items: [item], discount: 0, subtotal: 29999, servicesSubtotal: 29999,
  materialsSubtotal: 0, total: 29999, createdAt: 1, updatedAt: 1,
};

test('estimate item requires categoryId and integer kopecks', () => {
  assert.equal(isValidEstimateItem(item), true);
  assert.equal(isValidEstimateItem({ ...item, categoryId: undefined }), false);
  assert.equal(isValidEstimateItem({ ...item, price: 199.99, total: 300 }), false);
  assert.equal(isValidEstimateItem({ ...item, total: 1 }), false);
});

test('estimate rejects non-finite and unsafe item arithmetic', () => {
  assert.equal(isValidEstimateItem({ ...item, price: Number.NaN, total: 0 }), false);
  assert.equal(isValidEstimateItem({ ...item, price: Number.POSITIVE_INFINITY, total: 0 }), false);
  assert.equal(isValidEstimateItem({ ...item, quantity: Number.POSITIVE_INFINITY, total: 0 }), false);
  assert.equal(isValidEstimateItem({ ...item, quantity: Number.MAX_VALUE, total: 0 }), false);
  assert.equal(isValidEstimateItem({ ...item, price: Number.MAX_SAFE_INTEGER, quantity: 2, total: 0 }), false);
});

test('estimate requires the current schema version and derived totals', () => {
  assert.equal(isValidEstimate(estimate), true);
  assert.equal(isValidEstimate({ ...estimate, schemaVersion: 0 }), false);
  assert.equal(isValidEstimate({ ...estimate, schemaVersion: undefined }), false);
  assert.equal(isValidEstimate({ ...estimate, total: 1 }), false);
});

test('estimate rejects unsafe derived totals', () => {
  const largeItem = { ...item, price: 4_503_599_627_370_496, total: 4_503_599_627_370_496 };
  const unsafeTotal = Number.MAX_SAFE_INTEGER + 1;
  assert.equal(
    isValidEstimate({
      ...estimate,
      items: [largeItem, { ...largeItem, id: 'item-2' }],
      subtotal: unsafeTotal,
      servicesSubtotal: unsafeTotal,
      total: unsafeTotal,
    }),
    false,
  );
});

test('estimate allows omitted optional contact and notes fields', () => {
  const { phone, address, notes, ...legacyEstimate } = estimate;
  assert.equal(isValidEstimate(legacyEstimate), true);
});
