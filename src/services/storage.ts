import type { Estimate, ProfileCatalog, ProfileMeta } from '../types';
import { filterValidEstimates, isValidEstimate, parseStoredEstimate } from '../utils/validation';

const DB_NAME = 'SmetaProDB';
const DB_VERSION = 3;
const ESTIMATES_STORE = 'estimates';
const PROFILES_STORE = 'cached_profiles';
const ACTIVE_ESTIMATE_KEY = 'smetapro_active_estimate_id';
const LOCALSTORAGE_ESTIMATES_KEY = 'smetapro_estimates_v2';
const LEGACY_LOCALSTORAGE_ESTIMATES_KEY = 'smetapro_estimates_v1';
const LOCALSTORAGE_PROFILES_KEY = 'smetapro_profiles_v1';
const LOCALSTORAGE_PROFILES_META_KEY = 'smetapro_profiles_meta_list';

function readStoredEstimates(raw: string | null): Estimate[] {
  if (!raw) return [];
  try {
    return filterValidEstimates(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function migrateEstimateStorageValues(
  currentRaw: string | null,
  legacyRaw: string | null,
): { estimates: Estimate[]; migrated: boolean } {
  const current = readStoredEstimates(currentRaw);
  const legacy = readStoredEstimates(legacyRaw);
  if (legacy.length === 0) return { estimates: current, migrated: false };

  const byId = new Map(current.map((estimate) => [estimate.id, estimate]));
  for (const estimate of legacy) {
    const existing = byId.get(estimate.id);
    if (!existing || estimate.updatedAt > existing.updatedAt) byId.set(estimate.id, estimate);
  }
  return { estimates: [...byId.values()], migrated: true };
}

function mergeEstimates(...lists: Estimate[][]): Estimate[] {
  const byId = new Map<string, Estimate>();
  for (const list of lists) {
    for (const estimate of list) {
      const existing = byId.get(estimate.id);
      if (!existing || estimate.updatedAt >= existing.updatedAt) byId.set(estimate.id, estimate);
    }
  }
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isIndexedDBAvailable: boolean;

  constructor() {
    this.isIndexedDBAvailable = typeof window !== 'undefined' && 'indexedDB' in window;
    if (this.isIndexedDBAvailable) void this.initDB().catch(() => undefined);
    this.migrateLegacyLocalStorageEstimates();
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains(ESTIMATES_STORE)) {
            const store = db.createObjectStore(ESTIMATES_STORE, { keyPath: 'id' });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          } else if (event.oldVersion < 3) {
            const store = (event.target as IDBOpenDBRequest).transaction?.objectStore(ESTIMATES_STORE);
            if (store && !store.indexNames.contains('updatedAt')) {
              store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
          }

          if (!db.objectStoreNames.contains(PROFILES_STORE)) {
            db.createObjectStore(PROFILES_STORE, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => db.close();
          resolve(db);
        };

        request.onerror = () => {
          this.isIndexedDBAvailable = false;
          this.dbPromise = null;
          reject(request.error);
        };
      } catch (error) {
        this.isIndexedDBAvailable = false;
        this.dbPromise = null;
        reject(error);
      }
    });

    return this.dbPromise;
  }

  async saveEstimate(estimate: Estimate): Promise<void> {
    if (!isValidEstimate(estimate)) throw new Error('Attempted to save invalid estimate data');

    const normalized = { ...estimate, updatedAt: Date.now() };

    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(ESTIMATES_STORE, 'readwrite');
          const request = tx.objectStore(ESTIMATES_STORE).put(normalized);
          request.onerror = () => reject(request.error);
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
        });
      } catch (error) {
        console.warn('IndexedDB save failed, using localStorage backup', error);
      }
    }

    this.saveToLocalStorageEstimates(normalized);
  }

  async getEstimate(id: string): Promise<Estimate | null> {
    if (!id) return null;

    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        const item = await new Promise<Estimate | null>((resolve, reject) => {
          const tx = db.transaction(ESTIMATES_STORE, 'readonly');
          const request = tx.objectStore(ESTIMATES_STORE).get(id);
          request.onsuccess = () => resolve(parseStoredEstimate(request.result));
          request.onerror = () => reject(request.error);
        });
        if (item) return item;
      } catch (error) {
        console.warn('IndexedDB get failed, checking localStorage backup', error);
      }
    }

    return readStoredEstimates(localStorage.getItem(LOCALSTORAGE_ESTIMATES_KEY))
      .find((estimate) => estimate.id === id) || null;
  }

  async getAllEstimates(): Promise<Estimate[]> {
    let indexed: Estimate[] = [];

    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        indexed = await new Promise<Estimate[]>((resolve, reject) => {
          const tx = db.transaction(ESTIMATES_STORE, 'readonly');
          const request = tx.objectStore(ESTIMATES_STORE).getAll();
          request.onsuccess = () => resolve(filterValidEstimates(request.result));
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.warn('IndexedDB getAll failed, reading localStorage backup', error);
      }
    }

    const local = readStoredEstimates(localStorage.getItem(LOCALSTORAGE_ESTIMATES_KEY));
    return mergeEstimates(indexed, local);
  }

  async deleteEstimate(id: string): Promise<void> {
    if (!id) return;

    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(ESTIMATES_STORE, 'readwrite');
          const request = tx.objectStore(ESTIMATES_STORE).delete(id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
        });
      } catch (error) {
        console.warn('IndexedDB delete failed, continuing with localStorage', error);
      }
    }

    const estimates = readStoredEstimates(localStorage.getItem(LOCALSTORAGE_ESTIMATES_KEY))
      .filter((estimate) => estimate.id !== id);

    try {
      localStorage.setItem(LOCALSTORAGE_ESTIMATES_KEY, JSON.stringify(estimates));
    } catch (error) {
      console.error('LocalStorage delete error', error);
    }

    if (this.getActiveEstimateId() === id) {
      try {
        localStorage.removeItem(ACTIVE_ESTIMATE_KEY);
      } catch {
        // Ignore storage errors.
      }
    }
  }

  private migrateLegacyLocalStorageEstimates(): void {
    try {
      const migration = migrateEstimateStorageValues(
        localStorage.getItem(LOCALSTORAGE_ESTIMATES_KEY),
        localStorage.getItem(LEGACY_LOCALSTORAGE_ESTIMATES_KEY),
      );
      if (!migration.migrated) return;

      localStorage.setItem(LOCALSTORAGE_ESTIMATES_KEY, JSON.stringify(migration.estimates));
      localStorage.removeItem(LEGACY_LOCALSTORAGE_ESTIMATES_KEY);
    } catch (error) {
      console.warn('Legacy estimate migration failed', error);
    }
  }

  private saveToLocalStorageEstimates(estimate: Estimate): void {
    try {
      const all = readStoredEstimates(localStorage.getItem(LOCALSTORAGE_ESTIMATES_KEY));
      const next = all.filter((entry) => entry.id !== estimate.id);
      next.push(estimate);
      localStorage.setItem(LOCALSTORAGE_ESTIMATES_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('LocalStorage write error', error);
    }
  }

  getActiveEstimateId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_ESTIMATE_KEY);
    } catch {
      return null;
    }
  }

  setActiveEstimateId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_ESTIMATE_KEY, id);
    } catch (error) {
      console.error('Active estimate write error', error);
    }
  }

  async saveCachedProfile(profile: ProfileCatalog): Promise<void> {
    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(PROFILES_STORE, 'readwrite');
          const request = tx.objectStore(PROFILES_STORE).put(profile);
          request.onerror = () => reject(request.error);
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
        });
      } catch (error) {
        console.warn('Failed to cache profile in IndexedDB', error);
      }
    }

    try {
      localStorage.setItem(LOCALSTORAGE_PROFILES_KEY + '_' + profile.id, JSON.stringify(profile));
    } catch (error) {
      console.warn('LocalStorage profile cache error', error);
    }
  }

  async getCachedProfile(id: string): Promise<ProfileCatalog | null> {
    if (!id) return null;

    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        const profile = await new Promise<ProfileCatalog | null>((resolve, reject) => {
          const tx = db.transaction(PROFILES_STORE, 'readonly');
          const request = tx.objectStore(PROFILES_STORE).get(id);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
        if (profile) return profile;
      } catch (error) {
        console.warn('IndexedDB getCachedProfile failed', error);
      }
    }

    try {
      const raw = localStorage.getItem(LOCALSTORAGE_PROFILES_KEY + '_' + id);
      return raw ? JSON.parse(raw) as ProfileCatalog : null;
    } catch {
      return null;
    }
  }

  saveCachedProfilesMeta(list: ProfileMeta[]): void {
    try {
      localStorage.setItem(LOCALSTORAGE_PROFILES_META_KEY, JSON.stringify(list));
    } catch (error) {
      console.error('Profile meta cache write error', error);
    }
  }

  getCachedProfilesMeta(): ProfileMeta[] | null {
    try {
      const raw = localStorage.getItem(LOCALSTORAGE_PROFILES_META_KEY);
      return raw ? JSON.parse(raw) as ProfileMeta[] : null;
    } catch {
      return null;
    }
  }

  getLastUsedProfileId(): string {
    try {
      return localStorage.getItem('smetapro_last_profile_id') || 'plumbing';
    } catch {
      return 'plumbing';
    }
  }

  setLastUsedProfileId(id: string): void {
    try {
      localStorage.setItem('smetapro_last_profile_id', id);
    } catch (error) {
      console.error('Last profile write error', error);
    }
  }
}

export const storage = new StorageService();
