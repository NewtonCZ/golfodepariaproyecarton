import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { FichaBadge } from '../common/FichaBadge';
import { MatrixCardView } from '../cards/MatrixCardView';
import { getFichaById } from '../../data/fichasPool';
import { soundService } from '../../services/soundAndSpeech';
import { LotteryStorageService } from '../../services/storageService';
import confetti from 'canvas-confetti';
import {
  Radio,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Volume2,
  VolumeX,
  Trophy,
  Sparkles,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Lock,
  LogIn,
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  ArrowRight,
  RefreshCw,
  FileText,
  Smartphone,
  UserCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Ficha, GameRound } from '../../types';

interface LiveDrawViewerProps {
  onOpenBuyCards?: () => void;
  onOpenLogin?: (tab?: 'login' | 'register') => void;
  onOpenRecharge?: () => void;
  onOpenMyCards?: () => void;
}

export const LiveDrawViewer: React.FC<LiveDrawViewerProps> = ({
  onOpenBuyCards,
  onOpenLogin,
  onOpenRecharge,
  onOpenMyCards,
}) => {
  const {
    rounds,
    activeRound,
    userCards,
    currentUser,
    isAuthenticated,
    sessionToken,
    formatMoney,
    verifyCurrentAccount,
    isLiveDrawing,
    liveDrawnFichas,
    startLiveDrawSimulation,
    isRealtimeSyncConnected,
    commercialConfig,
  } = useGame();

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [kycFeedback, setKycFeedback] = useState<string | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());

  // Update clock every second for exact 7-minute countdown calculations
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine the target round to display:
  // 1. If a round is actively drawing or marked live:
  // 2. If no drawing round, check if there's a finished round <= 7 minutes ago
  // 3. Else check open round or activeRound
  const targetRound: GameRound | null = useMemo(() => {
    // 1. Live drawing round
    const liveRound = rounds.find(
      (r) =>
        String(r.status).toLowerCase() === 'drawing' ||
        String(r.status).toLowerCase() === 'en_vivo' ||
        (isLiveDrawing && r.id === activeRound?.id)
    );
    if (liveRound) return liveRound;

    // 2. Finished round within 7 minutes
    const finishedRounds = rounds
      .filter(
        (r) =>
          (String(r.status).toLowerCase() === 'finished' ||
            String(r.status).toLowerCase() === 'completado') &&
          Array.isArray(r.drawnFichas) &&
          r.drawnFichas.length > 0
      )
      .sort((a, b) => {
        const timeA = new Date(a.resultSubmittedAt || a.updatedAt || a.drawAt || 0).getTime();
        const timeB = new Date(b.resultSubmittedAt || b.updatedAt || b.drawAt || 0).getTime();
        return timeB - timeA;
      });

    if (finishedRounds.length > 0) {
      const latestFinished = finishedRounds[0];
      const finishTimeMs = new Date(
        latestFinished.resultSubmittedAt ||
          latestFinished.updatedAt ||
          latestFinished.drawAt ||
          nowTimestamp
      ).getTime();
      const diffMinutes = (nowTimestamp - finishTimeMs) / (1000 * 60);
      if (diffMinutes <= 7) {
        return latestFinished;
      }
    }

    // 3. Open round
    const openRound = rounds.find((r) => String(r.status).toLowerCase() === 'open');
    if (openRound) return openRound;

    // 4. Default to activeRound or first round
    return activeRound || rounds[0] || null;
  }, [rounds, activeRound, isLiveDrawing, nowTimestamp]);

  // Round status flags & 7-Minute calculation
  const isTargetFinished = Boolean(
    targetRound &&
      (String(targetRound.status).toLowerCase() === 'finished' ||
        String(targetRound.status).toLowerCase() === 'completado')
  );

  const finishTimeMs = useMemo(() => {
    if (!targetRound || !isTargetFinished) return 0;
    return new Date(
      targetRound.resultSubmittedAt ||
        targetRound.updatedAt ||
        targetRound.drawAt ||
        targetRound.ends_at ||
        Date.now()
    ).getTime();
  }, [targetRound, isTargetFinished]);

  const diffSeconds = isTargetFinished ? Math.max(0, (nowTimestamp - finishTimeMs) / 1000) : 0;
  const diffMinutes = diffSeconds / 60;
  const isWithin7Min = isTargetFinished && diffMinutes <= 7;
  const remainingSecondsIn7Min = isWithin7Min ? Math.max(0, Math.floor(420 - diffSeconds)) : 0;

  // Cartones del usuario para la ronda objetivo
  const currentRoundCards = useMemo(() => {
    if (!targetRound) return [];
    return userCards.filter((c) => c.roundId === targetRound.id);
  }, [userCards, targetRound]);

  // =========================================================================
  // VALIDACIÓN DE CONTROL DE ACCESO ESTRICTO (3 REQUISITOS OBLIGATORIOS)
  // 1. auth: Usuario registrado y autenticado
  // 2. identidad verificada +18 aprobada por admin (KYC Aprobado y status active)
  // 3. tener >= 1 cartón comprado en la ronda en curso / evaluada
  // =========================================================================
  const isRegisteredAndAuthenticated = Boolean(isAuthenticated && sessionToken && currentUser);

  const isKycVerified = Boolean(
    isRegisteredAndAuthenticated &&
      currentUser?.kycStatus === 'Aprobado' &&
      currentUser?.status === 'active'
  );

  const hasActiveCardsForRound = currentRoundCards.length >= 1;

  const isAccessAllowed =
    isRegisteredAndAuthenticated && isKycVerified && hasActiveCardsForRound;

  // =========================================================================
  // REPLICA / REPRODUCCIÓN SECUENCIAL DE BALOTAS EXTRAÍDAS (REGLA 7 MINUTOS)
  // =========================================================================
  const [replicaStep, setReplicaStep] = useState<number>(0);
  const [isReplicaPlaying, setIsReplicaPlaying] = useState<boolean>(true);
  const replicaTimerRef = useRef<NodeJS.Timeout | null>(null);

  const officialDrawnFichasIds: number[] = useMemo(() => {
    if (isTargetFinished && Array.isArray(targetRound?.drawnFichas)) {
      return targetRound.drawnFichas;
    }
    return [];
  }, [targetRound, isTargetFinished]);

  // Reset or initialize replica when target round changes
  useEffect(() => {
    if (isWithin7Min && officialDrawnFichasIds.length > 0) {
      setReplicaStep(1);
      setIsReplicaPlaying(true);
    } else {
      setReplicaStep(0);
      setIsReplicaPlaying(false);
    }
  }, [targetRound?.id, isWithin7Min, officialDrawnFichasIds.length]);

  // Sequential replica runner
  useEffect(() => {
    if (!isWithin7Min || !isReplicaPlaying || officialDrawnFichasIds.length === 0) {
      if (replicaTimerRef.current) clearInterval(replicaTimerRef.current);
      return;
    }

    replicaTimerRef.current = setInterval(() => {
      setReplicaStep((prev) => {
        if (prev >= officialDrawnFichasIds.length) {
          setIsReplicaPlaying(false);
          if (replicaTimerRef.current) clearInterval(replicaTimerRef.current);
          return prev;
        }
        const next = prev + 1;
        const currentFichaId = officialDrawnFichasIds[next - 1];
        if (currentFichaId) {
          const fichaObj = getFichaById(currentFichaId);
          if (voiceEnabled) {
            soundService.playPop();
            soundService.cantarFicha(fichaObj.pronunciation);
          }
        }
        return next;
      });
    }, 1400);

    return () => {
      if (replicaTimerRef.current) clearInterval(replicaTimerRef.current);
    };
  }, [isWithin7Min, isReplicaPlaying, officialDrawnFichasIds, voiceEnabled]);

  // Drawn list for display:
  // - If in 7-minute replica mode: slice official drawn sequence up to replicaStep
  // - If live drawing: liveDrawnFichas
  // - Else: restored from storage or empty
  const drawnList: Ficha[] = useMemo(() => {
    if (isWithin7Min && officialDrawnFichasIds.length > 0) {
      const currentSlice = officialDrawnFichasIds.slice(0, replicaStep);
      return currentSlice.map((id) => getFichaById(id));
    }
    if (isLiveDrawing || liveDrawnFichas.length > 0) {
      return liveDrawnFichas;
    }
    if (targetRound && !isTargetFinished) {
      const savedLive = LotteryStorageService.getLiveDrawState(targetRound.id);
      if (savedLive && savedLive.drawnFichaIds.length > 0) {
        return savedLive.drawnFichaIds.map((id) => getFichaById(id));
      }
    }
    return [];
  }, [
    isWithin7Min,
    officialDrawnFichasIds,
    replicaStep,
    isLiveDrawing,
    liveDrawnFichas,
    targetRound,
    isTargetFinished,
  ]);

  const currentDrawn: Ficha | null = useMemo(() => {
    if (drawnList.length > 0) {
      return drawnList[drawnList.length - 1];
    }
    return null;
  }, [drawnList]);

  const drawnFichaIds = useMemo(() => drawnList.map((f) => f.id), [drawnList]);

  // =========================================================================
  // REDIRECCIÓN AUTOMÁTICA SI SUCEDE DESPUÉS DE > 7 MINUTOS
  // =========================================================================
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  useEffect(() => {
    // If round is finished and was finished > 7 min ago (and no live draw active)
    if (isTargetFinished && diffMinutes > 7 && !isLiveDrawing) {
      setRedirectCountdown(4);
      const countdownInterval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            onOpenMyCards?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    } else {
      setRedirectCountdown(null);
    }
  }, [isTargetFinished, diffMinutes, isLiveDrawing, onOpenMyCards]);

  // Confetti on win celebration
  useEffect(() => {
    if (isWithin7Min && replicaStep >= officialDrawnFichasIds.length && officialDrawnFichasIds.length > 0) {
      const hasWinnerCard = currentRoundCards.some(
        (c) => c.status === 'winner' || (c.winningPatterns && c.winningPatterns.length > 0)
      );
      if (hasWinnerCard) {
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#F59E0B', '#10B981', '#6366F1', '#EC4899', '#3B82F6'],
          });
        } catch (e) {}
      }
    }
  }, [isWithin7Min, replicaStep, officialDrawnFichasIds.length, currentRoundCards]);

  // Handle Quick KYC verification
  const handleVerifyKyc = () => {
    const res = verifyCurrentAccount();
    if (res.success) {
      setKycFeedback(res.message);
      soundService.playPop();
      setTimeout(() => setKycFeedback(null), 5000);
    }
  };

  // Run live draw simulation
  const startSimulation = () => {
    if (!targetRound) return;
    startLiveDrawSimulation(targetRound.id);
  };

  // Helper for formatting mm:ss
  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // =========================================================================
  // CASO 1: SORTEO FINALIZADO HACE MÁS DE 7 MINUTOS (> 7 MIN) -> REDIRECCIÓN
  // =========================================================================
  if (isTargetFinished && diffMinutes > 7 && !isLiveDrawing) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6 animate-in fade-in duration-300">
        <div className="bg-slate-900/90 border-2 border-indigo-700/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-950 border border-indigo-700 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-2 bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold text-xs px-3.5 py-1 rounded-full mb-3">
            <span>TRANSMISIÓN FINALIZADA (+7 MIN)</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Sorteo #{targetRound?.roundNumber || ''} Concluido
          </h2>
          <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
            La ventana de réplica en vivo de 7 minutos para este sorteo ha finalizado. Tus cartones y los premios adjudicados están disponibles en la sección <strong>Mis Cartones</strong>.
          </p>

          <div className="mt-6 p-4 bg-indigo-950/60 border border-indigo-800/80 rounded-2xl flex items-center justify-between gap-4 max-w-sm mx-auto">
            <div className="text-left">
              <span className="text-[11px] text-slate-400 block font-medium">Redirección Automática:</span>
              <span className="text-base font-black text-amber-400">
                En {redirectCountdown ?? 3} segundos...
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenMyCards}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <span>Ir Ahora</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASO 2: NO CUMPLE CON LOS 3 REQUISITOS DE CONTROL DE ACCESO
  // =========================================================================
  if (!isAccessAllowed) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Security Access Control Hero */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border-2 border-indigo-700/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="inline-flex items-center gap-2 bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black text-xs px-3.5 py-1.5 rounded-full shadow-inner">
                <Lock className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>CONTROL DE ACCESO • SALA DE TRANSMISIÓN</span>
              </div>

              {targetRound && (
                <span className="text-xs font-bold text-indigo-300 bg-indigo-900/60 border border-indigo-700 px-3 py-1 rounded-xl">
                  {targetRound.title} • Sorteo #{targetRound.roundNumber}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Acceso Restringido a la Sala en Vivo
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Por estrictas políticas de juego responsable y seguridad de la plataforma, la entrada a la sala de sorteos en tiempo real está reservada exclusivamente a <strong>usuarios registrados</strong>, con <strong>identidad verificada (+18 / KYC)</strong> y con <strong>al menos un cartón comprado</strong> para la ronda en curso.
            </p>
          </div>
        </div>

        {/* Feedback message if verification action triggered */}
        {kycFeedback && (
          <div className="bg-emerald-950/90 border-2 border-emerald-500 rounded-2xl p-4 text-emerald-200 text-xs sm:text-sm flex items-center gap-3 shadow-lg animate-in slide-in-from-top duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="font-bold">{kycFeedback}</span>
          </div>
        )}

        {/* 3-Step Requirements Checklist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Requisito 1: Registro y Autenticación */}
          <div
            className={`rounded-3xl p-5 sm:p-6 border-2 transition-all flex flex-col justify-between shadow-xl ${
              isRegisteredAndAuthenticated
                ? 'bg-slate-900/90 border-emerald-500/60 shadow-emerald-950/30'
                : 'bg-slate-900/90 border-rose-500/60 shadow-rose-950/30'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Requisito 1 de 3
                </span>
                {isRegisteredAndAuthenticated ? (
                  <span className="flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-950/80 border border-emerald-600 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Cumplido</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-black text-rose-400 bg-rose-950/80 border border-rose-600 px-2.5 py-1 rounded-full">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Requerido</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-md ${
                    isRegisteredAndAuthenticated
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Usuario Registrado</h3>
                  <span className="text-xs text-slate-400 block font-medium">
                    Autenticación en la plataforma
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                {isRegisteredAndAuthenticated ? (
                  <>
                    Sesión activa como <strong className="text-emerald-300">{currentUser.name}</strong> ({currentUser.documentId || 'Cédula Registrada'}).
                  </>
                ) : (
                  'Debes iniciar sesión con tu cuenta de jugador o registrar una nueva cuenta de forma gratuita.'
                )}
              </p>
            </div>

            {!isRegisteredAndAuthenticated && (
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onOpenLogin?.('login')}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-black text-xs py-2.5 min-h-[44px] rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 stroke-[2.5]" />
                  <span>Iniciar Sesión</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLogin?.('register')}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-800 hover:bg-indigo-700 text-amber-300 border border-indigo-600 font-bold text-xs py-2.5 min-h-[44px] rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>Crear Cuenta (+18)</span>
                </button>
              </div>
            )}
          </div>

          {/* Requisito 2: Verificación de Identidad KYC */}
          <div
            className={`rounded-3xl p-5 sm:p-6 border-2 transition-all flex flex-col justify-between shadow-xl ${
              isKycVerified
                ? 'bg-slate-900/90 border-emerald-500/60 shadow-emerald-950/30'
                : 'bg-slate-900/90 border-amber-500/60 shadow-amber-950/30'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Requisito 2 de 3
                </span>
                {isKycVerified ? (
                  <span className="flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-950/80 border border-emerald-600 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verificado</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-black text-amber-400 bg-amber-950/80 border border-amber-600 px-2.5 py-1 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{currentUser?.kycStatus || 'Pendiente'}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-md ${
                    isKycVerified
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Identidad Verificada</h3>
                  <span className="text-xs text-slate-400 block font-medium">
                    Validación KYC (+18 Aprobado)
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                {isKycVerified ? (
                  <>
                    Cuenta certificada formalmente con documento oficial ({currentUser.documentId}). Mayoría de edad (+18) validada.
                  </>
                ) : (
                  'El usuario debe tener su documento de identidad nacional verificado y aprobado para poder interactuar en la sala de sorteos en vivo.'
                )}
              </p>
            </div>

            {!isKycVerified && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleVerifyKyc}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-indigo-950 font-black text-xs py-2.5 min-h-[44px] rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Validar Identidad (+18 KYC)</span>
                </button>
              </div>
            )}
          </div>

          {/* Requisito 3: Cartón Comprado en la Ronda en Curso */}
          <div
            className={`rounded-3xl p-5 sm:p-6 border-2 transition-all flex flex-col justify-between shadow-xl ${
              hasActiveCardsForRound
                ? 'bg-slate-900/90 border-emerald-500/60 shadow-emerald-950/30'
                : 'bg-slate-900/90 border-rose-500/60 shadow-rose-950/30'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Requisito 3 de 3
                </span>
                {hasActiveCardsForRound ? (
                  <span className="flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-950/80 border border-emerald-600 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{currentRoundCards.length} Cartón(es)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-black text-rose-400 bg-rose-950/80 border border-rose-600 px-2.5 py-1 rounded-full">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>0 Cartones</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-md ${
                    hasActiveCardsForRound
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Cartón en Juego</h3>
                  <span className="text-xs text-slate-400 block font-medium">
                    {targetRound ? targetRound.title : 'Ronda Actual'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                {hasActiveCardsForRound ? (
                  <>
                    Tienes <strong className="text-emerald-300">{currentRoundCards.length} cartón(es) 4×4</strong> listo(s) para escaneo y premiación en este sorteo.
                  </>
                ) : (
                  `No tienes ningún cartón adquirido para ${targetRound?.title || 'la ronda en curso'}. Debes comprar al menos un paquete para ingresar al sorteo.`
                )}
              </p>
            </div>

            {!hasActiveCardsForRound && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenBuyCards}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 font-black text-xs py-2.5 min-h-[44px] rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-indigo-950 stroke-[2.5]" />
                  <span>Comprar Cartones (Desde {formatMoney(50)})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASO 3: ACCESO TOTAL CONCEDIDO (EN VIVO O RÉPLICA <= 7 MINUTOS)
  // =========================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Shows Live Stream vs. 7-Minute Official Replica */}
      <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-indigo-950 rounded-3xl p-5 sm:p-7 text-white shadow-2xl border-2 border-indigo-700/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
              {isWithin7Min ? (
                <div className="inline-flex items-center gap-2 bg-emerald-600/90 text-white font-black text-xs px-3.5 py-1 rounded-full shadow-md animate-pulse">
                  <Radio className="w-4 h-4" />
                  <span>RÉPLICA OFICIAL EN VIVO • RESULTADOS</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-red-600/90 text-white font-black text-xs px-3 py-1 rounded-full shadow-md">
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>SALA DE SORTEO EN VIVO</span>
                </div>
              )}

              {/* 7-Minute Countdown Pill if within 7 min */}
              {isWithin7Min && (
                <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/50 font-mono font-black text-xs px-3 py-1 rounded-full shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tiempo restante de réplica: {formatTime(remainingSecondsIn7Min)}</span>
                </div>
              )}

              {/* Verified Access Pill */}
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-black text-xs px-3 py-1 rounded-full shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Acceso Autorizado • {currentUser.name} ({currentRoundCards.length} Cartones)</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {targetRound ? targetRound.title : 'Sorteo Estelar 4×4'}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-lg">
              {isWithin7Min
                ? `Reproduciendo la secuencia oficial de las ${officialDrawnFichasIds.length} figuras extraídas. Tus ${currentRoundCards.length} cartones se pintan y validan automáticamente con sus aciertos.`
                : `El cantador oficial anuncia cada figura en español en tiempo real. Tus ${currentRoundCards.length} cartones 4×4 se escanean automáticamente al instante.`}
            </p>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                voiceEnabled
                  ? 'bg-indigo-900/80 border-indigo-600 text-amber-300'
                  : 'bg-indigo-950/80 border-indigo-800 text-slate-400'
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{voiceEnabled ? 'Cantador de Voz: Activo' : 'Voz: Silenciada'}</span>
            </button>

            {isWithin7Min ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReplicaPlaying(!isReplicaPlaying)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-black text-xs bg-indigo-800 hover:bg-indigo-700 text-white border border-indigo-600 transition-all cursor-pointer"
                >
                  {isReplicaPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Continuar</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReplicaStep(1);
                    setIsReplicaPlaying(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl font-bold text-xs bg-indigo-900 hover:bg-indigo-800 text-slate-300 border border-indigo-700 transition-all cursor-pointer"
                  title="Reiniciar Réplica desde el inicio"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReplicaStep(officialDrawnFichasIds.length);
                    setIsReplicaPlaying(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-indigo-950 shadow-md transition-all cursor-pointer"
                  title="Ver resultado final completo"
                >
                  <FastForward className="w-4 h-4 fill-indigo-950" />
                  <span className="font-black">Final</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isLiveDrawing}
                onClick={startSimulation}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm shadow-xl transition-all cursor-pointer ${
                  isLiveDrawing
                    ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 shadow-amber-500/30 active:scale-95'
                }`}
              >
                <Play className="w-4 h-4 fill-indigo-950" />
                <span>{isLiveDrawing ? 'Sorteando Fichas...' : 'Iniciar Sorteo en Vivo'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Draw Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Arena: Big Live Figure Display & Tumbler (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-indigo-100 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[360px]">
            <div className="flex items-center justify-between w-full mb-3">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                {isWithin7Min ? 'Figura Réplica en Secuencia' : 'Figura Cantada al Momento'}
              </span>
              <span className="font-mono font-black text-xs text-indigo-950 bg-indigo-50 px-2.5 py-1 rounded-xl">
                {drawnList.length} / {isWithin7Min ? officialDrawnFichasIds.length : (commercialConfig?.drawDrawTotalCount || 20)} Cantadas
              </span>
            </div>

            {currentDrawn ? (
              <div
                key={currentDrawn.id}
                className="my-auto flex flex-col items-center animate-in zoom-in-50 duration-300"
              >
                {/* 3D Giant Sphere / Chip */}
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-300 to-orange-500 p-1.5 shadow-2xl shadow-amber-400/50 mb-3 transform hover:scale-105 transition-transform flex items-center justify-center">
                  <div className="w-full h-full bg-white rounded-[22px] flex flex-col items-center justify-center relative p-3 border-2 border-amber-300">
                    <span className="absolute top-2 left-3 font-mono font-black text-xs text-slate-500">
                      #{currentDrawn.id}
                    </span>
                    <span className="text-6xl sm:text-7xl drop-shadow-md my-auto animate-bounce">
                      {currentDrawn.emoji}
                    </span>
                    <span className="text-xs font-black uppercase text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      {currentDrawn.category}
                    </span>
                  </div>
                </div>

                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {currentDrawn.pronunciation}
                </div>
                <div className="text-xs font-bold text-slate-500 mt-0.5">
                  Ficha Oficial #{currentDrawn.id} • {currentDrawn.name}
                </div>
              </div>
            ) : (
              <div className="my-auto flex flex-col items-center text-slate-400 py-10">
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-4xl mb-3 animate-pulse">
                  🎰
                </div>
                <h3 className="font-black text-slate-700 text-base">Tómbola Lista</h3>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  {isWithin7Min
                    ? 'Iniciando réplica oficial de figuras sorteadas...'
                    : 'Presiona "Iniciar Sorteo en Vivo" para ver el correr de las figuras y escuchar la cantada oficial.'}
                </p>
              </div>
            )}

            {/* Bottom Progress Bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-4">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300"
                style={{
                  width: `${
                    ((drawnList.length) /
                      (isWithin7Min
                        ? officialDrawnFichasIds.length || 20
                        : commercialConfig?.drawDrawTotalCount || 20)) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Winning Patterns Guide Pill */}
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white rounded-3xl p-4 shadow-lg text-xs">
            <div className="flex items-center gap-2 mb-2 font-black text-amber-300">
              <Trophy className="w-4 h-4" />
              <span>Patrones de Victoria Evaluados:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-indigo-200">
              <div className="bg-indigo-900/60 p-2 rounded-xl border border-indigo-800">
                <span className="font-bold text-white block">Tabla Llena (16 Casillas)</span>
                <span className="text-amber-300 font-bold">50x Premio Mayor</span>
              </div>
              <div className="bg-indigo-900/60 p-2 rounded-xl border border-indigo-800">
                <span className="font-bold text-white block">Cuatro Esquinas</span>
                <span className="text-amber-300 font-bold">8x Multiplicador</span>
              </div>
              <div className="bg-indigo-900/60 p-2 rounded-xl border border-indigo-800">
                <span className="font-bold text-white block">Líneas Horizontales (4)</span>
                <span className="text-amber-300 font-bold">3x por Línea</span>
              </div>
              <div className="bg-indigo-900/60 p-2 rounded-xl border border-indigo-800">
                <span className="font-bold text-white block">Líneas Diagonales (2)</span>
                <span className="text-amber-300 font-bold">4x por Diagonal</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Arena: Live Drawn Figures History & Matched Cards (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* History of Drawn Fichas Grid */}
          <div className="bg-white rounded-3xl p-5 shadow-xl border-2 border-indigo-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Figuras Sorteadas ({drawnList.length} de {isWithin7Min ? officialDrawnFichasIds.length : (commercialConfig?.drawDrawTotalCount || 20)})</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">
                Pool de 70 Fichas
              </span>
            </div>

            {drawnList.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
                Aún no ha iniciado el sorteo. Las fichas sorteadas aparecerán aquí en tiempo real.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                {drawnList.map((ficha, idx) => (
                  <FichaBadge
                    key={`${ficha.id}-${idx}`}
                    ficha={ficha}
                    size="sm"
                    isRecent={idx === drawnList.length - 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* User's Active Cards in this Round Live Scanner */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Mis Cartones en este Sorteo ({currentRoundCards.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl">
                  {isWithin7Min ? 'Pintado y Validación Activa' : 'Escaneo Automático Activo'}
                </span>
                {onOpenMyCards && (
                  <button
                    type="button"
                    onClick={onOpenMyCards}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                  >
                    <span>Mis Cartones</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentRoundCards.map((card) => (
                <MatrixCardView
                  key={card.id}
                  card={card}
                  drawnFichas={drawnFichaIds}
                  roundStatus={targetRound?.status}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

