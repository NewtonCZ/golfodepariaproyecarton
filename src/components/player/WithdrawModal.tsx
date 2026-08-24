import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  X,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Building,
  Smartphone,
  CreditCard,
} from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, formatMoney, submitWithdrawal } = useGame();

  const [channel, setChannel] = useState<'pago_movil' | 'transferencia'>('pago_movil');
  const [amountVes, setAmountVes] = useState<number>(100);
  const [bankDest, setBankDest] = useState('Banesco (0134)');
  const [phoneOrAccount, setPhoneOrAccount] = useState(currentUser?.phone || '');
  const [documentId, setDocumentId] = useState(currentUser?.documentId || '');
  const [titularName, setTitularName] = useState(currentUser?.name || '');
  const [accountType, setAccountType] = useState<'corriente' | 'ahorro'>('corriente');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const availableReal = Number(currentUser?.availableBalance ?? currentUser?.balanceVes ?? 0);
  const isAmountBelowMin = amountVes < 100;
  const isAmountExceedingBalance = amountVes > availableReal;
  const hasInsufficientMinBalance = availableReal < 100;
  const isValidAmount = amountVes >= 100 && amountVes <= availableReal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (amountVes < 100) {
      setErrorMessage('El monto mínimo de retiro es de 100 Bs.');
      return;
    }
    if (amountVes > availableReal) {
      setErrorMessage(`Saldo insuficiente. Tu saldo disponible real es de ${formatMoney(availableReal)}.`);
      return;
    }
    if (!phoneOrAccount.trim() || !documentId.trim() || !titularName.trim()) {
      setErrorMessage('Por favor completa todos los campos requeridos para la conciliación bancaria.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = submitWithdrawal({
        amountVes: Number(amountVes),
        channel,
        bankDest,
        phoneOrAccount: phoneOrAccount.trim(),
        documentId: documentId.trim(),
        titularName: titularName.trim(),
        accountType: channel === 'transferencia' ? accountType : undefined,
      });

      setIsSubmitting(false);

      if (result.success) {
        setSuccessMessage(result.message);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Error al procesar la solicitud de retiro.');
    }
  };

  const handleClose = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="withdraw-modal-container"
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-black">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Solicitud de Retiro
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                Pago Móvil o Transferencia Bancaria
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMessage ? (
          /* Success Screen */
          <div className="py-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1">
              ¡Solicitud de Retiro Enviada!
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mb-4 leading-relaxed">
              Has solicitado retirar <span className="font-bold text-slate-900">{formatMoney(amountVes)}</span> hacia tu cuenta{' '}
              <span className="font-bold text-indigo-950">{bankDest}</span>.
            </p>
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-2xl p-3.5 text-xs text-left mb-6 flex items-start gap-2.5">
              <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Mecanismo de Saldo Bloqueado</span>
                El monto ha sido reservado temporalmente para evitar doble gasto. Una vez que el operador emita la transferencia, se marcará como Completado.
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3.5 bg-indigo-950 hover:bg-indigo-900 text-amber-300 font-black rounded-2xl shadow-lg transition-all"
            >
              Aceptar y Volver al Inicio
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="pt-4 space-y-4">
            {/* Balance Overview Card */}
            <div className="bg-gradient-to-r from-indigo-950 to-indigo-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
              <div>
                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">
                  Saldo Disponible Real para Retiro
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black text-amber-300">
                  {formatMoney(availableReal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-indigo-300 font-bold block">Saldo Bloqueado:</span>
                <span className="text-xs font-mono font-bold text-indigo-200">
                  {formatMoney(currentUser?.lockedBalance || 0)}
                </span>
              </div>
            </div>

            {hasInsufficientMinBalance && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Saldo Mínimo Requerido</span>
                  El monto mínimo para solicitar retiros es de <strong>100 Bs.</strong> Tu saldo disponible actual es de <strong>{formatMoney(availableReal)}</strong>.
                </div>
              </div>
            )}

            {/* Channel Selector */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                Método de Retiro
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChannel('pago_movil')}
                  className={`p-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    channel === 'pago_movil'
                      ? 'bg-amber-50 border-amber-500 text-indigo-950 shadow-sm font-black'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  <span>Pago Móvil</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChannel('transferencia')}
                  className={`p-3 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    channel === 'transferencia'
                      ? 'bg-amber-50 border-amber-500 text-indigo-950 shadow-sm font-black'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Building className="w-4 h-4 text-indigo-600" />
                  <span>Transferencia</span>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Monto a Retirar en Bolívares (VES) *
                </label>
                <span className="text-[11px] font-bold text-slate-500">
                  Mínimo: <span className="text-indigo-950 font-black">100 Bs.</span>
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  max={availableReal}
                  step="10"
                  value={amountVes || ''}
                  onChange={(e) => setAmountVes(Number(e.target.value))}
                  required
                  className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-black text-base focus:outline-hidden transition-all ${
                    isAmountExceedingBalance
                      ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30'
                      : isAmountBelowMin
                      ? 'border-amber-500 ring-2 ring-amber-200'
                      : 'border-slate-300 focus:ring-2 focus:ring-amber-500'
                  }`}
                  placeholder="Mínimo 100 Bs."
                />
                <span className="absolute right-3 top-2.5 text-xs font-black text-slate-500">
                  Bs.
                </span>
              </div>

              {/* Dynamic validation feedback */}
              <div className="mt-1.5 space-y-1">
                {isAmountExceedingBalance && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>No puedes retirar más de tu saldo disponible ({formatMoney(availableReal)}).</span>
                  </div>
                )}
                {isAmountBelowMin && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>El monto mínimo de retiro es de 100 Bs.</span>
                  </div>
                )}
                {isValidAmount && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Monto válido. Quedará disponible: {formatMoney(availableReal - amountVes)}.</span>
                  </div>
                )}
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[100, 200, 500, 1000].map((preset) => {
                  const isEligible = availableReal >= preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      disabled={!isEligible}
                      onClick={() => setAmountVes(preset)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        amountVes === preset
                          ? 'bg-amber-500 text-indigo-950 border-amber-500 font-black'
                          : isEligible
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {preset} Bs.
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setAmountVes(availableReal)}
                  disabled={availableReal < 100}
                  className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition-all ml-auto ${
                    amountVes === availableReal && availableReal >= 100
                      ? 'bg-indigo-950 text-amber-300 border-indigo-950'
                      : availableReal >= 100
                      ? 'bg-indigo-50 text-indigo-950 border-indigo-200 hover:bg-indigo-100'
                      : 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                  }`}
                >
                  Todo ({formatMoney(availableReal)})
                </button>
              </div>
            </div>

            {/* Bank Destination */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Banco de Destino *
              </label>
              <select
                value={bankDest}
                onChange={(e) => setBankDest(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              >
                <option value="Banesco (0134)">Banesco (0134)</option>
                <option value="Banco de Venezuela (0102)">Banco de Venezuela (0102)</option>
                <option value="Mercantil (0105)">Mercantil (0105)</option>
                <option value="BBVA Provincial (0108)">BBVA Provincial (0108)</option>
                <option value="Bancaribe (0114)">Bancaribe (0114)</option>
                <option value="Banco Nacional de Crédito (0191)">Banco Nacional de Crédito (0191)</option>
                <option value="Banplus (0174)">Banplus (0174)</option>
                <option value="BFC Banco Fondo Común (0151)">BFC Banco Fondo Común (0151)</option>
              </select>
            </div>

            {/* Phone or Account Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {channel === 'pago_movil' ? 'Número de Teléfono Celular *' : 'Número de Cuenta Bancaria (20 dígitos) *'}
              </label>
              <input
                type="text"
                value={phoneOrAccount}
                onChange={(e) => setPhoneOrAccount(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                placeholder={channel === 'pago_movil' ? '0414-1234567' : '0134-0000-00-0000000000'}
              />
            </div>

            {/* Document ID & Titular */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cédula o RIF del Titular *
                </label>
                <input
                  type="text"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  placeholder="V-12345678"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Completo del Titular *
                </label>
                <input
                  type="text"
                  value={titularName}
                  onChange={(e) => setTitularName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  placeholder="Nombre y Apellido"
                />
              </div>
            </div>

            {channel === 'transferencia' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Cuenta
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="accountType"
                      checked={accountType === 'corriente'}
                      onChange={() => setAccountType('corriente')}
                      className="text-amber-500"
                    />
                    <span>Corriente</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="accountType"
                      checked={accountType === 'ahorro'}
                      onChange={() => setAccountType('ahorro')}
                      className="text-amber-500"
                    />
                    <span>Ahorro</span>
                  </label>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !isValidAmount || !phoneOrAccount.trim() || !documentId.trim() || !titularName.trim()}
                className={`w-2/3 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition-all ${
                  !isValidAmount || !phoneOrAccount.trim() || !documentId.trim() || !titularName.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-950 to-indigo-900 hover:from-indigo-900 hover:to-indigo-800 text-amber-300 shadow-indigo-950/20 active:scale-98'
                }`}
              >
                {isSubmitting ? (
                  <span>Procesando Retiro...</span>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Confirmar Retiro ({formatMoney(amountVes || 0)})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
