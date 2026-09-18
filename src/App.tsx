import React, { useState } from 'react';
import type { CatalogItem, Estimate, EstimateItem } from './types';
import { useCatalogController } from './hooks/useCatalogController';
import { useEstimate } from './hooks/useEstimate';
import { Header } from './components/Header';
import { CatalogBrowser } from './components/CatalogBrowser';
import { EstimateTable } from './components/EstimateTable';
import { EstimateSummary } from './components/EstimateSummary';
import { ProfileSelectorModal } from './components/ProfileSelectorModal';
import { AddCustomItemModal } from './components/AddCustomItemModal';
import { CustomerInfoModal } from './components/CustomerInfoModal';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { ShoppingBag, BookOpen, ArrowRight } from 'lucide-react';
import { formatCurrency } from './services/exportService';

export default function App() {
  const { profiles, currentProfile, currentProfileId, currentCatalog, isLoading: isCatalogLoading, error: catalogError, selectProfile } = useCatalogController();
  const { estimate, saveStatus, totals, addItem, updateItemQuantity, updateItemPrice, deleteItem, clearEstimate, updateDiscount, updateMetadata, restoreEstimate } = useEstimate(
    currentProfileId,
    currentCatalog?.name || currentProfile?.name || 'Сантехника',
  );

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'catalog' | 'estimate'>('catalog');

  const handleSelectProfile = async (profileId: string) => {
    try {
      const catalog = await selectProfile(profileId);
      updateMetadata({ profileId: catalog.id, profileName: catalog.name });
      setIsProfileModalOpen(false);
    } catch {
      // Controller owns the error state.
    }
  };

  const handleAddCustomItem = (itemData: Omit<EstimateItem, 'id' | 'total'>) => {
    addItem(itemData, itemData.quantity);
    setIsCustomItemModalOpen(false);
  };

  const handleRestoreEstimate = async (restored: Estimate) => {
    await restoreEstimate(restored);
    if (restored.profileId && restored.profileId !== currentProfileId) {
      try { await selectProfile(restored.profileId); } catch { /* Catalog may be offline; the estimate is still restored. */ }
    }
  };

  const showLoading = isCatalogLoading && !currentCatalog;

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Header currentProfile={currentProfile} onOpenProfileSelector={() => setIsProfileModalOpen(true)} onOpenSettings={() => setIsSettingsModalOpen(true)} />

      <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-2 sticky top-[57px] z-30 no-print flex-shrink-0">
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button type="button" onClick={() => setMobileTab('catalog')} className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${mobileTab === 'catalog' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}><BookOpen className="w-4 h-4" /><span>Каталог товаров</span></button>
          <button type="button" onClick={() => setMobileTab('estimate')} className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${mobileTab === 'estimate' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}><ShoppingBag className="w-4 h-4" /><span>Смета ({estimate.items.length})</span></button>
        </div>
      </div>

      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto p-3 sm:p-4 no-print flex flex-col">
        {showLoading ? (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-400"><div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mb-3" /><p className="text-sm font-medium">Загрузка каталога профиля...</p></div>
        ) : catalogError && !currentCatalog ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center px-6"><p className="text-sm font-semibold text-red-300">{catalogError}</p><p className="text-xs text-slate-500 mt-2">Проверьте подключение к сети и попробуйте снова.</p></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 items-stretch">
            <div className={`lg:col-span-6 xl:col-span-6 h-full flex flex-col min-h-0 ${mobileTab === 'catalog' ? 'block' : 'hidden lg:flex'}`}>
              <CatalogBrowser catalogItems={currentCatalog?.items || []} categories={currentCatalog?.categories || []} activeEstimateItems={estimate.items} onAddItem={(item: CatalogItem, qty: number) => addItem(item, qty)} synonyms={currentCatalog?.synonyms} onOpenCustomModal={() => setIsCustomItemModalOpen(true)} />
            </div>
            <div className={`lg:col-span-6 xl:col-span-6 h-full flex flex-col min-h-0 space-y-3 ${mobileTab === 'estimate' ? 'block' : 'hidden lg:flex'}`}>
              <EstimateSummary totals={totals} estimate={estimate} saveStatus={saveStatus} onUpdateDiscount={updateDiscount} onOpenCustomerInfo={() => setIsCustomerModalOpen(true)} onOpenExportModal={() => setIsExportModalOpen(true)} onClearAll={clearEstimate} />
              <EstimateTable items={estimate.items} onUpdateQuantity={updateItemQuantity} onUpdatePrice={updateItemPrice} onDeleteItem={deleteItem} onClearAll={clearEstimate} onSwitchToCatalog={() => setMobileTab('catalog')} />
            </div>
          </div>
        )}
      </main>

      {mobileTab === 'catalog' && estimate.items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-2.5 bg-slate-950/95 border-t border-slate-800 backdrop-blur-md z-40 no-print flex items-center justify-between gap-3 shadow-2xl">
          <div><div className="text-[11px] text-slate-400">В смете: <span className="text-white font-bold">{estimate.items.length} поз.</span></div><div className="text-base font-black text-amber-400 font-mono">{formatCurrency(totals.grandTotal)}</div></div>
          <button type="button" onClick={() => setMobileTab('estimate')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"><span>К смете ({estimate.items.length})</span><ArrowRight className="w-4 h-4" /></button>
        </div>
      )}

      <ProfileSelectorModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} profiles={profiles} selectedProfileId={currentProfileId} onSelectProfile={handleSelectProfile} estimateItemCount={estimate.items.length} />
      <AddCustomItemModal isOpen={isCustomItemModalOpen} onClose={() => setIsCustomItemModalOpen(false)} onAddItem={handleAddCustomItem} defaultCategories={currentCatalog?.categories || []} />
      <CustomerInfoModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} estimate={estimate} onSave={updateMetadata} />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} estimate={estimate} onRestoreEstimate={handleRestoreEstimate} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
    </div>
  );
}
