import React from 'react';
import { GameProvider } from './context/GameContext';
import { useGameViewModel } from './viewmodels/useGameViewModel';
import { Navbar } from './components/layout/Navbar';
import { HomeDashboard } from './components/player/HomeDashboard';
import { MyCardsView } from './components/player/MyCardsView';
import { LiveDrawViewer } from './components/player/LiveDrawViewer';
import { ResultsHistoryView } from './components/player/ResultsHistoryView';
import { WalletLedgerView } from './components/player/WalletLedgerView';
import { BuyCardsModal } from './components/player/BuyCardsModal';
import { RechargeModal } from './components/player/RechargeModal';
import { WithdrawModal } from './components/player/WithdrawModal';
import { LoginModal } from './components/common/LoginModal';
import { UserProfileModal } from './components/player/UserProfileModal';
import { AdminPortal } from './components/admin/AdminPortal';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { CustomerSupportWidget } from './components/support/CustomerSupportWidget';
import {
  ShieldCheck,
  Smartphone,
  Trophy,
  Sparkles,
  HelpCircle,
  Volume2,
  Lock,
} from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    viewMode,
    commercialConfig,
    activeTab,
    setActiveTab,
    selectedRoundId,
    isBuyCardsOpen,
    openBuyCards,
    closeBuyCards,
    isRechargeOpen,
    openRecharge,
    closeRecharge,
    isWithdrawOpen,
    openWithdraw,
    closeWithdraw,
    isLoginModalOpen,
    loginModalTab,
    openLogin,
    closeLogin,
    isUserProfileOpen,
    closeUserProfile,
  } = useGameViewModel();

     return (
    <>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-900">
      {/* Top Global Navigation */}
      <Navbar
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenBuyCards={openBuyCards}
        onOpenRecharge={openRecharge}
        onOpenWithdraw={openWithdraw}
        onOpenLogin={openLogin}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-20 md:pb-6">
        {viewMode === 'admin' ? (
          <ProtectedRoute allowedRoles={['Super Admin', 'Operador Financiero', 'Auditor']}>
            <AdminPortal />
          </ProtectedRoute>
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeDashboard
                onOpenBuyCards={openBuyCards}
                onOpenRecharge={openRecharge}
                onOpenWithdraw={openWithdraw}
                onOpenLiveDraw={() => setActiveTab('live-draw')}
                onOpenMyCards={() => setActiveTab('my-cards')}
              />
            )}

            {activeTab === 'my-cards' && (
              <MyCardsView onOpenBuyCards={openBuyCards} />
            )}

            {activeTab === 'live-draw' && (
              <LiveDrawViewer
                onOpenBuyCards={openBuyCards}
                onOpenLogin={openLogin}
                onOpenRecharge={openRecharge}
                onOpenMyCards={() => setActiveTab('my-cards')}
              />
            )}

            {activeTab === 'results' && <ResultsHistoryView />}

            {activeTab === 'wallet' && (
              <WalletLedgerView
                onClose={() => setActiveTab('home')}
                onOpenRecharge={openRecharge}
                onOpenWithdraw={openWithdraw}
              />
            )}

            {activeTab === 'admin' && (
              <ProtectedRoute allowedRoles={['Super Admin', 'Operador Financiero', 'Auditor']}>
                <AdminPortal />
              </ProtectedRoute>
            )}
          </>
        )}
      </main>

      {/* Global Modals */}
      <BuyCardsModal
        isOpen={isBuyCardsOpen}
        targetRoundId={selectedRoundId}
        onClose={closeBuyCards}
        onOpenRecharge={() => {
          closeBuyCards();
          openRecharge();
        }}
      />

      <RechargeModal
        isOpen={isRechargeOpen}
        onClose={closeRecharge}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={closeWithdraw}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLogin}
        initialTab={loginModalTab}
      />

      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={closeUserProfile}
      />

      {/* Floating Customer Support Widget & Ticket Modal */}
      <CustomerSupportWidget />

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 py-8 px-4 sm:px-6 mt-12 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-indigo-950 font-black flex items-center justify-center text-sm shadow-md">
              LF
            </div>
            <div>
              <span className="font-black text-white text-sm block">
                TÚ SUPERCARTÓN • Sorteos
              </span>
              <span className="text-[11px] text-slate-500">
                Plataforma de Gestión de Cartones con Matriz 4×4 y Cantador por Voz en Español
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Pago Móvil Inmediato (Tasa: {commercialConfig.exchangeRateVesUsd} Bs/$)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Matriz Certificada 70 Figuras</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <span>+18 Juega Responsablemente</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-slate-900 text-center text-[10px] text-slate-600">
          © {new Date().getFullYear()} TÚ SUPERCARTÓN Inc. Todos los derechos reservados. Liquidación automática y auditoría contable inmutable.
        </div>
      </footer>
   </div>
 </>
 );
 };
export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
