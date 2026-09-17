import type { Estimate, EstimateItem } from '../../types';
import { ESTIMATE_SCHEMA_VERSION } from '../../types';
import { createId } from '../../utils/id';
import { normalizeQuantity } from '../../utils/quantity';
import { calculateEstimateTotals, calculateLineTotal } from './calculations';

export const createEmptyEstimate = (
  profileId = 'plumbing',
  profileName = 'Сантехника',
): Estimate => {
  const date = new Date().toISOString().split('T')[0];
  const now = Date.now();
  return {
    schemaVersion: ESTIMATE_SCHEMA_VERSION,
    id: createId('est'),
    title: '',
    customer: '',
    companyName: '',
    date,
    phone: '',
    address: '',
    notes: '',
    profileId,
    profileName,
    items: [],
    discount: 0,
    subtotal: 0,
    servicesSubtotal: 0,
    materialsSubtotal: 0,
    total: 0,
    createdAt: now,
    updatedAt: now,
  };
};

export const normalizeEstimateItem = (item: EstimateItem, id = item.id): EstimateItem => {
  const quantity = normalizeQuantity(item.quantity);
  const price = Math.max(0, Math.round(item.price));
  return {
    ...item,
    id: id || createId('item'),
    price,
    quantity,
    total: calculateLineTotal(price, quantity),
  };
};

export const recalculateEstimate = (
  estimate: Estimate,
  items = estimate.items,
  discount = estimate.discount,
): Estimate => {
  const normalizedItems = items.map((item) => normalizeEstimateItem(item));
  const totals = calculateEstimateTotals(normalizedItems, discount);
  return {
    ...estimate,
    schemaVersion: ESTIMATE_SCHEMA_VERSION,
    items: normalizedItems,
    discount: totals.discountPercent,
    subtotal: totals.subtotal,
    servicesSubtotal: totals.servicesSum,
    materialsSubtotal: totals.productsSum,
    total: totals.grandTotal,
    updatedAt: Date.now(),
  };
};
