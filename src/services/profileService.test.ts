import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfileCatalog, validateProfileMeta } from './profileService';

test('validateProfileCatalog requires stable category ids and integer kopecks', () => {
  const catalog = validateProfileCatalog({
    id: 'plumbing',
    name: 'Сантехника',
    description: '',
    icon: 'Wrench',
    categories: ['Работы'],
    items: [{ id: '1', name: 'Монтаж крана', category: 'Работы', categoryId: 'works', unit: 'шт', price: 12550, type: 'service' }],
  });

  assert.equal(catalog.items[0].categoryId, 'works');
  assert.equal(catalog.items[0].price, 12550);
  assert.equal(catalog.items[0].type, 'work');
  assert.throws(() => validateProfileCatalog({ ...catalog, items: [{ ...catalog.items[0], categoryId: '' }] }));
  assert.throws(() => validateProfileCatalog({ ...catalog, items: [{ ...catalog.items[0], price: 125.5 }] }));
});

test('validateProfileMeta rejects non-canonical manifest URLs', () => {
  assert.throws(() => validateProfileMeta([{
    id: 'plumbing',
    name: 'Сантехника',
    description: '',
    icon: 'Wrench',
    color: 'blue',
    manifestUrl: '/local/manifest.json',
    categories: ['Работы'],
  }]));
});
