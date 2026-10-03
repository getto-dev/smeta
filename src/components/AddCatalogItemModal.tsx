import React, { useEffect, useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { CatalogItem } from '../types';
import { formatCurrency } from '../services/exportService';
import { formatQuantity, normalizeQuantity } from '../utils/quantity';
import { Button, EditableNumberInput, Modal } from './ui';

interface AddCatalogItemModalProps {
  item: CatalogItem | null;
  isOpen: boolean;
  currentQuantity: number;
  onClose: () => void;
  onAddItem: (item: CatalogItem, quantity: number) => void;
}

export const AddCatalogItemModal: React.FC<AddCatalogItemModalProps> = ({
  item,
  isOpen,
  currentQuantity,
  onClose,
  onAddItem,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [quantityValid, setQuantityValid] = useState(true);

  useEffect(() => {
    if (!isOpen || !item) return;
    setQuantity(1);
    setQuantityValid(true);
  }, [isOpen, item]);

  if (!item) return null;

  const total = Math.round(item.price * quantity);
  const hasExistingQuantity = currentQuantity > 0;

  const changeQuantity = (direction: -1 | 1) => {
    setQuantity((prev) => normalizeQuantity(Math.max(0.5, prev + direction * 0.5)));
  };

  const handleAdd = () => {
    const safeQuantity = normalizeQuantity(quantity);
    if (!quantityValid || !Number.isFinite(safeQuantity) || safeQuantity <= 0) return;
    onAddItem(item, safeQuantity);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="add-catalog-item-title"
      describedBy="add-catalog-item-description"
      className="p-5 sm:max-w-md sm:p-6"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="min-w-0">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            Добавление в смету
          </div>
          <h2 id="add-catalog-item-title" className="text-lg font-bold leading-snug text-white">
            {item.name}
          </h2>
          <p id="add-catalog-item-description" className="mt-1 text-xs text-slate-400">
            {item.description || item.category}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          aria-label="Закрыть"
          className="min-w-11 shrink-0 px-2 text-xl sm:min-w-0"
        >
          ×
        </Button>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Цена</div>
            <div className="mt-0.5 font-mono text-xl font-black text-amber-400">
              {formatCurrency(item.price)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">за 1 {item.unit}</div>
          </div>
          {hasExistingQuantity && (
            <div className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              Уже в смете: {formatQuantity(currentQuantity)} {item.unit}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-300">Количество</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeQuantity(-1)}
            disabled={quantity <= 0.5}
            aria-label="Уменьшить количество"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-200 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>

          <EditableNumberInput
            value={quantity}
            onCommit={(next) => {
              setQuantity(normalizeQuantity(Math.max(0.5, next)));
              setQuantityValid(true);
            }}
            onValidationChange={setQuantityValid}
            min={0.5}
            validate={(next) =>
              Math.abs(next * 2 - Math.round(next * 2)) > 0.000001 ? 'Шаг: 0.5' : null
            }
            formatValue={(next) => formatQuantity(next)}
            ariaLabel="Количество"
            title="Количество, шаг 0.5"
            enterKeyHint="done"
            className="w-full text-center"
          />

          <button
            type="button"
            onClick={() => changeQuantity(1)}
            aria-label="Увеличить количество"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">Сумма</span>
          <span className="font-mono text-lg font-black text-white">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="mt-5 flex gap-2.5 border-t border-slate-800 pt-4">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Отмена
        </Button>
        <Button
          variant="primary"
          onClick={handleAdd}
          disabled={!quantityValid}
          className="flex-1"
        >
          {hasExistingQuantity ? 'Добавить ещё' : 'Добавить в смету'}
        </Button>
      </div>
    </Modal>
  );
};
