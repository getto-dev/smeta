import React, { useEffect, useState } from 'react';
import { X, PlusCircle, Check } from 'lucide-react';
import { EstimateItem } from '../types';
import { Button, FieldLabel, Modal, TextArea, TextInput } from './ui';

interface AddCustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: Omit<EstimateItem, 'id' | 'total'>) => void;
  defaultCategories: string[];
}

const COMMON_UNITS = ['м²', 'м.п.', 'шт', 'точка', 'комплект', 'комплекс', 'час', 'кг', 'мешок', 'м³', 'т'];

function makeCategoryId(category: string): string {
  const normalized = category
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return normalized ? `manual:${normalized}` : 'manual';
}

export const AddCustomItemModal: React.FC<AddCustomItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  defaultCategories,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(defaultCategories[0] || 'Индивидуальные работы');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [unit, setUnit] = useState('шт');
  const [customUnit, setCustomUnit] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [type, setType] = useState<'work' | 'material'>('work');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) return;
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isCustomCategory && category && defaultCategories.includes(category)) return;
    if (!isCustomCategory) setCategory(defaultCategories[0] || 'Индивидуальные работы');
  }, [defaultCategories, category, isCustomCategory]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory(defaultCategories[0] || 'Индивидуальные работы');
    setCustomCategory('');
    setIsCustomCategory(false);
    setUnit('шт');
    setCustomUnit('');
    setIsCustomUnit(false);
    setPrice('');
    setQuantity('1');
    setType('work');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleEnterNavigation = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    const fields = Array.from(e.currentTarget.elements).filter(
      (element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
        element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement,
    );
    const index = fields.indexOf(target);
    const next = fields.slice(index + 1).find((field) => !field.disabled);
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const finalPriceRubles = Number(price.replace(',', '.'));
    const finalQty = Number(quantity.replace(',', '.'));

    if (!trimmedName) {
      setError('Введите наименование позиции');
      return;
    }
    if (!Number.isFinite(finalPriceRubles) || finalPriceRubles < 0) {
      setError('Цена должна быть числом от 0');
      return;
    }
    if (!Number.isFinite(finalQty) || finalQty <= 0) {
      setError('Количество должно быть больше 0');
      return;
    }
    if (Math.abs(finalQty * 2 - Math.round(finalQty * 2)) > 0.000001) {
      setError('Количество задаётся с шагом 0.5');
      return;
    }

    const finalCat = isCustomCategory ? (customCategory.trim() || 'Индивидуальные работы') : category;
    const finalUnit = isCustomUnit ? (customUnit.trim() || 'шт') : unit;

    onAddItem({
      name: trimmedName,
      description: description.trim() || undefined,
      category: finalCat,
      categoryId: makeCategoryId(finalCat),
      unit: finalUnit,
      price: Math.round(finalPriceRubles * 100),
      quantity: finalQty,
      type,
    });

    resetForm();
    onClose();
  };

  const previewPrice = Number(price.replace(',', '.'));
  const previewQuantity = Number(quantity.replace(',', '.'));
  const previewTotal = (Number.isFinite(previewPrice) ? previewPrice : 0) * (Number.isFinite(previewQuantity) ? previewQuantity : 0);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} labelledBy="add-custom-item-title" className="p-5 sm:max-w-lg sm:p-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 id="add-custom-item-title" className="text-lg font-bold text-white">Добавить свою позицию</h2>
            <p className="text-xs text-slate-400">Создайте индивидуальную работу или материал для сметы</p>
          </div>
        </div>
        <Button variant="ghost" onClick={handleClose} aria-label="Закрыть" className="min-w-11 px-2 text-xl sm:min-w-0">×</Button>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-medium text-red-300">{error}</div>}

      <form onSubmit={handleSubmit} onKeyDown={handleEnterNavigation} className="mt-4 space-y-4">
        <div>
          <FieldLabel>Тип позиции</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={type === 'work' ? 'primary' : 'secondary'} onClick={() => setType('work')} className="text-xs sm:text-sm">🛠️ Работа / Услуга</Button>
            <Button type="button" variant={type === 'material' ? 'primary' : 'secondary'} onClick={() => setType('material')} className="text-xs sm:text-sm">📦 Материал / Товар</Button>
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="custom-item-name">Наименование <span className="text-amber-400">*</span></FieldLabel>
          <TextInput id="custom-item-name" type="text" required value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="Например: Монтаж инсталляции с переделкой стояка" enterKeyHint="next" autoComplete="off" />
        </div>

        <div>
          <FieldLabel htmlFor="custom-item-description">Описание / Примечание (необязательно)</FieldLabel>
          <TextArea id="custom-item-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Дополнительные детали, марка, параметры..." />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <FieldLabel className="mb-0">Категория</FieldLabel>
            <button type="button" onClick={() => { setIsCustomCategory((prev) => !prev); setError(null); }} className="min-h-11 px-2 text-left text-xs text-amber-400 hover:underline sm:min-h-0">
              {isCustomCategory ? 'Выбрать из списка' : '+ Новая категория'}
            </button>
          </div>
          {isCustomCategory ? (
            <TextInput type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Введите название новой категории..." enterKeyHint="next" />
          ) : (
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 text-base text-white focus:border-amber-500 focus:outline-none sm:min-h-0 sm:text-sm">
              {defaultCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="Индивидуальные работы">Индивидуальные работы</option>
              <option value="Дополнительные материалы">Дополнительные материалы</option>
            </select>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <FieldLabel className="mb-0">Единица измерения</FieldLabel>
            <button type="button" onClick={() => { setIsCustomUnit((prev) => !prev); setError(null); }} className="min-h-11 px-2 text-left text-xs text-amber-400 hover:underline sm:min-h-0">
              {isCustomUnit ? 'Выбрать из стандартных' : 'Своя единица'}
            </button>
          </div>
          {isCustomUnit ? (
            <TextInput type="text" value={customUnit} onChange={(e) => setCustomUnit(e.target.value)} placeholder="Например: рейс, смена, рулон" enterKeyHint="next" />
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap">
              {COMMON_UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`min-h-11 rounded-lg border px-2 text-xs font-medium transition sm:min-h-0 sm:py-1 ${unit === u ? 'border-amber-500 bg-amber-500 text-slate-950 font-semibold' : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <FieldLabel htmlFor="custom-item-price">Цена за ед., ₽ <span className="text-amber-400">*</span></FieldLabel>
            <TextInput
              id="custom-item-price"
              type="text"
              inputMode="decimal"
              required
              value={price}
              onChange={(e) => { setPrice(e.target.value); setError(null); }}
              placeholder="0"
              enterKeyHint="next"
              className="font-mono"
            />
          </div>
          <div>
            <FieldLabel htmlFor="custom-item-quantity">Количество <span className="text-amber-400">*</span></FieldLabel>
            <TextInput
              id="custom-item-quantity"
              type="text"
              inputMode="decimal"
              required
              value={quantity}
              onChange={(e) => { setQuantity(e.target.value); setError(null); }}
              placeholder="1"
              enterKeyHint="done"
              className="font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-700/80 bg-slate-800/80 p-3">
          <span className="text-xs font-medium text-slate-400">Стоимость позиции:</span>
          <span className="font-mono text-base font-bold text-amber-400">
            {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }).format(previewTotal)}
          </span>
        </div>

        <div className="flex gap-2.5 border-t border-slate-800 pt-3">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">Отмена</Button>
          <Button type="submit" variant="primary" className="flex-1"><Check className="h-4 w-4" />Добавить в смету</Button>
        </div>
      </form>
    </Modal>
  );
};
