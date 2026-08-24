import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { MatrixCardView } from '../cards/MatrixCardView';
import {
  Layers,
  Trophy,
  Clock,
  Sparkles,
  Archive,
  ArchiveRestore,
  Radio,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  History,
  PlayCircle,
  RefreshCw,
} from 'lucide-react';
import { MatrixCard, GameRound } from '../../types';

interface MyCardsViewProps {
  onOpenBuyCards: () => void;
}

const ITEMS_PER_PAGE = 20;

export const MyCardsView: React.FC<MyCardsViewProps> = ({ onOpenBuyCards }) => {
  const {
    userCards,
    rounds,
    activeRound,
    formatMoney,
    archiveCard,
    unarchiveCard,
    archiveCardsBatch,
    fetchActiveRounds,
    isRealtimeSyncConnected,
  } = useGame();

  // Primary navigation tabs: 'active' (En Juego) | 'history' (Todos los Sorteos / Historial) | 'archived' (Archivados)
  const [mainTab, setMainTab] = useState<'active' | 'history' | 'archived'>('active');

  // Secondary sub-filters
  const [subFilter, setSubFilter] = useState<'all' | 'winner' | 'loss'>('all');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('all');

  // Pagination for history & active tabs (20 per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual refresh trigger
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchActiveRounds({ bypassCache: true });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Find the currently open or drawing round
  const currentOpenRound: GameRound | null = useMemo(() => {
    const open = rounds.find(
      (r) => String(r.status).toLowerCase() === 'open' || String(r.status).toLowerCase() === 'drawing'
    );
    if (open) return open;
    if (activeRound && String(activeRound.status).toLowerCase() !== 'finished') return activeRound;
    return rounds[0] || null;
  }, [rounds, activeRound]);

  // Set of active round IDs (open or drawing)
  const activeRoundIds = useMemo(() => {
    return new Set(
      rounds
        .filter(
          (r) => String(r.status).toLowerCase() === 'open' || String(r.status).toLowerCase() === 'drawing'
        )
        .map((r) => r.id)
    );
  }, [rounds]);

  // Non-archived cards
  const unarchivedCards = useMemo(() => {
    return userCards.filter((c) => !c.is_archived);
  }, [userCards]);

  // Archived cards
  const archivedCards = useMemo(() => {
    return userCards.filter((c) => Boolean(c.is_archived));
  }, [userCards]);

  // Tab 1: Cards in active / open rounds (En Juego)
  const activeRoundCards = useMemo(() => {
    return unarchivedCards
      .filter((c) => {
        if (currentOpenRound && c.roundId === currentOpenRound.id) return true;
        return activeRoundIds.has(c.roundId);
      })
      .sort((a, b) => new Date(b.purchaseTime).getTime() - new Date(a.purchaseTime).getTime());
  }, [unarchivedCards, currentOpenRound, activeRoundIds]);

  // Tab 2: All cards / History (sorted DESC by purchase time)
  const historyCards = useMemo(() => {
    return [...unarchivedCards].sort(
      (a, b) => new Date(b.purchaseTime).getTime() - new Date(a.purchaseTime).getTime()
    );
  }, [unarchivedCards]);

  // Global counts for top interactive counters
  const totalCount = unarchivedCards.length;
  const enJuegoCount = activeRoundCards.length;
  const winnersCount = unarchivedCards.filter(
    (c) => c.status === 'winner' || (c.winningPatterns && c.winningPatterns.length > 0)
  ).length;
  const totalPrizeWon = unarchivedCards.reduce((sum, c) => sum + (c.totalPrizeVes || 0), 0);

  // Compute final filtered list based on selected tab and sub-filters
  const currentTabBaseList = useMemo(() => {
    if (mainTab === 'active') return activeRoundCards;
    if (mainTab === 'archived') return archivedCards;
    return historyCards;
  }, [mainTab, activeRoundCards, archivedCards, historyCards]);

  const filteredCards = useMemo(() => {
    return currentTabBaseList.filter((card) => {
      // Sub-filter by winner / loss
      if (subFilter === 'winner') {
        const isWin = card.status === 'winner' || (card.winningPatterns && card.winningPatterns.length > 0);
        if (!isWin) return false;
      }
      if (subFilter === 'loss' && card.status !== 'loss') return false;

      // Filter by specific round in history mode
      if (mainTab === 'history' && selectedRoundId !== 'all' && card.roundId !== selectedRoundId) {
        return false;
      }

      return true;
    });
  }, [currentTabBaseList, subFilter, mainTab, selectedRoundId]);

  // Reset page to 1 when filters or tabs change
  useEffect(() => {
    setCurrentPage(1);
  }, [mainTab, subFilter, selectedRoundId]);

  // Pagination calculation (20 items per page)
  const totalPages = Math.max(1, Math.ceil(filteredCards.length / ITEMS_PER_PAGE));
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCards.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCards, currentPage]);

  // Batch Archive finished cards (clean view without delete)
  const handleArchivePastCards = () => {
    const pastCardsToArchive = unarchivedCards.filter(
      (c) => !activeRoundIds.has(c.roundId) && c.roundId !== currentOpenRound?.id
    );
    if (pastCardsToArchive.length === 0) {
      showToast('No hay cartones de sorteos finalizados pendientes por archivar.');
      return;
    }
    const ids = pastCardsToArchive.map((c) => c.id);
    archiveCardsBatch(ids);
    showToast(`Se archivaron ${ids.length} cartones pasados exitosamente.`);
  };

  const handleArchiveSingle = (cardId: string) => {
    archiveCard(cardId);
    showToast('Cartón archivado (oculto de la vista activa).');
  };

  const handleUnarchiveSingle = (cardId: string) => {
    unarchiveCard(cardId);
    showToast('Cartón restaurado a la vista activa.');
  };

  const handleUnarchiveAll = () => {
    if (archivedCards.length === 0) return;
    archivedCards.forEach((c) => unarchiveCard(c.id));
    showToast('Todos los cartones archivados han sido restaurados.');
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-amber-300 font-bold px-4 py-3 rounded-2xl shadow-2xl border border-amber-400/40 flex items-center gap-2 animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 1: BANNER GRANDE DEL SORTEO ACTIVO (Sincronizado en Vivo) */}
      {/* ------------------------------------------------------------- */}
      {currentOpenRound ? (
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-indigo-700/60">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              {/* Live sync pill */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Sincronizado
                </span>

                <span className="bg-amber-400 text-indigo-950 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Sorteo #{currentOpenRound.roundNumber} ACTIVO
                </span>

                {isRealtimeSyncConnected && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                    <Radio className="w-3 h-3 text-emerald-400" /> WebSocket Online
                  </span>
                )}
              </div>

              {/* Headline */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                Sorteo #{currentOpenRound.roundNumber} - {currentOpenRound.title}
              </h1>

              {/* Dynamic Jackpot Display */}
              <div className="mt-2 flex items-center gap-2 flex-wrap text-sm">
                <span className="text-indigo-200 font-bold">Premio a Repartir:</span>
                <span className="text-lg sm:text-xl font-mono font-black text-amber-300 bg-amber-500/10 px-3 py-0.5 rounded-xl border border-amber-500/30">
                  {formatMoney(currentOpenRound.jackpotVes || 215000)}
                </span>
                <span className="text-xs text-indigo-300">
                  • Precio: {formatMoney(currentOpenRound.card_price || currentOpenRound.cardPriceVes || 25)}
                </span>
              </div>
            </div>

            {/* Quick Actions & Live Stats */}
            <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
              <button
                onClick={handleManualRefresh}
                title="Actualizar estado de sorteos en tiempo real"
                className={`p-2.5 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 rounded-2xl border border-indigo-700 transition-all ${
                  isRefreshing ? 'animate-spin text-amber-400' : ''
                }`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={onOpenBuyCards}
                className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 font-black text-xs sm:text-sm px-4 sm:px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Comprar Más Cartones</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Fallback Header */
        <div className="bg-gradient-to-r from-indigo-950 to-indigo-900 rounded-3xl p-5 text-white shadow-xl border border-indigo-800 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Mis Cartones</h1>
            <p className="text-xs text-indigo-200 mt-0.5">
              Tus cartones activos y registro histórico de jugadas.
            </p>
          </div>
          <button
            onClick={onOpenBuyCards}
            className="bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Comprar Cartones</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONTADORES INTERACTIVOS ARRIBA */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Counter: Total */}
        <button
          onClick={() => {
            setMainTab('history');
            setSubFilter('all');
            setSelectedRoundId('all');
          }}
          className={`p-3 rounded-2xl border text-left transition-all ${
            mainTab === 'history' && subFilter === 'all' && selectedRoundId === 'all'
              ? 'bg-indigo-950 border-indigo-700 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-200 shadow-xs'
          }`}
        >
          <span className="text-[10px] uppercase font-extrabold tracking-wider block text-slate-500">
            Total No Archivados
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-lg sm:text-xl font-mono font-black">{totalCount}</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
        </button>

        {/* Counter: En Juego */}
        <button
          onClick={() => {
            setMainTab('active');
            setSubFilter('all');
          }}
          className={`p-3 rounded-2xl border text-left transition-all ${
            mainTab === 'active'
              ? 'bg-amber-500/10 border-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/40'
              : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-700">
              En Juego
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-lg sm:text-xl font-mono font-black text-amber-600">
              {enJuegoCount}
            </span>
            <PlayCircle className="w-4 h-4 text-amber-500" />
          </div>
        </button>

        {/* Counter: Premiadas */}
        <button
          onClick={() => {
            setMainTab('history');
            setSubFilter('winner');
          }}
          className={`p-3 rounded-2xl border text-left transition-all ${
            subFilter === 'winner'
              ? 'bg-emerald-950 border-emerald-600 text-white shadow-md'
              : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <span className="text-[10px] uppercase font-extrabold tracking-wider block text-emerald-600">
            Premiadas
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-lg sm:text-xl font-mono font-black text-emerald-600">
              {winnersCount}
            </span>
            <Trophy className="w-4 h-4 text-emerald-500" />
          </div>
        </button>

        {/* Counter: Total Ganado */}
        <div className="p-3 rounded-2xl border bg-white border-slate-200 text-slate-700 shadow-xs">
          <span className="text-[10px] uppercase font-extrabold tracking-wider block text-slate-500">
            Premios Acreditados
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm sm:text-base font-mono font-black text-emerald-600 truncate">
              {formatMoney(totalPrizeWon)}
            </span>
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* STEP 2: 2 PESTAÑAS PRINCIPALES [En Juego] Y [Historial Completo] */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Main Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {/* Tab 1: En Juego */}
          <button
            onClick={() => setMainTab('active')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black transition-all ${
              mainTab === 'active'
                ? 'bg-indigo-950 text-amber-300 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>En Juego ({enJuegoCount})</span>
          </button>

          {/* Tab 2: Todos los Sorteos / Historial */}
          <button
            onClick={() => setMainTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black transition-all ${
              mainTab === 'history'
                ? 'bg-indigo-950 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Todos los Sorteos ({totalCount})</span>
          </button>

          {/* Tab 3: Archivados (opcional para ver lo archivado) */}
          {archivedCards.length > 0 && (
            <button
              onClick={() => setMainTab('archived')}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                mainTab === 'archived'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archivados ({archivedCards.length})</span>
            </button>
          )}
        </div>

        {/* Secondary Filters & Archiving Tools */}
        <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
          {/* Sorteo selector in History mode */}
          {mainTab === 'history' && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="all">Todos los Sorteos ({rounds.length})</option>
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    #{r.roundNumber} - {r.title} ({r.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sub-filter pills (Todos / Ganadores) */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
            <button
              onClick={() => setSubFilter('all')}
              className={`px-2 py-1 rounded-md font-bold transition-colors ${
                subFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSubFilter('winner')}
              className={`px-2 py-1 rounded-md font-bold transition-colors ${
                subFilter === 'winner' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Ganadores
            </button>
          </div>

          {/* STEP 3: BOTÓN ARCHIVAR / LIMPIAR HISTORIAL (Sin DELETE) */}
          {mainTab === 'history' && (
            <button
              onClick={handleArchivePastCards}
              title="Archiva cartones de sorteos finalizados para mantener la pantalla limpia"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 border border-slate-300"
            >
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              <span>Limpiar Pasados</span>
            </button>
          )}

          {mainTab === 'archived' && (
            <button
              onClick={handleUnarchiveAll}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
            >
              <ArchiveRestore className="w-3.5 h-3.5" />
              <span>Restaurar Todos</span>
            </button>
          )}
        </div>
      </div>

      {/* Notice info banner */}
      {mainTab === 'active' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="font-bold">
              Mostrando {filteredCards.length} cartones en juego para el sorteo activo.
            </span>
          </div>
          <span className="text-[11px] text-amber-700 font-medium hidden sm:inline">
            Tus aciertos se actualizan en vivo durante la extracción de fichas.
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* GRID DE CARTONES CON PAGINACIÓN DE 20 EN 20 */}
      {/* ------------------------------------------------------------- */}
      {filteredCards.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl">
            {mainTab === 'active' ? '🎟️' : '🗃️'}
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-1">
            {mainTab === 'active'
              ? 'No tienes cartones en juego para el sorteo activo'
              : 'No se encontraron cartones con este filtro'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {mainTab === 'active'
              ? 'Adquiere tu paquete de cartones para participar en el sorteo y ganar el premio mayor.'
              : 'Revisa otras pestañas o adquiere nuevos cartones para los próximos sorteos.'}
          </p>
          <button
            onClick={onOpenBuyCards}
            className="bg-indigo-950 hover:bg-indigo-900 text-amber-300 font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Comprar Paquete de Cartones</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 4x4 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedCards.map((card) => {
              const round = rounds.find((r) => r.id === card.roundId);
              return (
                <MatrixCardView
                  key={card.id}
                  card={card}
                  drawnFichas={round?.drawnFichas || []}
                  roundStatus={round?.status || 'open'}
                  onArchive={mainTab !== 'archived' ? handleArchiveSingle : undefined}
                  onUnarchive={mainTab === 'archived' ? handleUnarchiveSingle : undefined}
                />
              );
            })}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* PAGINACIÓN DE 20 EN 20 */}
          {/* ------------------------------------------------------------- */}
          {totalPages > 1 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Mostrando{' '}
                <span className="font-bold text-slate-800">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredCards.length)}
                </span>{' '}
                de <span className="font-bold text-slate-800">{filteredCards.length}</span> cartones
              </span>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        currentPage === pageNum
                          ? 'bg-indigo-950 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
