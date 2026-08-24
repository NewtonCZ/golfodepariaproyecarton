import React from 'react';
import { DataItem, MetricCard } from '../types';
import { BarChart3, PieChart, TrendingUp, CheckCircle, Target, Layers } from 'lucide-react';

interface AnalyticsViewProps {
  items: DataItem[];
  metrics: MetricCard[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ items, metrics }) => {
  const total = items.length;
  const completed = items.filter((i) => i.status === 'completado').length;
  const inProgress = items.filter((i) => i.status === 'en_progreso').length;
  const pending = items.filter((i) => i.status === 'pendiente').length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Category counts
  const categoryCounts = items.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Priority counts
  const priorityCounts = {
    urgente: items.filter((i) => i.priority === 'urgente').length,
    alta: items.filter((i) => i.priority === 'alta').length,
    media: items.filter((i) => i.priority === 'media').length,
    baja: items.filter((i) => i.priority === 'baja').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
          Métricas y Analíticas del Sistema
        </h1>
        <p className="text-xs text-gray-400 dark:text-zinc-400 font-medium">
          Resumen visual del rendimiento, distribución de trabajo y avance de metas.
        </p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Tasa de Finalización</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-900 dark:text-zinc-100">{completionRate}%</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
          <p className="mt-2 text-[11px] font-medium text-gray-400">
            {completed} de {total} elementos terminados
          </p>
        </div>

        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Módulos en Curso</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-900 dark:text-zinc-100">{inProgress}</p>
          <p className="mt-3 text-[11px] font-medium text-gray-400">
            Representa el {total > 0 ? Math.round((inProgress / total) * 100) : 0}% de la carga activa
          </p>
        </div>

        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Prioridad Alta & Urgente</span>
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
          <p className="mt-3 text-3xl font-black text-gray-900 dark:text-zinc-100">
            {priorityCounts.urgente + priorityCounts.alta}
          </p>
          <p className="mt-3 text-[11px] font-bold text-rose-600 dark:text-rose-400">
            Requieren atención y seguimiento prioritario
          </p>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Category Breakdown */}
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-zinc-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
              Distribución por Categoría
            </h2>
            <Layers className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-5 space-y-4">
            {Object.entries(categoryCounts).map(([category, count]) => {
              const numCount = Number(count);
              const pct = total > 0 ? Math.round((numCount / total) * 100) : 0;
              return (
                <div key={category}>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-800 dark:text-zinc-200">{category}</span>
                    <span className="text-gray-400">
                      {numCount} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Matrix */}
        <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-zinc-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
              Nivel de Prioridad
            </h2>
            <PieChart className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium">
                <span className="font-bold text-rose-600 dark:text-rose-400">Urgente</span>
                <span className="text-gray-400">{priorityCounts.urgente}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{ width: `${total > 0 ? (priorityCounts.urgente / total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium">
                <span className="font-bold text-orange-600 dark:text-orange-400">Alta</span>
                <span className="text-gray-400">{priorityCounts.alta}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${total > 0 ? (priorityCounts.alta / total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium">
                <span className="font-bold text-amber-600 dark:text-amber-400">Media</span>
                <span className="text-gray-400">{priorityCounts.media}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${total > 0 ? (priorityCounts.media / total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Baja</span>
                <span className="text-gray-400">{priorityCounts.baja}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${total > 0 ? (priorityCounts.baja / total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
