import { Estimate, ProfileCatalog, ProfileMeta } from '../types';
import { filterValidEstimates, parseStoredEstimate, isValidEstimate } from '../utils/validation';
const DB_NAME = 'SmetaProDB';
const DB_VERSION = 3;
const ESTIMATES_STORE = 'estimates';
const PROFILES_STORE = 'cached_profiles';
const ACTIVE_ESTIMATE_KEY = 'smetapro_active_estimate_id';
const LOCALSTORAGE_ESTIMATES_KEY = 'smetapro_estimates_v2';
const LEGACY_LOCALSTORAGE_ESTIMATES_KEY = 'smetapro_estimates_v1';
const LOCALSTORAGE_PROFILES_KEY = 'smetapro_profiles_v1';

export function migrateEstimateStorageValues(currentRaw: string | null, legacyRaw: string | null): { estimates: Estimate[]; migrated: boolean } {
  const current = currentRaw ? filterValidEstimates(JSON.parse(currentRaw)) : [];
  const legacy = legacyRaw ? filterValidEstimates(JSON.parse(legacyRaw)) : [];
  if (legacy.length === 0) return { estimates: current, migrated: false };
  const byId = new Map(current.map((estimate) => [estimate.id, estimate]));
  for (const estimate of legacy) if (!byId.has(estimate.id)) byId.set(estimate.id, estimate);
  return { estimates: [...byId.values()], migrated: true };
}

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isIndexedDBAvailable: boolean;
  constructor() {
    this.isIndexedDBAvailable = typeof window !== 'undefined' && 'indexedDB' in window;
    if (this.isIndexedDBAvailable) this.initDB();
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
            if (store && !store.indexNames.contains('updatedAt')) store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(PROFILES_STORE)) db.createObjectStore(PROFILES_STORE, { keyPath: 'id' });
        };
        request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
        request.onerror = () => { this.isIndexedDBAvailable = false; this.dbPromise = null; reject(request.error); };
      } catch (err) { this.isIndexedDBAvailable = false; this.dbPromise = null; reject(err); }
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
        this.saveToLocalStorageEstimates(normalized);
        return;
      } catch (err) { console.warn('IndexedDB save failed, using localStorage fallback', err); }
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
      } catch (err) { console.warn('IndexedDB get failed, checking localStorage fallback', err); }
    }
    return this.getFromLocalStorageEstimates().find((estimate) => estimate.id === id) || null;
  }
  async getAllEstimates(): Promise<Estimate[]> {
    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        const items = await new Promise<Estimate[]>((resolve, reject) => {
          const tx = db.transaction(ESTIMATES_STORE, 'readonly');
          const request = tx.objectStore(ESTIMATES_STORE).getAll();
          request.onsuccess = () => resolve(filterValidEstimates(request.result));
          request.onerror = () => reject(request.error);
        });
        if (items.length > 0) return items.sort((a, b) => b.updatedAt - a.updatedAt);
      } catch (err) { console.warn('IndexedDB getAll failed, reading localStorage', err); }
    }
    return this.getFromLocalStorageEstimates().sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async deleteEstimate(id: string): Promise<void> {
    if (!id) return;
    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(ESTIMATES_STORE, 'readwrite');
          const request = tx.objectStore(ESTIMATES_STORE).delete(id);
          request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
        });
      } catch (err) { console.warn('IndexedDB delete failed, continuing with localStorage', err); }
    }
    const estimates = this.getFromLocalStorageEstimates().filter((estimate) => estimate.id !== id);
    try { localStorage.setItem(LOCALSTORAGE_ESTIMATES_KEY, JSON.stringify(estimates)); } catch (err) { console.error(err); }
    if (this.getActiveEstimateId() === id) { try { localStorage.removeItem(ACTIVE_ESTIMATE_KEY); } catch { /* ignore */ } }
  }
  private migrateLegacyLocalStorageEstimates(): void {
    try {
      const currentRaw = localStorage.getItem(LOCALSTORAGE_ESTIMATES_KEY);
      const legacyRaw = localStorage.getItem(LEGACY_LOCALSTORAGE_ESTIMATES_KEY);
      const migration = migrateEstimateStorageValues(currentRaw, legacyRaw);
      if (!migration.migrated) return;
      localStorage.setItem(LOCALSTORAGE_ESTIMATES_KEY, JSON.stringify(migration.estimates));
      localStorage.removeItem(LEGACY_LOCALSTORAGE_ESTIMATES_KEY);
    } catch { /* ignore migration errors; normal fallback handles missing data */ }
  }
  private getFromLocalStorageEstimates(): Estimate[] {
    try { const raw = localStorage.getItem(LOCALSTORAGE_ESTIMATES_KEY); return raw ? filterValidEstimates(JSON.parse(raw)) : []; } catch { return []; }
  }
  private saveToLocalStorageEstimates(estimate: Estimate): void {
    try { const all = this.getFromLocalStorageEstimates(); const idx = all.findIndex((entry) => entry.id === estimate.id); if (idx >= 0) all[idx] = estimate; else all.push(estimate); localStorage.setItem(LOCALSTORAGE_ESTIMATES_KEY, JSON.stringify(all)); } catch (err) { console.error('LocalStorage write error', err); }
  }
  getActiveEstimateId(): string | null { try { return localStorage.getItem(ACTIVE_ESTIMATE_KEY); } catch { return null; } }
  setActiveEstimateId(id: string): void { try { localStorage.setItem(ACTIVE_ESTIMATE_KEY, id); } catch (err) { console.error(err); } }
  async saveCachedProfile(profile: ProfileCatalog): Promise<void> {
    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        await new Promise<void>((resolve, reject) => { const tx = db.transaction(PROFILES_STORE, 'readwrite'); const request = tx.objectStore(PROFILES_STORE).put(profile); request.onerror = () => reject(request.error); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted')); });
      } catch (err) { console.warn('Failed to cache profile in IndexedDB', err); }
    }
    try { localStorage.setItem(`${LOCALSTORAGE_PROFILES_KEY}_${profile.id}`, JSON.stringify(profile)); } catch (err) { console.warn('LocalStorage profile cache error', err); }
  }
  async getCachedProfile(id: string): Promise<ProfileCatalog | null> {
    if (!id) return null;
    if (this.isIndexedDBAvailable) {
      try {
        const db = await this.initDB();
        const profile = await new Promise<ProfileCatalog | null>((resolve, reject) => { const tx = db.transaction(PROFILES_STORE, 'readonly'); const request = tx.objectStore(PROFILES_STORE).get(id); request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error); });
        if (profile) return profile;
      } catch (err) { console.warn('IndexedDB getCachedProfile failed', err); }
    }
    try { const raw = localStorage.getItem(`${LOCALSTORAGE_PROFILES_KEY}_${id}`); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  saveCachedProfilesMeta(list: ProfileMeta[]): void { try { localStorage.setItem('smetapro_profiles_meta_list', JSON.stringify(list)); } catch (err) { console.error(err); } }
  getCachedProfilesMeta(): ProfileMeta[] | null { try { const raw = localStorage.getItem('smetapro_profiles_meta_list'); return raw ? JSON.parse(raw) : null; } catch { return null; } }
  getLastUsedProfileId(): string { try { return localStorage.getItem('smetapro_last_profile_id') || 'plumbing'; } catch { return 'plumbing'; } }
  setLastUsedProfileId(id: string): void { try { localStorage.setItem('smetapro_last_profile_id', id); } catch (err) { console.error(err); } }
}
export const storage = new StorageService();
