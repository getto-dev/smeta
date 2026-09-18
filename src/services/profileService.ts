import type { ProfileCatalog, ProfileMeta, CatalogItem } from '../types';
import {
  MAX_CATALOG_ITEMS,
  MAX_CATEGORY,
  MAX_DESCRIPTION,
  MAX_NAME,
  MAX_ID,
  MAX_UNIT,
  PROFILE_ID_RE,
  REMOTE_DATA_BASE_URL,
} from './catalogValidation';
import { profileRepository } from './profileRepository';
import { fetchRemoteProfileCatalog, fetchRemoteProfileMetas } from './dataRepository';

const MAX_ITEM_CODE_LENGTH = 100;
const REMOTE_MANIFEST_BASE = REMOTE_DATA_BASE_URL;

function isTrustedManifestUrl(value: string): boolean {
  try {
    const expected = new URL(REMOTE_MANIFEST_BASE);
    const actual = new URL(value);
    return actual.origin === expected.origin
      && actual.pathname.startsWith(expected.pathname)
      && !actual.pathname.includes('..')
      && actual.pathname.endsWith('/manifest.json');
  } catch {
    return false;
  }
}

export function validateProfileMeta(data: unknown): ProfileMeta[] {
  if (!Array.isArray(data)) throw new Error('Некорректный список профилей: ожидается массив');

  const seenIds = new Set<string>();
  return data.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error('Профиль #' + (index + 1) + ' имеет неверный формат');

    const profile = item as Partial<ProfileMeta>;
    const id = typeof profile.id === 'string' ? profile.id.trim() : '';
    const name = typeof profile.name === 'string' ? profile.name.trim() : '';
    const manifestUrl = typeof profile.manifestUrl === 'string' ? profile.manifestUrl.trim() : '';

    if (!id || !PROFILE_ID_RE.test(id)) throw new Error('Профиль #' + (index + 1) + ' имеет неверный id');
    if (seenIds.has(id)) throw new Error('Дублирующийся id профиля: ' + id);
    seenIds.add(id);
    if (!name || name.length > 200) throw new Error('Профиль ' + id + ' имеет неверное название');
    if (!isTrustedManifestUrl(manifestUrl)) throw new Error('Профиль ' + id + ' имеет недоверенный manifest URL');
    if (!Array.isArray(profile.categories)) throw new Error('Профиль ' + id + ' не имеет категорий');

    const categories = profile.categories.map((category) => typeof category === 'string' ? category.trim() : '');
    if (categories.some((category) => !category || category.length > MAX_CATEGORY)) {
      throw new Error('Профиль ' + id + ' содержит некорректную категорию');
    }

    const itemCount = profile.itemCount;
    if (itemCount !== undefined && (!Number.isInteger(itemCount) || itemCount < 0 || itemCount > MAX_CATALOG_ITEMS)) {
      throw new Error('Профиль ' + id + ' содержит некорректное количество позиций');
    }

    return {
      id,
      name,
      description: typeof profile.description === 'string' ? profile.description.slice(0, MAX_DESCRIPTION) : '',
      icon: typeof profile.icon === 'string' && profile.icon.length <= 50 ? profile.icon : 'Wrench',
      color: typeof profile.color === 'string' && profile.color.length <= 50 ? profile.color : 'blue',
      manifestUrl,
      categories,
      itemCount,
      version: typeof profile.version === 'string' ? profile.version.slice(0, 100) : undefined,
    };
  });
}

