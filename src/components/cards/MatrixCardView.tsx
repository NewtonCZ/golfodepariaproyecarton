import React, { useMemo } from 'react';
import { MatrixCard, RoundStatus } from '../../types';
import { getFichaById } from '../../data/fichasPool';
import { Trophy, Sparkles, CheckCircle2, Archive, ArchiveRestore, Radio, XCircle } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { mobileCacheManager } from '../../services/mobileCacheManager';

interface MatrixCardViewProps {
  card: MatrixCard;
  drawnFichas?: number[]; // Ficha IDs drawn so far in this round
  roundStatus?: RoundStatus;
  highlightWinningPatterns?: boolean;
  compact?: boolean;
  onSelect?: (card: MatrixCard) => void;
  onArchive?: (cardId: string) => void;
  onUnarchive?: (cardId: string) => void;
}

const MatrixCardViewComponent: React.FC<MatrixCardViewProps> = ({
  card,
  drawnFichas = [],
  roundStatus = 'open',
  highlightWinningPatterns = true,
  compact = false,
  onSelect,
  onArchive,
  onUnarchive,
}) => {
  const { formatMoney } = useGame();

  // Determine which cells in this 4x4 are matched with mobile cache memoization
  const matchedCellIndices = useMemo(() => {
    const cached = mobileCacheManager.getCachedEvaluation(card.id, drawnFichas.length);
    if (cached && Array.isArray(cached.matchedIndices)) {
      return new Set<number>(cached.matchedIndices);
    }

    const drawnSet = new Set(drawnFichas);
    const matched = new Set<number>();
    card.matrix.forEach((fichaId, index) => {
      if (drawnSet.has(fichaId)) {
        matched.add(index);
      }
    });

    mobileCacheManager.setCachedEvaluation(card.id, drawnFichas.length, {
      matchedIndices: Array.from(matched),
    });

    return matched;
  }, [card.id, card.matrix, drawnFichas.length, drawnFichas]);

  const isWinner = card.status === 'winner' || card.winningPatterns.length > 0;
  const isRoundFinished = roundStatus === 'finished';
  const isRoundActive = roundStatus === 'open' || roundStatus === 'drawing';
  const matchCount = matchedCellIndices.size;
  const isArchived = Boolean(card.is_archived);

  return (
    <div
      id={`matrix-card-${card.id}`}
      onClick={() => onSelect && onSelect(card)}
      className={`relative rounded-3xl p-3.5 sm:p-4.5 transition-all duration-300 transform bg-white border-2 shadow-lg ${
        isWinner
          ? 'border-amber-400 ring-4 ring-amber-300/60 shadow-amber-200/80 bg-gradient-to-b from-amber-50/80 via-white to-yellow-50/50'
          : isRoundFinished && !isWinner
          ? 'border-slate-200 bg-slate-50/70 opacity-90 hover:opacity-100 hover:border-slate-300'
          : 'border-indigo-100 hover:border-indigo-300 shadow-slate-200/80 hover:shadow-xl'
      } ${onSelect ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="bg-indigo-950 text-amber-300 font-mono font-black text-xs px-2.5 py-1 rounded-xl tracking-wider shadow-sm flex items-center gap-1">
            <span>{card.code}</span>
          </div>
          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
            Sorteo #{card.roundNumber}
          </span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5">
          {isWinner ? (
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
              <Trophy className="w-3 h-3 text-slate-950" />
              GANADOR
            </span>
          ) : isRoundFinished ? (
            <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <XCircle className="w-3 h-3 text-slate-400" />
              PERDEDOR
            </span>
          ) : isRoundActive ? (
            <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              EN JUEGO
            </span>
          ) : (
            <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
              {formatMoney(card.priceVes)}
            </span>
          )}
        </div>
      </div>

      {/* 4x4 Grid (16 Casillas) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 aspect-square">
        {card.matrix.map((fichaId, index) => {
          const ficha = getFichaById(fichaId);
          const isMatched = matchedCellIndices.has(index);

          return (
            <div
              key={`${card.id}-cell-${index}`}
              id={`card-${card.id}-cell-${index}`}
              className={`relative flex flex-col items-center justify-center rounded-2xl p-1 transition-all duration-200 select-none ${
                isMatched
                  ? 'bg-gradient-to-b from-amber-300 via-amber-200 to-yellow-300 border-2 border-amber-500 shadow-md shadow-amber-300/60 scale-100 animate-in fade-in zoom-in'
                  : 'bg-slate-50/90 hover:bg-slate-100 border border-slate-200/90 text-slate-800'
              }`}
            >
              {/* Corner mini ID number */}
              <span className="absolute top-0.5 left-1 text-[8px] font-black text-slate-400">
                #{ficha.id}
              </span>

              {/* Emoji Icon */}
              <span
                className={`transition-transform duration-200 drop-shadow-sm ${
                  compact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'
                } ${isMatched ? 'scale-110' : ''}`}
              >
                {ficha.emoji}
              </span>

              {/* Ficha Name */}
              <span
                className={`text-center font-extrabold tracking-tight truncate w-full px-0.5 mt-0.5 ${
                  compact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'
                } ${isMatched ? 'text-amber-950 font-black' : 'text-slate-700'}`}
              >
                {ficha.name}
              </span>

              {/* Matched check badge */}
              {isMatched && (
                <div className="absolute -top-1 -right-1 bg-amber-600 text-white rounded-full p-0.5 shadow-sm border border-white">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress & Winning info Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-600">
          <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-slate-800 font-mono text-[11px]">
            {matchCount} / 16
          </span>
          <span className="text-[11px] text-slate-500">aciertos</span>
        </div>

        <div className="flex items-center gap-2">
          {isWinner && card.totalPrizeVes > 0 && (
            <div className="flex items-center gap-1 font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-xl border border-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>+{formatMoney(card.totalPrizeVes)}</span>
            </div>
          )}

          {/* Quick Archive / Unarchive Button */}
          {onArchive && !isArchived && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive(card.id);
              }}
              title="Archivar cartón (Ocultar sin eliminar)"
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}

          {onUnarchive && isArchived && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnarchive(card.id);
              }}
              title="Restaurar / Desarchivar cartón"
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
            >
              <ArchiveRestore className="w-3.5 h-3.5" />
              <span>Restaurar</span>
            </button>
          )}
        </div>
      </div>

      {/* Winning Patterns Banner */}
      {isWinner && highlightWinningPatterns && card.winningPatterns.length > 0 && (
        <div className="mt-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 rounded-xl p-2 text-center text-xs font-black shadow-sm flex flex-col gap-0.5">
          {card.winningPatterns.map((pat, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span>{pat.label}</span>
              <span className="bg-black/20 text-white px-2 py-0.5 rounded-full text-[10px]">
                {pat.multiplier}x (+{formatMoney(pat.prizeVes)})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const MatrixCardView = React.memo(MatrixCardViewComponent, (prev, next) => {
  return (
    prev.card.id === next.card.id &&
    prev.card.status === next.card.status &&
    prev.card.matchedCount === next.card.matchedCount &&
    prev.card.is_archived === next.card.is_archived &&
    prev.card.totalPrizeVes === next.card.totalPrizeVes &&
    prev.roundStatus === next.roundStatus &&
    prev.compact === next.compact &&
    (prev.drawnFichas?.length || 0) === (next.drawnFichas?.length || 0)
  );
});
