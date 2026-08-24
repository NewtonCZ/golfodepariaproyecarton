import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  Download,
  Calendar,
  User,
  Tag,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { DataItem, ItemStatus, ItemPriority } from '../types';

interface DataTableViewProps {
  items: DataItem[];
  onDeleteItem: (id: string) => void;
  onUpdateStatus: (id: string, status: ItemStatus) => void;
  onOpenCreate: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const DataTableView: React.FC<DataTableViewProps> = ({
  items,
  onDeleteItem,
  onUpdateStatus,
  onOpenCreate,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [sortField, setSortField] = useState<'title' | 'dueDate' | 'progress' | 'priority'>('dueDate');
  const [sortAsc, setSortAsc] = useState(true);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return ['todos', ...Array.from(set)];
  }, [items]);

  // Filtered & sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
          selectedCategory === 'todos' || item.category === selectedCategory;
        const matchesStatus =
          selectedStatus === 'todos' || item.status === selectedStatus;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      });
  }, [items, searchTerm, selectedCategory, selectedStatus, sortField, sortAsc]);

  const handleExportCSV = () => {
    const headers = 'ID,Título,Categoría,Estado,Prioridad,Asignado,Fecha Límite,Progreso\n';
    const rows = items
      .map(
        (i) =>
          `"${i.id}","${i.title}","${i.category}","${i.status}","${i.priority}","${i.assignedTo}","${i.dueDate}",${i.progress}%`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `datos_exportados_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Archivo CSV exportado exitosamente.', 'success');
  };

  const getPriorityBadge = (priority: ItemPriority) => {
    switch (priority) {
      case 'urgente':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300';
      case 'alta':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-950/80 dark:text-orange-300';
      case 'media':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300';
      case 'baja':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls: Search & Filters */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">
            Tabla de Registros y Módulos
          </h1>
          <p className="text-xs text-gray-400 dark:text-zinc-400 font-medium">
            Administra, filtra y gestiona todos los elementos de la aplicación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button
            id="table-create-btn"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 dark:bg-indigo-600 dark:shadow-none dark:hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Agregar Registro
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3.5 rounded-[2rem] border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between dark:border-zinc-800 dark:bg-zinc-950">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            id="table-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por título, responsable o descripción..."
            className="h-10 w-full rounded-xl border border-gray-100 bg-gray-50/80 pl-10 pr-3 text-xs font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
            <Filter className="h-3.5 w-3.5" />
            <span>Categoría:</span>
          </div>
          <select
            id="category-filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 rounded-xl border border-gray-100 bg-gray-50/80 px-3 text-xs font-medium text-gray-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'todos' ? 'Todas las Categorías' : cat}
              </option>
            ))}
          </select>

          <select
            id="status-filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-10 rounded-xl border border-gray-100 bg-gray-50/80 px-3 text-xs font-medium text-gray-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="todos">Todos los Estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_progreso">En Progreso</option>
            <option value="completado">Completado</option>
          </select>
        </div>
      </div>

      {/* Table Canvas */}
      <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
              <tr>
                <th className="py-4 pl-6 pr-3">
                  <button
                    onClick={() => {
                      if (sortField === 'title') setSortAsc(!sortAsc);
                      else {
                        setSortField('title');
                        setSortAsc(true);
                      }
                    }}
                    className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-zinc-200"
                  >
                    Elemento / Título
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-3 py-4">Categoría</th>
                <th className="px-3 py-4">Estado</th>
                <th className="px-3 py-4">Prioridad</th>
                <th className="px-3 py-4">Progreso</th>
                <th className="px-3 py-4">Responsable</th>
                <th className="px-3 py-4">
                  <button
                    onClick={() => {
                      if (sortField === 'dueDate') setSortAsc(!sortAsc);
                      else {
                        setSortField('dueDate');
                        setSortAsc(true);
                      }
                    }}
                    className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-zinc-200"
                  >
                    Fecha Límite
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-4 pl-3 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-zinc-800/80 dark:text-zinc-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 dark:text-zinc-500">
                    No se encontraron registros con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    id={`table-row-${item.id}`}
                    className="transition-colors hover:bg-gray-50/60 dark:hover:bg-zinc-900/40"
                  >
                    {/* Title & Desc */}
                    <td className="py-4 pl-6 pr-3 font-medium text-gray-900 dark:text-zinc-100">
                      <div>
                        <span className="font-bold text-gray-900 dark:text-zinc-100">{item.title}</span>
                        <p className="line-clamp-1 text-[11px] font-normal text-gray-400 dark:text-zinc-400">
                          {item.description}
                        </p>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-4">
                      <span className="inline-flex items-center rounded-xl bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {item.category}
                      </span>
                    </td>

                    {/* Status Dropdown/Selector */}
                    <td className="px-3 py-4">
                      <select
                        value={item.status}
                        onChange={(e) => onUpdateStatus(item.id, e.target.value as ItemStatus)}
                        className="rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_progreso">En Progreso</option>
                        <option value="completado">Completado</option>
                      </select>
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex rounded-xl px-2.5 py-1 text-[10px] font-bold capitalize ${getPriorityBadge(
                          item.priority
                        )}`}
                      >
                        {item.priority}
                      </span>
                    </td>

                    {/* Progress Bar */}
                    <td className="px-3 py-4">
                      <div className="w-24">
                        <div className="flex justify-between text-[10px] font-bold text-gray-500">
                          <span>{item.progress}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.progress === 100
                                ? 'bg-emerald-500'
                                : item.progress > 40
                                ? 'bg-indigo-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${item.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Assigned To */}
                    <td className="px-3 py-4 text-gray-600 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {item.assignedTo.charAt(0)}
                        </div>
                        <span className="font-medium text-xs text-gray-800 dark:text-zinc-200">{item.assignedTo}</span>
                      </div>
                    </td>

                    {/* Due date */}
                    <td className="px-3 py-4 text-gray-400 dark:text-zinc-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>{item.dueDate}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 pl-3 pr-6 text-right">
                      <button
                        id={`delete-btn-${item.id}`}
                        onClick={() => {
                          onDeleteItem(item.id);
                          onShowToast(`Elemento "${item.title}" eliminado.`, 'info');
                        }}
                        aria-label={`Eliminar ${item.title}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/40 px-6 py-4 text-xs font-medium text-gray-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          <span>
            Mostrando {filteredItems.length} de {items.length} registros
          </span>
          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Clean Minimal Layout</span>
        </div>
      </div>
    </div>
  );
};
