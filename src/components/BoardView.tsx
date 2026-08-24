import React from 'react';
import { Plus, ArrowRight, ArrowLeft, Calendar, User, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { DataItem, ItemStatus, ItemPriority } from '../types';

interface BoardViewProps {
  items: DataItem[];
  onUpdateStatus: (id: string, status: ItemStatus) => void;
  onOpenCreate: () => void;
  onDeleteItem: (id: string) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  items,
  onUpdateStatus,
  onOpenCreate,
  onDeleteItem,
}) => {
  const columns: { id: ItemStatus; title: string; color: string; border: string }[] = [
    {
      id: 'pendiente',
      title: 'Por Iniciar',
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
      border: 'border-amber-100',
    },
    {
      id: 'en_progreso',
      title: 'En Desarrollo',
      color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400',
      border: 'border-indigo-100',
    },
    {
      id: 'completado',
      title: 'Finalizado',
      color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
      border: 'border-emerald-100',
    },
  ];

  const getPriorityBadge = (priority: ItemPriority) => {
    switch (priority) {
      case 'urgente':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
      case 'alta':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300';
      case 'media':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
      case 'baja':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
            Tablero Kanban de Flujo de Trabajo
          </h1>
          <p className="text-xs text-gray-400 dark:text-zinc-400 font-medium">
            Mueve las tarjetas entre estados y supervisa el avance visualmente.
          </p>
        </div>
        <button
          id="board-add-card-btn"
          onClick={onOpenCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 dark:bg-indigo-600 dark:shadow-none dark:hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Nueva Tarjeta
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {columns.map((column) => {
          const columnItems = items.filter((item) => item.status === column.id);

          return (
            <div
              key={column.id}
              id={`kanban-col-${column.id}`}
              className="flex flex-col rounded-[2rem] border border-gray-100 bg-gray-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/30"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`rounded-xl px-2.5 py-1 text-xs font-black ${column.color}`}
                  >
                    {columnItems.length}
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                    {column.title}
                  </h2>
                </div>
              </div>

              {/* Cards List */}
              <div className="flex-1 space-y-3.5">
                {columnItems.length === 0 ? (
                  <div className="flex h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 p-4 text-center dark:border-zinc-800">
                    <p className="text-xs text-gray-400 font-medium">Sin tareas en esta etapa</p>
                  </div>
                ) : (
                  columnItems.map((item) => (
                    <div
                      key={item.id}
                      id={`kanban-card-${item.id}`}
                      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                    >
                      {/* Card Header: Category & Priority */}
                      <div className="flex items-center justify-between">
                        <span className="rounded-xl bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {item.category}
                        </span>
                        <span
                          className={`rounded-xl px-2.5 py-0.5 text-[10px] font-bold ${getPriorityBadge(
                            item.priority
                          )}`}
                        >
                          {item.priority}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="mt-3 text-xs font-bold text-gray-900 dark:text-zinc-100">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-gray-400 dark:text-zinc-400">
                        {item.description}
                      </p>

                      {/* Tags */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-lg bg-gray-50 px-2 py-0.5 text-[9px] font-semibold text-gray-500 border border-gray-100 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-800"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Footer: User, Date & Status Shifters */}
                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-gray-400 dark:border-zinc-800/80 dark:text-zinc-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          <span className="truncate max-w-[90px] text-gray-700 dark:text-zinc-300 font-medium">{item.assignedTo}</span>
                        </div>

                        {/* Status transition triggers */}
                        <div className="flex items-center gap-1">
                          {column.id !== 'pendiente' && (
                            <button
                              onClick={() => {
                                const prev =
                                  column.id === 'completado' ? 'en_progreso' : 'pendiente';
                                onUpdateStatus(item.id, prev);
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-xl border border-gray-100 text-gray-500 hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                              title="Mover a estado anterior"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {column.id !== 'completado' && (
                            <button
                              onClick={() => {
                                const next =
                                  column.id === 'pendiente' ? 'en_progreso' : 'completado';
                                onUpdateStatus(item.id, next);
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded-xl border border-gray-100 text-gray-500 hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                              title="Mover al siguiente estado"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
