import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { getFichaById } from '../../data/fichasPool';
import { FichaBadge } from '../common/FichaBadge';
import { soundService } from '../../services/soundAndSpeech';
import { Sparkles, Zap, Trophy, AlertCircle, RotateCcw, Play } from 'lucide-react';

interface PlayResult {
  drawnFichas: number[];
  totalPrize: number;
  winnersCount: number;
  cards: any[];
}

// ─────────────────────────────────────────────
// TIPOS INTERNOS DE LA ANIMACIÓN
// ─────────────────────────────────────────────
type Phase = 'idle' | 'dealing' | 'drawing' | 'result';

const DRAW_INTERVAL_MS = 2000; // 2 seg por ficha
const DEAL_DELAY_MS = 300;     // stagger entre cartones

export const ExpressView: React.FC = () => {
  const { playExpress, formatMoney, commercialConfig, currentUser } = useGame();

  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<PlayResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado de animación
  const [dealtCardsCount, setDealtCardsCount] = useState(0);
  const [drawnFichas, setDrawnFichas] = useState<number[]>([]);
  const [currentFichaId, setCurrentFichaId] = useState<number | null>(null);
  const [showWinnerBanner, setShowWinnerBanner] = useState(false);

  const cfgAny = commercialConfig as any;
  const packPrices = {
    pack2: cfgAny.expressPack2Price || 150,
    pack4: cfgAny.expressPack4Price || 300,
    pack6: cfgAny.expressPack6Price || 450,
  };

  // Set de IDs de fichas cantadas para lookup rápido
  const drawnSet = useMemo(() => new Set(drawnFichas), [drawnFichas]);

  // ─────────────────────────────────────────────
  // SECUENCIA COMPLETA AL PRESIONAR UN PACK
  // ─────────────────────────────────────────────
  const handlePlay = async (packCount: 2 | 4 | 6) => {
    setErrorMsg(null);
    setResult(null);
    setDealtCardsCount(0);
    setDrawnFichas([]);
    setCurrentFichaId(null);
    setShowWinnerBanner(false);
    setPhase('dealing');

    try {
      // 1. Llamar al backend YA (en paralelo con la animación)
      const res = await playExpress(packCount);
      if (!res.success) {
        setErrorMsg(res.message);
        setPhase('idle');
        return;
      }

      const playResult = res.result as PlayResult;
      setResult(playResult);

      // 2. Esperar a que se repartan los cartones (stagger)
      const totalCards = playResult.cards?.length || packCount;
      for (let i = 1; i <= totalCards; i++) {
        setTimeout(() => setDealtCardsCount(i), i * DEAL_DELAY_MS);
      }

      const dealDuration = totalCards * DEAL_DELAY_MS + 400;

      // 3. Después de repartir → empezar a cantar fichas
      setTimeout(() => {
        setPhase('drawing');
        let idx = 0;
        const totalFichas = playResult.drawnFichas.length;

        const drawInterval = setInterval(() => {
          if (idx >= totalFichas) {
            clearInterval(drawInterval);
            setCurrentFichaId(null);
            
      // 4. Al terminar → resultado
            setTimeout(() => {
            setPhase('result');
              if (playResult.totalPrize > 0) {
                setShowWinnerBanner(true);
                // 🎺 Fanfarria del ganador
                try {
                  soundService.playFanfare();
                  soundService.cantarFicha('¡Felicidades, ganaste!');
                } catch {}
              }
            }, 800);
            return;
          }

  const fichaId = playResult.drawnFichas[idx];
    setCurrentFichaId(fichaId);
    setDrawnFichas((prev) => [...prev, fichaId]);

// 🔊 Locución del locutor con el nombre de la figura
      try {
      const ficha = getFichaById(fichaId);
      if (ficha) soundService.speakFicha(ficha);
    } catch (err) {
      console.warn('[ExpressView] speakFicha error:', err);
        }

          idx++;
  const resetView = () => {
    setPhase('idle');
    setResult(null);
    setErrorMsg(null);
    setDealtCardsCount(0);
    setDrawnFichas([]);
    setCurrentFichaId(null);
    setShowWinnerBanner(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* HEADER */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/30">
          <Zap className="w-4 h-4 fill-current" />
          <span>Sorteo Exprés</span>
        </div>
        <h2 className="text-3xl font-black text-white mt-3">Apuesta Instantánea</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-lg mx-auto">
          Compra tus cartones y juega al instante. Premios inmediatos.
        </p>
      </div>

      {/* SALDO */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase font-bold">Tu saldo disponible</p>
          <p className="text-2xl font-black text-amber-400">
            {formatMoney(currentUser?.availableBalance || 0)}
          </p>
        </div>
        <Sparkles className="w-8 h-8 text-amber-400/60" />
      </div>

      {/* FASE IDLE: elegir pack */}
      {phase === 'idle' && !errorMsg && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PackButton pack={2} price={packPrices.pack2} onPlay={handlePlay} />
          <PackButton pack={4} price={packPrices.pack4} onPlay={handlePlay} highlight />
          <PackButton pack={6} price={packPrices.pack6} onPlay={handlePlay} />
        </div>
      )}

      {/* ERROR */}
      {errorMsg && (
        <div className="bg-red-950/40 border border-red-700/60 rounded-2xl p-4 flex items-start gap-3 mt-6">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-bold text-sm">No se pudo jugar</p>
            <p className="text-red-200/80 text-xs mt-1">{errorMsg}</p>
            <button
              onClick={resetView}
              className="mt-3 text-xs font-bold text-red-300 underline"
            >
              Volver a intentar
            </button>
          </div>
        </div>
      )}

      {/* FASES DE JUEGO: dealing / drawing / result */}
      {phase !== 'idle' && result && (
        <div className="space-y-6">
          {/* MESA DE CARTONES */}
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold mb-3 text-center">
              Tus cartones en juego
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(result.cards || []).map((card: any, idx: number) => {
                const isFlipped = idx < dealtCardsCount;
                return (
                  <CardOnTable
                    key={card.id}
                    card={card}
                    isFlipped={isFlipped}
                    drawnSet={drawnSet}
                    currentFichaId={currentFichaId}
                  />
                );
              })}
            </div>
          </div>

          {/* BOLILLERO - FICHAS CANTADAS */}
          {phase !== 'idle' && (
            <div className="bg-slate-900/80 border-2 border-amber-500/30 rounded-2xl p-4 sm:p-6">
              {/* Ficha actual grande */}
              <div className="flex items-center justify-center gap-6 mb-4">
                {currentFichaId ? (
                  <CurrentFichaDisplay fichaId={currentFichaId} />
                ) : phase === 'result' ? (
                  <div className="text-center">
                    <p className="text-slate-400 text-xs uppercase font-bold mb-1">
                      Fin del sorteo
                    </p>
                    <p className="text-white font-black text-lg">
                      {drawnFichas.length} figuras cantadas
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-amber-300 font-black text-sm animate-pulse">
                      Preparando sorteo...
                    </p>
                  </div>
                )}
              </div>

              {/* Historial de fichas cantadas */}
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 text-center">
                  Figuras cantadas
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center min-h-[40px]">
                  {drawnFichas.map((id, i) => (
                    <FichaChip key={`${id}-${i}`} fichaId={id} isLatest={i === drawnFichas.length - 1} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CARTEL DE GANADOR / PERDEDOR */}
          {phase === 'result' && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              {showWinnerBanner && result.totalPrize > 0 ? (
                <div className="relative rounded-3xl p-8 text-center border-4 border-amber-400 bg-gradient-to-br from-amber-500/30 via-yellow-500/20 to-orange-500/30 shadow-2xl shadow-amber-500/40 overflow-hidden">
                  {/* Confeti simulado con puntos dorados */}
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-amber-300 rounded-full animate-bounce"
                        style={{
                          left: `${(i * 37) % 100}%`,
                          top: `${(i * 23) % 100}%`,
                          animationDelay: `${i * 100}ms`,
                          animationDuration: `${1500 + (i % 3) * 500}ms`,
                          opacity: 0.6,
                        }}
                      />
                    ))}
                  </div>

                  <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-3 animate-bounce relative z-10" />
                  <p className="text-white text-lg font-black uppercase tracking-wider relative z-10">
                    ¡Ganaste!
                  </p>
                  <p className="text-5xl sm:text-6xl font-black text-amber-300 mt-2 drop-shadow-2xl relative z-10">
                    {formatMoney(result.totalPrize)}
                  </p>
                  <p className="text-slate-200 text-sm mt-3 relative z-10 font-bold">
                    {result.winnersCount} cartón(es) premiado(s)
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl p-8 text-center border-2 border-slate-700 bg-slate-800/60">
                  <p className="text-slate-300 text-lg font-black">Sin premio esta vez</p>
                  <p className="text-slate-500 text-xs mt-2">
                    ¡Inténtalo de nuevo! Cada ronda es una nueva oportunidad.
                  </p>
                </div>
              )}

              <button
                onClick={resetView}
                className="group relative w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm py-4 rounded-2xl shadow-lg hover:shadow-amber-500/50 transition-all overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <RotateCcw className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Jugar de nuevo</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// SUB-COMPONENTES
// ─────────────────────────────────────────────

/** Botón de pack con hover y glow */
const PackButton: React.FC<{
  pack: 2 | 4 | 6;
  price: number;
  onPlay: (p: 2 | 4 | 6) => void;
  highlight?: boolean;
}> = ({ pack, price, onPlay, highlight = false }) => (
  <button
    onClick={() => onPlay(pack)}
    className={`group relative bg-slate-800/60 border-2 rounded-2xl p-6 text-left transition-all hover:scale-[1.03] active:scale-[0.98] hover:shadow-2xl ${
      highlight
        ? 'border-amber-500/70 hover:border-amber-400 hover:shadow-amber-500/30'
        : 'border-slate-700 hover:border-amber-500/60 hover:shadow-amber-500/20'
    }`}
  >
    {highlight && (
      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-full shadow-md uppercase tracking-wider">
        Popular
      </span>
    )}
    <div className="flex items-center gap-2 mb-3">
      <Sparkles className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
      <span className="text-xs font-black uppercase text-amber-400">Pack</span>
    </div>
    <p className="text-2xl font-black text-white">{pack} Cartones</p>
    <p className="text-3xl font-black text-amber-400 mt-2 group-hover:scale-105 transition-transform origin-left">
      {price} Bs.
    </p>
    <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
      <Play className="w-3 h-3 text-amber-400 fill-current" />
      Jugar ahora
    </p>
  </button>
);

/** Cartón en la mesa con animación de volteo 3D */
const CardOnTable: React.FC<{
  card: any;
  isFlipped: boolean;
  drawnSet: Set<number>;
  currentFichaId: number | null;
}> = ({ card, isFlipped, drawnSet, currentFichaId }) => {
  const matrix: number[] = Array.isArray(card.matrix) ? card.matrix : [];

  return (
    <div className="relative" style={{ perspective: '1200px' }}>
      <div
        className="relative transition-transform duration-700"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
        }}
      >
        {/* FRENTE (visible cuando volteado) */}
        <div
          className="bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-3 shadow-lg"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-indigo-400">
              Cartón #{card.serialNumber || card.id.slice(-6)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {drawnSet.size} cantadas
            </span>
          </div>

          {/* Matriz 4x4 */}
          <div className="grid grid-cols-4 gap-1.5">
            {matrix.map((fichaId, idx) => {
              const isMarked = drawnSet.has(fichaId);
              const isLatest = fichaId === currentFichaId;

              return (
                <div
                  key={idx}
                  className={`transition-all duration-300 ${
                    isLatest
                      ? 'ring-4 ring-amber-400 rounded-xl scale-110 z-10 shadow-lg shadow-amber-500/50'
                      : isMarked
                      ? 'ring-2 ring-emerald-400 rounded-xl'
                      : ''
                  }`}
                >
                  <FichaBadge
                    fichaId={fichaId}
                    size="sm"
                    showName={false}
                    showNumber={false}
                    isMatched={isMarked && !isLatest}
                    isRecent={isLatest}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* REVERSO (visible antes de voltear) */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 border-2 border-indigo-700 flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="text-center">
            <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-2 animate-pulse" />
            <p className="text-amber-300 font-black text-xs uppercase tracking-wider">
              Tú Supercartón
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Ficha actual grande */
const CurrentFichaDisplay: React.FC<{ fichaId: number }> = ({ fichaId }) => {
  const ficha = getFichaById(fichaId);
  if (!ficha) return null;

  return (
    <div
      key={fichaId}
      className="flex flex-col items-center animate-in zoom-in-50 duration-500"
    >
      <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 flex items-center justify-center shadow-2xl shadow-amber-500/60 border-4 border-amber-300 relative">
        <span className="text-6xl sm:text-7xl drop-shadow-lg">{ficha.emoji}</span>
      </div>
      <div className="mt-3 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-400/50">
        <p className="text-white font-black text-base sm:text-lg capitalize tracking-wide">
          {ficha.name}
        </p>
      </div>
    </div>
  );
};

/** Chip pequeño de ficha cantada */
const FichaChip: React.FC<{ fichaId: number; isLatest: boolean }> = ({ fichaId, isLatest }) => {
  const ficha = getFichaById(fichaId);
  if (!ficha) return null;

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
        isLatest
          ? 'bg-amber-400 text-slate-950 scale-110 shadow-md'
          : 'bg-slate-800 text-slate-300'
      }`}
    >
      <span>{ficha.emoji}</span>
      <span className="capitalize text-[10px]">{ficha.name}</span>
    </div>
  );
};

export default ExpressView;
