import React from 'react';
import {
  Database,
  CheckCircle2,
  TrendingUp,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Plus,
  ArrowRight,
  ShieldCheck,
  FolderTree,
  Sparkles,
} from 'lucide-react';
import { MetricCard, DataItem, ActivityLog, NavigationTab } from '../types';

interface OverviewViewProps {
  metrics: MetricCard[];
  items: DataItem[];
  activities: ActivityLog[];
  onNavigate: (tab: NavigationTab) => void;
  onOpenCreate: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  metrics,
  items,
  activities,
  onNavigate,
  onOpenCreate,
}) => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'Database':
        return <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
      case 'CheckCircle2':
        return <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case 'TrendingUp':
        return <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
      case 'Zap':
        return <Zap className="h-5 w-5 text-amber-500 dark:text-amber-400" />;
      default:
        return <Database className="h-5 w-5 text-gray-600 dark:text-zinc-400" />;
    }
  };

  const completedCount = items.filter((i) => i.status === 'completado').length;
  const inProgressCount = items.filter((i) => i.status === 'en_progreso').length;
  const pendingCount = items.filter((i) => i.status === 'pendiente').length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-indigo-600 p-8 text-white shadow-xl shadow-indigo-100/80 dark:bg-indigo-600 dark:shadow-none">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Clean Minimalism Theme</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Bienvenido al Entorno de Desarrollo
            </h1>
            <p className="max-w-2xl text-xs font-normal text-indigo-100 sm:text-sm leading-relaxed">
              Base minimalista diseñada con una jerarquía visual limpia, espaciado generoso, colores armónicos y componentes modulares listos para escalar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              id="overview-quick-add-btn"
              onClick={onOpenCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-50 active:scale-98"
            >
              <Plus className="h-4 w-4" />
              Crear Nuevo Registro
            </button>
            <button
              id="overview-view-data-btn"
              onClick={() => onNavigate('data')}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-xs font-bold text-white transition-all hover:bg-white/20 active:scale-98"
            >
              Ver Tabla de Datos
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            id={`metric-card-${metric.id}`}
            className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 dark:text-zinc-400">
                {metric.title}
              </span>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50/80 dark:bg-zinc-900">
                {getIcon(metric.iconName)}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black tracking-tight text-gray-900 dark:text-zinc-100">
                {metric.value}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center font-bold ${
                    metric.isPositive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {metric.isPositive ? (
                    <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
                  )}
                  {metric.change}
                </span>
                <span className="text-gray-400 dark:text-zinc-500 font-medium">{metric.period}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Status summary & Recent activities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Active records summary */}
        <div className="space-y-6 lg:col-span-2">
          {/* Quick Status Bar */}
          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-zinc-800/80">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                  Estado de los Elementos
                </h2>
                <p className="text-xs text-gray-400 dark:text-zinc-400">
                  Distribución actual de las tareas y módulos en el sistema.
                </p>
              </div>
              <button
                onClick={() => onNavigate('board')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Abrir Tablero →
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3.5">
              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  Pendientes
                </span>
                <p className="mt-1 text-2xl font-black text-amber-900 dark:text-amber-200">
                  {pendingCount}
                </p>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                  En Progreso
                </span>
                <p className="mt-1 text-2xl font-black text-indigo-900 dark:text-indigo-200">
                  {inProgressCount}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  Completados
                </span>
                <p className="mt-1 text-2xl font-black text-emerald-900 dark:text-emerald-200">
                  {completedCount}
                </p>
              </div>
            </div>

            {/* List of top items */}
            <div className="mt-6 space-y-3">
              <p className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                Registros Recientes
              </p>
              {items.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5 transition-colors hover:bg-gray-100/70 dark:border-zinc-800/60 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/70"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="truncate text-xs font-bold text-gray-900 dark:text-zinc-100">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-zinc-400 font-medium">
                      {item.category} • Asignado a {item.assignedTo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-xl px-2.5 py-1 text-[10px] font-bold ${
                        item.status === 'completado'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : item.status === 'en_progreso'
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Architectural Checklist */}
          <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
              Estructura Base del Proyecto
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4 dark:border-zinc-800/80">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-zinc-100">TypeScript & Tipos</p>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-400">
                    Definiciones estructuradas en <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded">src/types.ts</code>.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4 dark:border-zinc-800/80">
                <FolderTree className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-zinc-100">Módulos Desacoplados</p>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-400">
                    Vistas y componentes en <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded">src/components/</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Activity Log */}
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
              Actividad Reciente
            </h2>
            <span className="text-[11px] font-bold text-gray-400">Historial en vivo</span>
          </div>

          <div className="mt-5 space-y-4">
            {activities.map((act) => (
              <div key={act.id} className="relative flex items-start gap-3.5 text-xs">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-zinc-800 dark:text-indigo-400">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-700 dark:text-zinc-200">
                    <span className="font-bold text-gray-900 dark:text-zinc-100">
                      {act.user}
                    </span>{' '}
                    {act.action}{' '}
                    <span className="font-bold text-gray-900 dark:text-zinc-100">
                      "{act.target}"
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400 dark:text-zinc-500 font-medium">
                    {act.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
