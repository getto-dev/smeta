# Data layer — СметаПро 2.0

`checknew` — самостоятельное приложение. Формат данных и архитектура проекта не зависят от `getto-dev/check`.

## Каноническая модель сметы

`Estimate` имеет собственную `schemaVersion`. Все денежные значения (`price`, `total`, `subtotal`, `servicesSubtotal`, `materialsSubtotal`) хранятся как целые копейки. Отображение рублей выполняется только на границе UI/экспорта.

Расчёты находятся в `src/domain/estimate/calculations.ts` и вычисляются из `price + quantity`. Поля итогов — производные данные, а validation отклоняет смету, если они не совпадают с пересчитанными значениями.

Поток данных:

```text
UI
 ↓
Zustand store
 ↓
domain calculations
 ↓
estimateRepository
 ↓
storage
 ↓
IndexedDB / localStorage fallback
```

## Storage

Сметы хранятся в IndexedDB. Для отказоустойчивости используется localStorage fallback. Начиная с DB version 2 хранилище смет намеренно не мигрирует старую модель данных: прежние записи считаются устаревшими и должны быть пересозданы в `checknew`.

Будущие изменения схемы самого `checknew` должны получать явную версию и отдельную миграцию.

## Catalog

Каталог приходит из `https://github.com/getto-dev/check-data` и проходит проверку структуры до попадания в runtime. Позиции используют стабильный `categoryId`; отображаемое название категории не является идентификатором.

Валидированный профиль сохраняется в IndexedDB и используется как offline cache. При недоступной сети приложение пытается использовать последний валидный cached profile.

## Remote data

`index.json` → `manifest.json` → `categories.json` + `catalog.json` + optional synonyms.

`catalog.json` хранит `priceKopecks` и `categoryId`. Runtime-адаптер преобразует `priceKopecks` в каноническое поле `CatalogItem.price`, которое также выражено в копейках.

## PWA

Service Worker использует `NetworkFirst` для remote JSON. Устаревшие cache очищаются при обновлении, а новая версия приложения активируется автоматически. Remote catalog cache имеет отдельное имя и ограниченный срок жизни.

## Export / import

Экспорт и импорт принимают только текущую каноническую схему `checknew`. Файлы без корректного `schemaVersion` не восстанавливаются. Legacy-форматы `check` намеренно не поддерживаются.
