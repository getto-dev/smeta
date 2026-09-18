export const REMOTE_DATA_BASE_URL = 'https://raw.githubusercontent.com/getto-dev/smeta/main/data/';
export const PROFILE_ID_RE = /^[a-z0-9_-]{1,64}$/i;

export const MAX_CATALOG_ITEMS = 100_000;
export const MAX_PROFILE_NAME = 200;
export const MAX_NAME = 300;
export const MAX_DESCRIPTION = 1000;
export const MAX_UNIT = 50;
export const MAX_CATEGORY = 200;
export const MAX_ID = 128;

export type RemoteIndexEntry = { id: string; manifest: string };
export type RemoteIndex = { schemaVersion: 1; profiles: RemoteIndexEntry[] };

export type RemoteManifest = {
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  version: string;
  locale: string;
  currency: string;
  files: {
    catalog: string;
    categories: string;
    synonyms?: string;
    config?: string;
  };
  itemCount?: number;
};

export type RemoteCategory = { id: string; name: string };
export type RemoteCategoryFile = { schemaVersion: 1; categories: RemoteCategory[] };

export type RemoteDatasetItem = {
  id: string;
  name: string;
  description?: string;
  unit: string;
  priceKopecks: number;
  categoryId: string;
  type: 'service' | 'material';
};
export type RemoteDataset = { schemaVersion: 1; items: RemoteDatasetItem[] };

export type RemoteSynonymsFile = { schemaVersion: 1; groups: string[][] };
export type RemoteConfig = {
  schemaVersion: 1;
  profileId: string;
  name: string;
  locale: string;
  currency: string;
  features?: Record<string, unknown>;
};

const assertObject = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(label + ' must be an object');
  return value as Record<string, unknown>;
};

const assertString = (value: unknown, label: string, maxLength = Number.POSITIVE_INFINITY): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) throw new Error(label + ' must be a non-empty string');
  return value.trim();
};

const assertSafeFileName = (value: unknown, label: string): string => {
  const name = assertString(value, label, 200);
  if (!/^[a-zA-Z0-9._-]+\\.json$/.test(name) || name.includes('..')) throw new Error(label + ' must be a simple JSON file name');
  return name;
};

export const validateRemoteIndex = (value: unknown): RemoteIndex => {
  const index = assertObject(value, 'index');
  if (index.schemaVersion !== 1 || !Array.isArray(index.profiles) || index.profiles.length === 0) {
    throw new Error('index has invalid schema');
  }

  const seen = new Set<string>();
  const profiles = index.profiles.map((raw, position) => {
    const entry = assertObject(raw, 'index profile #' + (position + 1));
    const id = assertString(entry.id, 'index profile id', 64);
    if (!PROFILE_ID_RE.test(id) || seen.has(id)) throw new Error('index profile id is invalid or duplicated: ' + id);
    const manifest = assertString(entry.manifest, 'index profile manifest', 200);
    if (manifest !== 'profiles/' + id + '/manifest.json') throw new Error('index manifest path must match profile id: ' + id);
    seen.add(id);
    return { id, manifest };
  });

  return { schemaVersion: 1, profiles };
};

export const validateRemoteManifest = (value: unknown, expectedProfileId: string): RemoteManifest => {
  const manifest = assertObject(value, 'manifest');
  if (manifest.schemaVersion !== 1) throw new Error(expectedProfileId + ': unsupported manifest schema');

  const id = assertString(manifest.id, expectedProfileId + ' manifest id', 64);
  if (!PROFILE_ID_RE.test(id) || id !== expectedProfileId) throw new Error(expectedProfileId + ': manifest id mismatch');

  const name = assertString(manifest.name, expectedProfileId + ' name', MAX_PROFILE_NAME);
  const description = assertString(manifest.description, expectedProfileId + ' description', MAX_DESCRIPTION);
  const icon = assertString(manifest.icon, expectedProfileId + ' icon', 50);
  const color = assertString(manifest.color, expectedProfileId + ' color', 50);
  const version = assertString(manifest.version, expectedProfileId + ' version', 100);
  const locale = assertString(manifest.locale, expectedProfileId + ' locale', 50);
  const currency = assertString(manifest.currency, expectedProfileId + ' currency', 3);
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error(expectedProfileId + ': currency must be ISO-4217 style code');

  const files = assertObject(manifest.files, expectedProfileId + ' files');
  const catalog = assertSafeFileName(files.catalog, expectedProfileId + ' catalog file');
  const categories = assertSafeFileName(files.categories, expectedProfileId + ' categories file');
  const synonyms = files.synonyms === undefined ? undefined : assertSafeFileName(files.synonyms, expectedProfileId + ' synonyms file');
  const config = files.config === undefined ? undefined : assertSafeFileName(files.config, expectedProfileId + ' config file');

  const itemCount = manifest.itemCount === undefined ? undefined : manifest.itemCount;
  if (itemCount !== undefined && (!Number.isInteger(itemCount) || itemCount < 0 || itemCount > MAX_CATALOG_ITEMS)) {
    throw new Error(expectedProfileId + ': invalid itemCount');
  }

  return { schemaVersion: 1, id, name, description, icon, color, version, locale, currency, files: { catalog, categories, synonyms, config }, itemCount };
};

