import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Edit3, Check, ShoppingBag, Wrench, Package, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { EstimateItem } from '../types';
import { formatCurrency } from '../services/exportService';
import { formatQuantity, changeQuantity } from '../utils/quantity';
import { Button, EditableNumberInput } from './ui';

interface EstimateTableProps {
  items: EstimateItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdatePrice: (id: string, priceKopecks: number) => void;
  onDeleteItem: (id: string) => void;
  onRestoreItem?: (item: EstimateItem) => void;
  onEditItem?: (item: EstimateItem) => void;
  onSwitchToCatalog?: () => void;
}

export const EstimateTable: React.FC<EstimateTableProps> = ({
  items,
  onUpdateQuantity,
  onUpdatePrice,
  onDeleteItem,
  onRestoreItem,
  onEditItem,
  onSwitchToCatalog,
}) => {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [deletedItem, setDeletedItem] = useState<EstimateItem | null>(null);
  const deleteTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
  }, []);

  const categorizedGroups = useMemo(() => {
    const map = new Map<string, { category: string; items: { item: EstimateItem; index: number }[]; sum: number }>();
    items.forEach((item, idx) => {
      const category = item.category || 'Общие работы';
      let group = map.get(category);
      if (!group) {
        group = { category, items: [], sum: 0 };
        map.set(category, group);
      }
      group.items.push({ item, index: idx + 1 });
      group.sum += Number.isFinite(item.total) ? item.total : Math.round(item.price * item.quantity);
    });
    return Array.from(map.values());
  }, [items]);

  const handleDelete = (item: EstimateItem) => {
    onDeleteItem(item.id);
    setDeletedItem(item);
    if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = window.setTimeout(() => {
      setDeletedItem(null);
      deleteTimerRef.current = null;
    }, 5000);
  };

  const handleUndo = () => {
    if (!deletedItem || !onRestoreItem) return;
    onRestoreItem(deletedItem);
    setDeletedItem(null);
    if (deleteTimerRef.current !== null) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  if (items.length === 0) {
    return (
      <div className="landscape-no-min-height flex min-h-[300px] flex-1 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-800/80 text-slate-500">
          <ShoppingBag className="h-7 w-7" />
        </div>
        <h3 className="mb-1 text-base font-bold text-white">Смета пока пуста</h3>
        <p className="mb-4 max-w-sm text-xs text-slate-400">Нажмите «В смету» в каталоге слева или добавьте нестандартную позицию вручную.</p>
        {onSwitchToCatalog && (
          <Button type="button" onClick={onSwitchToCatalog} className="lg:hidden">
            Открыть каталог позиций
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
      <div className="flex flex-shrink-0 items-center border-b border-slate-800 bg-slate-900/95 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white">Позиции сметы</h3>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 font-mono text-xs font-bold text-amber-400">{items.length}</span>
        </div>
      </div>

      <div className="mobile-scroll-safe min-h-0 flex-1 space-y-3 overflow-y-auto p-3 pb-24 pr-2 sm:p-4 sm:pb-4">
        {categorizedGroups.map(({ category, items: categoryItems, sum }) => {
          const collapsed = Boolean(collapsedCategories[category]);
          return (
            <div key={category} className="space-y-2 rounded-xl border border-slate-800/60 bg-slate-950/40 p-1.5">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="flex min-h-11 w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/90 px-2.5 py-1.5 text-left text-xs"
                aria-expanded={!collapsed}
              >
                <span className="flex items-center gap-1.5 font-bold text-slate-200">
                  {collapsed ? <ChevronRight className="h-4 w-4 text-amber-400" /> : <ChevronDown className="h-4 w-4 text-amber-400" />}
                  <span>{category}</span>
                  <span className="text-[11px] font-normal text-slate-400">({categoryItems.length})</span>
                </span>
                <span className="font-mono text-xs font-semibold text-amber-400/90">{formatCurrency(sum)}</span>
              </button>

              {!collapsed && (
                <div className="space-y-1.5 pt-0.5">
                  {categoryItems.map(({ item, index }) => {
                    const isEditingPrice = editingPriceId === item.id;
                    const isMaterial = item.type === 'material';

                    return (
                      <div key={item.id} className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-2.5 transition hover:border-slate-700 sm:p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 flex-1 items-start gap-2.5">
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-800 font-mono text-[10px] font-medium text-slate-400 sm:h-5 sm:w-5">{index}</span>
                            <div className="min-w-0 flex-1">
                              <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                                <span className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px] font-semibold ${isMaterial ? 'border-sky-500/30 bg-sky-500/15 text-sky-400' : 'border-amber-500/30 bg-amber-500/15 text-amber-400'}`}>
                                  {isMaterial ? <><Package className="h-3 w-3" />Материал</> : <><Wrench className="h-3 w-3" />Работа</>}
                                </span>
                              </div>
                              <h4 className="text-sm font-semibold leading-snug text-white">{item.name}</h4>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-2 sm:flex-row sm:items-center sm:justify-end sm:border-t-0 sm:pt-0">
                            <div className="flex items-center justify-between gap-2.5">
                              <div className="flex items-center rounded-xl border border-slate-700 bg-slate-950 p-0.5">
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.id, changeQuantity(item.quantity, -1))}
                                  title="Уменьшить"
                                  className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white active:scale-95 sm:h-7 sm:w-7 sm:text-xs"
                                  aria-label={`Уменьшить количество: ${item.name}`}
                                >
                                  −
                                </button>
                                <EditableNumberInput
                                  value={item.quantity}
                                  onCommit={(next) => onUpdateQuantity(item.id, next)}
                                  min={0.5}
                                  validate={(next) => Math.abs(next * 2 - Math.round(next * 2)) > 0.000001 ? 'Шаг: 0.5' : null}
                                  formatValue={(next) => formatQuantity(next)}
                                  ariaLabel={`Количество: ${item.name}`}
                                  title="Количество, шаг 0.5"
                                  enterKeyHint="done"
                                  className="w-14 border-0 bg-transparent px-1 text-center sm:w-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => onUpdateQuantity(item.id, changeQuantity(item.quantity, 1))}
                                  title="Увеличить"
                                  className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white active:scale-95 sm:h-7 sm:w-7 sm:text-xs"
                                  aria-label={`Увеличить количество: ${item.name}`}
                                >
                                  +
                                </button>
                              </div>
                              <span className="w-8 text-left text-[10px] font-medium text-slate-400 sm:w-7">{item.unit}</span>
                            </div>

                            <div className="flex items-center justify-between gap-2 sm:justify-end">
                              <div className="text-right">
                                {isEditingPrice ? (
                                  <EditableNumberInput
                                    value={item.price / 100}
                                    onCommit={(next) => {
                                      onUpdatePrice(item.id, Math.round(next * 100));
                                      setEditingPriceId(null);
                                    }}
                                    min={0}
                                    validate={(next) => Math.abs(next * 100 - Math.round(next * 100)) > 0.000001 ? 'Максимум 2 знака' : null}
                                    formatValue={(next) => String(Number(next.toFixed(2)))}
                                    ariaLabel={`Цена: ${item.name}`}
                                    title="Цена за единицу"
                                    enterKeyHint="done"
                                    className="w-24 text-right"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditingPriceId(item.id)}
                                    className="flex min-h-11 items-center justify-end gap-1 rounded-lg px-2 text-xs font-mono text-slate-300 transition hover:text-amber-400 sm:min-h-0"
                                    title="Изменить цену"
                                    aria-label={`Изменить цену: ${item.name}`}
                                  >
                                    <span>{formatCurrency(item.price)}</span>
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="w-20 text-right font-mono text-xs font-bold text-white sm:text-sm">{formatCurrency(item.total)}</div>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleDelete(item)}
                                className="min-h-11 min-w-11 px-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 sm:min-h-0 sm:min-w-0"
                                title="Удалить позицию"
                                aria-label={`Удалить позицию: ${item.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {onEditItem && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => onEditItem(item)}
                                  className="min-h-11 min-w-11 px-2 text-slate-400 hover:bg-slate-800 hover:text-white sm:min-h-0 sm:min-w-0"
                                  title="Редактировать позицию"
                                  aria-label={`Редактировать позицию: ${item.name}`}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {deletedItem && onRestoreItem && (
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/95 px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="min-w-0 text-xs text-slate-300">
            Удалено: <span className="font-semibold text-white">{deletedItem.name}</span>
          </div>
          <Button type="button" variant="secondary" onClick={handleUndo} className="shrink-0 px-3 text-xs">
            <RotateCcw className="h-4 w-4" />
            Отменить
          </Button>
        </div>
      )}
    </div>
  );
};
