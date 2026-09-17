import React, { useState } from 'react';
import { Percent, FileDown, Settings, Download, Wrench, Package, Loader2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Estimate } from '../types';
import type { EstimateTotals } from '../domain/estimate/calculations';
import { formatCurrency, generateAndDownloadVectorPDF } from '../services/exportService';
import { Button, Panel, TextInput } from './ui';

type SaveStatus = 'saved' | 'saving' | 'error';
interface EstimateSummaryProps {
  totals: EstimateTotals;
  estimate: Estimate;
  saveStatus?: SaveStatus;
  onUpdateDiscount: (discount: number) => void;
  onOpenCustomerInfo: () => void;
  onOpenExportModal: () => void;
  onClearAll: () => void;
}

const DISCOUNT_PRESETS = [0, 5, 10, 15];

export const EstimateSummary: React.FC<EstimateSummaryProps> = ({ totals, estimate, saveStatus = 'saved', onUpdateDiscount, onOpenCustomerInfo, onOpenExportModal, onClearAll }) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const saveLabel = saveStatus === 'saving' ? 'Сохранение…' : saveStatus === 'error' ? 'Ошибка сохранения' : 'Сохранено';

  const handleFastDownloadPdf = async () => {
    if (totals.totalCount === 0) {
      alert('Смета пока пуста. Добавьте хотя бы одну позицию.');
      return;
    }
    try {
      setIsDownloadingPdf(true);
      await generateAndDownloadVectorPDF(estimate);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка генерации PDF';
      alert(`Не удалось сформировать PDF файл: ${msg}. Открываем окно экспорта.`);
      onOpenExportModal();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <Panel className="flex-shrink-0 space-y-3 p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90">Итого к оплате</div>
          <div className="font-mono text-2xl font-black tracking-tight text-white sm:text-3xl">{formatCurrency(totals.grandTotal)}</div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-[10px] font-semibold text-slate-400">
            {saveStatus === 'saving' ? <Loader2 className="h-3 w-3 animate-spin" /> : saveStatus === 'error' ? <AlertCircle className="h-3 w-3 text-red-400" /> : <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
            <span>{saveLabel}</span>
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-400">{totals.totalCount} {totals.totalCount === 1 ? 'позиция' : totals.totalCount < 5 ? 'позиции' : 'позиций'}</div>
          {totals.discountAmount > 0 && <div className="font-mono text-[11px] font-semibold text-emerald-400">скидка {totals.discountPercent}% (-{formatCurrency(totals.discountAmount)})</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/70 px-2.5 py-1.5">
          <span className="flex items-center gap-1 truncate text-[11px] font-medium text-amber-300"><Wrench className="h-3 w-3 flex-shrink-0 text-amber-400" /><span>Работы:</span></span>
          <span className="font-mono text-xs font-bold text-white">{formatCurrency(totals.servicesSum)}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/70 px-2.5 py-1.5">
          <span className="flex items-center gap-1 truncate text-[11px] font-medium text-sky-300"><Package className="h-3 w-3 flex-shrink-0 text-sky-400" /><span>Материалы:</span></span>
          <span className="font-mono text-xs font-bold text-white">{formatCurrency(totals.productsSum)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 px-2.5 py-1.5 text-xs">
        <div className="flex items-center gap-1 text-slate-400 font-medium"><Percent className="h-3.5 w-3.5 text-amber-400" /><span>Скидка:</span></div>
        <div className="flex items-center gap-1">
          {DISCOUNT_PRESETS.map((p) => <Button key={p} onClick={() => onUpdateDiscount(p)} variant={totals.discountPercent === p ? 'primary' : 'secondary'} className="rounded-lg px-2 py-0.5 text-[11px]">{p}%</Button>)}
          <div className="ml-1 flex items-center"><TextInput type="number" min="0" max="100" value={totals.discountPercent} onChange={(e) => onUpdateDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))} className="w-10 px-1 py-0.5 text-center text-[11px] font-mono font-bold" aria-label="Скидка в процентах" /><span className="ml-0.5 text-[11px] text-slate-400">%</span></div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 px-2.5 py-1.5 text-xs">
        <div className="flex max-w-[210px] items-center gap-1.5 truncate text-[11px] text-slate-400"><Settings className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" /><span className="truncate">{estimate.address || estimate.customer ? <span className="font-medium text-slate-200">{estimate.address || estimate.customer}</span> : <span className="text-slate-500">Объект / Заказчик не указаны</span>}</span></div>
        <Button variant="ghost" onClick={onOpenCustomerInfo} className="flex-shrink-0 px-1.5 py-0.5 text-[11px] text-amber-400 hover:bg-slate-800 hover:text-amber-300">{estimate.address || estimate.customer ? 'Изменить' : '+ Указать'}</Button>
      </div>

      <div className="grid grid-cols-1 gap-2 pt-0.5 sm:grid-cols-12">
        <Button variant="primary" onClick={handleFastDownloadPdf} disabled={isDownloadingPdf || totals.totalCount === 0} className="sm:col-span-5">
          {isDownloadingPdf ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Формирование...</span></> : <><Download className="h-4 w-4" /><span>Скачать PDF</span></>}
        </Button>
        <Button variant="outline" onClick={onOpenExportModal} className="sm:col-span-4 text-sky-400" title="Создать файл бэкапа или импортировать смету"><FileDown className="h-3.5 w-3.5" /><span>Бэкап / Экспорт</span></Button>
        {isConfirmingClear ? (
          <div className="flex items-center gap-1 rounded-xl border border-red-500/40 bg-red-500/10 px-2 py-1.5 sm:col-span-3">
            <Button variant="danger" onClick={() => { onClearAll(); setIsConfirmingClear(false); }} className="flex-1 px-2 py-1.5 text-xs bg-red-500 text-white hover:bg-red-400 border-red-500">Да</Button>
            <Button variant="secondary" onClick={() => setIsConfirmingClear(false)} className="flex-1 px-2 py-1.5 text-xs">Нет</Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setIsConfirmingClear(true)} className="sm:col-span-3" title="Очистить все позиции сметы"><Trash2 className="h-3.5 w-3.5" /><span>Очистить смету</span></Button>
        )}
      </div>
    </Panel>
  );
};
