import React, { useRef, useState } from 'react';
import { UploadCloud, Download, CheckCircle2, Database } from 'lucide-react';
import { Estimate } from '../types';
import { exportToHTML, importFromFile } from '../services/exportService';
import { Button, Modal } from './ui';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimate: Estimate;
  onRestoreEstimate: (restored: Estimate) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  estimate,
  onRestoreEstimate,
}) => {
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportBackup = () => {
    exportToHTML(estimate);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      const restored = await importFromFile(file);
      onRestoreEstimate(restored);
      setImportSuccess(true);
      window.setTimeout(() => {
        setImportSuccess(false);
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка при чтении файла';
      setImportError(msg);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="export-title" className="p-4 sm:max-w-xl sm:p-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
        <div>
          <h2 id="export-title" className="text-lg font-bold text-white">Бэкап / Экспорт</h2>
          <p className="mt-0.5 text-xs text-slate-400">Создайте резервную копию или восстановите смету</p>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Закрыть" className="min-w-11 px-2 text-xl sm:min-w-0">×</Button>
      </div>

      <div className="mt-5 space-y-5">
        <div className="flex flex-col justify-between rounded-xl border border-sky-500/30 bg-gradient-to-b from-sky-500/10 to-slate-950 p-4 transition hover:border-sky-500/50">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
              <Database className="h-5 w-5" />
            </div>
            <h4 className="mb-1 text-sm font-bold text-white">Бэкап сметы</h4>
            <p className="text-xs leading-relaxed text-slate-300">Автономный файл со сметой и данными для восстановления. Сохраните его в удобном месте.</p>
          </div>
          <div className="pt-4">
            <Button type="button" onClick={handleExportBackup} className="w-full text-sky-400" variant="secondary">
              <Download className="h-4 w-4" />
              <span>Скачать бэкап</span>
            </Button>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3">
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Импорт сметы</h3>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group w-full rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-center transition hover:border-amber-500/60"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,.json,text/html,application/json"
              onChange={handleFileChange}
              className="hidden"
              tabIndex={-1}
            />
            <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition group-hover:text-amber-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold text-white transition group-hover:text-amber-300">Выбрать файл сметы или бэкапа</div>
            <div className="mt-1 text-[11px] text-slate-500">.html / .json</div>
            {importSuccess && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Смета успешно импортирована</span>
              </div>
            )}
            {importError && <div className="mt-3 text-xs font-medium text-red-400">{importError}</div>}
          </button>
        </div>
      </div>
    </Modal>
  );
};
