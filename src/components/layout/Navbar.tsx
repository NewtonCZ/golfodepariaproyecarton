import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { LoginModal } from '../common/LoginModal';
import { SuperSparkleBadge } from '../common/SuperSparkleBadge';
import { SparkleDiamond } from '../common/SparkleDiamond';
import {
  Wallet,
  PlusCircle,
  ArrowUpRight,
  Volume2,
  VolumeX,
  Shield,
  User,
  Radio,
  Layers,
  History,
  Sparkles,
  RefreshCw,
  Eye,
  LogIn,
  LogOut,
  UserPlus,
  Users,
} from 'lucide-react';
import { soundService } from '../../services/soundAndSpeech';

interface NavbarProps {
  currentTab: 'home' | 'my-cards' | 'live-draw' | 'results' | 'wallet' | 'admin';
  onSelectTab: (tab: 'home' | 'my-cards' | 'live-draw' | 'results' | 'wallet' | 'admin') => void;
  onOpenRecharge: () => void;
  onOpenWithdraw: () => void;
  onOpenBuyCards: () => void;
  onOpenLogin?: (tab?: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenRecharge,
  onOpenWithdraw,
  onOpenLogin,
}) => {
  const {
    currentUser,
    currentRole,
    viewMode,
    setViewMode,
    operatorRole,
    setOperatorRole,
    activeCredential,
    formatMoney,
    activeRound,
    isLiveDrawing,
    isAuthenticated,
    loggedUsername,
    logout,
    isRealtimeSyncConnected,
  } = useGame();

  const [soundEnabled, setSoundEnabled] = useState(soundService.isSoundEffectsEnabled());
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState<'login' | 'register'>('login');

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    soundService.setSoundEffectsEnabled(nextState);
    soundService.setVoiceEnabled(nextState);
    if (nextState) soundService.playPop();
  };

  return (
    <header className="sticky top-0 z-40 bg-indigo-950/95 backdrop-blur-md border-b border-indigo-800 text-white shadow-xl">
      {/* Top Banner / Role & Currency Toolbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 min-h-[44px] flex flex-wrap items-center justify-between gap-2 border-b border-indigo-900/60 text-xs">
        {/* Servidor Activo Container */}
        <div className="flex items-center gap-2 flex-wrap min-h-[32px]">
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-800/60 min-h-[28px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Sincronizado</span>
          </span>

          {activeRound && (
            <span className="hidden sm:inline-flex items-center gap-1 text-amber-300 font-medium min-h-[28px]">
              <span>Sorteo #{activeRound.roundNumber}</span>
              <span className="text-indigo-400">•</span>
              <span>Premio a Repartir: {formatMoney(activeRound.jackpotVes)}</span>
            </span>
          )}
        </div>

        {/* Action Controls & Authentication */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-h-[32px]">
          {/* Sound / Cantador Voice Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={toggleSound}
            className={`min-h-[32px] min-w-[32px] p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
              soundEnabled
                ? 'bg-indigo-800 border-indigo-600 text-amber-400 hover:bg-indigo-700'
                : 'bg-indigo-950 border-indigo-900 text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Sonido y Voz de Cantador Activos' : 'Sonido y Voz Silenciados'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Mode Switcher & Login/Logout Controls */}
          <div className="flex items-center gap-2 min-h-[32px]">
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 bg-indigo-900/90 border border-indigo-700 p-1 pl-2.5 rounded-xl text-xs min-h-[32px]">
                <span className="text-[11px] font-bold text-amber-300 max-w-[100px] truncate" title={loggedUsername}>
                  @{loggedUsername || 'Usuario'}
                </span>
                <button
                  id="logout-btn-header"
                  onClick={logout}
                  className="flex items-center gap-1 px-2.5 py-1 min-h-[26px] rounded-lg font-black text-xs bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Cerrar Sesión Segura"
                >
                  <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">Cerrar Sesión</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-h-[32px]">
                <button
                  id="open-login-btn"
                  onClick={() => {
                    if (onOpenLogin) {
                      onOpenLogin('login');
                    } else {
                      setLoginModalTab('login');
                      setIsLoginModalOpen(true);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 min-h-[32px] rounded-lg font-black text-xs bg-amber-500 hover:bg-amber-400 text-indigo-950 transition-all shadow-sm cursor-pointer"
                  title="Iniciar Sesión Operador / Administrador / Jugador"
                >
                  <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Login</span>
                </button>
                <button
                  id="open-register-btn"
                  onClick={() => {
                    if (onOpenLogin) {
                      onOpenLogin('register');
                    } else {
                      setLoginModalTab('register');
                      setIsLoginModalOpen(true);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 min-h-[32px] rounded-lg font-black text-xs bg-indigo-800 hover:bg-indigo-700 text-amber-300 border border-indigo-600 transition-all shadow-sm cursor-pointer"
                  title="Registro de Jugador con Verificación KYC (+18)"
                >
                  <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Registro (+18)</span>
                </button>
              </div>
            )}

            {viewMode === 'admin' && (
              <button
                id="mode-switch-btn"
                onClick={() => setViewMode('player')}
                className="flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-lg font-black text-xs transition-all bg-gradient-to-r from-purple-600 to-indigo-600 text-white border border-purple-400 shadow-md cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-purple-300" />
                <span>Panel Backoffice</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 min-h-[64px] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
        {/* Brand Logo */}
        <div
          onClick={() => {
            setViewMode('player');
            onSelectTab('home');
          }}
          className="flex items-center gap-2.5 cursor-pointer select-none group min-h-[44px] flex-shrink-0 bg-transparent"
        >
          {/* Left Sparkle Diamond Icon (replaces fruit) */}
          <div className="group-hover:scale-105 transition-transform flex items-center justify-center">
           <SuperSparkleBadge size="md" />
          </div>
          <div className="bg-transparent">
            <div className="flex items-center gap-2 bg-transparent">
              <h1 className="font-black text-base sm:text-xl tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow-sm flex items-center bg-transparent">
                TÚ SUPERCARTÓN
              </h1>
              <SuperSparkleBadge size="md" />
            </div>
            <p className="text-[10px] text-indigo-300 font-medium hidden sm:block">
              Sorteo base de 70 Fichas •
            </p>
          </div>
        </div>

        {/* Middle Navigation Tabs (Player Mode) */}
        {viewMode === 'player' && (
          <nav className="hidden md:flex items-center gap-1 bg-indigo-900/60 p-1 rounded-2xl border border-indigo-800 min-h-[44px]">
            <button
              id="nav-tab-home"
              onClick={() => onSelectTab('home')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-xl font-bold text-xs transition-all ${
                currentTab === 'home'
                  ? 'bg-amber-500 text-indigo-950 shadow-md font-black'
                  : 'text-indigo-200 hover:text-white hover:bg-indigo-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sorteo Actual</span>
            </button>

            <button
              id="nav-tab-my-cards"
              onClick={() => onSelectTab('my-cards')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-xl font-bold text-xs transition-all ${
                currentTab === 'my-cards'
                  ? 'bg-amber-500 text-indigo-950 shadow-md font-black'
                  : 'text-indigo-200 hover:text-white hover:bg-indigo-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mis Cartones</span>
            </button>

            <button
              id="nav-tab-live-draw"
              onClick={() => onSelectTab('live-draw')}
              className={`relative flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-xl font-bold text-xs transition-all ${
                currentTab === 'live-draw'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md font-black'
                  : 'text-rose-300 hover:text-white hover:bg-indigo-800/60'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isLiveDrawing ? 'animate-pulse text-yellow-300' : ''}`} />
              <span>En Vivo</span>
              {isLiveDrawing && (
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>

            <button
              id="nav-tab-results"
              onClick={() => onSelectTab('results')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-xl font-bold text-xs transition-all ${
                currentTab === 'results'
                  ? 'bg-amber-500 text-indigo-950 shadow-md font-black'
                  : 'text-indigo-200 hover:text-white hover:bg-indigo-800/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial</span>
            </button>

            <button
              id="nav-tab-wallet"
              onClick={() => onSelectTab('wallet')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-xl font-bold text-xs transition-all ${
                currentTab === 'wallet'
                  ? 'bg-amber-500 text-indigo-950 shadow-md font-black'
                  : 'text-indigo-200 hover:text-white hover:bg-indigo-800/60'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Movimientos</span>
            </button>

            <button
              id="nav-tab-admin"
              onClick={() => {
                if (typeof window !== 'undefined' && window.history?.pushState) {
                  window.history.pushState({}, '', '/admin');
                }
                onSelectTab('admin');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-xl font-bold text-xs transition-all ${
                currentTab === 'admin'
                  ? 'bg-amber-500 text-indigo-950 shadow-md font-black'
                  : 'text-indigo-200 hover:text-white hover:bg-indigo-800/60'
              }`}
              title="Panel /admin - Listado de Jugadores Registrados"
            >
              <Users className="w-3.5 h-3.5 text-amber-300" />
              <span>Jugadores /admin</span>
            </button>
          </nav>
        )}

        {/* Right Side: Wallet Balance & Action Buttons Container */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap xs:flex-nowrap min-h-[44px] flex-shrink-0">
          {viewMode === 'player' ? (
            <>
              {/* Balance Box */}
              <div
                id="user-balance-box"
                onClick={() => onSelectTab('wallet')}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-900 to-indigo-950 border border-indigo-700/80 rounded-2xl px-2.5 sm:px-3 py-1.5 min-h-[44px] cursor-pointer hover:border-amber-400/80 transition-all shadow-inner"
              >
                <div className="w-7 h-7 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  Bs
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider leading-none">
                    Saldo
                  </span>
                  <span className="font-mono font-black text-sm sm:text-base text-amber-300 leading-tight">
                    {formatMoney(currentUser.availableBalance)}
                  </span>
                </div>
              </div>

              {/* Recargar Button */}
              <button
                id="quick-recharge-btn"
                onClick={onOpenRecharge}
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-emerald-950 font-black text-xs px-3 sm:px-4 py-2 min-h-[44px] rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-emerald-950 stroke-[2.5]" />
                <span className="hidden xs:inline">Recargar</span>
              </button>

              {/* Retirar Button */}
              <button
                id="quick-withdraw-btn"
                onClick={onOpenWithdraw}
                className="flex items-center justify-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/50 font-black text-xs px-2.5 sm:px-3 py-2 min-h-[44px] rounded-xl active:scale-95 transition-all cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Retirar</span>
              </button>
            </>
          ) : (
            /* Admin Mode Status */
            <div className="flex items-center gap-2 min-h-[44px]">
              {activeCredential?.role === 'Super Admin' ? (
                <div className="relative">
                  <button
                    id="operator-role-btn"
                    onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                    className="flex items-center gap-2 bg-purple-900/80 border border-purple-500/60 px-3 py-2 min-h-[44px] rounded-xl text-xs font-black text-purple-200 hover:bg-purple-800 transition-all cursor-pointer"
                    title="Superadmin: Seleccionar vista de rol para pruebas"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>Rol Activo: {operatorRole}</span>
                  </button>

                  {roleMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-indigo-950 border border-indigo-700 rounded-2xl p-1.5 shadow-2xl z-50 text-xs">
                      <div className="px-2 py-1 text-[10px] text-indigo-400 font-black uppercase">
                        Simular Vista de Operador
                      </div>
                      {(['Super Admin', 'Auditor'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setOperatorRole(r);
                            setRoleMenuOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 min-h-[36px] rounded-xl font-bold transition-all cursor-pointer ${
                            operatorRole === r
                              ? 'bg-purple-600 text-white'
                              : 'text-indigo-200 hover:bg-indigo-900'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-cyan-950/80 border border-cyan-700/60 px-3 py-2 min-h-[44px] rounded-xl text-xs font-black text-cyan-200 select-none">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Rol: Auditor (Solo Lectura)</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar (Ensures Retirar button is always visible at bottom for mobile) */}
      {viewMode === 'player' && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-indigo-900/80 px-2 py-2 min-h-[60px] flex items-center justify-around gap-1 shadow-2xl">
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-h-[44px] min-w-[48px] rounded-xl transition-all cursor-pointer ${
              currentTab === 'home' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-bold">Sorteo</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('my-cards')}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-h-[44px] min-w-[48px] rounded-xl transition-all cursor-pointer ${
              currentTab === 'my-cards' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-[10px] font-bold">Cartones</span>
          </button>

          {/* Quick Recharge Button */}
          <button
            type="button"
            onClick={onOpenRecharge}
            className="flex items-center justify-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-emerald-950 px-2.5 py-1.5 min-h-[44px] rounded-xl font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Recargar</span>
          </button>

          {/* Quick Withdraw Button (Mobile Bottom) */}
          <button
            type="button"
            id="mobile-bottom-withdraw-btn"
            onClick={onOpenWithdraw}
            className="flex items-center justify-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-950 px-2.5 py-1.5 min-h-[44px] rounded-xl font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Retirar</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('wallet')}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-h-[44px] min-w-[48px] rounded-xl transition-all cursor-pointer ${
              currentTab === 'wallet' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span className="text-[10px] font-bold">Saldo</span>
          </button>
        </div>
      )}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        initialTab={loginModalTab}
      />
    </header>
  );
};
