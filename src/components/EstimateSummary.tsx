import React, { useEffect, useRef, useState } from 'react';
import { Percent, FileDown, Settings, Download, Wrench, Package, Loader2, Trash2, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import type { Estimate } from '../types';
import type { EstimateTotals } from '../domain/estimate/calculations';
import { formatCurrency, generateAndDownloadVectorPDF } from '../services/exportService';
import { Button, EditableNumberInput, Panel } from './ui';

type SaveStatus = 'saved' | 'saving' | 'error';

interface EstimateSummaryProps {
  totals: EstimateTotals;
  estimate: Estimate;
  saveStatus?: SaveStatus;
  onUpdateDiscount: (discount: number) => void;
  onOpenCustomerInfo: () => void;
  onOpenExportModal: () => void;
  onClearAll: () => void;
  onRestoreEstimate?: (estimate: Estimate) => Promise<void>;
}

const DISCOUNT_PRESETS = [0, 5, 10, 15];

export const EstimateSummary: React.FC<EstimateSummaryProps> = ({
  totals,
  estimate,
  saveStatus = 'saved',
  onUpdateDiscount,
  onOpenCustomerInfo,
  onOpenExportModal,
  onClearAll,
  onRestoreEstimate,
}) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [clearedEstimate, setClearedEstimate] = useState<Estimate | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const clearTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
  }, []);

  const saveLabel = saveStatus === 'saving' ? 'Сохранение…' : saveStatus === 'error' ? 'Ошибка сохранения' : 'Сохранено';

  const handleFastDownloadPdf = async () => {
    if (totals.totalCount === 0) {
      onOpenExportModal();
      return;
    }
    try {
      setIsDownloadingPdf(true);
      await generateAndDownloadVectorPDF(estimate);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка генерации PDF';
      window.alert(`Не удалось сформировать PDF файл: ${msg}. Открываем окно экспорта.`);
      onOpenExportModal();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleClearConfirmed = () => {
    const snapshot = estimate;
    onClearAll();
    setClearedEstimate(snapshot);
    setIsConfirmingClear(false);
    if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => {
      setClearedEstimate(null);
      clearTimerRef.current = null;
    }, 6000);
  };

  const handleUndoClear = async () => {
    if (!clearedEstimate || !onRestoreEstimate) return;
    try {
      setIsRestoring(true);
      await onRestoreEstimate(clearedEstimate);
      setClearedEstimate(null);
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Panel className="flex-shrink-0 space-y-3 p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90">Итого к оплате</div>
          <div className="whitespace-nowrap font-mono text-2xl font-black tracking-tight text-white sm:text-3xl">{formatCurrency(totals.grandTotal)}</div>
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
        <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/70 px-2.5 py-2">
          <span className="flex items-center gap-1 truncate text-[11px] font-medium text-amber-300"><Wrench className="h-3 w-3 shrink-0 text-amber-400" /><span>Работы:</span></span>
          <span className="shrink-0 whitespace-nowrap font-mono text-xs font-bold text-white">{formatCurrency(totals.servicesSum)}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/70 px-2.5 py-2">
          <span className="flex items-center gap-1 truncate text-[11px] font-medium text-sky-300"><Package className="h-3 w-3 shrink-0 text-sky-400" /><span>Материалы:</span></span>
          <span className="shrink-0 whitespace-nowrap font-mono text-xs font-bold text-white">{formatCurrency(totals.productsSum)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 text-slate-400">
          <Percent className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-medium">Скидка:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {DISCOUNT_PRESETS.map((p) => (
            <Button
              key={p}
              onClick={() => onUpdateDiscount(p)}
              variant={totals.discountPercent === p ? 'primary' : 'secondary'}
              className="min-w-12 px-2 text-[11px]"
            >
              {p}%
            </Button>
          ))}
          <EditableNumberInput
            value={totals.discountPercent}
            onCommit={(next) => onUpdateDiscount(Math.min(100, Math.max(0, next)))}
            min={0}
            max={100}
            formatValue={(next) => String(Number(next.toFixed(2)))}
            validate={(next) => next < 0 || next > 100 ? 'От 0 до 100%' : null}
            ariaLabel="Скидка в процентах"
            title="Скидка от 0 до 100%"
            enterKeyHint="done"
            className="w-20"
          />
          <span className="px-1 text-[11px] text-slate-400">%</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 px-2.5 py-2 text-xs">
        <div className="flex max-w-[210px] items-center gap-1.5 truncate text-[11px] text-slate-400">
          <Settings className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span className="truncate">
            {estimate.address || estimate.customer
              ? <span className="font-medium text-slate-200">{estimate.address || estimate.customer}</span>
              : <span className="text-slate-500">Объект / Заказчик не указаны</span>}
          </span>
        </div>
        <Button variant="ghost" onClick={onOpenCustomerInfo} className="shrink-0 px-2 text-[11px] text-amber-400 hover:bg-slate-800 hover:text-amber-300">
          {estimate.address || estimate.customer ? 'Изменить' : '+ Указать'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 pt-0.5 sm:grid-cols-12">
        <Button variant="primary" onClick={handleFastDownloadPdf} disabled={isDownloadingPdf || totals.totalCount === 0} className="sm:col-span-5">
          {isDownloadingPdf ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Формирование...</span></> : <><Download className="h-4 w-4" /><span>Скачать PDF</span></>}
        </Button>
        <Button variant="outline" onClick={onOpenExportModal} className="text-sky-400 sm:col-span-4" title="Создать файл бэкапа или импортировать смету">
          <FileDown className="h-4 w-4" />
          <span>Бэкап / Экспорт</span>
        </Button>
        {isConfirmingClear ? (
          <div className="flex items-center gap-1 rounded-xl border border-red-500/40 bg-red-500/10 px-2 py-1.5 sm:col-span-3">
            <Button variant="danger" onClick={handleClearConfirmed} className="flex-1 px-2 text-xs">Да</Button>
            <Button variant="secondary" onClick={() => setIsConfirmingClear(false)} className="flex-1 px-2 text-xs">Нет</Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setIsConfirmingClear(true)} className="sm:col-span-3" title="Очистить все позиции сметы">
            <Trash2 className="h-4 w-4" />
            <span>Очистить смету</span>
          </Button>
        )}
      </div>

      {clearedEstimate && onRestoreEstimate && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <div className="min-w-0 text-xs text-slate-300">
            Смета очищена. <span className="font-semibold text-white">{clearedEstimate.items.length} поз.</span> можно вернуть.
          </div>
          <Button type="button" variant="secondary" onClick={handleUndoClear} disabled={isRestoring} className="shrink-0 px-3 text-xs">
            <RotateCcw className="h-4 w-4" />
            {isRestoring ? 'Возврат…' : 'Отменить'}
          </Button>
        </div>
      )}
    </Panel>
  );
};
