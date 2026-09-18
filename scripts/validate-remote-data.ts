import {
  validateRemoteCategories,
  validateRemoteDataset,
  validateRemoteIndex,
  validateRemoteManifest,
  validateRemoteSynonyms,
  validateRemoteConfig,
} from '../src/services/catalogValidation.ts';

const BASE = 'https://raw.githubusercontent.com/getto-dev/smeta/main/data/';

const fetchJson = async (path: string): Promise<unknown> => {
  const url = BASE + path.replace(/^\/+/, '');
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + path);
  return response.json() as Promise<unknown>;
};

const main = async () => {
  const index = validateRemoteIndex(await fetchJson('index.json'));

  for (const profile of index.profiles) {
    const manifest = validateRemoteManifest(await fetchJson(profile.manifest), profile.id);
    const base = 'profiles/' + profile.id + '/';
    const catalog = validateRemoteDataset(await fetchJson(base + manifest.files.catalog), profile.id);
    const categories = validateRemoteCategories(await fetchJson(base + manifest.files.categories), profile.id);
    const categoryIds = new Set(categories.map((category) => category.id));

    for (const item of catalog.items) {
      if (!categoryIds.has(item.categoryId)) {
        throw new Error(profile.id + ': unknown category ' + item.categoryId + ' for ' + item.id);
      }
    }

    if (manifest.itemCount !== undefined && manifest.itemCount !== catalog.items.length) {
      throw new Error(profile.id + ': itemCount mismatch');
    }

    if (manifest.files.synonyms) {
      validateRemoteSynonyms(await fetchJson(base + manifest.files.synonyms), profile.id);
    }

    if (manifest.files.config) {
      validateRemoteConfig(await fetchJson(base + manifest.files.config), profile.id);
    }

    console.log('✓ ' + profile.id + ': ' + catalog.items.length + ' remote items');
  }

  console.log('✓ Remote catalog validation passed (' + index.profiles.length + ' profiles)');
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
