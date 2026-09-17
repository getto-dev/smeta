import type { ProfileCatalog, ProfileMeta } from '../types';
import { storage } from './storage';

export interface ProfileRepository {
  saveCatalog(profile: ProfileCatalog): Promise<void>;
  getCatalog(id: string): Promise<ProfileCatalog | null>;
  saveMetaList(profiles: ProfileMeta[]): void;
  getMetaList(): ProfileMeta[] | null;
}

export const profileRepository: ProfileRepository = {
  saveCatalog: (profile) => storage.saveCachedProfile(profile),
  getCatalog: (id) => storage.getCachedProfile(id),
  saveMetaList: (profiles) => storage.saveCachedProfilesMeta(profiles),
  getMetaList: () => storage.getCachedProfilesMeta(),
};
