import React, { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { useGame } from '../../context/GameContext';

export interface SorteoFormProps {
  onSuccess?: () => void;
  nextOrder?: number;
}

function getDefaultCaracasDateTime(): string {
  try {
    const now = new Date();
    const caracasString = now.toLocaleString('en-US', { timeZone: 'America/Caracas' });
    const caracasDate = new Date(caracasString);
    caracasDate.setHours(caracasDate.getHours() + 1);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = caracasDate.getFullYear();
    const month = pad(caracasDate.getMonth() + 1);
    const day = pad(caracasDate.getDate());
    const hours = pad(caracasDate.getHours());
    const minutes = pad(caracasDate.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  }
}

export const SorteoForm: React.FC<SorteoFormProps> = ({ onSuccess, nextOrder }) => {
  const { createRound, rounds, formatMoney } = useGame();

  const [form, setForm] = useState({
    titulo: '',
    fechaFin: getDefaultCaracasDateTime(),
    montoPremio: '' as number | '',
    porcentajePremio: 70,
    orden: nextOrder || rounds.length + 1,
  });

  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 2- FIX SOLO TIEMPO:
    // Al leer form.fechaFin de tipo datetime-local, interpretarlo como hora Caracas:
    const cleanFechaFin = form.fechaFin.trim().slice(0, 16);
    const fechaCaracas = new Date(cleanFechaFin + ':00-04:00');
    const start_at = fechaCaracas.toISOString();
    const close_bet_at = new Date(fechaCaracas.getTime() - 5 * 60000).toISOString();

    createRound(
      form.titulo,
      start_at,
      undefined,
      form.porcentajePremio,
      form.orden,
      form.montoPremio !== '' ? Number(form.montoPremio) : undefined,
      { start_at, close_bet_at }
    );

    const horaLocalCaracas = fechaCaracas.toLocaleString('es-VE', {
      timeZone: 'America/Caracas',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });

    setFeedback(`✅ Sorteo creado con éxito. Inicio oficial Caracas: ${horaLocalCaracas} (Cierre de apuestas 5 min antes)`);

    // Resetear formulario para el siguiente sorteo
    setForm({
      titulo: '',
      fechaFin: getDefaultCaracasDateTime(),
      montoPremio: '',
      porcentajePremio: 70,
      orden: rounds.length + 2,
    });

    if (onSuccess) onSuccess();
  };

  return (
    <div id="sorteo-form-card" className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border border-slate-200">
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-black text-slate-900 text-base">Crear Nueva Ronda de Sorteo</h3>
          <p className="text-xs text-slate-500">
            Horario programado en hora legal de Venezuela (Caracas UTC-4).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Zona Horaria: Caracas (-04:00)</span>
          </span>
          <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-900 px-3 py-1 rounded-xl">
            Sorteo #{form.orden || rounds.length + 1}
          </span>
        </div>
      </div>

      {feedback && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Título del Sorteo *
            </label>
            <input
              id="sorteo-form-title"
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ej. Sorteo Noche Especial #104"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Fecha y Hora de Inicio (Caracas) *
            </label>
            <input
              id="sorteo-form-fecha-fin"
              type="datetime-local"
              value={form.fechaFin}
              onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Monto del Premio (Bs.) *
            </label>
            <input
              id="sorteo-form-monto-premio"
              type="number"
              min="0"
              step="1"
              placeholder="Ej. 150000"
              value={form.montoPremio}
              onChange={(e) =>
                setForm({
                  ...form,
                  montoPremio: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)),
                })
              }
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              % a Premio (Pozo) *
            </label>
            <div className="relative">
              <input
                id="sorteo-form-porcentaje"
                type="number"
                min="10"
                max="95"
                step="1"
                value={form.porcentajePremio}
                onChange={(e) =>
                  setForm({
                    ...form,
                    porcentajePremio: Math.min(95, Math.max(10, Number(e.target.value))),
                  })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 pr-7 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
              />
              <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <div className="text-xs text-slate-600 font-medium">
            {form.montoPremio !== '' && Number(form.montoPremio) > 0 ? (
              <span>
                Premio Fijo Manual: <strong className="text-indigo-950 font-mono">{formatMoney(Number(form.montoPremio))}</strong> establecido para este sorteo.
              </span>
            ) : (
              <span>
                Cálculo de Premio Automático: <strong>Cartones Vendidos × Precio × ({form.porcentajePremio}%)</strong>. Margen de casa:{' '}
                <strong className="text-emerald-700">{100 - form.porcentajePremio}%</strong>.
              </span>
            )}
          </div>

          <button
            id="btn-crear-sorteo"
            type="submit"
            className="w-full sm:w-auto bg-indigo-950 hover:bg-indigo-900 text-amber-300 font-black text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Crear y Publicar Ronda</span>
          </button>
        </div>
      </form>
    </div>
  );
};
