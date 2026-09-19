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
import { EditEstimateItemModal } from './components/EditEstimateItemModal';
import { ShoppingBag, BookOpen, ArrowRight } from 'lucide-react';
import { formatCurrency } from './services/exportService';

export default function App() {
  const { profiles, currentProfile, currentProfileId, currentCatalog, isLoading: isCatalogLoading, error: catalogError, selectProfile } = useCatalogController();
  const {
    estimate,
    saveStatus,
    totals,
    addItem,
    updateItemQuantity,
    updateItemPrice,
    updateItem,
    deleteItem,
    restoreItem,
    clearEstimate,
    updateDiscount,
    updateMetadata,
    restoreEstimate,
  } = useEstimate(
    currentProfileId,
    currentCatalog?.name || currentProfile?.name || 'Сантехника',
  );

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'catalog' | 'estimate'>('catalog');
  const [editingItem, setEditingItem] = useState<EstimateItem | null>(null);

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
    setMobileTab('estimate');
  };

  const handleRestoreEstimate = async (restored: Estimate) => {
    await restoreEstimate(restored);
    if (restored.profileId && restored.profileId !== currentProfileId) {
      try {
        await selectProfile(restored.profileId);
      } catch {
        // Catalog may be offline; the estimate is still restored.
      }
    }
  };

  const showLoading = isCatalogLoading && !currentCatalog;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 font-sans text-slate-100 selection:bg-amber-500 selection:text-slate-950 lg:h-screen lg:overflow-hidden">
      <Header currentProfile={currentProfile} onOpenProfileSelector={() => setIsProfileModalOpen(true)} onOpenSettings={() => setIsSettingsModalOpen(true)} />

      <div className="mobile-tabs-sticky sticky top-0 z-30 flex-shrink-0 border-b border-slate-800 bg-slate-900 p-2 no-print lg:hidden">
        <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => setMobileTab('catalog')}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold transition active:scale-[0.99] ${mobileTab === 'catalog' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
            aria-pressed={mobileTab === 'catalog'}
          >
            <BookOpen className="h-4 w-4" />
            <span>Каталог товаров</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('estimate')}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold transition active:scale-[0.99] ${mobileTab === 'estimate' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
            aria-pressed={mobileTab === 'estimate'}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Смета ({estimate.items.length})</span>
          </button>
        </div>
      </div>

      <main className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:p-4 no-print">
        {showLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
            <p className="text-sm font-medium">Загрузка каталога профиля...</p>
          </div>
        ) : catalogError && !currentCatalog ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-semibold text-red-300">{catalogError}</p>
            <p className="mt-2 text-xs text-slate-500">Проверьте подключение к сети и попробуйте снова.</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
            <div className={`h-full min-h-0 flex-col lg:col-span-6 xl:col-span-6 ${mobileTab === 'catalog' ? 'flex' : 'hidden lg:flex'}`}>
              <CatalogBrowser
                catalogItems={currentCatalog?.items || []}
                categories={currentCatalog?.categories || []}
                activeEstimateItems={estimate.items}
                onAddItem={(item: CatalogItem, qty: number) => {
                  addItem(item, qty);
                  setMobileTab('estimate');
                }}
                synonyms={currentCatalog?.synonyms}
                onOpenCustomModal={() => setIsCustomItemModalOpen(true)}
              />
            </div>

            <div className={`h-full min-h-0 flex-col space-y-3 lg:col-span-6 xl:col-span-6 ${mobileTab === 'estimate' ? 'flex' : 'hidden lg:flex'}`}>
              <EstimateSummary
                totals={totals}
                estimate={estimate}
                saveStatus={saveStatus}
                onUpdateDiscount={updateDiscount}
                onOpenCustomerInfo={() => setIsCustomerModalOpen(true)}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                onClearAll={clearEstimate}
                onRestoreEstimate={handleRestoreEstimate}
              />
              <EstimateTable
                items={estimate.items}
                onUpdateQuantity={updateItemQuantity}
                onUpdatePrice={updateItemPrice}
                onDeleteItem={deleteItem}
                onRestoreItem={restoreItem}
                onEditItem={setEditingItem}
                onSwitchToCatalog={() => setMobileTab('catalog')}
              />
            </div>
          </div>
        )}
      </main>

      {mobileTab === 'catalog' && estimate.items.length > 0 && (
        <div className="mobile-bottom-safe fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/95 px-3 pt-2.5 backdrop-blur-md no-print shadow-2xl">
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400">В смете: <span className="font-bold text-white">{estimate.items.length} поз.</span></div>
            <div className="font-mono text-base font-black text-amber-400">{formatCurrency(totals.grandTotal)}</div>
          </div>
          <button
            type="button"
            onClick={() => setMobileTab('estimate')}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 transition hover:bg-amber-400 active:scale-95"
          >
            <span>К смете ({estimate.items.length})</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <ProfileSelectorModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} profiles={profiles} selectedProfileId={currentProfileId} onSelectProfile={handleSelectProfile} estimateItemCount={estimate.items.length} />
      <AddCustomItemModal isOpen={isCustomItemModalOpen} onClose={() => setIsCustomItemModalOpen(false)} onAddItem={handleAddCustomItem} defaultCategories={currentCatalog?.categories || []} />
      <CustomerInfoModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} estimate={estimate} onSave={updateMetadata} />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} estimate={estimate} onRestoreEstimate={handleRestoreEstimate} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
      <EditEstimateItemModal isOpen={editingItem !== null} item={editingItem} onClose={() => setEditingItem(null)} onSave={(patch) => {
        if (editingItem) updateItem(editingItem.id, patch);
      }} />
    </div>
  );
}
