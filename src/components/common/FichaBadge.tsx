import React from 'react';
import { Ficha } from '../../types';
import { getFichaById } from '../../data/fichasPool';

interface FichaBadgeProps {
  fichaId?: number;
  ficha?: Ficha;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  showNumber?: boolean;
  isMatched?: boolean;
  isRecent?: boolean;
  onClick?: () => void;
  className?: string;
}

export const FichaBadge: React.FC<FichaBadgeProps> = ({
  fichaId,
  ficha: propFicha,
  size = 'md',
  showName = true,
  showNumber = true,
  isMatched = false,
  isRecent = false,
  onClick,
  className = '',
}) => {
  const ficha = propFicha || (fichaId ? getFichaById(fichaId) : null);

  if (!ficha) return null;

  const sizeClasses = {
    xs: {
      box: 'w-8 h-8 text-sm rounded-lg',
      emoji: 'text-base',
      name: 'text-[9px] font-semibold truncate',
      num: 'text-[8px] font-black',
    },
    sm: {
      box: 'w-11 h-11 text-base rounded-xl',
      emoji: 'text-lg',
      name: 'text-[10px] font-bold truncate',
      num: 'text-[9px] font-black',
    },
    md: {
      box: 'w-14 h-14 text-xl rounded-2xl',
      emoji: 'text-2xl',
      name: 'text-[11px] font-bold truncate max-w-full',
      num: 'text-[10px] font-black',
    },
    lg: {
      box: 'w-20 h-20 text-3xl rounded-2xl',
      emoji: 'text-4xl',
      name: 'text-xs font-black truncate max-w-full',
      num: 'text-xs font-black',
    },
    xl: {
      box: 'w-28 h-28 text-5xl rounded-3xl',
      emoji: 'text-6xl',
      name: 'text-base font-black truncate max-w-full',
      num: 'text-sm font-black',
    },
  };

  const categoryBadgeColors = {
    animal: 'bg-amber-500/20 text-amber-900 border-amber-400/40',
    fruta: 'bg-rose-500/20 text-rose-900 border-rose-400/40',
    objeto: 'bg-indigo-500/20 text-indigo-900 border-indigo-400/40',
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      id={`ficha-badge-${ficha.id}`}
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-1 cursor-pointer select-none transition-all duration-200 transform ${
        onClick ? 'hover:scale-105 active:scale-95' : ''
      } ${
        isMatched
          ? 'ring-4 ring-amber-400 shadow-lg shadow-amber-300/50 bg-gradient-to-b from-amber-200 via-amber-100 to-yellow-200 border-2 border-amber-500 animate-pulse'
          : isRecent
          ? 'ring-4 ring-emerald-400 shadow-xl shadow-emerald-400/50 bg-white border-2 border-emerald-500 scale-105'
          : 'bg-white/95 hover:bg-white shadow-sm border border-slate-200/80'
      } ${currentSize.box} ${className}`}
      title={`#${ficha.id} - ${ficha.name} (${ficha.category})`}
    >
      {/* Category corner badge */}
      {showNumber && (
        <span
          className={`absolute top-0.5 left-1 px-1 rounded-full text-slate-600 bg-slate-100/90 ${currentSize.num}`}
        >
          #{ficha.id}
        </span>
      )}

      {/* Main Emoji Graphic */}
      <span className={`leading-none drop-shadow-sm my-auto ${currentSize.emoji}`}>
        {ficha.emoji}
      </span>

      {/* Name in Spanish */}
      {showName && (
        <span
          className={`text-slate-800 text-center tracking-tight px-0.5 ${currentSize.name}`}
        >
          {ficha.name}
        </span>
      )}

      {/* Matched Checkmark overlay */}
      {isMatched && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-md border-2 border-white animate-bounce">
          ✓
        </span>
      )}
    </div>
  );
};
