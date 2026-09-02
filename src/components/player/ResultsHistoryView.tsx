import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { FichaBadge } from '../common/FichaBadge';
import { getFichaById } from '../../data/fichasPool';
import { History, Trophy, Award, Calendar, CheckCircle2, ChevronDown, ChevronUp, Radio } from 'lucide-react';

interface ResultsHistoryViewProps {
  onOpenLiveDraw?: (roundId?: string) => void;
}

export const ResultsHistoryView: React.FC<ResultsHistoryViewProps> = ({ onOpenLiveDraw }) => {
  const { finishedRounds, rounds, formatMoney, fetchFinishedRounds, userCards, currentUser } = useGame();
  
  const displayFinishedRounds = (finishedRounds && finishedRounds.length > 0)
    ? finishedRounds.slice(0, 6)
    : rounds.filter((r) => String(r.status).toLowerCase() === 'finished' || (Array.isArray(r.drawnFichas) && r.drawnFichas.length > 0)).slice(0, 6);

  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(displayFinishedRounds[0]?.id || null);
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());

  useEffect(() => {
    fetchFinishedRounds({ bypassCache: true, limit: 6 });
    const timer = setInterval(() => setNowTimestamp(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [fetchFinishedRounds]);

  const toggleExpand = (id: string) => {
    setExpandedRoundId(expandedRoundId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 to-indigo-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-indigo-800">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
          <History className="w-4 h-4" />
          <span>REGISTRO OFICIAL DE SORTEOS (ÚLTIMOS 6)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Historial y Resultados de Sorteos
        </h1>
        <p className="text-xs text-indigo-200 mt-1 max-w-xl">
          Consulta las figuras oficiales cantadas en cada sorteo 4×4, tarjetas premiadas y total de fondos distribuidos. Repetición en video disponible por 7 minutos.
        </p>
      </div>

      {/* Finished Rounds List */}
      <div className="space-y-4">
        {displayFinishedRounds.length === 0 ? (
          <div className="bg-slate-900 rounded-3xl p-10 text-center border border-slate-800 text-slate-400">
            No hay sorteos finalizados en el historial aún.
          </div>
        ) : (
          displayFinishedRounds.map((round) => {
            const isExpanded = expandedRoundId === round.id;
            const finishTimeMs = new Date(round.resultSubmittedAt || round.updatedAt || round.drawAt || round.ends_at || 0).getTime();
            const diffSec = finishTimeMs > 0 ? Math.max(0, (nowTimestamp - finishTimeMs) / 1000) : 999999;
            const isWithin7Min = diffSec <= 420;
            const remainingSec = isWithin7Min ? Math.max(0, Math.floor(420 - diffSec)) : 0;
            const remainingMinStr = `${Math.floor(remainingSec / 60)}:${(remainingSec % 60).toString().padStart(2, '0')}`;
            const userHasCards = userCards.some((c) => c.roundId === round.id);
            const isKycApproved = currentUser?.kycStatus === 'Aprobado' && currentUser?.status === 'active';

            return (
              <div
                key={round.id}
                className="bg-slate-900 rounded-3xl p-5 shadow-lg border-2 border-slate-800 transition-all text-white"
              >
                {/* Round Top Header */}
                <div
                  onClick={() => toggleExpand(round.id)}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400/15 text-amber-400 flex items-center justify-center font-mono font-black text-lg border border-amber-400/30 shrink-0">
                      #{round.roundNumber || round.order || ''}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-white text-base sm:text-lg">
                          {round.title}
                        </h3>
                        {isWithin7Min ? (
                          <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase animate-pulse">
                            Repetición Activa ({remainingMinStr})
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-400 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border border-slate-700">
                            Finalizado
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{round?.drawAt ? new Date(round.drawAt).toLocaleString('es-VE') : 'Fecha no disponible'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Summary Badges */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        Premios Repartidos
                      </span>
                      <span className="font-mono font-black text-emerald-400 text-sm sm:text-base">
                        {formatMoney(round.totalPrizesPaidVes || 0)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        Ganadores
                      </span>
                      <span className="font-mono font-black text-white text-sm sm:text-base">
                        {round.winningCardsCount || 0} tarjetas
                      </span>
                    </div>

                    {isWithin7Min && onOpenLiveDraw && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenLiveDraw(round.id);
                        }}
                        className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black text-xs px-3 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>Ver Sala ({remainingMinStr})</span>
                      </button>
                    )}

                    <button className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Figures Grid */}
                {isExpanded && (
                  <div className="mt-5 pt-4 border-t border-slate-800 animate-in fade-in">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                        Figuras Ganadoras Oficiales ({round.drawnFichas?.length || 0} Cantadas)
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        Pool de 72 Fichas
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      {round.drawnFichas?.map((fichaId, idx) => {
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
                      <div className="mt-3 text-right text-[11px] text-slate-500 font-medium">
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
