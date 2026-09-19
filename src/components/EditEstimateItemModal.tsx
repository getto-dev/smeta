import React, { useEffect, useState } from 'react';
import type { EstimateItem } from '../types';
import { Button, EditableNumberInput, FieldLabel, Modal, TextArea, TextInput } from './ui';

interface EditEstimateItemModalProps {
  isOpen: boolean;
  item: EstimateItem | null;
  onClose: () => void;
  onSave: (patch: {
    name: string;
    description?: string;
    category: string;
    categoryId: string;
    unit: string;
    price: number;
    quantity: number;
    type: 'work' | 'material';
  }) => void;
}

function makeCategoryId(category: string): string {
  const normalized = category
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return normalized ? `manual:${normalized}` : 'manual';
}

export const EditEstimateItemModal: React.FC<EditEstimateItemModalProps> = ({
  isOpen,
  item,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [priceRubles, setPriceRubles] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<'work' | 'material'>('work');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setDescription(item.description || '');
    setCategory(item.category);
    setUnit(item.unit);
    setPriceRubles(item.price / 100);
    setQuantity(item.quantity);
    setType(item.type === 'material' ? 'material' : 'work');
    setError(null);
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    if (!name.trim()) {
      setError('Введите наименование позиции');
      return;
    }
    if (!category.trim()) {
      setError('Укажите категорию');
      return;
    }
    if (!unit.trim()) {
      setError('Укажите единицу измерения');
      return;
    }
    if (!Number.isFinite(priceRubles) || priceRubles < 0) {
      setError('Цена должна быть неотрицательным числом');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Количество должно быть больше 0');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim(),
      categoryId: item.catalogId ? item.categoryId : makeCategoryId(category),
      unit: unit.trim(),
      price: Math.round(priceRubles * 100),
      quantity,
      type,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="edit-estimate-item-title" className="p-5 sm:max-w-lg sm:p-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 id="edit-estimate-item-title" className="text-lg font-bold text-white">Редактировать позицию</h2>
          <p className="mt-0.5 text-xs text-slate-400">Изменения применятся к текущей смете</p>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Закрыть редактор" className="min-w-11 px-2 text-xl sm:min-w-0">
          ×
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-medium text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <FieldLabel htmlFor="edit-item-name">Наименование</FieldLabel>
          <TextInput id="edit-item-name" value={name} onChange={(e) => { setName(e.target.value); setError(null); }} enterKeyHint="next" autoComplete="off" />
        </div>

        <div>
          <FieldLabel htmlFor="edit-item-description">Описание / примечание</FieldLabel>
          <TextArea id="edit-item-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <FieldLabel htmlFor="edit-item-category">Категория</FieldLabel>
          <TextInput id="edit-item-category" value={category} onChange={(e) => { setCategory(e.target.value); setError(null); }} enterKeyHint="next" />
        </div>

        <div>
          <FieldLabel htmlFor="edit-item-unit">Единица измерения</FieldLabel>
          <TextInput id="edit-item-unit" value={unit} onChange={(e) => { setUnit(e.target.value); setError(null); }} enterKeyHint="next" />
        </div>

        <div>
          <FieldLabel>Тип позиции</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={type === 'work' ? 'primary' : 'secondary'} onClick={() => setType('work')} className="text-xs sm:text-sm">
              Работа / услуга
            </Button>
            <Button type="button" variant={type === 'material' ? 'primary' : 'secondary'} onClick={() => setType('material')} className="text-xs sm:text-sm">
              Материал / товар
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="edit-item-price">Цена, ₽</FieldLabel>
            <EditableNumberInput
              value={priceRubles}
              onCommit={(next) => { setPriceRubles(next); setError(null); }}
              min={0}
              validate={(next) => Math.abs(next * 100 - Math.round(next * 100)) > 0.000001 ? 'Максимум 2 знака после запятой' : null}
              formatValue={(next) => String(Number(next.toFixed(2)))}
              ariaLabel="Цена позиции"
              title="Цена за единицу"
              enterKeyHint="next"
              className="w-full"
            />
          </div>
          <div>
            <FieldLabel htmlFor="edit-item-quantity">Количество</FieldLabel>
            <EditableNumberInput
              value={quantity}
              onCommit={(next) => { setQuantity(next); setError(null); }}
              min={0.5}
              validate={(next) => Math.abs(next * 2 - Math.round(next * 2)) > 0.000001 ? 'Шаг количества: 0.5' : null}
              formatValue={(next) => Number(next.toFixed(1)).toString()}
              ariaLabel="Количество позиции"
              title="Количество, шаг 0.5"
              enterKeyHint="done"
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2.5 border-t border-slate-800 pt-4">
        <Button variant="secondary" onClick={onClose} className="flex-1">Отмена</Button>
        <Button variant="primary" onClick={handleSave} className="flex-1">Сохранить</Button>
      </div>
    </Modal>
  );
};
