import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ExpressAnimalitoCardProps {
  onClick: () => void;
}

export const ExpressAnimalitoCard: React.FC<ExpressAnimalitoCardProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full group relative overflow-hidden rounded-3xl p-[2px] transition-all hover:scale-[1.01] active:scale-[0.99]"
    >
      {/* Borde diamante morado/ámbar que brilla */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-300 via-amber-400 to-purple-300 bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite] rounded-3xl" />

      <div className="relative bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-4 sm:p-5 flex items-center gap-4">
        {/* Ícono */}
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-purple-400/50 blur-xl rounded-full animate-pulse" />
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-300 via-amber-400 to-purple-600 text-white flex items-center justify-center shadow-2xl shadow-purple-500/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/50 to-transparent"></div>
            <span className="text-3xl sm:text-4xl relative">🐘</span>
          </div>
        </div>

        {/* Texto */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base sm:text-xl font-black text-white truncate">
              Exprés Animalito
            </h3>
            <span className="hidden sm:inline-flex items-center gap-1 bg-purple-500/20 text-purple-100 border border-purple-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-ping" />
              Instantáneo
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-300 font-medium truncate">
            Elegí tu animalito y multiplicá tu suerte
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-300">
              Desde 50 Bs.
            </span>
            <span className="text-[10px] text-slate-500">•</span>
            <span className="text-[10px] sm:text-[11px] text-slate-400">
              Premio hasta 15x
            </span>
          </div>
        </div>

        {/* Flecha */}
        <div className="shrink-0 flex items-center gap-2">
          <span className="hidden sm:inline text-xs font-black text-purple-200">
            Jugar ya
          </span>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-300 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent"></div>
            <ArrowRight className="w-5 h-5 stroke-[2.5] relative" />
          </div>
        </div>
      </div>
    </button>
  );
};
