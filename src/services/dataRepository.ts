import type { ProfileCatalog, ProfileMeta } from '../types';
import {
  MAX_CATALOG_ITEMS,
  REMOTE_DATA_BASE_URL,
  validateRemoteCategories,
  validateRemoteDataset,
  validateRemoteIndex,
  validateRemoteManifest,
  validateRemoteSynonyms,
  type RemoteIndex,
  type RemoteManifest,
} from './catalogValidation';

export { REMOTE_DATA_BASE_URL };

let indexCache: RemoteIndex | null = null;
const metadataCache = new Map<string, Promise<unknown>>();

export const remoteDataUrl = (path: string): string => {
  const cleanPath = path.replace(/^\/+/, '');
  if (!cleanPath || cleanPath.includes('..') || /^[a-z][a-z0-9+.-]*:/i.test(cleanPath)) {
    throw new Error('Некорректный путь удалённых данных');
  }
  return REMOTE_DATA_BASE_URL + cleanPath;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error('HTTP ' + response.status + ' при загрузке ' + url);
  return response.json() as Promise<T>;
}

async function fetchCachedMetadata<T>(url: string): Promise<T> {
  const cached = metadataCache.get(url);
  if (cached) return cached as Promise<T>;

  const request = fetchJson<T>(url);
  metadataCache.set(url, request);
  try {
    return await request;
  } catch (error) {
    metadataCache.delete(url);
    throw error;
  }
}

async function getRemoteIndex(): Promise<RemoteIndex> {
  if (!indexCache) {
    indexCache = validateRemoteIndex(await fetchCachedMetadata<unknown>(remoteDataUrl('index.json')));
  }
  return indexCache;
}

async function fetchRemoteProfile(profileId: string): Promise<{ entry: RemoteIndex['profiles'][number]; manifest: RemoteManifest }> {
  const index = await getRemoteIndex();
  const entry = index.profiles.find((profile) => profile.id === profileId);
  if (!entry) throw new Error('Профиль ' + profileId + ' отсутствует в удалённом index');

  const manifest = validateRemoteManifest(
    await fetchCachedMetadata<unknown>(remoteDataUrl(entry.manifest)),
    profileId,
  );
  return { entry, manifest };
}

export async function fetchRemoteProfileMetas(): Promise<ProfileMeta[]> {
  const index = await getRemoteIndex();

  return Promise.all(index.profiles.map(async (entry) => {
    const manifest = validateRemoteManifest(
      await fetchCachedMetadata<unknown>(remoteDataUrl(entry.manifest)),
      entry.id,
    );
    const categories = validateRemoteCategories(
      await fetchCachedMetadata<unknown>(remoteDataUrl('profiles/' + entry.id + '/' + manifest.files.categories)),
      entry.id,
    );

    return {
      id: entry.id,
      name: manifest.name,
      description: manifest.description,
      icon: manifest.icon,
      color: manifest.color,
      manifestUrl: remoteDataUrl(entry.manifest),
      categories: categories.map((category) => category.name),
      itemCount: manifest.itemCount,
      version: manifest.version,
    };
  }));
}

export async function fetchRemoteProfileCatalog(profileId: string): Promise<ProfileCatalog> {
  const { manifest } = await fetchRemoteProfile(profileId);

  const dataset = validateRemoteDataset(
    await fetchJson<unknown>(remoteDataUrl('profiles/' + profileId + '/' + manifest.files.catalog)),
    profileId,
  );

  const categories = validateRemoteCategories(
    await fetchCachedMetadata<unknown>(remoteDataUrl('profiles/' + profileId + '/' + manifest.files.categories)),
    profileId,
  );

  const synonyms = manifest.files.synonyms
    ? validateRemoteSynonyms(
      await fetchCachedMetadata<unknown>(remoteDataUrl('profiles/' + profileId + '/' + manifest.files.synonyms)),
      profileId,
    )
    : undefined;

  if (manifest.itemCount !== undefined && manifest.itemCount !== dataset.items.length) {
    throw new Error('Удалённый каталог ' + profileId + ': ожидалось ' + manifest.itemCount + ', получено ' + dataset.items.length);
  }

  const categoryMap = new Map(categories.map((category) => [category.id, category.name]));

  return {
    id: profileId,
    name: manifest.name,
    description: manifest.description,
    icon: manifest.icon,
    categories: categories.map((category) => category.name),
    items: dataset.items.map((item) => ({
      id: item.id,
      name: item.name,
      category: categoryMap.get(item.categoryId) ?? item.categoryId,
      categoryId: item.categoryId,
      unit: item.unit,
      price: item.priceKopecks,
      type: item.type === 'material' ? 'material' : 'work',
      description: item.description,
    })),
    synonyms,
  };
}
