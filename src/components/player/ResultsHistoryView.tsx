import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { FichaBadge } from '../common/FichaBadge';
import { getFichaById } from '../../data/fichasPool';
import { History, Trophy, Award, Calendar, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export const ResultsHistoryView: React.FC = () => {
  const { rounds, formatMoney } = useGame();
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(rounds.find(r => r.status === 'finished')?.id || null);

  const finishedRounds = rounds.filter((r) => r.status === 'finished' || r.drawnFichas.length > 0);

  const toggleExpand = (id: string) => {
    setExpandedRoundId(expandedRoundId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 to-indigo-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-indigo-800">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
          <History className="w-4 h-4" />
          <span>REGISTRO OFICIAL DE SORTEOS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Historial y Resultados de Sorteos
        </h1>
        <p className="text-xs text-indigo-200 mt-1 max-w-xl">
          Consulta las figuras oficiales cantadas en cada sorteo 4×4, tarjetas premiadas y total de fondos distribuidos.
        </p>
      </div>

      {/* Finished Rounds List */}
      <div className="space-y-4">
        {finishedRounds.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-slate-500">
            No hay sorteos finalizados aún.
          </div>
        ) : (
          finishedRounds.map((round) => {
            const isExpanded = expandedRoundId === round.id;

            return (
              <div
                key={round.id}
                className="bg-white rounded-3xl p-5 shadow-lg border-2 border-slate-200/80 transition-all"
              >
                {/* Round Top Header */}
                <div
                  onClick={() => toggleExpand(round.id)}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-mono font-black text-lg border border-amber-300 shrink-0">
                      #{round.roundNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 text-base sm:text-lg">
                          {round.title}
                        </h3>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                          Finalizado
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{round?.drawAt ? new Date(round.drawAt).toLocaleString('es-VE') : 'Fecha no disponible'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Summary Badges */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        Premios Repartidos
                      </span>
                      <span className="font-mono font-black text-emerald-600 text-sm sm:text-base">
                        {formatMoney(round.totalPrizesPaidVes)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        Ganadores
                      </span>
                      <span className="font-mono font-black text-indigo-950 text-sm sm:text-base">
                        {round.winningCardsCount} tarjetas
                      </span>
                    </div>

                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Figures Grid */}
                {isExpanded && (
                  <div className="mt-5 pt-4 border-t border-slate-100 animate-in fade-in">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        Figuras Ganadoras Oficiales ({round.drawnFichas.length} Cantadas)
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        Pool de 70 Fichas
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      {round.drawnFichas.map((fichaId, idx) => {
                        const ficha = getFichaById(fichaId);
                        return (
                          <FichaBadge
                            key={`${fichaId}-${idx}`}
                            ficha={ficha}
                            size="sm"
                          />
                        );
                      })}
                    </div>

                    {round.resultSubmittedBy && (
                      <div className="mt-3 text-right text-[11px] text-slate-400 font-medium">
                        Sorteo certificado por: {round.resultSubmittedBy} {round.resultSubmittedAt ? `(${new Date(round.resultSubmittedAt).toLocaleTimeString('es-VE')})` : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
