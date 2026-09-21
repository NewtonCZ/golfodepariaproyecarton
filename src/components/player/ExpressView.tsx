import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { Sparkles, Zap, Trophy, AlertCircle, Loader2, RotateCcw } from 'lucide-react';

interface PlayResult {
  drawnFichas: number[];
  totalPrize: number;
  winnersCount: number;
  cards: any[];
}

export const ExpressView: React.FC = () => {
  const { playExpress, formatMoney, commercialConfig, currentUser } = useGame();
  const [isPlaying, setIsPlaying] = useState(false);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cfgAny = commercialConfig as any;
const packPrices = {
  pack2: cfgAny.expressPack2Price || 150,
  pack4: cfgAny.expressPack4Price || 300,
  pack6: cfgAny.expressPack6Price || 450,
};

  const handlePlay = async (packCount: 2 | 4 | 6) => {
    setErrorMsg(null);
    setResult(null);
    setIsPlaying(true);
    try {
      const res = await playExpress(packCount);
      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        setResult(res.result as PlayResult);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error inesperado');
    } finally {
      setIsPlaying(false);
    }
  };

  const resetView = () => {
    setResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg">
          <Zap className="w-4 h-4" />
          <span>Sorteo Exprés</span>
        </div>
        <h2 className="text-3xl font-black text-white mt-3">Apuesta Instantánea</h2>
        <p className="text-slate-400 text-sm mt-2">
          Compra tus cartones y juega al instante. 22 fichas se sortean al azar y evalúan tus cartones en segundos.
        </p>
      </div>

      {/* Saldo actual */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase font-bold">Tu saldo disponible</p>
          <p className="text-2xl font-black text-amber-400">{formatMoney(currentUser?.availableBalance || 0)}</p>
        </div>
        <Sparkles className="w-8 h-8 text-amber-400/60" />
      </div>

      {/* Sin resultado: mostrar botones de packs */}
      {!result && !isPlaying && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PackButton pack={2} price={packPrices.pack2} onPlay={handlePlay} />
          <PackButton pack={4} price={packPrices.pack4} onPlay={handlePlay} />
          <PackButton pack={6} price={packPrices.pack6} onPlay={handlePlay} />
        </div>
      )}

      {/* Cargando */}
      {isPlaying && (
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-bold text-lg">Sorteando fichas...</p>
          <p className="text-slate-400 text-sm mt-1">Evaluando tus cartones</p>
        </div>
      )}

      {/* Error */}
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

      {/* Resultado */}
      {result && (
        <div className="space-y-6">
          {/* Cartel de premio */}
          <div
            className={`rounded-2xl p-6 text-center border-2 ${
              result.totalPrize > 0
                ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500'
                : 'bg-slate-800/60 border-slate-700'
            }`}
          >
            {result.totalPrize > 0 ? (
              <>
                <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                <p className="text-white text-sm font-bold uppercase tracking-wider">¡Ganaste!</p>
                <p className="text-4xl font-black text-amber-400 mt-1">{formatMoney(result.totalPrize)}</p>
                <p className="text-slate-300 text-xs mt-1">
                  {result.winnersCount} cartón(es) premiado(s)
                </p>
              </>
            ) : (
              <>
                <p className="text-slate-300 text-sm font-bold">Esta vez no hubo premio</p>
                <p className="text-slate-500 text-xs mt-1">Sigue intentando — hay nuevas oportunidades cada vez</p>
              </>
            )}
          </div>

          {/* Fichas sorteadas */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
            <p className="text-xs text-slate-400 uppercase font-bold mb-3">
              Fichas sorteadas ({result.drawnFichas.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {result.drawnFichas.map((id, idx) => (
                <div
                  key={idx}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md"
                >
                  {id}
                </div>
              ))}
            </div>
          </div>

          {/* Botón jugar de nuevo */}
          <button
            onClick={resetView}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm py-3 rounded-2xl shadow-lg hover:from-amber-400 hover:to-orange-400 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Jugar de nuevo
          </button>
        </div>
      )}
    </div>
  );
};

// Sub-componente: botón de pack
const PackButton: React.FC<{ pack: 2 | 4 | 6; price: number; onPlay: (p: 2 | 4 | 6) => void }> = ({ pack, price, onPlay }) => (
  <button
    onClick={() => onPlay(pack)}
    className="group bg-slate-800/60 border-2 border-slate-700 hover:border-amber-500 rounded-2xl p-6 text-left transition-all hover:shadow-xl hover:shadow-amber-500/10"
  >
    <div className="flex items-center gap-2 mb-3">
      <Sparkles className="w-5 h-5 text-amber-400" />
      <span className="text-xs font-black uppercase text-amber-400">Pack</span>
    </div>
    <p className="text-2xl font-black text-white">{pack} Cartones</p>
    <p className="text-3xl font-black text-amber-400 mt-2">{price} Bs.</p>
    <p className="text-xs text-slate-400 mt-3">Click para jugar ahora</p>
  </button>
);

export default ExpressView;
