import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { timeSync } from '../../services/timeSyncService';

export interface ContadorProps {
  targetDate: string;
  onExpire?: () => void;
  label?: string;
  compact?: boolean;
  showVenezuelaTime?: boolean;
  id?: string;
}

export const Contador: React.FC<ContadorProps> = ({
  targetDate,
  onExpire,
  label = 'Cierre de apuestas en',
  compact = false,
  showVenezuelaTime = true,
  id = 'contador-component',
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    totalSeconds: number;
    horaVenezuela: string;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    totalSeconds: 0,
    horaVenezuela: '',
  });

  const calculateTime = useCallback(() => {
    const now = timeSync.getServerNow();
    const target = timeSync.parseIsoToEpochMs(targetDate);

    if (isNaN(target)) {
      setTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
        totalSeconds: 0,
        horaVenezuela: '',
      });
      return;
    }

    // Hora oficial Venezuela (America/Caracas)
    const horaCaracas = new Date(target).toLocaleString('es-VE', {
      timeZone: 'America/Caracas',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // diff calculado normal
    const difference = target - now;

    if (difference <= 0) {
      setTimeLeft({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
        totalSeconds: 0,
        horaVenezuela: horaCaracas,
      });
      if (onExpire) onExpire();
      return;
    }

    const totalSeconds = Math.floor(difference / 1000);
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    setTimeLeft({
      days,
      hours,
      minutes,
      seconds,
      isExpired: false,
      totalSeconds,
      horaVenezuela: horaCaracas,
    });
  }, [targetDate, onExpire]);

  useEffect(() => {
    calculateTime();
    const timer = setInterval(calculateTime, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        calculateTime();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', calculateTime);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', calculateTime);
    };
  }, [calculateTime]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const isUrgent = timeLeft.totalSeconds > 0 && timeLeft.totalSeconds < 180; // Menos de 3 minutos

  if (compact) {
    return (
      <div
        id={id}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
          timeLeft.isExpired
            ? 'bg-slate-200 text-slate-700'
            : isUrgent
            ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30'
            : 'bg-amber-100 text-amber-900 border border-amber-300'
        }`}
        title={timeLeft.horaVenezuela ? `Hora Caracas: ${timeLeft.horaVenezuela}` : undefined}
      >
        <Clock className="w-3.5 h-3.5" />
        <span>
          {timeLeft.isExpired
            ? 'Cerrado'
            : timeLeft.days > 0
            ? `${timeLeft.days}d ${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`
            : `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`}
        </span>
      </div>
    );
  }

  return (
    <div
      id={id}
      className={`relative overflow-hidden rounded-2xl p-3 sm:p-4 text-center border-2 transition-all ${
        timeLeft.isExpired
          ? 'bg-slate-100 border-slate-300 text-slate-600'
          : isUrgent
          ? 'bg-gradient-to-r from-red-600 to-rose-600 border-red-400 text-white shadow-lg shadow-red-500/20'
          : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 border-amber-300 text-amber-950 shadow-md shadow-amber-500/20'
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        {isUrgent && <AlertTriangle className="w-4 h-4 text-yellow-200 animate-bounce" />}
        <span className="text-xs sm:text-sm font-extrabold tracking-wide uppercase">
          {timeLeft.isExpired ? 'Sorteo en Proceso / Cerrado' : label}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-3 font-mono font-black text-2xl sm:text-3xl my-1">
        {timeLeft.days > 0 && (
          <>
            <div className="flex flex-col items-center">
              <span className="bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                {pad(timeLeft.days)}
              </span>
              <span className="text-[10px] font-sans font-bold tracking-wider mt-0.5 opacity-80">
                DÍAS
              </span>
            </div>
            <span className="opacity-60 -mt-3">:</span>
          </>
        )}
        <div className="flex flex-col items-center">
          <span className="bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-lg">
            {pad(timeLeft.hours)}
          </span>
          <span className="text-[10px] font-sans font-bold tracking-wider mt-0.5 opacity-80">
            HORAS
          </span>
        </div>
        <span className="opacity-60 -mt-3">:</span>
        <div className="flex flex-col items-center">
          <span className="bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-lg">
            {pad(timeLeft.minutes)}
          </span>
          <span className="text-[10px] font-sans font-bold tracking-wider mt-0.5 opacity-80">
            MIN
          </span>
        </div>
        <span className="opacity-60 -mt-3">:</span>
        <div className="flex flex-col items-center">
          <span className="bg-black/20 backdrop-blur-xs px-2.5 py-1 rounded-lg">
            {pad(timeLeft.seconds)}
          </span>
          <span className="text-[10px] font-sans font-bold tracking-wider mt-0.5 opacity-80">
            SEG
          </span>
        </div>
      </div>

      {showVenezuelaTime && timeLeft.horaVenezuela && (
        <div className="mt-2 pt-1.5 border-t border-black/10 flex items-center justify-center gap-1.5 text-[11px] font-bold opacity-90">
          <span>🇻🇪 Hora Caracas:</span>
          <span className="font-mono">{timeLeft.horaVenezuela}</span>
        </div>
      )}
    </div>
  );
};
