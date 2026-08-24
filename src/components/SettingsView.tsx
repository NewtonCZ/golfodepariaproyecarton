import React from 'react';
import { AppSettings, UserProfile } from '../types';
import { Settings, Moon, Sun, Bell, Sliders, CheckCircle2, RotateCcw, User, Shield, Info } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  user: UserProfile;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onUpdateUser: (newUser: Partial<UserProfile>) => void;
  onResetToDefaults: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  user,
  onUpdateSettings,
  onUpdateUser,
  onResetToDefaults,
  onShowToast,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
          Configuración & Parámetros
        </h1>
        <p className="text-xs text-gray-400 dark:text-zinc-400 font-medium">
          Personaliza la experiencia, opciones de visualización e identidad de tu aplicación.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* App Identity */}
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4 dark:border-zinc-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400">
              <Sliders className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
              Identidad de la Aplicación
            </h2>
          </div>

          <div className="mt-5 space-y-4 text-xs">
            <div>
              <label className="font-bold text-gray-700 dark:text-zinc-300">
                Nombre de la Aplicación
              </label>
              <input
                id="setting-app-name-input"
                type="text"
                value={settings.appName}
                onChange={(e) => onUpdateSettings({ appName: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 text-xs font-medium text-gray-900 outline-none focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 dark:text-zinc-300">
                Idioma Principal
              </label>
              <select
                value={settings.language}
                onChange={(e) => onUpdateSettings({ language: e.target.value as 'es' | 'en' })}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 text-xs font-medium text-gray-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="es">Español (Predeterminado)</option>
                <option value="en">English (Inglés)</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/50 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/40">
              <div>
                <p className="font-bold text-gray-900 dark:text-zinc-100">Guardado Automático</p>
                <p className="text-[11px] text-gray-400 font-medium">Persistir cambios en almacenamiento local</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
                className="h-4 w-4 rounded accent-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4 dark:border-zinc-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400">
              <User className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
              Perfil de Usuario
            </h2>
          </div>

          <div className="mt-5 space-y-4 text-xs">
            <div>
              <label className="font-bold text-gray-700 dark:text-zinc-300">
                Nombre de Usuario
              </label>
              <input
                id="setting-user-name-input"
                type="text"
                value={user.name}
                onChange={(e) => onUpdateUser({ name: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 text-xs font-medium text-gray-900 outline-none focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 dark:text-zinc-300">
                Correo Electrónico
              </label>
              <input
                id="setting-user-email-input"
                type="email"
                value={user.email}
                onChange={(e) => onUpdateUser({ email: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 text-xs font-medium text-gray-900 outline-none focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 dark:text-zinc-300">Rol en la Organización</label>
              <input
                id="setting-user-role-input"
                type="text"
                value={user.role}
                onChange={(e) => onUpdateUser({ role: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 text-xs font-medium text-gray-900 outline-none focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* System info & Reset */}
      <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                Entorno y Arquitectura
              </h3>
              <p className="text-[11px] font-medium text-gray-400">
                React 19 + TypeScript + Tailwind CSS v4 + Vite + Clean Minimalism System
              </p>
            </div>
          </div>

          <button
            id="reset-defaults-btn"
            onClick={() => {
              onResetToDefaults();
              onShowToast('Configuración y datos restaurados al estado inicial.', 'info');
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 active:scale-98"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer Valores Iniciales
          </button>
        </div>
      </div>
    </div>
  );
};