export function validateProfileCatalog(data: unknown): ProfileCatalog {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Каталог должен быть объектом');

  const catalog = data as Partial<ProfileCatalog>;
  const id = typeof catalog.id === 'string' ? catalog.id.trim() : '';
  const name = typeof catalog.name === 'string' ? catalog.name.trim() : '';

  if (!id || !PROFILE_ID_RE.test(id)) throw new Error('Каталог содержит неверный id');
  if (!name || name.length > 200) throw new Error('Каталог содержит неверное название');
  if (!Array.isArray(catalog.items) || catalog.items.length > MAX_CATALOG_ITEMS) {
    throw new Error('Каталог содержит некорректный список позиций');
  }

  if (!Array.isArray(catalog.categories)) throw new Error('Каталог не содержит корректный список категорий');
  const categories = catalog.categories.map((category) => typeof category === 'string' ? category.trim() : '');
  if (categories.some((category) => !category || category.length > MAX_CATEGORY)) {
    throw new Error('Каталог содержит некорректную категорию');
  }
  const categoryNames = new Set(categories);
  const validItems: CatalogItem[] = [];
  const seenIds = new Set<string>();

  for (let idx = 0; idx < catalog.items.length; idx += 1) {
    const raw = catalog.items[idx];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('Позиция каталога #' + (idx + 1) + ' некорректна');
    }

    const item = raw as Partial<CatalogItem>;
    const itemId = typeof item.id === 'string' ? item.id.trim() : '';
    const itemName = typeof item.name === 'string' ? item.name.trim() : '';
    const category = typeof item.category === 'string' ? item.category.trim() : '';
    const categoryId = typeof item.categoryId === 'string' ? item.categoryId.trim() : '';
    const unit = typeof item.unit === 'string' ? item.unit.trim() : '';
    const price = item.price;

    if (!itemId || itemId.length > MAX_ID || seenIds.has(itemId)) {
      throw new Error('Позиция #' + (idx + 1) + ' имеет неверный id');
    }
    if (!itemName || itemName.length > MAX_NAME) throw new Error('Позиция ' + itemId + ' имеет неверное название');
    if (!category || category.length > MAX_CATEGORY) throw new Error('Позиция ' + itemId + ' имеет неверную категорию');
    if (!categoryId || categoryId.length > MAX_ID) throw new Error('Позиция ' + itemId + ' имеет неверный categoryId');
    if (categories.length > 0 && !categoryNames.has(category)) throw new Error('Позиция ' + itemId + ' ссылается на неизвестную категорию');
    if (!unit || unit.length > MAX_UNIT) throw new Error('Позиция ' + itemId + ' имеет неверную единицу измерения');
    if (!Number.isSafeInteger(price) || price < 0) throw new Error('Позиция ' + itemId + ' имеет неверную цену');
    if (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > MAX_DESCRIPTION)) {
      throw new Error('Позиция ' + itemId + ' имеет слишком длинное описание');
    }
    if (item.code !== undefined && (typeof item.code !== 'string' || item.code.length > MAX_ITEM_CODE_LENGTH)) {
      throw new Error('Позиция ' + itemId + ' имеет неверный код');
    }
    if (rawType !== undefined && rawType !== 'work' && rawType !== 'material' && rawType !== 'service') {
      throw new Error('Позиция ' + itemId + ' имеет неверный type');
    }

    seenIds.add(itemId);
    validItems.push({
      id: itemId,
      name: itemName,
      category,
      categoryId,
      unit,
      price,
      type: rawType === 'material' ? 'material' : 'work',
      description: typeof item.description === 'string' ? item.description : undefined,
      code: typeof item.code === 'string' ? item.code : undefined,
    });
  }

  return {
    id,
    name,
    description: typeof catalog.description === 'string' ? catalog.description.slice(0, MAX_DESCRIPTION) : '',
    icon: typeof catalog.icon === 'string' && catalog.icon.length <= 50 ? catalog.icon : 'Wrench',
    categories,
    items: validItems,
    synonyms: catalog.synonyms === undefined ? undefined : (() => {
      if (!Array.isArray(catalog.synonyms)) throw new Error('Каталог содержит некорректные синонимы');
      return catalog.synonyms.map((group, index) => {
        if (!Array.isArray(group) || group.length < 2 || group.some((entry) => typeof entry !== 'string' || !entry.trim())) {
          throw new Error('Некорректная группа синонимов #' + (index + 1));
        }
        return group.map((entry) => entry.trim());
      });
    })(),
  };
}

export async function fetchProfilesList(): Promise<ProfileMeta[]> {
  try {
    const profiles = validateProfileMeta(await fetchRemoteProfileMetas());
    profileRepository.saveMetaList(profiles);
    return profiles;
  } catch (error) {
    console.warn('Remote profile index failed, checking offline cache', error);
    const cached = profileRepository.getMetaList();
    if (cached?.length) {
      try {
        return validateProfileMeta(cached);
      } catch (cacheError) {
        console.warn('Cached profiles are invalid', cacheError);
      }
    }
    throw new Error('Каталоги недоступны: подключитесь к интернету хотя бы один раз для первоначальной загрузки.');
  }
}

export async function fetchProfileCatalog(profileId: string): Promise<ProfileCatalog> {
  const safeProfileId = profileId.trim();
  if (!PROFILE_ID_RE.test(safeProfileId)) throw new Error('Некорректный идентификатор профиля.');

  const cached = await profileRepository.getCatalog(safeProfileId);

  try {
    const catalog = validateProfileCatalog(await fetchRemoteProfileCatalog(safeProfileId));
    if (catalog.id !== safeProfileId) throw new Error('ID каталога не совпадает с профилем');
    await profileRepository.saveCatalog(catalog);
    return catalog;
  } catch (error) {
    console.warn('Remote catalog for ' + safeProfileId + ' failed, using cached catalog', error);

    if (cached) {
      try {
        const validCached = validateProfileCatalog(cached);
        if (validCached.id === safeProfileId) return validCached;
      } catch (cacheError) {
        console.warn('Cached catalog for ' + safeProfileId + ' is invalid', cacheError);
      }
    }

    throw new Error('Каталог «' + safeProfileId + '» не найден в сети или кеше.');
  }
}
