import type { Estimate } from '../../types';

export function getEstimateNumber(estimate: Pick<Estimate, 'date'>): string {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(estimate.date || '');
  if (!match) {
    const now = new Date();
    return String(now.getFullYear()).slice(-2)
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0')
      + '-01';
  }
  return match[1].slice(-2) + match[2] + match[3] + '-01';
}
