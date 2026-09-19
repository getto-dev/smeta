import React from 'react';
import { Check, Sparkles, FolderKanban, Wrench, Zap, Paintbrush, Hammer } from 'lucide-react';
import { ProfileMeta } from '../types';
import { Button, Modal } from './ui';

interface ProfileSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: ProfileMeta[];
  selectedProfileId: string;
  onSelectProfile: (profileId: string) => void;
  estimateItemCount: number;
}

const ICONS_MAP: Record<string, React.ReactNode> = {
  Wrench: <Wrench className="h-6 w-6" />,
  Zap: <Zap className="h-6 w-6" />,
  Paintbrush: <Paintbrush className="h-6 w-6" />,
  Hammer: <Hammer className="h-6 w-6" />,
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  sky: { bg: 'bg-sky-500/15', border: 'border-sky-500/40', text: 'text-sky-400' },
  amber: { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-400' },
  emerald: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-400' },
  orange: { bg: 'bg-orange-500/15', border: 'border-orange-500/40', text: 'text-orange-400' },
};

export const ProfileSelectorModal: React.FC<ProfileSelectorModalProps> = ({
  isOpen,
  onClose,
  profiles,
  selectedProfileId,
  onSelectProfile,
  estimateItemCount,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="profile-selector-title" className="p-5 sm:max-w-2xl sm:p-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="profile-selector-title" className="text-lg font-bold text-white">Профили деятельности</h2>
            <p className="text-xs text-slate-400">Выберите сферу работ для загрузки соответствующего каталога</p>
          </div>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Закрыть" className="min-w-11 px-2 text-xl sm:min-w-0">×</Button>
      </div>

      <div className="mt-4 grid flex-1 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
        {profiles.map((profile) => {
          const isSelected = profile.id === selectedProfileId;
          const theme = COLOR_MAP[profile.color] || COLOR_MAP.sky;
          const icon = ICONS_MAP[profile.icon] || <Wrench className="h-6 w-6" />;

          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => onSelectProfile(profile.id)}
              className={`group relative flex min-h-40 flex-col justify-between rounded-xl border p-4 text-left transition ${
                isSelected
                  ? 'border-amber-500/70 bg-slate-800/90 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/5'
                  : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
              }`}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                  <Check className="h-3 w-3" />
                  <span>Активен</span>
                </div>
              )}

              <div>
                <div className="mb-2.5 flex items-center gap-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${theme.bg} ${theme.border} ${theme.text}`}>
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-white group-hover:text-amber-300">{profile.name}</h3>
                    <span className="text-[11px] font-medium text-slate-400">{profile.categories.length} категорий каталога</span>
                  </div>
                </div>

                <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-300">{profile.description}</p>
              </div>

              <div className="border-t border-slate-700/40 pt-2.5">
                <div className="flex flex-wrap gap-1">
                  {profile.categories.slice(0, 3).map((cat, idx) => (
                    <span key={idx} className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">{cat}</span>
                  ))}
                  {profile.categories.length > 3 && (
                    <span className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] text-slate-500">+{profile.categories.length - 3}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-1.5 border-t border-slate-800 pt-3 text-xs text-slate-400">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
        <span>Каталог сохраняется локально и доступен офлайн.</span>
        {estimateItemCount > 0 && <span className="ml-auto text-[11px] text-slate-500">В текущей смете {estimateItemCount} поз.</span>}
      </div>
    </Modal>
  );
};
