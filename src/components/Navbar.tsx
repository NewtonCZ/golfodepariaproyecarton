import React, { useState } from 'react';
import { Search, Bell, Plus, Menu, User, Sparkles, Check, Moon, Sun } from 'lucide-react';
import { UserProfile, AppNotification } from '../types';

interface NavbarProps {
  user: UserProfile;
  notifications: AppNotification[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenCreate: () => void;
  onToggleSidebar: () => void;
  onToggleNotifications: () => void;
  isNotificationOpen: boolean;
  onMarkNotificationRead: (id: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  notifications,
  searchTerm,
  onSearchChange,
  onOpenCreate,
  onToggleSidebar,
  onToggleNotifications,
  isNotificationOpen,
  onMarkNotificationRead,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-100 bg-white/90 px-6 backdrop-blur-md transition-colors sm:px-8 dark:border-zinc-800 dark:bg-zinc-950/90">
      {/* Left section: Hamburger button & Search */}
      <div className="flex items-center gap-3.5">
        <button
          id="toggle-sidebar-btn"
          onClick={onToggleSidebar}
          aria-label="Alternar barra lateral"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-100 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 md:hidden dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search */}
        <div className="relative hidden w-72 sm:block md:w-96">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
          <input
            id="global-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar registros, tareas o datos..."
            className="h-11 w-full rounded-2xl border border-gray-100 bg-gray-50/80 pl-11 pr-4 text-xs font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-indigo-200 focus:bg-white focus:ring-4 focus:ring-indigo-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700 dark:focus:ring-zinc-800"
          />
        </div>
      </div>

      {/* Right section: Quick action, notifications, theme toggle & profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Create Button */}
        <button
          id="navbar-create-item-btn"
          onClick={onOpenCreate}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-98 dark:bg-indigo-600 dark:text-white dark:shadow-none dark:hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo Registro</span>
        </button>

        {/* Dark/Light mode toggle */}
        <button
          id="theme-toggle-btn"
          onClick={onToggleDarkMode}
          aria-label="Cambiar tema"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-100 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications Trigger */}
        <div className="relative">
          <button
            id="navbar-notifications-btn"
            onClick={onToggleNotifications}
            aria-label="Ver notificaciones"
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-100 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute 2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="h-7 w-px bg-gray-100 dark:bg-zinc-800 mx-1 hidden sm:block"></div>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            id="user-profile-menu-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 rounded-2xl border border-transparent p-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900"
          >
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-9 w-9 rounded-2xl object-cover ring-2 ring-indigo-50 shadow-xs dark:ring-zinc-700"
              referrerPolicy="no-referrer"
            />
            <div className="hidden text-left md:block">
              <p className="text-xs font-bold text-gray-900 dark:text-zinc-100">{user.name}</p>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500">{user.role}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div
              id="profile-dropdown-menu"
              className="absolute right-0 mt-3 w-60 rounded-3xl border border-gray-100 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="border-b border-gray-100 px-3 py-2.5 dark:border-zinc-800">
                <p className="text-xs font-bold text-gray-900 dark:text-zinc-100">{user.name}</p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">{user.email}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Conectado
                </div>
              </div>
              <div className="py-1.5 space-y-1">
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <User className="h-4 w-4 text-gray-400" />
                  Perfil & Preferencias
                </button>
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Clean Minimalism v1.0
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
