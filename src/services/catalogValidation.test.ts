import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRemoteCategories,
  validateRemoteConfig,
  validateRemoteDataset,
  validateRemoteIndex,
  validateRemoteManifest,
  validateRemoteSynonyms,
} from './catalogValidation';

test('catalog validation accepts the canonical profile structure', () => {
  const index = validateRemoteIndex({
    schemaVersion: 1,
    profiles: [{ id: 'plumbing', manifest: 'profiles/plumbing/manifest.json' }],
  });
  assert.equal(index.profiles[0]?.id, 'plumbing');

  const manifest = validateRemoteManifest({
    schemaVersion: 1,
    id: 'plumbing',
    name: 'Сантехника',
    description: 'Описание',
    icon: 'Wrench',
    color: 'sky',
    version: '1.0.1',
    locale: 'ru-RU',
    currency: 'RUB',
    files: {
      catalog: 'catalog.json',
      categories: 'categories.json',
      synonyms: 'search-synonyms.json',
      config: 'config.json',
    },
    itemCount: 1,
  }, 'plumbing');
  assert.equal(manifest.files.catalog, 'catalog.json');

  const categories = validateRemoteCategories({
    schemaVersion: 1,
    categories: [{ id: 'works', name: 'Работы' }],
  }, 'plumbing');
  const catalog = validateRemoteDataset({
    schemaVersion: 1,
    items: [{
      id: 'item-1',
      name: 'Монтаж',
      unit: 'шт',
      priceKopecks: 10000,
      categoryId: 'works',
      type: 'service',
    }],
  }, 'plumbing');
  assert.equal(categories[0]?.id, catalog.items[0]?.categoryId);

  const synonyms = validateRemoteSynonyms({
    schemaVersion: 1,
    groups: [['смеситель', 'кран-смеситель']],
  });
  assert.deepEqual(synonyms, [['смеситель', 'кран-смеситель']]);

  const config = validateRemoteConfig({
    schemaVersion: 1,
    profileId: 'plumbing',
    name: 'Сантехника',
    locale: 'ru-RU',
    currency: 'RUB',
  }, 'plumbing');
  assert.equal(config.profileId, 'plumbing');
});

test('catalog validation rejects traversal and unsafe numeric values', () => {
  assert.throws(() => validateRemoteIndex({
    schemaVersion: 1,
    profiles: [{ id: 'plumbing', manifest: 'profiles/plumbing/../manifest.json' }],
  }));

  assert.throws(() => validateRemoteManifest({
    schemaVersion: 1,
    id: 'plumbing',
    name: 'Сантехника',
    description: 'Описание',
    icon: 'Wrench',
    color: 'sky',
    version: '1.0.1',
    locale: 'ru-RU',
    currency: 'RUB',
    files: { catalog: '../catalog.json', categories: 'categories.json' },
  }, 'plumbing'));

  assert.throws(() => validateRemoteDataset({
    schemaVersion: 1,
    items: [{
      id: 'item-1',
      name: 'Монтаж',
      unit: 'шт',
      priceKopecks: Number.MAX_SAFE_INTEGER + 1,
      categoryId: 'works',
      type: 'service',
    }],
  }));
});
