import { create } from 'zustand';
import type { CatalogItem, Estimate, EstimateItem } from '../types';
import { estimateRepository } from '../services/estimateRepository';
import { createEmptyEstimate, normalizeEstimateItem, recalculateEstimate } from '../domain/estimate/model';
import { calculateEstimateTotals } from '../domain/estimate/calculations';
import type { EstimateTotals } from '../domain/estimate/calculations';
import { normalizeQuantity } from '../utils/quantity';
import { isValidEstimate, MAX_ESTIMATE_ITEMS } from '../utils/validation';

export type SaveStatus = 'saved' | 'saving' | 'error';

type EstimateStore = {
  estimate: Estimate;
  isLoaded: boolean;
  saveStatus: SaveStatus;
  totals: EstimateTotals;
  initialize: (profileId?: string, profileName?: string) => Promise<void>;
  addItem: (item: CatalogItem | Omit<EstimateItem, 'id' | 'total'>, quantity?: number) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  updateItemPrice: (id: string, priceKopecks: number) => void;
  deleteItem: (id: string) => void;
  clearEstimate: () => void;
  updateDiscount: (discount: number) => void;
  createNewEstimate: (profileId?: string, profileName?: string) => Promise<void>;
  updateMetadata: (metadata: Partial<Estimate>) => void;
  restoreEstimate: (restored: Estimate) => Promise<void>;
};

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let saveOperationId = 0;
let saveQueue: Promise<void> = Promise.resolve();
let initializationPromise: Promise<void> | null = null;

const persistEstimate = (estimate: Estimate, setStatus: (status: SaveStatus) => void) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  const operationId = ++saveOperationId;
  setStatus('saving');
  saveTimeout = setTimeout(async () => {
    saveTimeout = null;
    saveQueue = saveQueue
      .catch(() => undefined)
      .then(async () => {
        await estimateRepository.save(estimate);
        estimateRepository.setActiveId(estimate.id);
      });

    try {
      await saveQueue;
      if (operationId === saveOperationId) setStatus('saved');
    } catch (error) {
      console.error('Failed to auto-save estimate:', error);
      if (operationId === saveOperationId) setStatus('error');
    }
  }, 250);
};

const cancelPendingSave = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = null;
};

const rebuild = (estimate: Estimate, items = estimate.items, discount = estimate.discount) =>
  recalculateEstimate(estimate, items, discount);

