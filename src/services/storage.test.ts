import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateEstimateStorageValues } from './storage';
import type { Estimate } from '../types';

const makeEstimate = (id: string, updatedAt: number): Estimate => ({
  schemaVersion: 1,
  id,
  title: `Estimate ${id}`,
  customer: '',
  companyName: '',
  date: '2026-01-01',
  profileId: 'plumbing',
  profileName: 'Сантехника',
  items: [],
  discount: 0,
  subtotal: 0,
  servicesSubtotal: 0,
  materialsSubtotal: 0,
  total: 0,
  createdAt: updatedAt - 100,
  updatedAt,
});

test('migrateEstimateStorageValues keeps current estimates when legacy storage is empty', () => {
  const current = [makeEstimate('current', 200)];
  const result = migrateEstimateStorageValues(JSON.stringify(current), JSON.stringify([]));
  assert.deepEqual(result.estimates, current);
  assert.equal(result.migrated, false);
});

test('migrateEstimateStorageValues imports legacy estimates without duplicates', () => {
  const current = [makeEstimate('shared', 200), makeEstimate('current', 300)];
  const legacy = [makeEstimate('shared', 100), makeEstimate('legacy', 150)];
  const result = migrateEstimateStorageValues(JSON.stringify(current), JSON.stringify(legacy));
  assert.deepEqual(result.estimates, [current[0], current[1], legacy[1]]);
  assert.equal(result.migrated, true);
});

test('migrateEstimateStorageValues ignores invalid persisted entries', () => {
  const current = [makeEstimate('current', 200)];
  const legacy = [makeEstimate('legacy', 100), { id: 'broken', items: [] }];
  const result = migrateEstimateStorageValues(JSON.stringify(current), JSON.stringify(legacy));
  assert.deepEqual(result.estimates.map((estimate) => estimate.id), ['current', 'legacy']);
  assert.equal(result.migrated, true);
});

test('migrateEstimateStorageValues keeps the newest copy when the same id exists in both stores', () => {
  const current = [makeEstimate('shared', 100)];
  const legacy = [makeEstimate('shared', 200)];
  const result = migrateEstimateStorageValues(JSON.stringify(current), JSON.stringify(legacy));
  assert.equal(result.estimates.length, 1);
  assert.equal(result.estimates[0]?.updatedAt, 200);
  assert.equal(result.migrated, true);
});
