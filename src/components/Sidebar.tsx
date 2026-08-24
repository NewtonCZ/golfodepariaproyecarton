import React from 'react';
import {
  LayoutDashboard,
  TableProperties,
  KanbanSquare,
  BarChart3,
  Settings,
  Layers,
  ChevronLeft,
  ChevronRight,
  Code2,
  Sparkles,
} from 'lucide-react';
import { NavigationTab } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  totalItemsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  totalItemsCount,
}) => {
  const navItems = [
    {
      id: 'overview' as NavigationTab,
      label: 'Panel General',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'data' as NavigationTab,
      label: 'Tabla de Datos',
      icon: TableProperties,
      badge: totalItemsCount.toString(),
    },
    {
      id: 'board' as NavigationTab,
      label: 'Tablero Kanban',
      icon: KanbanSquare,
      badge: undefined,
    },
    {
      id: 'analytics' as NavigationTab,
      label: 'Métricas & Gráficos',
      icon: BarChart3,
      badge: undefined,
    },
    {
      id: 'settings' as NavigationTab,
      label: 'Configuración',
      icon: Settings,
      badge: undefined,
    },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-gray-100 bg-white transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950 ${
        isCollapsed ? 'w-20' : 'w-68'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-20 items-center justify-between border-b border-gray-100 px-5 dark:border-zinc-800">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:bg-indigo-500 dark:shadow-none">
              <Layers className="h-5 w-5" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-zinc-100">
                App Template
              </span>
              <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                Clean Minimalism
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:bg-indigo-500 dark:shadow-none">
            <Layers className="h-5 w-5" />
          </div>
        )}

        {/* Collapse toggle (desktop) */}
        <button
          id="collapse-sidebar-btn"
          onClick={onToggleCollapse}
          className="hidden h-8 w-8 items-center justify-center rounded-xl border border-gray-100 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 md:flex dark:border-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-2 px-2">
          {!isCollapsed && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-600">
              Navegación
            </p>
          )}
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`group flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 group-hover:text-gray-600 dark:text-zinc-500'
                }`} />

                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive
                            ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                            : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Developer note / footer card */}
      {!isCollapsed && (
        <div className="p-4">
          <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2 text-gray-900 dark:text-zinc-100">
              <Code2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold">Base Minimalista</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-gray-500 dark:text-zinc-400">
              Estructura limpia lista para escalar tus módulos y flujos.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