export const useEstimateStore = create<EstimateStore>((set, get) => ({
  estimate: createEmptyEstimate(),
  isLoaded: false,
  saveStatus: 'saved',
  totals: calculateEstimateTotals([], 0),

  initialize: async (profileId = 'plumbing', profileName = 'Сантехника') => {
    if (initializationPromise) return initializationPromise;
    const run = async () => {
      try {
        const activeId = estimateRepository.getActiveId();
        let loaded = activeId ? await estimateRepository.get(activeId) : null;
        if (!loaded) {
          const all = await estimateRepository.getAll();
          loaded = all[0] ?? null;
        }

        if (loaded && isValidEstimate(loaded)) {
          const validated = rebuild(loaded);
          const profileSynced = validated.profileId === profileId && validated.profileName === profileName
            ? validated
            : rebuild({ ...validated, profileId, profileName });
          const totals = calculateEstimateTotals(profileSynced.items, profileSynced.discount);
          set({ estimate: profileSynced, totals, isLoaded: true, saveStatus: 'saved' });
          estimateRepository.setActiveId(profileSynced.id);
          if (profileSynced.profileId !== validated.profileId || profileSynced.profileName !== validated.profileName) {
            await estimateRepository.save(profileSynced);
          }
          return;
        }

        const initial = createEmptyEstimate(profileId, profileName);
        await estimateRepository.save(initial);
        estimateRepository.setActiveId(initial.id);
        set({ estimate: initial, totals: calculateEstimateTotals([], 0), isLoaded: true, saveStatus: 'saved' });
      } catch (error) {
        console.error('Failed to initialize estimate:', error);
        const current = get().estimate;
        set({ totals: calculateEstimateTotals(current.items, current.discount), isLoaded: true, saveStatus: 'error' });
      }
    };

    initializationPromise = run();
    try {
      await initializationPromise;
    } finally {
      initializationPromise = null;
    }
  },

  addItem: (item, quantity = 1) => {
    const safeQuantity = normalizeQuantity(quantity);
    const safeName = String(item.name || '').trim().slice(0, 300) || 'Позиция без названия';
    const safeCategory = String(item.category || '').trim().slice(0, 200) || 'Общие работы';
    const safeCategoryId = String(item.categoryId || '').trim().slice(0, 128) || 'manual';
    const safeUnit = String(item.unit || '').trim().slice(0, 50) || 'шт';
    const safeDescription = item.description ? String(item.description).slice(0, 1000) : undefined;
    const safePrice = Number.isFinite(Number(item.price)) && Number(item.price) >= 0 ? Math.round(Number(item.price)) : 0;

    set((state) => {
      if (state.estimate.items.length >= MAX_ESTIMATE_ITEMS) return state;
      const catalogId = 'id' in item ? item.id : undefined;
      const index = state.estimate.items.findIndex((entry) =>
        (catalogId && entry.catalogId === catalogId) || (!catalogId && entry.name === safeName && entry.unit === safeUnit),
      );

      const items = index >= 0
        ? state.estimate.items.map((entry, itemIndex) => itemIndex === index
          ? normalizeEstimateItem({ ...entry, quantity: entry.quantity + safeQuantity })
          : entry)
        : [...state.estimate.items, normalizeEstimateItem({
          id: '', catalogId, name: safeName, description: safeDescription,
          category: safeCategory, categoryId: safeCategoryId, unit: safeUnit,
          price: safePrice, quantity: safeQuantity, total: 0, type: item.type || 'work',
        })];

      const updated = rebuild(state.estimate, items);
      const totals = calculateEstimateTotals(updated.items, updated.discount);
      persistEstimate(updated, (status) => set({ saveStatus: status }));
      return { estimate: updated, totals };
    });
  },

  updateItemQuantity: (id, quantity) => {
    set((state) => {
      const safeQuantity = Number.isFinite(quantity) ? normalizeQuantity(quantity) : 1;
      const items = quantity <= 0
        ? state.estimate.items.filter((item) => item.id !== id)
        : state.estimate.items.map((item) => item.id === id ? normalizeEstimateItem({ ...item, quantity: safeQuantity }) : item);
      const updated = rebuild(state.estimate, items);
      const totals = calculateEstimateTotals(updated.items, updated.discount);
      persistEstimate(updated, (status) => set({ saveStatus: status }));
      return { estimate: updated, totals };
    });
  },

  updateItemPrice: (id, priceKopecks) => {
    if (!Number.isFinite(priceKopecks) || priceKopecks < 0) return;
    set((state) => {
      const items = state.estimate.items.map((item) => item.id === id ? normalizeEstimateItem({ ...item, price: priceKopecks }) : item);
      const updated = rebuild(state.estimate, items);
      const totals = calculateEstimateTotals(updated.items, updated.discount);
      persistEstimate(updated, (status) => set({ saveStatus: status }));
      return { estimate: updated, totals };
    });
  },

  deleteItem: (id) => {
    set((state) => {
      const updated = rebuild(state.estimate, state.estimate.items.filter((item) => item.id !== id));
      const totals = calculateEstimateTotals(updated.items, updated.discount);
      persistEstimate(updated, (status) => set({ saveStatus: status }));
      return { estimate: updated, totals };
    });
  },

  clearEstimate: () => {
    set((state) => {
      const updated = rebuild(state.estimate, []);
      const totals = calculateEstimateTotals([], updated.discount);
      persistEstimate(updated, (status) => set({ saveStatus: status }));
      return { estimate: updated, totals };
    });
  },

  updateDiscount: (discount) => {
    set((state) => {
      const updated = rebuild(state.estimate, state.estimate.items, discount);
      const totals = calculateEstimateTotals(updated.items, updated.discount);
      persistEstimate(updated, (status) => set({ saveStatus: status }));
      return { estimate: updated, totals };
    });
  },

  createNewEstimate: async (profileId, profileName) => {
    cancelPendingSave();
    const current = get().estimate;
    if (get().isLoaded && isValidEstimate(current)) {
      try {
        await estimateRepository.save(current);
      } catch (error) {
        console.error('Failed to preserve current estimate:', error);
      }
    }

    const fresh = createEmptyEstimate(profileId || current.profileId, profileName || current.profileName);
    set({ estimate: fresh, totals: calculateEstimateTotals([], 0), saveStatus: 'saving' });
    try {
      await estimateRepository.save(fresh);
      estimateRepository.setActiveId(fresh.id);
      set({ saveStatus: 'saved' });
    } catch (error) {
      console.error('Failed to persist new estimate:', error);
      set({ saveStatus: 'error' });
    }
  },

  updateMetadata: (metadata) => {
    set((state) => {
      const updated = rebuild({ ...state.estimate, ...metadata });
      const totals = calculateEstimateTotals(updated.items, updated.discount);
      persistEstimate(updated, (status) => set({ saveStatus: status }));
      return { estimate: updated, totals };
    });
  },

  restoreEstimate: async (restored) => {
    if (!isValidEstimate(restored)) throw new Error('Imported estimate data is invalid');
    cancelPendingSave();
    const normalized = rebuild(restored);
    const totals = calculateEstimateTotals(normalized.items, normalized.discount);
    set({ estimate: normalized, totals, saveStatus: 'saving' });
    try {
      await estimateRepository.save(normalized);
      estimateRepository.setActiveId(normalized.id);
      set({ saveStatus: 'saved' });
    } catch (error) {
      set({ saveStatus: 'error' });
      throw error;
    }
  },
}));

export type { EstimateTotals } from '../domain/estimate/calculations';
export { calculateEstimateTotals } from '../domain/estimate/calculations';
