import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { onSnapshot, doc } from '../../services/configService';
import { AdminBankDetails } from '../../types';
import {
  X,
  Copy,
  Check,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Building,
  FileText,
  DollarSign,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_VOUCHERS = [
  {
    name: 'Comprobante Pago Móvil (BDV)',
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Comprobante Banesco Móvil',
    url: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Recibo Transferencia Mercantil',
    url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80',
  },
];

export const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose }) => {
  const { commercialConfig, fetchCommercialConfig, currentUser, submitRecharge, formatMoney } = useGame();

  const [amountVes, setAmountVes] = useState<number>(100);
  const [payerPhone, setPayerPhone] = useState(currentUser?.phone || '');
  const [payerName, setPayerName] = useState(currentUser?.name || '');
  const [payerDocumentId, setPayerDocumentId] = useState(currentUser?.documentId || '');
  const [bankOrigin, setBankOrigin] = useState('Banesco (0134)');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [voucherUrl, setVoucherUrl] = useState(SAMPLE_VOUCHERS[0].url);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Bank Configuration from DB collection 'config/comercial'
  const [bankDetails, setBankDetails] = useState<AdminBankDetails | null>(() => {
    return commercialConfig?.adminBank?.phone ? commercialConfig.adminBank : null;
  });
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(!commercialConfig?.adminBank?.phone);

  // Keep payer fields synchronized with active logged user
  useEffect(() => {
    if (currentUser) {
      if (!payerName && currentUser.name) setPayerName(currentUser.name);
      if (!payerDocumentId && currentUser.documentId) setPayerDocumentId(currentUser.documentId);
    }
  }, [currentUser]);

  // Real-time onSnapshot listener for 'config/comercial' DB document
  useEffect(() => {
    if (!isOpen) return;

    // Trigger instant background refresh
    fetchCommercialConfig?.();

    // Subscribe to DB real-time stream
    const unsubscribe = onSnapshot(doc('config/comercial'), (docSnapshot) => {
      const liveData = docSnapshot.data();
      if (liveData) {
        if (liveData.adminBank) {
          setBankDetails(liveData.adminBank);
        } else if (liveData.bankName || liveData.phone) {
          setBankDetails(liveData as any);
        }
        setIsLoadingConfig(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, fetchCommercialConfig]);

  if (!isOpen) return null;

  const activeBank = bankDetails || commercialConfig?.adminBank;

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVoucherUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!amountVes || amountVes <= 0) {
      setErrorMessage('Ingresa un monto válido mayor a 0 Bs.');
      return;
    }
    if (!referenceNumber.trim()) {
      setErrorMessage('Ingresa los últimos dígitos o código de la referencia bancaria.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = submitRecharge({
        amountVes: Number(amountVes),
        payerPhone: payerPhone.trim(),
        payerName: payerName.trim(),
        payerDocumentId: payerDocumentId.trim(),
        bankOrigin,
        referenceNumber: referenceNumber.trim(),
        voucherImageUrl: voucherUrl,
      });

      setIsSubmitting(false);

      if (result.success) {
        setSuccessMessage(result.message);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Error al registrar la recarga.');
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
        id="recharge-modal-container"
        className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Recargar Saldo (Pago Móvil)
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                Acreditación directa en Bolívares (VES)
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
              ¡Comprobante Registrado!
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mb-4 leading-relaxed">
              Tu solicitud de recarga por{' '}
              <span className="font-bold text-slate-900">{formatMoney(amountVes)}</span> con
              referencia <span className="font-mono font-bold text-indigo-900">#{referenceNumber}</span> ha
              sido enviada a la cola de auditoría.
            </p>
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3.5 text-xs text-left mb-6">
              <span className="font-bold block mb-1">ℹ️ Estado: Pendiente de Auditoría</span>
              El operador financiero confirmará la recepción bancaria y acreditará tus fondos de inmediato.
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3.5 bg-indigo-950 hover:bg-indigo-900 text-amber-300 font-black rounded-2xl shadow-lg transition-all"
            >
              Cerrar y Ver Mi Saldo
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="pt-4 space-y-4">
            {/* Step 1: Admin Payment Details Card */}
            <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 text-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                  <span>Paso 1: Realiza el Pago Móvil a estos Datos</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  En Vivo
                </span>
              </div>

              {isLoadingConfig && !activeBank ? (
                <div className="py-4 text-center text-xs text-indigo-200 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Obteniendo datos bancarios oficiales...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-indigo-900/60 rounded-xl p-2.5 flex items-center justify-between border border-indigo-800">
                    <div>
                      <span className="text-[10px] text-indigo-300 block">Banco Receptor:</span>
                      <span className="font-black text-white">{activeBank?.bankName || 'Cargando...'}</span>
                    </div>
                    {activeBank?.bankName && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeBank.bankName, 'bank')}
                        className="p-1.5 hover:bg-indigo-800 rounded-lg text-indigo-200"
                        title="Copiar banco"
                      >
                        {copiedField === 'bank' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  <div className="bg-indigo-900/60 rounded-xl p-2.5 flex items-center justify-between border border-indigo-800">
                    <div>
                      <span className="text-[10px] text-indigo-300 block">Teléfono Receptor:</span>
                      <span className="font-mono font-black text-amber-300">{activeBank?.phone || 'Cargando...'}</span>
                    </div>
                    {activeBank?.phone && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeBank.phone, 'phone')}
                        className="p-1.5 hover:bg-indigo-800 rounded-lg text-indigo-200"
                        title="Copiar teléfono"
                      >
                        {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  <div className="bg-indigo-900/60 rounded-xl p-2.5 flex items-center justify-between border border-indigo-800">
                    <div>
                      <span className="text-[10px] text-indigo-300 block">C.I. / RIF:</span>
                      <span className="font-mono font-black text-white">{activeBank?.rif || 'Cargando...'}</span>
                    </div>
                    {activeBank?.rif && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeBank.rif, 'rif')}
                        className="p-1.5 hover:bg-indigo-800 rounded-lg text-indigo-200"
                        title="Copiar RIF"
                      >
                        {copiedField === 'rif' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  <div className="bg-indigo-900/60 rounded-xl p-2.5 flex items-center justify-between border border-indigo-800">
                    <div>
                      <span className="text-[10px] text-indigo-300 block">Titular:</span>
                      <span className="font-bold text-white truncate max-w-[130px]">{activeBank?.holderName || 'Cargando...'}</span>
                    </div>
                    {activeBank?.holderName && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeBank.holderName, 'holder')}
                        className="p-1.5 hover:bg-indigo-800 rounded-lg text-indigo-200"
                        title="Copiar titular"
                      >
                        {copiedField === 'holder' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Form */}
            <div className="space-y-3">
              <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider block">
                Paso 2: Reporta tu Transferencia
              </span>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Monto Transferido en Bolívares (VES) *
                  </label>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ Sin límite máximo
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="recharge-amount-input"
                    type="number"
                    min="1"
                    step="any"
                    value={amountVes || ''}
                    onChange={(e) => setAmountVes(Number(e.target.value))}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-black text-base focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    placeholder="Ingresa cualquier monto en Bs."
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-black text-slate-500">
                    Bs.
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {[50, 100, 500, 1000, 2500, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmountVes(preset)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        amountVes === preset
                          ? 'bg-amber-500 text-indigo-950 border-amber-500 font-black'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {preset} Bs.
                    </button>
                  ))}
                </div>
              </div>

              {/* Payer Phone & Bank Origin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono del Pagador *
                  </label>
                  <input
                    type="text"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    placeholder="0414-0000000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Banco de Origen *
                  </label>
                  <select
                    value={bankOrigin}
                    onChange={(e) => setBankOrigin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  >
                    <option value="Banesco (0134)">Banesco (0134)</option>
                    <option value="Banco de Venezuela (0102)">Banco de Venezuela (0102)</option>
                    <option value="Mercantil (0105)">Mercantil (0105)</option>
                    <option value="BBVA Provincial (0108)">BBVA Provincial (0108)</option>
                    <option value="Bancaribe (0114)">Bancaribe (0114)</option>
                    <option value="Banco Nacional de Crédito (0191)">Banco Nacional de Crédito (0191)</option>
                    <option value="Otro Banco">Otro Banco</option>
                  </select>
                </div>
              </div>

              {/* Reference number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Número de Referencia Bancaria *
                </label>
                <input
                  id="recharge-reference-input"
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  placeholder="Ej. 98452103"
                />
                <span className="text-[10px] text-slate-500">
                  Ingresa los últimos dígitos del comprobante emitido por tu banco.
                </span>
              </div>

              {/* Voucher capture / upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Captura del Comprobante (Obligatorio)
                </label>

                <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-3 text-center bg-slate-50 transition-all">
                  <div className="flex items-center justify-center gap-3">
                    {voucherUrl ? (
                      <div className="relative group">
                        <img
                          src={voucherUrl}
                          alt="Comprobante"
                          className="w-16 h-16 object-cover rounded-xl border border-slate-300 shadow-sm"
                        />
                        <div className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" /> Imagen cargada
                        </div>
                      </div>
                    ) : (
                      <UploadCloud className="w-8 h-8 text-slate-400" />
                    )}

                    <div className="text-left text-xs">
                      <label className="cursor-pointer font-bold text-indigo-900 hover:text-indigo-700 underline block">
                        <span>Subir archivo desde dispositivo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-slate-500 block">
                        O selecciona un comprobante de muestra abajo:
                      </span>
                    </div>
                  </div>

                  {/* Preset voucher picker for QA/Testing */}
                  <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-slate-200 overflow-x-auto pb-1">
                    {SAMPLE_VOUCHERS.map((samp, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setVoucherUrl(samp.url)}
                        className={`text-[10px] px-2 py-1 rounded-lg border font-bold shrink-0 transition-all ${
                          voucherUrl === samp.url
                            ? 'bg-amber-100 text-amber-900 border-amber-400'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {samp.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

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
                disabled={isSubmitting}
                className="w-2/3 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/25 active:scale-98 transition-all text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Enviando Comprobante...</span>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Reportar Recarga ({formatMoney(amountVes)})</span>
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
