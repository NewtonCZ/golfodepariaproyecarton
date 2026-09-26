import React, { useState, useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { soundService } from '../../services/soundAndSpeech';
import {
  ANIMALITOS_POOL,
  getAnimalitoById,
  MULTIPLICADORES,
  MONTO_MINIMO,
  MONTO_MAXIMO,
  type Multiplicador,
} from '../../data/animalitosPool';
import { X, Sparkles, Trophy, AlertCircle, RotateCcw } from 'lucide-react';

interface ExpressAnimalitoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Phase = 'setup' | 'drawing' | 'result';

export const ExpressAnimalitoModal: React.FC<ExpressAnimalitoModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, formatMoney, playExpressAnimalito } = useGame();

  const [phase, setPhase] = useState<Phase>('setup');
  const [selectedAnimalitoId, setSelectedAnimalitoId] = useState<number | null>(null);
  const [monto, setMonto] = useState<number>(50);
  const [multiplicador, setMultiplicador] = useState<Multiplicador>(2);
  const [fichaGirando, setFichaGirando] = useState<number>(1);
  const [resultado, setResultado] = useState<{
    animalitoId: number;
    gano: boolean;
    premio: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedAnimalito = useMemo(
    () => (selectedAnimalitoId ? getAnimalitoById(selectedAnimalitoId) : null),
    [selectedAnimalitoId]
  );

  const premioPotencial = useMemo(() => monto * multiplicador, [monto, multiplicador]);

  const puedeJugar =
    selectedAnimalitoId !== null &&
    monto >= MONTO_MINIMO &&
    monto <= MONTO_MAXIMO &&
    (currentUser?.availableBalance || 0) >= monto;

  const handleJugar = async () => {
    setErrorMsg(null);

    if (!selectedAnimalitoId || !selectedAnimalito) {
      setErrorMsg('Elegí un animalito para jugar.');
      return;
    }
    if (monto < MONTO_MINIMO) {
      setErrorMsg(`El monto mínimo es ${MONTO_MINIMO} Bs.`);
      return;
    }
    if (monto > MONTO_MAXIMO) {
      setErrorMsg(`El monto máximo es ${formatMoney(MONTO_MAXIMO)}.`);
      return;
    }
    if ((currentUser?.availableBalance || 0) < monto) {
      setErrorMsg('Saldo insuficiente.');
      return;
    }

    setPhase('drawing');

    // Llamar a la función del contexto (debitará saldo y persistirá)
    const res = await playExpressAnimalito({
      animalitoId: selectedAnimalitoId,
      animalitoName: selectedAnimalito.name,
      animalitoEmoji: selectedAnimalito.emoji,
      monto,
      multiplicador,
    });

    if (!res.success || !res.result) {
      setErrorMsg(res.message || 'Error al procesar la jugada');
      setPhase('setup');
      return;
    }

    // Animación: la ficha gira por los 25 animalitos durante 3 segundos
    const totalAnimales = ANIMALITOS_POOL.length;
    const duracionTotal = 3000;
    const intervalTime = 80;
    const totalTicks = duracionTotal / intervalTime;
    let tick = 0;

    const interval = setInterval(() => {
      const nextId = ((tick * 7) % totalAnimales) + 1;
      setFichaGirando(nextId);
      try {
        soundService.playPop();
      } catch {}

      tick++;
      if (tick >= totalTicks) {
        clearInterval(interval);

        const ganadorId = res.result!.animalitoGanadorId;
        setFichaGirando(ganadorId);

        const ganador = getAnimalitoById(ganadorId);
        const gano = res.result!.gano;
        const premio = res.result!.premio;

        setResultado({ animalitoId: ganadorId, gano, premio });

        try {
          if (ganador) {
            soundService.cantarFicha(`¡${ganador.name}!`);
          }
          if (gano) {
            setTimeout(() => {
              soundService.playFanfare();
              soundService.cantarFicha('¡Felicidades, ganaste!');
            }, 800);
          }
        } catch {}

        setTimeout(() => {
          setPhase('result');
        }, 700);
      }
    }, intervalTime);
  };

  const resetJuego = () => {
    setPhase('setup');
    setResultado(null);
    setFichaGirando(1);
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetJuego();
    setSelectedAnimalitoId(null);
    setMonto(50);
    setMultiplicador(2);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-purple-500/40">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 border-b border-purple-500/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-amber-500 flex items-center justify-center text-2xl shadow-lg">
              🐘
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Exprés Animalito</h2>
              <p className="text-[11px] text-purple-200">
                Elegí 1 animalito, elegí tu multiplicador
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Saldo */}
          <div className="bg-slate-950 rounded-2xl p-3 flex items-center justify-between border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-bold">
              Tu saldo
            </span>
            <span className="text-xl font-black text-amber-400">
              {formatMoney(currentUser?.availableBalance || 0)}
            </span>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="bg-rose-950/60 border border-rose-700/60 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FASE SETUP */}
          {phase === 'setup' && (
            <>
              <div>
                <p className="text-xs font-black text-slate-300 uppercase mb-2">
                  1. Elegí tu animalito
                </p>
                <div className="grid grid-cols-5 gap-1.5 max-h-[240px] overflow-y-auto p-1">
                  {ANIMALITOS_POOL.map((a) => {
                    const isSelected = selectedAnimalitoId === a.id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAnimalitoId(a.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-b from-purple-500 to-amber-500 border-amber-400 scale-105 shadow-lg shadow-purple-500/40'
                            : 'bg-slate-950 border-slate-800 hover:border-purple-500/60'
                        }`}
                      >
                        <span className="text-2xl sm:text-3xl">{a.emoji}</span>
                        <span
                          className={`text-[9px] font-bold mt-0.5 ${
                            isSelected ? 'text-white' : 'text-slate-400'
                          }`}
                        >
                          {a.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-slate-300 uppercase mb-2">
                  2. Monto a apostar ({MONTO_MINIMO} - {formatMoney(MONTO_MAXIMO)})
                </p>
                <input
                  type="number"
                  min={MONTO_MINIMO}
                  max={MONTO_MAXIMO}
                  value={monto}
                  onChange={(e) => setMonto(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border-2 border-slate-800 focus:border-amber-400 rounded-xl px-4 py-3 text-white font-mono font-black text-lg focus:outline-none"
                />
                <div className="flex gap-1.5 mt-2">
                  {[50, 100, 200, 500, 1000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setMonto(v)}
                      className="flex-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black text-slate-300 uppercase mb-2">
                  3. Multiplicador
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {MULTIPLICADORES.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMultiplicador(m)}
                      className={`py-2 rounded-xl font-black text-sm transition-all cursor-pointer ${
                        multiplicador === m
                          ? 'bg-gradient-to-r from-purple-500 to-amber-500 text-white shadow-lg scale-105'
                          : 'bg-slate-950 border-2 border-slate-800 text-slate-300 hover:border-purple-500/60'
                      }`}
                    >
                      {m}x
                    </button>
                  ))}
                </div>
              </div>

              {selectedAnimalitoId && (
                <div className="bg-gradient-to-r from-purple-950 to-slate-950 rounded-2xl p-4 border-2 border-amber-500/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-purple-300 uppercase font-bold">
                        Animalito elegido
                      </p>
                      <p className="text-lg font-black text-white">
                        {selectedAnimalito?.emoji} {selectedAnimalito?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-amber-300 uppercase font-bold">
                        Premio potencial
                      </p>
                      <p className="text-2xl font-mono font-black text-amber-400">
                        {formatMoney(premioPotencial)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleJugar}
                disabled={!puedeJugar}
                className={`w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 ${
                  puedeJugar
                    ? 'bg-gradient-to-r from-purple-500 via-amber-500 to-purple-500 text-white shadow-xl shadow-purple-500/40 active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-5 h-5" />
                <span>JUGAR {formatMoney(monto)}</span>
              </button>
            </>
          )}

          {/* FASE DRAWING */}
          {phase === 'drawing' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              <p className="text-sm font-black text-purple-300 uppercase tracking-wider animate-pulse">
                🎲 Sorteando...
              </p>
              <div className="relative">
                <div className="absolute inset-0 bg-amber-400/40 blur-3xl rounded-full animate-pulse" />
                <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-purple-500 via-amber-500 to-purple-600 flex items-center justify-center shadow-2xl border-4 border-amber-300">
                  <span className="text-7xl drop-shadow-lg">
                    {getAnimalitoById(fichaGirando)?.emoji || '🐘'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-400">
                Tu animalito:{' '}
                <strong className="text-amber-400">
                  {selectedAnimalito?.emoji} {selectedAnimalito?.name}
                </strong>
              </p>
            </div>
          )}

          {/* FASE RESULT */}
          {phase === 'result' && resultado && (
            <div className="space-y-4 animate-in zoom-in-95 duration-500">
              <div
                className={`rounded-3xl p-6 text-center border-4 ${
                  resultado.gano
                    ? 'border-amber-400 bg-gradient-to-br from-amber-500/30 via-yellow-500/20 to-orange-500/30 shadow-2xl shadow-amber-500/40'
                    : 'border-slate-700 bg-slate-800/60'
                }`}
              >
                <div className="mb-3">
                  <span className="text-7xl">
                    {getAnimalitoById(resultado.animalitoId)?.emoji}
                  </span>
                </div>
                <p className="text-xl font-black text-white mb-1">
                  {getAnimalitoById(resultado.animalitoId)?.name}
                </p>

                {resultado.gano ? (
                  <>
                    <Trophy className="w-12 h-12 text-amber-400 mx-auto my-3 animate-bounce" />
                    <p className="text-sm font-black text-amber-300 uppercase">
                      ¡GANASTE!
                    </p>
                    <p className="text-4xl font-black text-amber-300 font-mono mt-1">
                      {formatMoney(resultado.premio)}
                    </p>
                    <p className="text-xs text-slate-300 mt-2">
                      {monto} Bs × {multiplicador}x
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-black text-slate-400 mt-4">
                      No fue esta vez
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Tu animalito era {selectedAnimalito?.emoji} {selectedAnimalito?.name}
                    </p>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={resetJuego}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-amber-500 text-white font-black text-sm rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Jugar de nuevo</span>
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-2xl transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
