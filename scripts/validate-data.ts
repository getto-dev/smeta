import {
  validateRemoteCategories,
  validateRemoteConfig,
  validateRemoteDataset,
  validateRemoteIndex,
  validateRemoteManifest,
  validateRemoteSynonyms,
} from '../src/services/catalogValidation.ts';
import { readFile } from 'node:fs/promises';

const DATA_ROOT = new URL('../data/', import.meta.url);

const readJson = async (path: string): Promise<unknown> => {
  const file = new URL(path, DATA_ROOT);
  return JSON.parse(await readFile(file, 'utf8')) as unknown;
};

const main = async () => {
  const index = validateRemoteIndex(await readJson('index.json'));

  for (const profile of index.profiles) {
    const manifest = validateRemoteManifest(await readJson(profile.manifest), profile.id);
    const base = 'profiles/' + profile.id + '/';

    const catalog = validateRemoteDataset(await readJson(base + manifest.files.catalog), profile.id);
    const categories = validateRemoteCategories(await readJson(base + manifest.files.categories), profile.id);
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
      validateRemoteSynonyms(await readJson(base + manifest.files.synonyms), profile.id);
    }

    if (manifest.files.config) {
      validateRemoteConfig(await readJson(base + manifest.files.config), profile.id);
    }

    console.log('Validated ' + profile.id + ': ' + catalog.items.length + ' items, ' + categories.length + ' categories.');
  }

  console.log('Dataset validation passed: ' + index.profiles.length + ' profile(s).');
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
