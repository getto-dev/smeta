import test from 'node:test';
import assert from 'node:assert/strict';
import { searchCatalogItems, tokenizeQuery } from './smartSearch';
import type { CatalogItem } from '../types';

const catalog: CatalogItem[] = [
  { id: '1', name: 'Монтаж смесителя', category: 'Сантехника', categoryId: 'plumbing', unit: 'шт', price: 100000, type: 'work' },
  { id: '2', name: 'Радиатор алюминиевый', category: 'Отопление', categoryId: 'heating', unit: 'шт', price: 500000, type: 'material' },
  { id: '3', name: 'Розетка двойная', category: 'Электрика', categoryId: 'electrical', unit: 'шт', price: 30000, type: 'material' },
  { id: '4', name: 'Кран шаровой', category: 'Сантехника', categoryId: 'plumbing', unit: 'шт', price: 70000, type: 'material' },
];

test('tokenizeQuery removes stop words and normalizes decimal comma', () => {
  assert.deepEqual(tokenizeQuery('кран для 2,5 м'), ['кран', '2.5']);
});

test('searchCatalogItems supports construction synonyms', () => {
  assert.equal(searchCatalogItems(catalog, 'кран')[0]?.id, '4');
  assert.equal(searchCatalogItems(catalog, 'розетка')[0]?.id, '3');
});

test('searchCatalogItems combines global and profile-specific synonyms', () => {
  const catalogWithSink: CatalogItem[] = [
    ...catalog,
    { id: '6', name: 'Умывальник подвесной', category: 'Сантехника', categoryId: 'plumbing', unit: 'шт', price: 90000, type: 'material' },
  ];

  assert.equal(searchCatalogItems(catalogWithSink, 'мойка', undefined, [['раковина', 'мойка']])[0]?.id, '6');
  assert.equal(searchCatalogItems(catalog, 'кран', undefined, [['насосная станция', 'гидроузел']])[0]?.id, '4');
});

test('searchCatalogItems respects category filter', () => {
  const result = searchCatalogItems(catalog, '', 'Отопление');
  assert.deepEqual(result.map((item) => item.id), ['2']);
});

test('searchCatalogItems supports close typos in product names', () => {
  const result = searchCatalogItems(catalog, 'смеситил');
  assert.equal(result[0]?.id, '1');
});

test('searchCatalogItems requires every significant query token to match', () => {
  const result = searchCatalogItems(catalog, 'кран двойная');
  assert.deepEqual(result, []);
});

test('searchCatalogItems preserves numeric query tokens', () => {
  const numericCatalog: CatalogItem[] = [
    ...catalog,
    { id: '5', name: 'Труба 2.5x20', category: 'Сантехника', categoryId: 'plumbing', unit: 'м', price: 12000, type: 'material' },
  ];
  assert.equal(searchCatalogItems(numericCatalog, '2,5x20')[0]?.id, '5');
});

test('searchCatalogItems returns no results for unknown terms', () => {
  assert.deepEqual(searchCatalogItems(catalog, 'космический трансформатор'), []);
});
