# Data

Канонические данные, которые использует СметаПро.

- `index.json` — список доступных профилей.
- `profiles/<id>/manifest.json` — метаданные профиля и ссылки на его файлы.
- `profiles/<id>/catalog.json` — позиции каталога.
- `profiles/<id>/categories.json` — стабильные идентификаторы категорий и их названия.
- `profiles/<id>/search-synonyms.json` — дополнительные поисковые синонимы.
- `profiles/<id>/config.json` — настройки профиля.
- `schema/` — JSON Schema для каждого формата данных.

Перед merge данные проверяются общим валидатором, который используется локальным CI, remote-check и runtime.

Источником истины является этот каталог внутри `getto-dev/smeta`. Репозиторий `getto-dev/check-data` оставлен только как legacy snapshot для обратной совместимости.
