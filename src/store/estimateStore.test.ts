import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEstimateTotals, calculateLineTotal } from '../domain/estimate/calculations';
import type { EstimateItem } from '../types';

const items: EstimateItem[] = [
  { id: 'work-1', name: 'Монтаж', category: 'Работы', categoryId: 'works', unit: 'шт', price: 10050, quantity: 2, total: 999999, type: 'work' },
  { id: 'material-1', name: 'Материал', category: 'Материалы', categoryId: 'materials', unit: 'шт', price: 50025, quantity: 1, total: 0, type: 'material' },
];

test('calculateEstimateTotals derives line totals from price and quantity', () => {
  const totals = calculateEstimateTotals(items, 10);
  assert.equal(totals.subtotal, 70125);
  assert.equal(totals.servicesSum, 20100);
  assert.equal(totals.productsSum, 50025);
  assert.equal(totals.discountAmount, 2010);
  assert.equal(totals.grandTotal, 68115);
  assert.equal(totals.workCount, 1);
  assert.equal(totals.materialCount, 1);
});

test('calculateEstimateTotals clamps discount to 0..100', () => {
  assert.equal(calculateEstimateTotals(items, -10).discountPercent, 0);
  assert.equal(calculateEstimateTotals(items, 150).discountPercent, 100);
  assert.equal(calculateEstimateTotals(items, 150).grandTotal, 50025);
});

test('calculateLineTotal rounds fractional kopecks deterministically', () => {
  assert.equal(calculateLineTotal(19999, 3), 59997);
  assert.equal(calculateLineTotal(101, 0.5), 51);
  assert.equal(calculateLineTotal(0, 10), 0);
  assert.equal(calculateLineTotal(100, 0), 0);
});
