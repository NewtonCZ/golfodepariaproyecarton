// src/utils/premios.ts

export function getPremioARepartir(round: any): number {
  return Number(round?.jackpot_ves ?? round?.jackpotVes ?? 0);
}

const ESTADOS_PENDIENTES = ['open', 'scheduled', 'live', 'drawing', 'replay', 'closed', 'cerrado'];

export function getTotalPremiosARepartir(rounds: any[]): number {
  if (!Array.isArray(rounds)) return 0;
  return rounds
    .filter(r => ESTADOS_PENDIENTES.includes((r.status || '').toLowerCase()))
    .reduce((total, r) => total + getPremioARepartir(r), 0);
}

export function contarRoundsPendientes(rounds: any[]): number {
  if (!Array.isArray(rounds)) return 0;
  return rounds.filter(r =>
    ESTADOS_PENDIENTES.includes((r.status || '').toLowerCase())
  ).length;
}

export function formatBs(monto: number): string {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
}
