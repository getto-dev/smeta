import React, { useEffect, useMemo, useState } from 'react';
import { Check, Filter, ListFilter, Package, PlusCircle, Search, Wrench, X } from 'lucide-react';
import { CatalogItem, EstimateItem } from '../types';
import { formatCurrency } from '../services/exportService';
import { searchCatalogItems } from '../services/smartSearch';
import { formatQuantity, changeQuantity, normalizeQuantity } from '../utils/quantity';
import { Button, EditableNumberInput, Modal } from './ui';

interface CatalogBrowserProps {
  catalogItems: CatalogItem[];
  categories: string[];
  activeEstimateItems: EstimateItem[];
  synonyms?: string[][];
  onAddItem: (item: CatalogItem, quantity: number) => void;
  onOpenCustomModal: () => void;
}

export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({
  catalogItems,
  categories,
  activeEstimateItems,
  synonyms,
  onAddItem,
  onOpenCustomModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (selectedCategory !== 'all' && !categories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory]);

  const estimateQuantities = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of activeEstimateItems) {
      map.set(item.catalogId || item.id, (map.get(item.catalogId || item.id) || 0) + item.quantity);
    }
    return map;
  }, [activeEstimateItems]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of catalogItems) counts.set(item.category, (counts.get(item.category) || 0) + 1);
    return counts;
  }, [catalogItems]);

  const filteredItems = useMemo(() => {    return searchCatalogItems(
      catalogItems,
      searchQuery,
      selectedCategory === 'all' ? undefined : selectedCategory,
      synonyms,
    );
  }, [catalogItems, selectedCategory, searchQuery, synonyms]);

  const getItemQuantity = (itemId: string) => {
    const value = itemQuantities[itemId];
    return Number.isFinite(value) && value > 0 ? value : 1;
  };

  const handleQtyChange = (itemId: string, direction: -1 | 1) => {
    setItemQuantities((prev) => ({
      ...prev,
      [itemId]: changeQuantity(getItemQuantity(itemId), direction, 0.5),
    }));
  };

  const handleAdd = (item: CatalogItem) => {
    const qty = normalizeQuantity(getItemQuantity(item.id));
    onAddItem(item, qty);
    setItemQuantities((prev) => ({ ...prev, [item.id]: 1 }));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
      <div className="flex-shrink-0 space-y-3 border-b border-slate-800 bg-slate-900/95 p-3.5 backdrop-blur-xs sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="min-w-0 flex-1 justify-start truncate px-3 text-xs text-amber-400 sm:flex-none"
            title="Выбрать раздел каталога"
          >
            <ListFilter className="h-4 w-4 shrink-0" />
            <span className="truncate">{selectedCategory === 'all' ? 'Все разделы' : selectedCategory}</span>
          </Button>
          <Button
            id="add-custom-item-btn"
            type="button"
            onClick={onOpenCustomModal}
            className="shrink-0 px-3 text-xs text-amber-400 sm:text-sm"
            title="Добавить свою позицию, которой нет в каталоге"
          >
            <PlusCircle className="h-4 w-4 text-amber-400" />
            <span>+ Своя позиция</span>
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="catalog-search-input"
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию или синонимам"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-700/80 bg-slate-950 py-3 pl-9 pr-12 text-base text-white placeholder-slate-500 transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 sm:py-2 sm:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white sm:h-8 sm:w-8"
              title="Очистить поиск"
              aria-label="Очистить поиск"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mobile-scroll-safe landscape-no-min-height flex-1 min-h-0 space-y-2.5 overflow-y-auto p-3 pb-24 sm:p-4 sm:pb-4">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
            <Filter className="mb-2 h-8 w-8 text-slate-600" />
            <p className="text-sm font-medium text-slate-300">Ничего не найдено</p>
            <p className="mt-1 text-xs text-slate-500">Попробуйте другой запрос или добавьте позицию вручную.</p>
            <Button type="button" variant="primary" onClick={onOpenCustomModal} className="mt-3 px-4 text-xs">
              + Добавить вручную
            </Button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const currentQty = getItemQuantity(item.id);
            const inEstimateQty = estimateQuantities.get(item.id) || 0;
            const isMaterial = item.type === 'material';

            return (
              <div
                key={item.id}
                className={`flex flex-col gap-2.5 rounded-xl border p-3 transition sm:flex-row sm:items-center sm:justify-between ${
                  inEstimateQty > 0
                    ? 'border-slate-700/90 bg-slate-800/80 shadow-sm'
                    : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className="max-w-[180px] truncate text-[10px] font-medium text-slate-400">{item.category}</span>
                    <span className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                      isMaterial ? 'border-sky-500/30 bg-sky-500/15 text-sky-400' : 'border-amber-500/30 bg-amber-500/15 text-amber-400'
                    }`}>
                      {isMaterial ? <><Package className="h-3 w-3" />Материал</> : <><Wrench className="h-3 w-3" />Работа</>}
                    </span>
                    {inEstimateQty > 0 && (
                      <span className="flex items-center gap-0.5 rounded border border-emerald-500/40 bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                        <Check className="h-3 w-3" />
                        <span>в смете: {formatQuantity(inEstimateQty)} {item.unit}</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold leading-snug text-white sm:text-sm">{item.name}</h3>
                  {item.description && <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{item.description}</p>}
                </div>

                <div className="flex flex-col gap-2 border-t border-slate-800/60 pt-2 sm:flex-row sm:items-center sm:justify-end sm:border-t-0 sm:pt-0">
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <div className="font-mono text-xs font-bold text-amber-400 sm:text-sm">{formatCurrency(item.price)}</div>
                      <div className="text-[10px] text-slate-400">за 1 {item.unit}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center rounded-xl border border-slate-700 bg-slate-900 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.id, -1)}
                          title="Уменьшить"
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white active:scale-95 sm:h-7 sm:w-7 sm:text-xs"
                          aria-label={`Уменьшить количество: ${item.name}`}
                        >
                          −
                        </button>
                        <EditableNumberInput
                          value={currentQty}
                          onCommit={(next) => setItemQuantities((prev) => ({ ...prev, [item.id]: normalizeQuantity(next) }))}
                          min={0.5}
                          validate={(next) => Math.abs(next * 2 - Math.round(next * 2)) > 0.000001 ? 'Шаг: 0.5' : null}
                          formatValue={(next) => formatQuantity(next)}
                          ariaLabel={`Количество: ${item.name}`}
                          title="Количество, шаг 0.5"
                          enterKeyHint="done"
                          className="w-14 border-0 bg-transparent px-1 text-center sm:w-12"
                        />
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item.id, 1)}
                          title="Увеличить"
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white active:scale-95 sm:h-7 sm:w-7 sm:text-xs"
                          aria-label={`Увеличить количество: ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleAdd(item)}
                        className="shrink-0 px-3 text-xs"
                        title="Добавить в смету"
                      >
                        В смету
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        labelledBy="catalog-category-title"
        className="p-5 sm:max-w-lg sm:p-6"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400">
              <ListFilter className="h-5 w-5" />
            </div>
            <div>
              <h2 id="catalog-category-title" className="text-lg font-bold text-white">Выберите раздел</h2>
              <p className="text-xs text-slate-400">Фильтр позиций каталога</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => setIsCategoryModalOpen(false)} aria-label="Закрыть" className="min-w-11 px-2 text-xl sm:min-w-0">
            ×
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => { setSelectedCategory('all'); setIsCategoryModalOpen(false); }}
            className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
              selectedCategory === 'all'
                ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                : 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <div>
              <div className="text-sm font-semibold">Все разделы</div>
              <div className="text-[11px] text-slate-400">Все позиции каталога · {catalogItems.length}</div>
            </div>
            {selectedCategory === 'all' && <Check className="h-4 w-4 shrink-0" />}
          </button>

          {categories.map((category) => {
            const count = categoryCounts.get(category) || 0;
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => { setSelectedCategory(category); setIsCategoryModalOpen(false); }}
                className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                  isSelected
                    ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                    : 'border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{category}</div>
                  <div className="text-[11px] text-slate-400">Позиций: {count}</div>
                </div>
                {isSelected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};
