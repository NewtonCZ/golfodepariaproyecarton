import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { AdminRole, ROLE_PERMISSIONS } from '../../config/permissions';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  User,
  ArrowLeft,
  CheckCircle2,
  LogIn,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AdminRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = ['Super Admin', 'Operador Financiero', 'Auditor'],
}) => {
  const {
    isAuthenticated,
    sessionToken,
    currentRole,
    operatorRole,
    login,
    setViewMode,
    loggedUsername,
  } = useGame();

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminRole>('Super Admin');

  const handleSelectDemoRole = (role: AdminRole) => {
    setActiveTab(role);
    setLoginError(null);
  };

  // Check if current user meets strict authorization requirements for admin panel
  const isAuthorizedAdmin =
    isAuthenticated &&
    Boolean(sessionToken) &&
    currentRole !== 'Player' &&
    allowedRoles.includes(operatorRole as AdminRole);

  if (isAuthorizedAdmin) {
    return <>{children}</>;
  }

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!usernameInput.trim() || !passwordInput.trim()) {
      setLoginError('Por favor ingresa usuario y contraseña.');
      return;
    }

    const res = await login(usernameInput.trim(), passwordInput.trim());
    if (res.success) {
      if (res.role === 'Player') {
        setLoginError('Acceso Denegado: Esta cuenta es de Jugador. Se requieren credenciales de personal administrativo para acceder al Backoffice.');
      }
    } else {
      setLoginError(res.message || 'Clave mala');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-slate-900 border-2 border-purple-800/80 w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 relative overflow-hidden">
        {/* Background Decorative Glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Access Denied Header Banner */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 via-purple-600 to-indigo-700 text-white flex items-center justify-center font-black text-2xl shadow-xl shrink-0">
            <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-400/30 px-2 py-0.5 rounded-full">
                Acceso Restringido - Backoffice
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Autenticación de Personal de Administración
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              El Panel Central de Control requiere credenciales validadas para Superadministrador, Operador Financiero o Auditor.
            </p>
          </div>
        </div>

        {/* Current Session Warning (if logged in as Jugador) */}
        {isAuthenticated && currentRole === 'Player' && (
          <div className="my-5 p-3.5 bg-amber-500/10 border border-amber-400/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Sesión activa como Jugador (<strong>@{loggedUsername}</strong>). Debes ingresar con credenciales de personal para acceder a esta vista.
              </span>
            </div>
          </div>
        )}

        {/* Administrative Roles Quick Selector Tabs (Testing) */}
        <div className="mt-6 mb-4">
          <label className="block text-[11px] font-black uppercase tracking-wider text-purple-300 mb-2">
            Selecciona el Perfil Administrativo para Autenticar:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                role: 'Super Admin' as const,
                label: 'Superadmin',
                badge: '👑 Acceso Total',
                color: 'from-amber-500 to-yellow-500',
              },
              {
                role: 'Operador Financiero' as const,
                label: 'Operador Finanzas',
                badge: '💼 Recargas & Retiros',
                color: 'from-emerald-600 to-teal-600',
              },
              {
                role: 'Auditor' as const,
                label: 'Auditor',
                badge: '🔍 Solo Lectura',
                color: 'from-cyan-600 to-blue-600',
              },
            ].map((item) => {
              const isSelected = activeTab === item.role;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => handleSelectDemoRole(item.role)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? `bg-slate-800 border-purple-400 ring-2 ring-purple-500/50 shadow-lg`
                      : `bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400`
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">
                    {item.badge}
                  </span>
                  <span className="text-xs font-black text-white">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleAdminLoginSubmit} className="space-y-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-purple-400" />
              <span>Ingresar Credenciales para {ROLE_PERMISSIONS[activeTab]?.displayName || 'Super Admin'}</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">2FA / Encriptado SSL</span>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Usuario / Correo *
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Ej. Millionaire13"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Contraseña de Acceso *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer p-0.5"
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Demo Helper box */}
          <div className="bg-purple-950/40 border border-purple-800/40 rounded-xl p-3 text-[11px] text-purple-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Credenciales Demo Cargadas: <strong className="text-white">{usernameInput}</strong> / <strong className="text-white">{passwordInput}</strong>
              </span>
            </div>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-indigo-950 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
            >
              Iniciar Sesión
            </button>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('player')}
            className="flex items-center gap-2 text-slate-400 hover:text-white font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span>Volver a la Interfaz de Jugador</span>
          </button>

          <span className="text-[11px] text-slate-500">
            Protección RBA v2.0 • Registro de Auditoría de IPs
          </span>
        </div>
      </div>
    </div>
  );
};
