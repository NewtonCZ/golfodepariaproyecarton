import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { CountdownTimer } from '../common/CountdownTimer';
import { MatrixCardView } from '../cards/MatrixCardView';
import { FichaBadge } from '../common/FichaBadge';
import { FICHAS_POOL } from '../../data/fichasPool';
import {
  Trophy,
  Sparkles,
  PlusCircle,
  ArrowUpRight,
  Radio,
  ShieldCheck,
  Zap,
  ArrowRight,
  Eye,
  Clock,
  Coins,
  Ticket,
  Calendar,
  Layers,
} from 'lucide-react';

interface HomeDashboardProps {
  onOpenBuyCards: (roundId?: string) => void;
  onOpenRecharge: () => void;
  onOpenWithdraw: () => void;
  onOpenLiveDraw: (roundId?: string) => void;
  onOpenMyCards: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onOpenBuyCards,
  onOpenRecharge,
  onOpenWithdraw,
  onOpenLiveDraw,
  onOpenMyCards,
}) => {
  const {
    activeRound,
    upcomingRounds,
    rounds,
    finishedRounds,
    currentUser,
    userCards,
    formatMoney,
    commercialConfig,
    fetchActiveRounds,
    fetchFinishedRounds,
  } = useGame();

  const [showFichasPoolModal, setShowFichasPoolModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'animal' | 'fruta' | 'objeto'>('all');
  const [selectedRoundTabId, setSelectedRoundTabId] = useState<string | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());

  // Update now timestamp every 5 seconds for replay countdown accuracy
  React.useEffect(() => {
    const timer = setInterval(() => setNowTimestamp(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // 15-second Polling interval: fetch('/api/rounds?status=open,scheduled&limit=6') and finished rounds history
  React.useEffect(() => {
    fetchActiveRounds({ bypassCache: true, limit: 6 });
    fetchFinishedRounds({ bypassCache: true, limit: 6 });

    const pollingInterval = setInterval(() => {
      fetchActiveRounds({ bypassCache: true, limit: 6 });
      fetchFinishedRounds({ bypassCache: true, limit: 6 });
    }, 15000);

    return () => clearInterval(pollingInterval);
  }, [fetchActiveRounds, fetchFinishedRounds]);

  // Compute active & scheduled sequential rounds (up to 6) sorted by starts_at ASC
  const displayRounds = React.useMemo(() => {
    if (upcomingRounds && upcomingRounds.length > 0) {
      return upcomingRounds.slice(0, 6);
    }
    return rounds
      .filter((r) => {
        const st = String(r.status || '').toLowerCase();
        return st === 'open' || st === 'scheduled' || st === 'active' || st === 'activo' || st === 'drawing';
      })
      .sort((a, b) => {
        const rawDateA = a?.starts_at || a?.openBetAt || a?.drawAt || a?.created_at;
        const rawDateB = b?.starts_at || b?.openBetAt || b?.drawAt || b?.created_at;
        const timeA = rawDateA ? new Date(rawDateA).getTime() : 0;
        const timeB = rawDateB ? new Date(rawDateB).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return ((a?.order || a?.roundNumber || 0) - (b?.order || b?.roundNumber || 0));
      })
      .slice(0, 6);
  }, [upcomingRounds, rounds]);

  const activeDisplayRound = displayRounds.find((r) => r.id === selectedRoundTabId) || displayRounds[0] || activeRound;

  const currentCardsInRound = userCards.filter((c) => c.roundId === activeDisplayRound?.id);

  const filteredPool = FICHAS_POOL.filter((f) => {
    if (selectedCategory === 'all') return true;
    return f.category === selectedCategory;
  });

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      {/* Top Banner: Quick Balance & Live Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/15 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Sorteos Oficiales
              </h1>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-[10px] uppercase px-2 py-0.5 rounded-full">
                En Vivo
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Sorteos programados con premios garantizados a repartir.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: 3 Sequential Sorteos (Next Draws) */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Próximos Sorteos Secuenciales
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Participa en cualquiera de los sorteos programados o en curso (hasta 6 activos). Cada uno posee su propio pozo y cartones independientes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenLiveDraw()}
              className="inline-flex items-center gap-2 bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>Sala de Transmisión</span>
            </button>
            <button
              onClick={() => setShowFichasPoolModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/60 px-3 py-1.5 rounded-xl transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>70 Fichas</span>
            </button>
          </div>
        </div>

        {displayRounds.length === 0 ? (
          <div className="bg-slate-900 rounded-3xl p-10 text-center border border-slate-800 text-slate-400">
            <Clock className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <h3 className="text-lg font-bold text-white">No hay sorteos programados en este momento</h3>
            <p className="text-xs text-slate-400 mt-1">El administrador publicará nuevos sorteos en breve.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {displayRounds.map((round, idx) => {
              const statusLower = String(round.status || '').toLowerCase();
              const isOpen = statusLower === 'open';
              const cardPrice = round.card_price || round.cardPriceVes || 25;
              const prizePct = round.prize_percentage !== undefined ? round.prize_percentage : 70;
              const accumulatedPrize = Math.max(
                round.jackpotVes || 0,
                (round.totalCardsSold || 0) * cardPrice * (prizePct / 100)
              );
              const userCardsInThisRound = userCards.filter((c) => c.roundId === round.id);

              const rawRoundDate = round?.starts_at || round?.openBetAt || round?.drawAt || round?.created_at;
              const roundDate = rawRoundDate ? new Date(rawRoundDate) : null;
              const formattedTime = roundDate && !isNaN(roundDate.getTime())
                ? roundDate.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
                : 'Próximamente';

              return (
                <div
                  key={round.id}
                  className={`rounded-3xl p-5 sm:p-6 transition-all flex flex-col justify-between relative overflow-hidden border-2 ${
                    isOpen
                      ? 'bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 border-amber-400/80 shadow-2xl shadow-amber-500/10'
                      : 'bg-slate-900/90 border-slate-800 hover:border-indigo-700/60 shadow-lg'
                  }`}
                >
                  {/* Top Status Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-900/80 border border-indigo-700/60 text-indigo-200 text-xs font-black px-2.5 py-0.5 rounded-lg">
                          #{round.order || round.roundNumber} • Turno {idx + 1}
                        </span>
                        {isOpen ? (
                          <span
                            style={{ height: '36.2153px', width: '80.281px' }}
                            className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center justify-center gap-1.5 animate-pulse"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Abierto Ahora
                          </span>
                        ) : (
                          <span
                            style={{ height: '36.2153px', width: '80.281px' }}
                            className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center justify-center"
                          >
                            Programado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-400 font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{formattedTime}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-black text-white leading-snug mb-1">
                      {round.title}
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                      {isOpen ? 'Apuestas abiertas en tiempo real' : 'Siguiente sorteo en cola automática'}
                    </p>

                    {/* Accumulated Prize Highlight Card */}
                    <div className="bg-slate-950/80 rounded-2xl p-4 border border-amber-400/20 mb-4 shadow-inner">
                      <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold uppercase tracking-wider mb-1">
                        <span>Premio a Repartir</span>
                        <span className="bg-amber-400/15 text-amber-300 px-2 py-0.2 rounded-md font-mono text-[10px]">
                          {prizePct}% Pozo
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Trophy className="w-7 h-7 text-amber-400 fill-amber-400 shrink-0" />
                        <span className="text-2xl sm:text-3xl font-mono font-black bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
                          {formatMoney(accumulatedPrize)}
                        </span>
                      </div>
                    </div>

                    {/* Metrics Grid: Card Price & Sold Cards */}
                    <div className="grid grid-cols-2 gap-2.5 mb-4 text-xs">
                      <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50 hidden">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                          Precio Cartón
                        </span>
                        <span className="font-mono font-black text-white text-sm">
                          {formatMoney(cardPrice)}
                        </span>
                      </div>
                      <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/50 hidden">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">
                          Cartones Vendidos
                        </span>
                        <span className="font-mono font-black text-amber-300 text-sm">
                          {round.totalCardsSold || 0} cartones
                        </span>
                      </div>
                    </div>

                    {/* Countdown Timer */}
                    {round.closeBetAt && (
                      <div className="mb-4">
                        <CountdownTimer
                          targetDate={round.closeBetAt}
                          label={isOpen ? 'Cierre de Apuestas' : 'Inicio Estimado'}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-slate-400">Tus cartones:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {userCardsInThisRound.length} de 6
                      </span>
                    </div>

                    <button
                      onClick={() => onOpenBuyCards(round.id)}
                      className={`w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 shadow-md ${
                        isOpen
                          ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 shadow-amber-500/20'
                          : 'bg-indigo-900/80 hover:bg-indigo-800 text-indigo-100 border border-indigo-700'
                      }`}
                    >
                      <Zap className="w-4 h-4 fill-current shrink-0" />
                      <span>Comprar para Sorteo #{round.order || round.roundNumber} ({formatMoney(cardPrice * 2)})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Package Quick Purchase Row */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Opciones de Paquetes en Pares (2, 4 o 6 Cartones)
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Cada cartón cuenta con 16 figuras aleatorias únicas del pool oficial de 70 figuras.
            </p>
          </div>
          <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold px-3 py-1 rounded-xl">
            Sorteo Actual: {activeDisplayRound?.title || 'Sorteo 4×4'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pack 2 */}
          <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 hover:border-amber-400/60 transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 font-black text-xs px-2.5 py-1 rounded-lg">
                  Pack Básico
                </span>
                <span className="text-xs font-bold text-slate-400">2 Cartones</span>
              </div>
              <div className="text-2xl font-black text-white mb-1 font-mono">
                {formatMoney((activeDisplayRound?.card_price || activeDisplayRound?.cardPriceVes || 25) * 2)}
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Ideal para participar y buscar líneas horizontales, verticales y esquinas.
              </p>
            </div>
            <button
              onClick={() => onOpenBuyCards(activeDisplayRound?.id)}
              className="w-full py-2.5 bg-slate-800 group-hover:bg-amber-500 group-hover:text-indigo-950 font-black text-slate-200 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Comprar 2 Cartones</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pack 4 */}
          <div className="bg-slate-950 rounded-2xl p-5 border-2 border-amber-400/90 shadow-lg shadow-amber-500/10 relative flex flex-col justify-between">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-indigo-950 text-[10px] font-black px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider">
              Más Popular
            </span>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-amber-400/20 text-amber-300 font-black text-xs px-2.5 py-1 rounded-lg">
                  Pack Estrella
                </span>
                <span className="text-xs font-bold text-slate-400">4 Cartones</span>
              </div>
              <div className="text-2xl font-black text-white mb-1 font-mono">
                {formatMoney((activeDisplayRound?.card_price || activeDisplayRound?.cardPriceVes || 25) * 4)}
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Mayor probabilidad de aciertos y combinaciones en diagonales y tabla llena.
              </p>
            </div>
            <button
              onClick={() => onOpenBuyCards(activeDisplayRound?.id)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Comprar 4 Cartones</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pack 6 */}
          <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 hover:border-purple-400/60 transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-purple-950 text-purple-300 border border-purple-800 font-black text-xs px-2.5 py-1 rounded-lg">
                  Pack Máximo
                </span>
                <span className="text-xs font-bold text-slate-400">6 Cartones (Tope)</span>
              </div>
              <div className="text-2xl font-black text-white mb-1 font-mono">
                {formatMoney((activeDisplayRound?.card_price || activeDisplayRound?.cardPriceVes || 25) * 6)}
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Máxima cobertura por sorteo con 96 casillas en juego simultáneo.
              </p>
            </div>
            <button
              onClick={() => onOpenBuyCards(activeDisplayRound?.id)}
              className="w-full py-2.5 bg-slate-800 group-hover:bg-purple-500 group-hover:text-white font-black text-slate-200 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Comprar 6 Cartones</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* User's Active Cards in the selected round */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg sm:text-xl font-black text-white">
               Cartones en Juego ({currentCardsInRound.length} de 6)
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Viendo cartones para: <strong>{activeDisplayRound?.title || 'Sorteo Actual'}</strong>
            </p>
          </div>

          {/* Round Selector Tabs if user has cards in other rounds */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {displayRounds.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoundTabId(r.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
                  (selectedRoundTabId === r.id || (!selectedRoundTabId && r.id === activeDisplayRound?.id))
                    ? 'bg-amber-400 text-indigo-950 border-amber-400 font-black shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Sorteo #{r.order || r.roundNumber} ({userCards.filter((c) => c.roundId === r.id).length})
              </button>
            ))}
          </div>
        </div>

        {currentCardsInRound.length === 0 ? (
          <div className="bg-slate-950 rounded-2xl p-8 text-center border border-dashed border-slate-800">
            <div className="w-14 h-14 bg-indigo-950/80 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl border border-indigo-800">
              🎟️
            </div>
            <h3 className="text-base font-black text-white">
              Aún no tienes cartones para {activeDisplayRound?.title || 'este sorteo'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Compra tu paquete antes del cierre para participar por el premio a repartir de{' '}
              {formatMoney(activeDisplayRound?.jackpotVes || 15000)}.
            </p>
            <button
              onClick={() => onOpenBuyCards(activeDisplayRound?.id)}
              className="bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Comprar Cartones Ahora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentCardsInRound.map((card) => (
              <MatrixCardView
                key={card.id}
                card={card}
                drawnFichas={activeDisplayRound?.drawnFichas || []}
              />
            ))}
          </div>
        )}
      </section>

      {/* SECTION: Historial de Resultados Oficiales (Últimos 6 Sorteos Finalizados) con Acceso a Repetición de 7 Minutos */}
      {finishedRounds && finishedRounds.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Historial de Resultados Oficiales
                </h2>
                <span className="bg-indigo-950 text-indigo-300 border border-indigo-700/80 font-black text-[10px] px-2.5 py-0.5 rounded-full">
                  Últimos {Math.min(finishedRounds.length, 6)} Sorteos
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Resultados certificados y repetición en video-sala disponible durante los primeros 7 minutos post-sorteo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {finishedRounds.slice(0, 6).map((r) => {
              const finishTimeMs = new Date(r.resultSubmittedAt || r.updatedAt || r.drawAt || r.ends_at || 0).getTime();
              const diffSec = finishTimeMs > 0 ? Math.max(0, (nowTimestamp - finishTimeMs) / 1000) : 999999;
              const isWithin7Min = diffSec <= 420;
              const remainingSec = isWithin7Min ? Math.max(0, Math.floor(420 - diffSec)) : 0;
              const remainingMinStr = `${Math.floor(remainingSec / 60)}:${(remainingSec % 60).toString().padStart(2, '0')}`;

              const userHasCardsInRound = userCards.some((c) => c.roundId === r.id);
              const isKycApproved = currentUser?.kycStatus === 'Aprobado' && currentUser?.status === 'active';
              const canWatchReplay = isWithin7Min && userHasCardsInRound && isKycApproved;

              return (
                <div
                  key={r.id}
                  className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                    isWithin7Min
                      ? 'bg-gradient-to-b from-indigo-950/90 to-slate-900 border-amber-400/60 shadow-lg shadow-amber-950/20'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-black text-amber-400">
                        Sorteo #{r.roundNumber || r.order || 'Oficial'}
                      </span>
                      {isWithin7Min ? (
                        <span className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse">
                          <Radio className="w-3 h-3 text-amber-400" />
                          <span>Repetición ({remainingMinStr})</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                          Concluido
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white line-clamp-1 mb-3">
                      {r.title || `Sorteo Estelar #${r.roundNumber}`}
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">Premios Repartidos</span>
                        <span className="text-xs font-black text-emerald-400">
                          {formatMoney(r.totalPrizesPaidVes || 0)}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">Cartones Ganadores</span>
                        <span className="text-xs font-black text-amber-400">
                          {r.winningCardsCount || 0} ganadores
                        </span>
                      </div>
                    </div>

                    {Array.isArray(r.drawnFichas) && r.drawnFichas.length > 0 && (
                      <div className="mb-4">
                        <span className="text-[10px] text-slate-400 block mb-1 font-semibold">
                          Fichas Certificadas ({r.drawnFichas.length}):
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {r.drawnFichas.slice(0, 8).map((fId) => (
                            <span
                              key={fId}
                              className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800 text-white font-black text-xs flex items-center justify-center shadow-xs"
                            >
                              {fId}
                            </span>
                          ))}
                          {r.drawnFichas.length > 8 && (
                            <span className="text-[11px] font-bold text-slate-400">
                              +{r.drawnFichas.length - 8} más
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/60">
                    {isWithin7Min ? (
                      <button
                        type="button"
                        onClick={() => onOpenLiveDraw(r.id)}
                        className={`w-full flex items-center justify-center gap-2 font-black text-xs py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer ${
                          canWatchReplay
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-indigo-950'
                            : 'bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-700'
                        }`}
                      >
                        <Radio className="w-4 h-4 animate-pulse" />
                        <span>Ver Repetición en Sala ({remainingMinStr})</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenLiveDraw(r.id)}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2 px-3 rounded-xl border border-slate-800 transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Ver Resumen Oficial</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Compliance & Responsible Gaming Bar */}
      <div className="bg-slate-950/60 rounded-2xl p-4 text-slate-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-slate-300">Juego Responsable y Transparente:</strong> Matrices auditables generadas en servidor, cálculo automático de premios y pagos certificados.
          </span>
        </div>
        <span className="font-bold text-slate-500 whitespace-nowrap">
          +18 Años Solamente
        </span>
      </div>

      {/* 72 Fichas Pool Modal */}
      {showFichasPoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-lg font-black text-white">
                  Librería Completa de las 72 Fichas
                </h3>
                <p className="text-xs text-slate-400 font-bold">
                  25 Animales, 25 Frutas y 22 Objetos oficiales
                </p>
              </div>
              <button
                onClick={() => setShowFichasPoolModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mb-4">
              {(['all', 'animal', 'fruta', 'objeto'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-400 text-indigo-950 border-amber-400 font-black'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {cat === 'all'
                    ? 'Todas (72)'
                    : cat === 'animal'
                    ? 'Animales (25)'
                    : cat === 'fruta'
                    ? 'Frutas (25)'
                    : 'Objetos (22)'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 max-h-[480px] overflow-y-auto p-2 bg-slate-950 rounded-2xl border border-slate-800">
              {filteredPool.map((ficha) => (
                <FichaBadge key={ficha.id} ficha={ficha} size="sm" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
