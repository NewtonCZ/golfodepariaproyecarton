import React, { useState } from 'react';
import { X, Plus, Tag, Calendar, User, AlignLeft } from 'lucide-react';
import { DataItem, ItemStatus, ItemPriority } from '../types';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (item: Omit<DataItem, 'id' | 'createdAt'>) => void;
}

export const CreateModal: React.FC<CreateModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Desarrollo');
  const [status, setStatus] = useState<ItemStatus>('pendiente');
  const [priority, setPriority] = useState<ItemPriority>('media');
  const [assignedTo, setAssignedTo] = useState('Alex Desarrollador');
  const [dueDate, setDueDate] = useState('2026-08-30');
  const [tagsInput, setTagsInput] = useState('Frontend, Core');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onCreate({
      title,
      description,
      category,
      status,
      priority,
      assignedTo,
      dueDate,
      progress: status === 'completado' ? 100 : status === 'en_progreso' ? 50 : 0,
      tags,
    });

    // Reset fields
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl transition-all dark:border-zinc-800 dark:bg-zinc-950">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-8 py-5 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">
              Crear Nuevo Registro / Tarea
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              Completa la información para agregar el elemento al sistema.
            </p>
          </div>
          <button
            id="close-create-modal-btn"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4 text-xs">
          <div>
            <label className="font-bold text-gray-700 dark:text-zinc-300">
              Título del Registro <span className="text-rose-500">*</span>
            </label>
            <input
              id="create-modal-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Implementar módulo de pagos"
              className="mt-1.5 h-10 w-full rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 text-xs font-medium text-gray-900 outline-none focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 dark:text-zinc-300">
              Descripción Detallada
            </label>
            <textarea
              id="create-modal-desc-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe los objetivos, requerimientos o detalles principales..."
              className="mt-1.5 w-full rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-xs font-medium text-gray-900 outline-none focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-gray-700 dark:text-zinc-300">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-100 bg-gray-50/80 px-3 text-xs font-medium text-gray-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="Desarrollo">Desarrollo</option>
                <option value="Diseño">Diseño</option>
                <option value="Seguridad">Seguridad</option>
                <option value="Funcionalidad">Funcionalidad</option>
                <option value="Optimización">Optimización</option>
                <option value="Documentación">Documentación</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 dark:text-zinc-300">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ItemPriority)}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-100 bg-gray-50/80 px-3 text-xs font-medium text-gray-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-gray-700 dark:text-zinc-300">Responsable</label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 text-xs font-medium text-gray-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 dark:text-zinc-300">Fecha Límite</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 text-xs font-medium text-gray-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-gray-700 dark:text-zinc-300">
              Etiquetas (separadas por comas)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="React, API, UI"
              className="mt-1.5 h-10 w-full rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 text-xs font-medium text-gray-900 outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              id="submit-create-item-btn"
              type="submit"
              className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-98 dark:bg-indigo-600 dark:shadow-none"
            >
              Guardar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
