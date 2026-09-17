import type { Estimate } from '../types';
import { storage } from './storage';

export interface EstimateRepository {
  save(estimate: Estimate): Promise<void>;
  get(id: string): Promise<Estimate | null>;
  getAll(): Promise<Estimate[]>;
  remove(id: string): Promise<void>;
  getActiveId(): string | null;
  setActiveId(id: string): void;
}

export const estimateRepository: EstimateRepository = {
  save: (estimate) => storage.saveEstimate(estimate),
  get: (id) => storage.getEstimate(id),
  getAll: () => storage.getAllEstimates(),
  remove: (id) => storage.deleteEstimate(id),
  getActiveId: () => storage.getActiveEstimateId(),
  setActiveId: (id) => storage.setActiveEstimateId(id),
};
