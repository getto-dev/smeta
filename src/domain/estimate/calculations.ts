import type { EstimateItem } from '../../types';

export interface EstimateTotals {
  subtotal: number;
  servicesSum: number;
  productsSum: number;
  discountPercent: number;
  discountAmount: number;
  grandTotal: number;
  totalCount: number;
  workCount: number;
  materialCount: number;
}

export function calculateLineTotal(priceKopecks: number, quantity: number): number {
  if (!Number.isFinite(priceKopecks) || priceKopecks < 0) return 0;
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  const total = Math.round(priceKopecks * quantity);
  return Number.isSafeInteger(total) && total >= 0 ? total : 0;
}

/** Calculates totals from canonical price + quantity values; the discount applies to works only. */
export function calculateEstimateTotals(items: EstimateItem[], discountPercent: number): EstimateTotals {
  let servicesSum = 0;
  let productsSum = 0;
  let workCount = 0;
  let materialCount = 0;

  for (const item of items) {
    const itemTotal = calculateLineTotal(item.price, item.quantity);
    if (item.type === 'material') {
      productsSum += itemTotal;
      materialCount += 1;
    } else {
      servicesSum += itemTotal;
      workCount += 1;
    }
  }

  const subtotal = servicesSum + productsSum;
  const clampedDiscount = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  const discountAmount = Math.round((servicesSum * clampedDiscount) / 100);
  const grandTotal = Math.max(0, servicesSum - discountAmount + productsSum);

  return {
    subtotal,
    servicesSum,
    productsSum,
    discountPercent: clampedDiscount,
    discountAmount,
    grandTotal,
    totalCount: items.length,
    workCount,
    materialCount,
  };
}
