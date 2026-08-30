import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { MatrixCardView } from '../cards/MatrixCardView';
import { X, Sparkles, AlertCircle, ShoppingCart, Check, ShieldCheck, KeyRound, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { MatrixCard } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface BuyCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRoundId?: string;
  onSuccessBuy?: () => void;
  onOpenRecharge?: () => void;
}

export const BuyCardsModal: React.FC<BuyCardsModalProps> = ({
  isOpen,
  onClose,
  targetRoundId,
  onSuccessBuy,
  onOpenRecharge,
}) => {
  const {
    activeRound,
    rounds,
    currentUser,
    commercialConfig,
    formatMoney,
    purchaseCards,
    userCards,
  } = useGame();

  const selectedRound = (targetRoundId ? rounds.find((r) => r.id === targetRoundId) : null) || activeRound;

  const [selectedPack, setSelectedPack] = useState<2 | 4 | 6>(2);
  const [step, setStep] = useState<'select' | 'otp'>('select');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [boughtCardsPreview, setBoughtCardsPreview] = useState<MatrixCard[] | null>(null);

  if (!isOpen || !selectedRound) return null;

  const currentCardsInRound = userCards.filter((c) => c.roundId === selectedRound.id);
  const maxAllowedToBuy = Math.max(0, 6 - currentCardsInRound.length);

  const unitPrice = selectedRound.card_price || selectedRound.cardPriceVes || (commercialConfig.cardPrices.pack2 / 2);

  const getPackPrice = (pack: 2 | 4 | 6) => {
    return unitPrice * pack;
  };

  const totalPrice = getPackPrice(selectedPack);
  const hasEnoughBalance = currentUser.availableBalance >= totalPrice;

  // Paso 1: Enviar OTP con Supabase Functions
  const handleInitiatePurchase = async () => {
    setErrorMessage(null);
    setIsSendingOtp(true);

    const email = 'niutoncaraballo3@gmail.com';

    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          email,
          pack: selectedPack,
          roundId: selectedRound.id,
          amountVes: totalPrice,
          user: currentUser.name || currentUser.email || 'Player',
        },
      });

      if (error) {
        console.error('[BuyCardsModal] send-otp error:', error);
        throw new Error(error.message || 'No se pudo enviar el código de verificación.');
      }

      setStep('otp');
      setOtpCode('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al enviar el código de seguridad.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Paso 2: Verificar OTP con Supabase Functions
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otpCode.trim().length !== 6) {
      setErrorMessage('Por favor ingresa el código de 6 dígitos.');
      return;
    }

    setErrorMessage(null);
    setIsVerifyingOtp(true);

    const email = 'niutoncaraballo3@gmail.com';
    const code = otpCode.trim();

    try {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-otp', {
        body: { email, code },
      });

      if (verifyError) {
        console.error('[BuyCardsModal] verify-otp error:', verifyError);
      }

      if (verifyData && (verifyData.valid === true || verifyData.success === true)) {
        // Código válido -> Proseguir con la generación normal del cartón
        const result = purchaseCards(selectedPack, selectedRound.id);
        if (result.success && result.cards) {
          setBoughtCardsPreview(result.cards);
          if (onSuccessBuy) onSuccessBuy();
        } else {
          setErrorMessage(result.message);
        }
      } else {
        setErrorMessage(verifyData?.message || 'Código incorrecto o expirado');
      }
    } catch (err: any) {
      setErrorMessage('Error al conectar con el servidor de verificación.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleReset = () => {
    setBoughtCardsPreview(null);
    setErrorMessage(null);
    setStep('select');
    setOtpCode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="buy-cards-modal-container"
        className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-black">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Comprar Cartones 4×4
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                {selectedRound.title} • Máx. 6 por sorteo
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {boughtCardsPreview ? (
          /* Post-Purchase Success View */
          <div className="py-5 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1">
              ¡Cartones Generados con Éxito!
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mb-5">
              Se han generado {boughtCardsPreview.length} tarjetas aleatorias e inalterables con figuras del pool de 72.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {boughtCardsPreview.map((card) => (
                <MatrixCardView key={card.id} card={card} compact />
              ))}
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3.5 bg-indigo-950 hover:bg-indigo-900 text-amber-300 font-black rounded-2xl shadow-lg transition-all cursor-pointer"
            >
              Entendido, Ir a Mis Cartones
            </button>
          </div>
        ) : step === 'otp' ? (
          /* OTP Verification Step */
          <form onSubmit={handleVerifyOtp} className="pt-5 space-y-4">
            <div className="p-4 bg-indigo-950 rounded-2xl border border-indigo-900 text-white space-y-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-amber-300">
                  Verificación de Seguridad Requerida
                </h3>
              </div>
              <p className="text-xs text-indigo-200">
                Se ha enviado un código de 6 dígitos al correo del administrador para autorizar la compra de <strong>{selectedPack} cartones</strong> ({formatMoney(totalPrice)}).
              </p>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Ingresa el Código de 6 Dígitos *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full bg-slate-50 border-2 border-slate-300 focus:border-amber-500 text-indigo-950 tracking-widest text-center py-3 rounded-2xl text-xl font-black focus:outline-none transition-colors"
              />
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('select');
                  setErrorMessage(null);
                }}
                className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <button
                type="submit"
                disabled={isVerifyingOtp || otpCode.length !== 6}
                className={`w-2/3 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  otpCode.length !== 6 || isVerifyingOtp
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 shadow-amber-500/25 active:scale-98'
                }`}
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Verificar</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleInitiatePurchase}
                disabled={isSendingOtp}
                className="text-xs text-amber-700 hover:text-amber-800 font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isSendingOtp ? 'animate-spin' : ''}`} />
                <span>{isSendingOtp ? 'Enviando código al admin...' : 'Reenviar código de verificación'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Purchase Selection View */
          <div className="pt-5">
            {/* Package selector */}
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Selecciona tu Paquete de Cartones (Solo Pares)
            </label>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {([2, 4, 6] as const).map((pack) => {
                const isSelected = selectedPack === pack;
                const price = getPackPrice(pack);
                const isOverLimit = currentCardsInRound.length + pack > 6;

                return (
                  <button
                    key={pack}
                    type="button"
                    disabled={isOverLimit}
                    onClick={() => {
                      setSelectedPack(pack);
                      setErrorMessage(null);
                    }}
                    className={`relative p-3.5 sm:p-4 rounded-2xl text-center border-2 transition-all flex flex-col items-center justify-between cursor-pointer ${
                      isOverLimit
                        ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                        : isSelected
                        ? 'bg-amber-50/90 border-amber-500 shadow-md shadow-amber-300/40 scale-102'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-black shadow-sm">
                        ✓
                      </span>
                    )}

                    <div className="text-xl sm:text-2xl font-black text-slate-900 mb-0.5">
                      {pack} <span className="text-xs font-bold text-slate-500">Cartones</span>
                    </div>

                    <div className="text-xs font-extrabold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-lg mb-1">
                      {formatMoney(price)}
                    </div>

                    <span className="text-[10px] text-slate-500 font-medium">
                      {formatMoney(price / pack)} c/u
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Current Limit & Status Indicator */}
            <div className="bg-slate-50 rounded-2xl p-3.5 mb-5 border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Cartones en esta ronda:</span>
              </div>
              <div className="font-mono font-black text-indigo-950">
                {currentCardsInRound.length} de 6 máximas
              </div>
            </div>

            {/* Price & Balance Breakdown */}
            <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 rounded-2xl p-4 text-white mb-5 shadow-lg">
              <div className="flex items-center justify-between mb-2 text-xs text-indigo-200 font-medium">
                <span>Saldo disponible:</span>
                <span className="font-mono font-bold text-amber-300">
                  {formatMoney(currentUser.availableBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2 text-xs text-indigo-200 font-medium">
                <span>Total a debitar ({selectedPack} tarjetas):</span>
                <span className="font-mono font-bold text-white">
                  {formatMoney(totalPrice)}
                </span>
              </div>
              <div className="pt-2 border-t border-indigo-800 flex items-center justify-between text-sm font-black">
                <span className="text-amber-300">Saldo restante:</span>
                <span className={`font-mono ${hasEnoughBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatMoney(currentUser.availableBalance - totalPrice)}
                </span>
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!hasEnoughBalance && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold p-3 rounded-xl mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Saldo insuficiente. Por favor realiza una recarga por Pago Móvil.</span>
                </div>
                {onOpenRecharge && (
                  <button
                    type="button"
                    onClick={onOpenRecharge}
                    className="shrink-0 bg-amber-500 hover:bg-amber-600 text-indigo-950 font-black px-2.5 py-1 rounded-lg text-[11px] shadow-sm transition-all cursor-pointer"
                  >
                    Recargar Ahora
                  </button>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all text-xs sm:text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!hasEnoughBalance || isSendingOtp || maxAllowedToBuy === 0}
                onClick={handleInitiatePurchase}
                className={`w-2/3 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !hasEnoughBalance || maxAllowedToBuy === 0 || isSendingOtp
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 shadow-amber-500/25 active:scale-98'
                }`}
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando código al admin...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generar / Pagar ({formatMoney(totalPrice)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
