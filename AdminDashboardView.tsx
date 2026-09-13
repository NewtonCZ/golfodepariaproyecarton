import React from 'react';
import { AlertTriangle, Users, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';
import { GameRound, MatrixCard, RechargeTransaction } from '../../types';
import { AdminTab } from '../../config/permissions';

export interface AdminDashboardViewProps {
  formatMoney: (amountVes: number, options?: { showBoth?: boolean }) => string;
  totalApprovedRechargesVes: number;
  totalCardsSalesVes: number;
  totalPrizesPaidVes: number;
  netPlatformProfitVes: number;
  pendingRechargesCount: number;
  pendingWithdrawalsCount: number;
  totalPlayersCount?: number;
  pendingRechargesSumVes?: number;
  dailyCardsSalesVes?: number;
  pendingWithdrawalsSumVes?: number;
  recharges: RechargeTransaction[];
  cards: MatrixCard[];
  visibleActiveRounds: GameRound[];
  setActiveTab: (tab: AdminTab) => void;
  setSelectedRoundForResult: (roundId: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  formatMoney,
  totalApprovedRechargesVes,
  totalCardsSalesVes,
  totalPrizesPaidVes,
  netPlatformProfitVes,
  pendingRechargesCount,
  pendingWithdrawalsCount,
  totalPlayersCount = 0,
  pendingRechargesSumVes = 0,
  dailyCardsSalesVes = 0,
  pendingWithdrawalsSumVes = 0,
  recharges,
  cards,
  visibleActiveRounds,
  setActiveTab,
  setSelectedRoundForResult,
}) => {
  return (
    <div className="space-y-6">
      {/* 4 Contadores en Tiempo Real de Supabase */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Jugadores */}
        <div id="kpi-total-jugadores" className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Total Jugadores
              </span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-3xl font-mono font-black text-slate-900">
              {totalPlayersCount}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>En base de datos:</span>
            <span className="font-bold text-slate-800">Directo de Supabase</span>
          </div>
        </div>

        {/* 2. Recargas Pendientes */}
        <div id="kpi-recargas-pendientes" className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Recargas Pendientes
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-3xl font-mono font-black text-amber-600">
              {pendingRechargesCount}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Monto a verificar:</span>
            <span className="font-bold font-mono text-amber-700">
              {formatMoney(pendingRechargesSumVes)}
            </span>
          </div>
        </div>

        {/* 3. Ventas del Día */}
        <div id="kpi-ventas-dia" className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Ventas del Día
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-mono font-black text-emerald-600">
              {formatMoney(dailyCardsSalesVes)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Filtro diario:</span>
            <span className="font-bold text-slate-800">00:00 a hoy</span>
          </div>
        </div>

        {/* 4. Retiros por Pagar */}
        <div id="kpi-retiros-pagar" className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Retiros por Pagar
              </span>
              <ArrowUpRight className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-3xl font-mono font-black text-purple-600">
              {pendingWithdrawalsCount}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Monto a liquidar:</span>
            <span className="font-bold font-mono text-purple-700">
              {formatMoney(pendingWithdrawalsSumVes)}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid - Métricas Financieras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recharges */}
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
              Total Recargas Aprobadas
            </span>
            <div className="text-2xl font-mono font-black text-emerald-600">
              {formatMoney(totalApprovedRechargesVes)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Comprobantes:</span>
            <span className="font-bold text-slate-800">
              {recharges.filter((r) => r.status === 'approved').length} aprobados
            </span>
          </div>
        </div>

        {/* Total Card Bets */}
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
              Ventas de Cartones 4×4
            </span>
            <div className="text-2xl font-mono font-black text-indigo-950">
              {formatMoney(totalCardsSalesVes)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Cartones Emitidas:</span>
            <span className="font-bold text-slate-800">{cards.length} unidades</span>
          </div>
        </div>

        {/* Total Prizes Paid */}
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
              Premios Distribuidos
            </span>
            <div className="text-2xl font-mono font-black text-amber-600">
              {formatMoney(totalPrizesPaidVes)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Cartones Premiadas:</span>
            <span className="font-bold text-slate-800">
              {cards.filter((c) => c.status === 'winner' || c.winningPatterns.length > 0).length} ganadoras
            </span>
          </div>
        </div>

        {/* Net Margin Profit */}
        <div className="bg-gradient-to-br from-indigo-950 to-purple-950 text-white rounded-3xl p-5 shadow-xl border border-purple-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider block mb-1">
              Margen Operativo Neto
            </span>
            <div className="text-2xl font-mono font-black text-amber-400">
              {formatMoney(netPlatformProfitVes)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-purple-800/80 flex items-center justify-between text-xs text-indigo-200">
            <span>Retención Casa:</span>
            <span className="font-bold text-emerald-400">
              {totalCardsSalesVes > 0 ? `${((netPlatformProfitVes / totalCardsSalesVes) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Alerts Banner */}
      {(pendingRechargesCount > 0 || pendingWithdrawalsCount > 0) && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-amber-950 text-sm">
                Atención: Hay Operaciones Financieras Pendientes
              </h3>
              <p className="text-xs text-amber-800">
                {pendingRechargesCount} recarga(s) por verificar y {pendingWithdrawalsCount} solicitud(es) de retiro en cola.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {pendingRechargesCount > 0 && (
              <button
                onClick={() => setActiveTab('recharges')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm"
              >
                Ver Recargas ({pendingRechargesCount})
              </button>
            )}
            {pendingWithdrawalsCount > 0 && (
              <button
                onClick={() => setActiveTab('withdrawals')}
                className="bg-indigo-950 hover:bg-indigo-900 text-amber-300 font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm"
              >
                Ver Retiros ({pendingWithdrawalsCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Round Overview */}
      <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <h3 className="font-black text-slate-900 text-base">
            Estado Actual de los Sorteos
          </h3>
          <button
            onClick={() => setActiveTab('rounds')}
            className="text-xs font-bold text-indigo-900 hover:underline"
          >
            Administrar Sorteos →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visibleActiveRounds.map((round) => (
            <div
              key={round.id}
              className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-slate-900 text-sm">
                    #{round.roundNumber} - {round.title}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      round.status === 'open'
                        ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                        : round.status === 'finished'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-indigo-100 text-indigo-900'
                    }`}
                  >
                    {round.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Cartones vendidas: <strong>{round.totalCardsSold}</strong> • Premio mayor: <strong>{formatMoney(round.jackpotVes)}</strong>
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 flex gap-2">
                {round.status === 'open' && (
                  <button
                    onClick={() => {
                      setSelectedRoundForResult(round.id);
                      setActiveTab('results');
                    }}
                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-black text-xs rounded-xl shadow-sm"
                  >
                    Cerrar e Ingresar Resultados
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
