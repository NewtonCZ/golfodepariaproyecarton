// src/utils/premios.ts

export function getPremioARepartir(round: any): number {
  return Number(round?.jackpot_ves ?? round?.jackpotVes ?? 0);
}

/**
 * Devuelve el timestamp del inicio del día en hora Venezuela (America/Caracas, UTC-4).
 */
export function getInicioDelDiaVenezuela(): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const fecha = formatter.format(now); // "2026-09-30"
  // Venezuela es UTC-4 todo el año (no tiene DST)
  const inicio = new Date(`${fecha}T00:00:00-04:00`);
  return inicio.getTime();
}

/**
 * Devuelve true si el round está programado para HOY (hora Venezuela).
 */
export function esRoundDeHoy(round: any): boolean {
  const raw =
    round?.starts_at ||
    round?.startsAt ||
    round?.open_bet_at ||
    round?.openBetAt ||
    round?.created_at;
  if (!raw) return false;
  const t = new Date(raw).getTime();
  if (isNaN(t)) return false;
  const inicio = getInicioDelDiaVenezuela();
  const fin = inicio + 24 * 60 * 60 * 1000;
  return t >= inicio && t < fin;
}

/**
 * Suma el premio de todos los rounds programados para HOY (hora Venezuela).
 * Se reinicia automáticamente a medianoche.
 */
export function getTotalPremiosDelDia(rounds: any[]): number {
  if (!Array.isArray(rounds)) return 0;
  return rounds
    .filter(esRoundDeHoy)
    .reduce((total, r) => total + getPremioARepartir(r), 0);
}

/**
 * Cuenta cuántos rounds están programados para HOY (hora Venezuela).
 */
export function contarRoundsDelDia(rounds: any[]): number {
  if (!Array.isArray(rounds)) return 0;
  return rounds.filter(esRoundDeHoy).length;
}

export function formatBs(monto: number): string {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
}
