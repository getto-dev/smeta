import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLineTotal } from './calculations';

test('calculateLineTotal rounds fractional quantities to integer kopecks', () => {
  assert.equal(calculateLineTotal(19999, 1.5), 29999);
});

test('calculateLineTotal rejects non-finite values', () => {
  assert.equal(calculateLineTotal(Number.NaN, 1), 0);
  assert.equal(calculateLineTotal(Number.POSITIVE_INFINITY, 1), 0);
  assert.equal(calculateLineTotal(100, Number.NaN), 0);
  assert.equal(calculateLineTotal(100, Number.POSITIVE_INFINITY), 0);
});

test('calculateLineTotal rejects results outside JavaScript safe integer range', () => {
  assert.equal(calculateLineTotal(Number.MAX_SAFE_INTEGER, 2), 0);
  assert.equal(calculateLineTotal(4_503_599_627_370_496, 1), 4_503_599_627_370_496);
});


test('discount applies only to work subtotal', () => {
  const items = [
    { id: 'work', name: 'Работа', category: 'Работы', categoryId: 'works', unit: 'шт', price: 10000, quantity: 1, total: 10000, type: 'work' as const },
    { id: 'material', name: 'Материал', category: 'Материалы', categoryId: 'materials', unit: 'шт', price: 20000, quantity: 1, total: 20000, type: 'material' as const },
  ];
  const totals = calculateEstimateTotals(items, 10);
  assert.equal(totals.discountAmount, 1000);
  assert.equal(totals.grandTotal, 29000);
});
