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
