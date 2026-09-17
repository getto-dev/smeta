import { Estimate, EstimateItem, ESTIMATE_SCHEMA_VERSION } from '../types';
import { calculateLineTotal, calculateEstimateTotals } from '../domain/estimate/calculations';
import { normalizeEstimateItem } from '../domain/estimate/model';

export const MAX_ESTIMATE_ITEMS = 5000;
export const MAX_NAME_LENGTH = 300;
export const MAX_CATEGORY_LENGTH = 200;
export const MAX_UNIT_LENGTH = 50;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_PHONE_LENGTH = 100;
export const MAX_ADDRESS_LENGTH = 500;
export const MAX_NOTES_LENGTH = 2000;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasText(value: unknown, maxLength: number, allowEmpty = false): value is string {
  if (typeof value !== 'string' || value.length > maxLength) return false;
  return allowEmpty || value.trim().length > 0;
}

function hasOptionalText(value: unknown, maxLength: number): value is string | undefined {
  return value === undefined || hasText(value, maxLength, true);
}

export function isValidEstimateItem(value: unknown): value is EstimateItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<EstimateItem>;
  if (!hasText(item.id, MAX_NAME_LENGTH) || !hasText(item.name, MAX_NAME_LENGTH) || !hasText(item.category, MAX_CATEGORY_LENGTH) || !hasText(item.categoryId, MAX_NAME_LENGTH) || !hasText(item.unit, MAX_UNIT_LENGTH)) return false;
  if (!isFiniteNumber(item.price) || !Number.isSafeInteger(item.price) || item.price < 0) return false;
  if (!isFiniteNumber(item.quantity) || item.quantity <= 0) return false;
  if (!isFiniteNumber(item.total) || !Number.isSafeInteger(item.total) || item.total < 0) return false;
  const exactLineTotal = item.price * item.quantity;
  if (!Number.isSafeInteger(Math.round(exactLineTotal))) return false;
  if (item.total !== calculateLineTotal(item.price, item.quantity)) return false;
  if (!hasOptionalText(item.description, MAX_DESCRIPTION_LENGTH)) return false;
  return item.type === undefined || item.type === 'work' || item.type === 'material';
}

export function isValidEstimate(value: unknown): value is Estimate {
  if (!value || typeof value !== 'object') return false;
  const estimate = value as Partial<Estimate>;
  if (estimate.schemaVersion !== ESTIMATE_SCHEMA_VERSION) return false;
  if (!hasText(estimate.id, MAX_NAME_LENGTH) || !hasText(estimate.title, MAX_NAME_LENGTH, true) || !hasText(estimate.customer, MAX_NAME_LENGTH, true) || !hasText(estimate.companyName, MAX_NAME_LENGTH, true) || !hasText(estimate.date, 50) || !hasOptionalText(estimate.phone, MAX_PHONE_LENGTH) || !hasOptionalText(estimate.address, MAX_ADDRESS_LENGTH) || !hasOptionalText(estimate.notes, MAX_NOTES_LENGTH) || !hasText(estimate.profileId, MAX_NAME_LENGTH)) return false;
  if (!Array.isArray(estimate.items) || estimate.items.length > MAX_ESTIMATE_ITEMS || !estimate.items.every(isValidEstimateItem)) return false;
  if (!isFiniteNumber(estimate.discount) || estimate.discount < 0 || estimate.discount > 100) return false;
  if (!isFiniteNumber(estimate.subtotal) || !Number.isSafeInteger(estimate.subtotal) || estimate.subtotal < 0) return false;
  if (estimate.servicesSubtotal !== undefined && (!isFiniteNumber(estimate.servicesSubtotal) || !Number.isSafeInteger(estimate.servicesSubtotal) || estimate.servicesSubtotal < 0)) return false;
  if (estimate.materialsSubtotal !== undefined && (!isFiniteNumber(estimate.materialsSubtotal) || !Number.isSafeInteger(estimate.materialsSubtotal) || estimate.materialsSubtotal < 0)) return false;
  if (!isFiniteNumber(estimate.total) || !Number.isSafeInteger(estimate.total) || estimate.total < 0) return false;
  if (!isFiniteNumber(estimate.createdAt) || estimate.createdAt < 0 || !isFiniteNumber(estimate.updatedAt) || estimate.updatedAt < 0) return false;

  const totals = calculateEstimateTotals(estimate.items, estimate.discount);
  return estimate.subtotal === totals.subtotal
    && estimate.servicesSubtotal === totals.servicesSum
    && estimate.materialsSubtotal === totals.productsSum
    && estimate.total === totals.grandTotal
    && estimate.discount === totals.discountPercent;
}

export function parseStoredEstimate(value: unknown): Estimate | null {
  if (!isValidEstimate(value)) return null;
  return {
    ...value,
    items: value.items.map((item) => normalizeEstimateItem(item)),
  };
}

export function filterValidEstimates(value: unknown): Estimate[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseStoredEstimate).filter((estimate): estimate is Estimate => estimate !== null);
}
