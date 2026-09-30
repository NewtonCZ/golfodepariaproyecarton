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

  return (
    <div
      className={
        esAdmin
          ? 'bg-indigo-950 text-amber-300 p-4 rounded-2xl shadow-md flex items-center justify-between'
          : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-950 p-5 rounded-2xl shadow-xl flex items-center justify-between'
      }
    >
      <div>
        <h4 className={esAdmin ? 'text-xs font-bold text-indigo-200' : 'text-xs font-bold uppercase tracking-wider'}>
          Total a Repartir
        </h4>
        <p className={esAdmin ? 'text-2xl font-black font-mono tracking-tight' : 'text-3xl font-black font-mono tracking-tight'}>
          Bs. {formatBs(total)}
        </p>
      </div>
      <div className={esAdmin ? 'bg-white/10 px-3 py-1 rounded-xl text-xs font-bold' : 'bg-indigo-950/20 px-3 py-1 rounded-xl text-xs font-bold'}>
        {cantidad} {cantidad === 1 ? 'Sorteo' : 'Sorteos'}
      </div>
    </div>
  );
};
