import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/realtimeService';
import { BarChart3, RefreshCw } from 'lucide-react';

type GameKey = 'express' | 'animalito' | 'programado';

interface PnlRow {
  game: GameKey;
  ingresos: number;
  premios: number;
  margen: number;
  retencionPct: number;
  transacciones: number;
  premiosPagados: number;
}

interface GamesPnlPanelProps {
  formatMoney: (amount: number) => string;
}

type RangeKey = 'today' | '7d' | '30d' | 'month' | 'all';

const GAME_META: Record<GameKey, { label: string; emoji: string; cardBg: string; border: string; badgeBg: string; badgeText: string }> = {
  express: {
    label: 'Sorteo Exprés',
    emoji: '⚡',
    cardBg: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
    badgeBg: 'bg-white/70',
    badgeText: 'text-amber-700',
  },
  animalito: {
    label: 'Exprés Animalito',
    emoji: '🐾',
    cardBg: 'from-purple-50 to-indigo-50',
    border: 'border-purple-200',
    badgeBg: 'bg-white/70',
    badgeText: 'text-purple-700',
  },
  programado: {
    label: 'Sorteo Programado',
    emoji: '🎯',
    cardBg: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-200',
    badgeBg: 'bg-white/70',
    badgeText: 'text-emerald-700',
  },
};

