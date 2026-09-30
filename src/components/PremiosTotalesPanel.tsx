// src/components/PremiosTotalesPanel.tsx
import React, { useMemo } from 'react';
import {
  getTotalPremiosARepartir,
  contarRoundsPendientes,
  formatBs,
} from '../utils/premios';

interface Props {
  rounds: any[];
  variant?: 'admin' | 'usuario';
}

export const PremiosTotalesPanel: React.FC<Props> = ({ rounds, variant = 'usuario' }) => {
  const total = useMemo(() => getTotalPremiosARepartir(rounds), [rounds]);
  const cantidad = useMemo(() => contarRoundsPendientes(rounds), [rounds]);

  const esAdmin = variant === 'admin';

  // Colores del borde brillante según variante
  const shimmerGradient = esAdmin
    ? 'bg-gradient-to-r from-indigo-500 via-amber-400 to-indigo-500'
    : 'bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-100';

  // Fondo interno según variante
  const innerBg = esAdmin
    ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900'
    : 'bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950';

  const textColor = esAdmin ? 'text-amber-300' : 'text-amber-300';
  const labelColor = esAdmin ? 'text-indigo-200' : 'text-amber-200';
  const badgeBg = esAdmin ? 'bg-white/10 text-amber-200' : 'bg-amber-400/15 text-amber-300 border border-amber-400/30';
  const badgeIcon = esAdmin ? '🎟️' : '🏆';

  return (
    <div className="w-full group relative overflow-hidden rounded-3xl p-[2px] transition-all hover:scale-[1.005]">
      {/* Borde diamante animado */}
      <div
        className={`absolute inset-0 ${shimmerGradient} bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite] rounded-3xl`}
      />

      {/* Contenido interno */}
      <div className={`relative ${innerBg} rounded-3xl p-5 sm:p-6 flex items-center justify-between gap-4`}>
        {/* Glow decorativo de fondo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Texto */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${labelColor}`}>
              {esAdmin ? 'Total a Repartir' : 'TOTAL A REPARTIR'}
            </span>
            {!esAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1 bg-amber-400/20 text-amber-200 border border-amber-400/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
                En Vivo
              </span>
            )}
          </div>
          <p className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${textColor} drop-shadow-[0_2px_12px_rgba(251,191,36,0.35)]`}>
            Bs. {formatBs(total)}
          </p>
        </div>

        {/* Badge de cantidad */}
        <div className={`relative z-10 shrink-0 ${badgeBg} px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5`}>
          <span>{badgeIcon}</span>
          <span>{cantidad}</span>
          <span className="hidden sm:inline">{cantidad === 1 ? 'Sorteo' : 'Sorteos'}</span>
        </div>
      </div>
    </div>
  );
};
