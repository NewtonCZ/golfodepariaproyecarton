import React, { useEffect } from 'react';
import { GameProvider } from './context/GameContext';
import { useGameViewModel } from './viewmodels/useGameViewModel';
import { Navbar } from './components/layout/Navbar';
import { HomeDashboard } from './components/player/HomeDashboard';
import { MyCardsView } from './components/player/MyCardsView';
import { LiveDrawViewer } from './components/player/LiveDrawViewer';
import { ExpressView } from './components/player/ExpressView';
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
import { CookieBanner } from './components/legal/CookieBanner';
import { Footer } from './components/legal/Footer';
import { PoliticaCookies } from './pages/PoliticaCookies';
import { TerminosCondiciones } from './pages/TerminosCondiciones';
import { PoliticaPrivacidad } from './pages/PoliticaPrivacidad';

const ScrollToTop: React.FC<{ dep: string }> = ({ dep }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [dep]);
  return null;
};

const AppContent: React.FC = () => {
  const {
    viewMode,
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-amber-400 selection:text-slate-900">
      <Navbar
        currentTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenBuyCards={openBuyCards}
        onOpenRecharge={openRecharge}
        onOpenWithdraw={openWithdraw}
        onOpenLogin={openLogin}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-20 md:pb-6">
        <ScrollToTop dep={activeTab} />

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
                onOpenExpress={() => setActiveTab('express')}
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
                onExit={() => setActiveTab('home')}
              />
            )}

            {activeTab === 'results' && <ResultsHistoryView />}

            {activeTab === 'express' && (
              <ExpressView onExit={() => setActiveTab('home')} />
           )}

            {activeTab === 'wallet' && (
              <WalletLedgerView
                onClose={() => setActiveTab('home')}
                onOpenRecharge={openRecharge}
                onOpenWithdraw={openWithdraw}
              />
            )}

            {activeTab === 'politica-cookies' && <PoliticaCookies />}
            {activeTab === 'terminos' && <TerminosCondiciones />}
            {activeTab === 'privacidad' && <PoliticaPrivacidad />}

            {activeTab === 'admin' && (
              <ProtectedRoute allowedRoles={['Super Admin', 'Operador Financiero', 'Auditor']}>
                <AdminPortal />
              </ProtectedRoute>
            )}
          </>
        )}
      </main>

      <BuyCardsModal
        isOpen={isBuyCardsOpen}
        targetRoundId={selectedRoundId}
        onClose={closeBuyCards}
        onOpenRecharge={() => {
          closeBuyCards();
          openRecharge();
        }}
      />

      <RechargeModal isOpen={isRechargeOpen} onClose={closeRecharge} />
      <WithdrawModal isOpen={isWithdrawOpen} onClose={closeWithdraw} />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLogin}
        initialTab={loginModalTab}
      />

      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={closeUserProfile}
      />

      <CustomerSupportWidget />

      <Footer onNavigate={setActiveTab} />

      <CookieBanner />
    </div>
  );
};

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
