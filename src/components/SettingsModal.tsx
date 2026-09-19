import React, { useState } from 'react';
import { Download, ExternalLink, Settings, Share2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Button, Modal } from './ui';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!isOpen) return null;

  const handleInstall = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    if (isIOS && !isInstalled) {
      setShowIOSGuide(true);
    }
  };

  if (showIOSGuide) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} labelledBy="ios-install-title" className="p-4 sm:max-w-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="ios-install-title" className="text-base font-semibold text-white">Установка на iPhone / iPad</h2>
            <p className="text-xs text-slate-400">Добавление СметаПро на экран «Домой»</p>
          </div>
        </div>

        <ol className="mb-6 mt-5 space-y-3 text-sm text-slate-300">
          <li className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-semibold text-amber-400">1</span>
            <span>Нажмите <strong className="inline-flex items-center gap-1 text-white"><Share2 className="h-4 w-4 text-sky-400" />Поделиться</strong> в Safari.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-semibold text-amber-400">2</span>
            <span>Выберите <strong className="text-white">«На экран “Домой”»</strong>.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-semibold text-amber-400">3</span>
            <span>Нажмите <strong className="text-white">«Добавить»</strong>.</span>
          </li>
        </ol>

        <Button type="button" onClick={() => setShowIOSGuide(false)} className="w-full">Назад</Button>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="settings-title" className="p-5 sm:max-w-md sm:p-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
            <Settings className="h-5 w-5" />
          </div>
          <h2 id="settings-title" className="text-lg font-bold text-white">Настройки</h2>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Закрыть" className="min-w-11 px-2 text-xl sm:min-w-0">×</Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40 divide-y divide-slate-800">
        <button
          type="button"
          onClick={handleInstall}
          disabled={isInstalled || (!isIOS && !isInstallable)}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-800/60 disabled:cursor-default disabled:hover:bg-transparent"
          aria-label="Установка приложения"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <Download className="h-5 w-5" />
          </div>
          <span className="flex-1 text-sm font-semibold text-white">Установка приложения</span>
          <span className="text-xs text-slate-400">
            {isInstalled ? 'Установлено' : isIOS ? 'Инструкция' : isInstallable ? 'Установить' : 'Недоступно'}
          </span>
        </button>

        <a
          href="https://t.me/gettocode"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-14 items-center gap-3 px-4 py-3.5 transition hover:bg-slate-800/60"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300">
            <ExternalLink className="h-5 w-5" />
          </div>
          <span className="flex-1 text-sm font-semibold text-white">Связаться в Telegram</span>
        </a>
      </div>
    </Modal>
  );
};