export const GamesPnlPanel: React.FC<GamesPnlPanelProps> = ({ formatMoney }) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PnlRow[]>([]);
    const [rangeKey, setRangeKey] = useState<RangeKey>('7d');
  const [error, setError] = useState<string | null>(null);

  const getDateRange = (key: RangeKey) => {
    const now = new Date();
    const end = now.toISOString();
    const start = new Date(now);
    if (key === 'today') start.setHours(0, 0, 0, 0);
    else if (key === '7d') start.setDate(now.getDate() - 7)
    else if (key === '30d') start.setDate(now.getDate() - 30);
    else if (key === 'month') start.setDate(1);
    else if (key === 'all') start.setFullYear(2020);
    return { start: start.toISOString(), end };
  };

  const fetchPnl = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getDateRange(rangeKey);

      const [instantRes, programmedRes] = await Promise.all([
        supabase
          .from('ledger')
          .select('type, amount_ves, reference_id, created_at')
          .gte('created_at', start)
          .lte('created_at', end)
          .like('reference_id', 'express%'),
        supabase
          .from('ledger')
          .select('type, amount_ves, reference_id, created_at')
          .gte('created_at', start)
          .lte('created_at', end)
          .like('reference_id', 'round-%'),
      ]);

      if (instantRes.error) throw instantRes.error;
      if (programmedRes.error) throw programmedRes.error;

      const allRows = [
        ...(instantRes.data || []),
        ...(programmedRes.data || []),
      ];

      const buckets: Record<GameKey, { ing: number; prem: number; tx: number; wins: number }> = {
        express: { ing: 0, prem: 0, tx: 0, wins: 0 },
        animalito: { ing: 0, prem: 0, tx: 0, wins: 0 },
        programado: { ing: 0, prem: 0, tx: 0, wins: 0 },
      };

      for (const row of allRows) {
        const ref = String(row.reference_id || '');
        let game: GameKey | 'other';
        if (ref.startsWith('express-anim-')) game = 'animalito';
        else if (ref.startsWith('express-')) game = 'express';
        else if (ref.startsWith('round-')) game = 'programado';
        else game = 'other';

        if (game === 'other') continue;

        const amt = Math.abs(Number(row.amount_ves || 0));
        if (row.type === 'card_purchase') {
          buckets[game].ing += amt;
          buckets[game].tx += 1;
        } else if (row.type === 'prize_payout') {
          buckets[game].prem += amt;
          buckets[game].wins += 1;
        }
      }

      const toRow = (game: GameKey): PnlRow => {
        const b = buckets[game];
        const margen = b.ing - b.prem;
        const ret = b.ing > 0 ? (margen / b.ing) * 100 : 0;
        return {
          game,
          ingresos: b.ing,
          premios: b.prem,
          margen,
          retencionPct: ret,
          transacciones: b.tx,
          premiosPagados: b.wins,
        };
      };

      setRows([toRow('express'), toRow('animalito'), toRow('programado')]);
    } catch (e: any) {
      console.error('[GamesPnlPanel] error:', e);
      setError(e?.message || 'Error cargando P&L');
    } finally {
      setLoading(false);
    }
  }, [rangeKey]);

  useEffect(() => {
    fetchPnl();
  }, [fetchPnl]);

  const totals = rows.reduce(
    (acc, r) => ({
      ingresos: acc.ingresos + r.ingresos,
      premios: acc.premios + r.premios,
      margen: acc.margen + r.margen,
    }),
    { ingresos: 0, premios: 0, margen: 0 }
  );
  const totalRet = totals.ingresos > 0 ? (totals.margen / totals.ingresos) * 100 : 0;

  const getRow = (game: GameKey) => rows.find((r) => r.game === game);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-lg border border-slate-200 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Ganancias y Pérdidas — Todos los Juegos
          </h3>
          <p className="text-xs text-slate-500">
            Análisis en tiempo real de ingresos, premios y margen por juego. Sorteo Exprés, Exprés Animalito y Sorteo Programado 4×4.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {([
            { k: 'today' as RangeKey, label: 'Hoy' },
            { k: '7d' as RangeKey, label: '7 días' },
            { k: '30d' as RangeKey, label: '30 días' },
            { k: 'month' as RangeKey, label: 'Mes' },
            { k: 'all' as RangeKey, label: 'Todo' },
          ]).map((b) => (
            <button
              key={b.k}
              type="button"
              onClick={() => setRangeKey(b.k)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                rangeKey === b.k
                  ? 'bg-indigo-950 text-amber-300 border-indigo-950 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {b.label}
            </button>
          ))}
          <button
            type="button"
            onClick={fetchPnl}
            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl">
          {error}
        </div>
      )}

      {!loading && !error && rows.length > 0 && rows.every((r) => r.transacciones === 0) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold p-3 rounded-xl flex items-center justify-between gap-3">
          <span>
            No hay movimientos en este rango ({rangeKey}). Probá con otro período.
          </span>
          <button
            type="button"
            onClick={() => setRangeKey('all')}
            className="shrink-0 text-[11px] font-black px-3 py-1 rounded-lg bg-amber-900 text-amber-100 hover:bg-amber-800"
          >
            Ver todo
          </button>
        </div>
      )}

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['express', 'animalito', 'programado'] as GameKey[]).map((g) => {
          const meta = GAME_META[g];
          const row = getRow(g);
          return (
            <div
              key={g}
              className={`bg-gradient-to-br ${meta.cardBg} border-2 ${meta.border} rounded-2xl p-4`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </h4>
                <span className={`text-[10px] font-bold ${meta.badgeText} ${meta.badgeBg} px-2 py-0.5 rounded-full`}>
                  {row?.transacciones || 0} tx · {row?.premiosPagados || 0} premios
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 font-semibold">Ingresos:</span>
                  <span className="font-mono font-black text-emerald-700">{formatMoney(row?.ingresos || 0)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 font-semibold">Premios:</span>
                  <span className="font-mono font-black text-rose-700">{formatMoney(row?.premios || 0)}</span>
                </div>
                <div className={`flex justify-between text-sm pt-2 border-t ${meta.border}`}>
                  <span className="text-slate-800 font-black">Margen:</span>
                  <span className={`font-mono font-black ${(row?.margen || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatMoney(row?.margen || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Retención:</span>
                  <span className={`font-mono font-bold ${(row?.retencionPct || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {(row?.retencionPct || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-indigo-950 to-purple-950 text-white rounded-2xl p-4 sm:p-5">
        <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-300 mb-3">
          📈 Total Consolidado — Los 3 Juegos
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-[10px] font-bold text-indigo-300 block mb-1">Ingresos</span>
            <span className="text-xl font-mono font-black text-emerald-400">{formatMoney(totals.ingresos)}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-300 block mb-1">Premios</span>
            <span className="text-xl font-mono font-black text-rose-400">{formatMoney(totals.premios)}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-300 block mb-1">Margen</span>
            <span className={`text-xl font-mono font-black ${totals.margen >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatMoney(totals.margen)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-300 block mb-1">Retención Global</span>
            <span className={`text-xl font-mono font-black ${totalRet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalRet.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamesPnlPanel;
