import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProfileCatalog, ProfileMeta } from '../types';
import { fetchProfileCatalog, fetchProfilesList } from '../services/profileService';
import { storage } from '../services/storage';

const DEFAULT_PROFILE_ID = 'plumbing';

export function useCatalogController() {
  const [profiles, setProfiles] = useState<ProfileMeta[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState(DEFAULT_PROFILE_ID);
  const [currentCatalog, setCurrentCatalog] = useState<ProfileCatalog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (profileId: string) => {
    const catalog = await fetchProfileCatalog(profileId);
    setCurrentProfileId(profileId);
    setCurrentCatalog(catalog);
    storage.setLastUsedProfileId(profileId);
    return catalog;
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const metas = await fetchProfilesList();
        if (!active) return;
        setProfiles(metas);
        const cachedProfileId = storage.getLastUsedProfileId();
        const profileId = metas.some((profile) => profile.id === cachedProfileId)
          ? cachedProfileId
          : metas[0]?.id || DEFAULT_PROFILE_ID;
        const catalog = await fetchProfileCatalog(profileId);
        if (!active) return;
        setCurrentProfileId(profileId);
        setCurrentCatalog(catalog);
        storage.setLastUsedProfileId(profileId);
      } catch (cause) {
        if (!active) return;
        console.error('Catalog initialization failed:', cause);
        setError(cause instanceof Error ? cause.message : 'Не удалось загрузить каталог.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void initialize();
    return () => { active = false; };
  }, []);

  const selectProfile = useCallback(async (profileId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const catalog = await loadProfile(profileId);
      return catalog;
    } catch (cause) {
      console.error('Profile change failed:', cause);
      setError(cause instanceof Error ? cause.message : 'Не удалось сменить профиль.');
      throw cause;
    } finally {
      setIsLoading(false);
    }
  }, [loadProfile]);

  const currentProfile = useMemo(
    () => profiles.find((profile) => profile.id === currentProfileId) || null,
    [profiles, currentProfileId],
  );

  return {
    profiles,
    currentProfile,
    currentProfileId,
    currentCatalog,
    isLoading,
    error,
    selectProfile,
  };
}
