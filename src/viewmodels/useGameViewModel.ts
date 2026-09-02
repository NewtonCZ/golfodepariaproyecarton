import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Ficha, MatrixCard } from '../types';

export type MainTabType = 'home' | 'my-cards' | 'live-draw' | 'results' | 'wallet' | 'admin';

interface SavedUiState {
  activeTab: MainTabType;
  isBuyCardsOpen: boolean;
  isRechargeOpen: boolean;
  isWithdrawOpen: boolean;
  isLoginModalOpen: boolean;
  loginModalTab: 'login' | 'register';
  isUserProfileOpen: boolean;
  selectedRoundId?: string;
  voiceAnnouncementEnabled: boolean;
  savedTimestamp: number;
}

const UI_STATE_STORAGE_KEY = 'supermillonario_lottery_ui_viewmodel_v1';

/**
 * ViewModel implementation for SuperMillonario Destiny Lottery UI.
 * Retains UI state securely across window tab changes, backgrounding, visibility changes,
 * and component updates without losing ongoing user work.
 */
export function useGameViewModel() {
  const gameContext = useGame();

  // Load initial UI state from session storage to prevent loss of UI state on reload/window switch
  const loadSavedState = (): Partial<SavedUiState> => {
    try {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        if (path.includes('/admin') || hash.includes('admin')) {
          return { activeTab: 'admin' };
        }
      }
      const serialized = sessionStorage.getItem(UI_STATE_STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        // Valid for 24 hours
        if (Date.now() - parsed.savedTimestamp < 24 * 60 * 60 * 1000) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not restore UI ViewModel state:', e);
    }
    return {};
  };

  const initial = useMemo(() => loadSavedState(), []);

  // UI Navigation & Dialog States
  const [activeTab, setActiveTabState] = useState<MainTabType>(initial.activeTab || 'home');
  const [isBuyCardsOpen, setIsBuyCardsOpen] = useState<boolean>(initial.isBuyCardsOpen || false);
  const [isRechargeOpen, setIsRechargeOpen] = useState<boolean>(initial.isRechargeOpen || false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState<boolean>(initial.isWithdrawOpen || false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(initial.isLoginModalOpen || false);
  const [loginModalTab, setLoginModalTab] = useState<'login' | 'register'>(initial.loginModalTab || 'login');
  const [isUserProfileOpen, setIsUserProfileOpen] = useState<boolean>(initial.isUserProfileOpen || false);
  const [selectedRoundId, setSelectedRoundId] = useState<string | undefined>(initial.selectedRoundId);
  const [voiceAnnouncementEnabled, setVoiceAnnouncementEnabled] = useState<boolean>(
    initial.voiceAnnouncementEnabled ?? true
  );

  // Route Guard Effect: Redirect /admin to /login if there is no authenticated admin session
  useEffect(() => {
    const handleUrlRouteSync = () => {
      if (typeof window === 'undefined') return;

      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const isAdminRoute = path.includes('/admin') || hash.includes('admin');
      const isLoginRoute = path.includes('/login') || hash.includes('login');

      const isAuthorizedAdmin =
        Boolean(gameContext.isAuthenticated) &&
        Boolean(gameContext.sessionToken) &&
        gameContext.currentRole !== 'Player' &&
        (gameContext.operatorRole === 'Super Admin' ||
          gameContext.operatorRole === 'Operador Financiero' ||
          gameContext.operatorRole === 'Auditor');

      if (isAdminRoute) {
        if (!isAuthorizedAdmin) {
          // Redirigir la ruta /admin a /login si no hay sesión autorizada
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, '', '/login');
          }
          setActiveTabState('home');
          setIsLoginModalOpen(true);
          setLoginModalTab('login');
        } else {
          setActiveTabState('admin');
          if (gameContext.viewMode !== 'admin') {
            gameContext.setViewMode('admin');
          }
        }
      } else if (isLoginRoute) {
        setIsLoginModalOpen(true);
        setLoginModalTab('login');
      }
    };

    // Run on mount and whenever auth state changes
    handleUrlRouteSync();

    window.addEventListener('popstate', handleUrlRouteSync);
    window.addEventListener('hashchange', handleUrlRouteSync);

    return () => {
      window.removeEventListener('popstate', handleUrlRouteSync);
      window.removeEventListener('hashchange', handleUrlRouteSync);
    };
  }, [gameContext.isAuthenticated, gameContext.sessionToken, gameContext.currentRole, gameContext.operatorRole]);

  // Synchronize and persist state upon changes or window backgrounding (visibilitychange)
  const persistCurrentUiState = useCallback(() => {
    try {
      const stateToSave: SavedUiState = {
        activeTab,
        isBuyCardsOpen,
        isRechargeOpen,
        isWithdrawOpen,
        isLoginModalOpen,
        loginModalTab,
        isUserProfileOpen,
        selectedRoundId,
        voiceAnnouncementEnabled,
        savedTimestamp: Date.now(),
      };
      sessionStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to persist UI ViewModel state:', e);
    }
  }, [
    activeTab,
    isBuyCardsOpen,
    isRechargeOpen,
    isWithdrawOpen,
    isLoginModalOpen,
    loginModalTab,
    isUserProfileOpen,
    selectedRoundId,
    voiceAnnouncementEnabled,
  ]);

  // Handle visibility change (when user minimizes app, switches window or browser tab)
  useEffect(() => {
    persistCurrentUiState();

    const handleVisibilityOrBlur = () => {
      persistCurrentUiState();
    };

    window.addEventListener('visibilitychange', handleVisibilityOrBlur);
    window.addEventListener('beforeunload', handleVisibilityOrBlur);
    window.addEventListener('pagehide', handleVisibilityOrBlur);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityOrBlur);
      window.removeEventListener('beforeunload', handleVisibilityOrBlur);
      window.removeEventListener('pagehide', handleVisibilityOrBlur);
    };
  }, [persistCurrentUiState]);

  // Handlers for Navigation & Modal Actions
  const setActiveTab = useCallback(
    (tab: MainTabType) => {
      if (tab === 'admin') {
        const isAuthorizedAdmin =
          Boolean(gameContext.isAuthenticated) &&
          Boolean(gameContext.sessionToken) &&
          gameContext.currentRole !== 'Player' &&
          (gameContext.operatorRole === 'Super Admin' ||
            gameContext.operatorRole === 'Operador Financiero' ||
            gameContext.operatorRole === 'Auditor');

        if (!isAuthorizedAdmin) {
          if (typeof window !== 'undefined' && window.history?.pushState) {
            window.history.pushState({}, '', '/login');
          }
          setIsLoginModalOpen(true);
          setLoginModalTab('login');
          return;
        } else {
          if (typeof window !== 'undefined' && window.history?.pushState) {
            window.history.pushState({}, '', '/admin');
          }
          gameContext.setViewMode('admin');
        }
      }
      setActiveTabState(tab);
    },
    [gameContext.isAuthenticated, gameContext.sessionToken, gameContext.currentRole, gameContext.operatorRole, gameContext.setViewMode]
  );

  const openBuyCards = useCallback((roundId?: string) => {
    if (roundId) setSelectedRoundId(roundId);
    setIsBuyCardsOpen(true);
  }, []);

  const closeBuyCards = useCallback(() => {
    setIsBuyCardsOpen(false);
  }, []);

  const openRecharge = useCallback(() => {
    setIsRechargeOpen(true);
  }, []);

  const closeRecharge = useCallback(() => {
    setIsRechargeOpen(false);
  }, []);

  const openWithdraw = useCallback(() => {
    setIsWithdrawOpen(true);
  }, []);

  const closeWithdraw = useCallback(() => {
    setIsWithdrawOpen(false);
  }, []);

  const openLiveDraw = useCallback((roundId?: string) => {
    if (roundId) setSelectedRoundId(roundId);
    setActiveTabState('live-draw');
  }, []);

  const openLogin = useCallback((tab: 'login' | 'register' = 'login') => {
    setLoginModalTab(tab);
    setIsLoginModalOpen(true);
  }, []);

  const closeLogin = useCallback(() => {
    setIsLoginModalOpen(false);
  }, []);

  const openUserProfile = useCallback(() => {
    setIsUserProfileOpen(true);
  }, []);

  const closeUserProfile = useCallback(() => {
    setIsUserProfileOpen(false);
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceAnnouncementEnabled((prev) => !prev);
  }, []);

  // Computed state for Live Draw Access validation
  const liveDrawAccess = useMemo(() => {
    const isAuth = Boolean(gameContext.isAuthenticated && gameContext.sessionToken && gameContext.currentUser);
    const isKyc = Boolean(
      isAuth &&
      gameContext.currentUser?.kycStatus === 'Aprobado' &&
      gameContext.currentUser?.status === 'active'
    );
    const currentRoundCards = gameContext.userCards.filter(
      (c) => c.roundId === gameContext.activeRound?.id
    );
    const hasCards = currentRoundCards.length >= 1;

    return {
      isAuth,
      isKyc,
      hasCards,
      cardsCount: currentRoundCards.length,
      isAllowed: isAuth && isKyc && hasCards,
    };
  }, [gameContext.isAuthenticated, gameContext.sessionToken, gameContext.currentUser, gameContext.userCards, gameContext.activeRound]);

  return {
    // Game context bridge
    ...gameContext,

    // ViewModel UI state
    activeTab,
    setActiveTab,
    selectedRoundId,
    setSelectedRoundId,
    openLiveDraw,
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
    openUserProfile,
    closeUserProfile,
    voiceAnnouncementEnabled,
    toggleVoice,

    // Live Draw Access rules
    liveDrawAccess,
  };
}