export const validateRemoteCategories = (value: unknown, profileId = 'catalog'): RemoteCategory[] => {
  const file = assertObject(value, profileId + ' categories');
  if (file.schemaVersion !== 1 || !Array.isArray(file.categories)) throw new Error(profileId + ': invalid categories schema');

  const seen = new Set<string>();
  return file.categories.map((raw, index) => {
    const category = assertObject(raw, profileId + ' category #' + (index + 1));
    const id = assertString(category.id, profileId + ' category id', MAX_ID);
    const name = assertString(category.name, profileId + ' category name', MAX_CATEGORY);
    if (seen.has(id)) throw new Error(profileId + ': duplicate category id ' + id);
    seen.add(id);
    return { id, name };
  });
};

export const validateRemoteDataset = (value: unknown, profileId = 'catalog'): RemoteDataset => {
  const dataset = assertObject(value, profileId + ' catalog');
  if (dataset.schemaVersion !== 1 || !Array.isArray(dataset.items) || dataset.items.length > MAX_CATALOG_ITEMS) {
    throw new Error(profileId + ': invalid catalog schema');
  }

  const seen = new Set<string>();
  const items = dataset.items.map((raw, index) => {
    const item = assertObject(raw, profileId + ' item #' + (index + 1));
    const id = assertString(item.id, profileId + ' item id', MAX_ID);
    const name = assertString(item.name, profileId + ' item ' + id + ' name', MAX_NAME);
    const unit = assertString(item.unit, profileId + ' item ' + id + ' unit', MAX_UNIT);
    const categoryId = assertString(item.categoryId, profileId + ' item ' + id + ' categoryId', MAX_ID);
    const description = item.description === undefined ? undefined : assertString(item.description, profileId + ' item ' + id + ' description', MAX_DESCRIPTION);
    const priceKopecks = item.priceKopecks;
    const type = item.type;
    if (!Number.isSafeInteger(priceKopecks) || priceKopecks < 0) throw new Error(profileId + ' item ' + id + ': invalid safe integer price');
    if (type !== 'service' && type !== 'material') throw new Error(profileId + ' item ' + id + ': invalid type');
    if (seen.has(id)) throw new Error(profileId + ': duplicate item id ' + id);
    seen.add(id);
    return { id, name, unit, categoryId, priceKopecks, description, type };
  });

  return { schemaVersion: 1, items };
};

export const validateRemoteSynonyms = (value: unknown, profileId = 'catalog'): string[][] => {
  const file = assertObject(value, profileId + ' synonyms');
  if (file.schemaVersion !== 1 || !Array.isArray(file.groups)) throw new Error(profileId + ': invalid synonyms schema');
  return file.groups.map((raw, index) => {
    if (!Array.isArray(raw) || raw.length < 2 || raw.some((term) => typeof term !== 'string' || !term.trim())) {
      throw new Error(profileId + ': invalid synonym group #' + (index + 1));
    }
    return raw.map((term) => term.trim());
  });
};

export const validateRemoteConfig = (value: unknown, expectedProfileId: string): RemoteConfig => {
  const config = assertObject(value, expectedProfileId + ' config');
  if (config.schemaVersion !== 1 || config.profileId !== expectedProfileId) throw new Error(expectedProfileId + ': invalid config schema');
  const name = assertString(config.name, expectedProfileId + ' config name', MAX_PROFILE_NAME);
  const locale = assertString(config.locale, expectedProfileId + ' config locale', 50);
  const currency = assertString(config.currency, expectedProfileId + ' config currency', 3);
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error(expectedProfileId + ': config currency is invalid');
  if (config.features !== undefined && (!config.features || typeof config.features !== 'object' || Array.isArray(config.features))) {
    throw new Error(expectedProfileId + ': config features must be an object');
  }
  return { schemaVersion: 1, profileId: expectedProfileId, name, locale, currency, features: config.features as Record<string, unknown> | undefined };
};
