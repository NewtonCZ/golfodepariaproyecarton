import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  X,
  User,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  Plus,
  Trash2,
  Check,
  Smartphone,
  Mail,
  Building,
  FileText,
  Lock,
  Globe,
  Wallet,
  QrCode
} from 'lucide-react';
export interface WithdrawalMethod {
  id: string;
  type: 'pago_movil' | 'transferencia' | 'zelle' | 'cripto';
  alias: string;
  bankName?: string;
  phone?: string;
  documentId?: string;
  accountNumber?: string;
  accountType?: 'corriente' | 'ahorro';
  email?: string;
  walletAddress?: string;
  walletNetwork?: string;
  holderName?: string;
  isDefault?: boolean;
}

export type TwoFactorMethod = 'none' | 'email' | 'sms' | 'whatsapp';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserKyc } = useGame();

  const [activeTab, setActiveTab] = useState<'profile' | 'kyc' | 'withdraw_methods'>('profile');

  // KYC Upload State
  const [kycFront, setKycFront] = useState<string | null>(currentUser.kycFrontUrl || currentUser.kycData?.frontUrl || null);
  const [kycBack, setKycBack] = useState<string | null>(currentUser.kycBackUrl || currentUser.kycData?.backUrl || null);
  const [kycSuccessMsg, setKycSuccessMsg] = useState<string | null>(null);

  // 2FA Settings State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(currentUser.twoFactorEnabled || false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethod>(currentUser.twoFactorMethod || 'email');
  const [twoFactorSuccessMsg, setTwoFactorSuccessMsg] = useState<string | null>(null);

  // Withdrawal Methods State (persistent in localStorage)
  const [withdrawalMethods, setWithdrawalMethods] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(`tusc_methods_${currentUser.id}`);
      return saved ? JSON.parse(saved) : (currentUser.withdrawalMethods || []);
    } catch {
      return currentUser.withdrawalMethods || [];
    }
  });

  const addWithdrawalMethod = (method: any) => {
    setWithdrawalMethods((prev) => {
      const updated = [{ ...method, id: `wm-${Date.now()}` }, ...prev];
      try {
        localStorage.setItem(`tusc_methods_${currentUser.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const deleteWithdrawalMethod = (methodId: string) => {
    setWithdrawalMethods((prev) => {
      const updated = prev.filter((m) => m.id !== methodId);
      try {
        localStorage.setItem(`tusc_methods_${currentUser.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const setDefaultWithdrawalMethod = (methodId: string) => {
    setWithdrawalMethods((prev) => {
      const updated = prev.map((m) => ({ ...m, isDefault: m.id === methodId }));
      try {
        localStorage.setItem(`tusc_methods_${currentUser.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const updateUser2FA = (enabled: boolean, method: TwoFactorMethod) => {
    try {
      localStorage.setItem(`tusc_2fa_${currentUser.id}`, JSON.stringify({ enabled, method }));
    } catch {}
  };

  // Add Withdrawal Method Form State
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [methodType, setMethodType] = useState<'pago_movil' | 'transferencia' | 'zelle' | 'cripto'>('pago_movil');
  const [methodAlias, setMethodAlias] = useState('');
  const [bankName, setBankName] = useState('Banesco (0134)');
  const [phone, setPhone] = useState(currentUser.phone);
  const [documentId, setDocumentId] = useState(currentUser.documentId);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState<'corriente' | 'ahorro'>('corriente');
  const [zelleEmail, setZelleEmail] = useState(currentUser.email || '');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletNetwork, setWalletNetwork] = useState('USDT (TRC20)');
  const [holderName, setHolderName] = useState(currentUser.name);
  const [methodMsg, setMethodMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate age from birthDate
  const calculateAge = (birthDateStr?: string) => {
    if (!birthDateStr) return 18;
    const today = new Date();
    const birthDate = new Date(birthDateStr);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const userAge = calculateAge(currentUser.birthDate);

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycFront || !kycBack) {
      alert('Por favor adjunta la imagen frontal y posterior de tu Cédula / DNI.');
      return;
    }
    updateUserKyc(currentUser.id, 'Pendiente', kycFront, kycBack);
    setKycSuccessMsg('Documentos de verificación KYC enviados correctamente. Un operador revisará tu perfil.');
    setTimeout(() => setKycSuccessMsg(null), 4000);
  };

  const handle2FASave = () => {
    updateUser2FA(twoFactorEnabled, twoFactorMethod);
    setTwoFactorSuccessMsg('Configuración de Autenticación de Dos Factores (2FA) actualizada.');
    setTimeout(() => setTwoFactorSuccessMsg(null), 3000);
  };

  const handleSaveMethod = (e: React.FormEvent) => {
    e.preventDefault();
    setMethodMsg(null);

    const alias = methodAlias.trim() || (
      methodType === 'pago_movil' ? `Pago Móvil ${bankName}` :
      methodType === 'transferencia' ? `Banco ${bankName}` :
      methodType === 'zelle' ? `Zelle ${zelleEmail}` : `Billetera ${walletNetwork}`
    );

    addWithdrawalMethod({
      type: methodType,
      alias,
      bankName: methodType === 'pago_movil' || methodType === 'transferencia' ? bankName : undefined,
      phone: methodType === 'pago_movil' ? phone : undefined,
      documentId: methodType === 'pago_movil' || methodType === 'transferencia' ? documentId : undefined,
      accountNumber: methodType === 'transferencia' ? accountNumber : undefined,
      accountType: methodType === 'transferencia' ? accountType : undefined,
      email: methodType === 'zelle' ? zelleEmail : undefined,
      walletAddress: methodType === 'cripto' ? walletAddress : undefined,
      walletNetwork: methodType === 'cripto' ? walletNetwork : undefined,
      holderName,
      isDefault: (currentUser.withdrawalMethods || []).length === 0,
    });

    setShowAddMethodModal(false);
    setMethodAlias('');
    setAccountNumber('');
    setWalletAddress('');
  };

  // Simulating image file pick for KYC
  const handleSimulatedFileUpload = (side: 'front' | 'back') => {
    const mockImage = side === 'front'
      ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80'
      : 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80';
    
    if (side === 'front') setKycFront(mockImage);
    else setKycBack(mockImage);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 pt-10 sm:pt-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-100 relative my-2 sm:my-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center font-black text-lg sm:text-xl shadow-inner shrink-0">
              👤
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
                <span>Mi Perfil de Usuario</span>
                <span className="text-[10px] sm:text-xs bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                  {currentUser.status === 'active' ? 'Cuenta Activa' : currentUser.status}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
                @{currentUser.username || 'carlosm'} • {currentUser.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar pestaña"
            title="Cerrar ventana"
            className="w-10 h-10 rounded-2xl bg-slate-800/90 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700/60 flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 my-4 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              activeTab === 'profile'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Datos & 2FA</span>
          </button>

          <button
            onClick={() => setActiveTab('kyc')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              activeTab === 'kyc'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verificación KYC</span>
            {currentUser.kycStatus === 'Aprobado' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
            {currentUser.kycStatus === 'Pendiente' && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('withdraw_methods')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              activeTab === 'withdraw_methods'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Métodos de Retiro ({currentUser.withdrawalMethods?.length || 0})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: PROFILE & 2FA */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>Información Personal Verificada</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-bold">Nombre Completo:</span>
                    <span className="font-bold text-white text-sm">{currentUser.name}</span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-bold">Documento de Identidad (DNI/Cédula):</span>
                    <span className="font-mono font-bold text-amber-300">{currentUser.documentId}</span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-bold">Fecha Nacimiento / Edad:</span>
                    <span className="font-bold text-white">
                      {currentUser.birthDate} <span className="text-emerald-400 font-bold">({userAge} años - Mayor de Edad 18+)</span>
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-bold">Teléfono Móvil:</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-white">{currentUser.phone}</span>
                      <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded-md font-bold">
                        ✓ Verificado
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 sm:col-span-2">
                    <span className="text-[10px] text-slate-400 block font-bold">Correo Electrónico:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-white font-bold">{currentUser.email || 'carlos@mendoza.com'}</span>
                      {currentUser.emailVerified ? (
                        <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Correo Verificado</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-md font-bold">
                          Pendiente de Confirmación
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2FA Configuration */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    <span>Autenticación de Dos Factores (2FA)</span>
                  </h3>
                  <button
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      twoFactorEnabled
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {twoFactorEnabled ? '2FA ACTIVADO' : '2FA DESACTIVADO'}
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  Protege los inicios de sesión y retiros de tu cuenta mediante el envío de códigos OTP de seguridad.
                </p>

                {twoFactorEnabled && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-slate-300">
                      Canal de Recepción de Códigos OTP:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTwoFactorMethod('email')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          twoFactorMethod === 'email'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Mail className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="text-xs font-bold">Correo Electrónico</div>
                          <div className="text-[10px] opacity-75">Código por Email</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTwoFactorMethod('sms')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          twoFactorMethod === 'sms'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Smartphone className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="text-xs font-bold">Mensaje SMS</div>
                          <div className="text-[10px] opacity-75">Texto a Celular</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTwoFactorMethod('whatsapp')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          twoFactorMethod === 'whatsapp'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Globe className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="text-xs font-bold">WhatsApp</div>
                          <div className="text-[10px] opacity-75">Mensaje Directo</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {twoFactorSuccessMsg && (
                  <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{twoFactorSuccessMsg}</span>
                  </div>
                )}

                <button
                  onClick={handle2FASave}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl transition-all cursor-pointer border border-slate-700"
                >
                  Guardar Configuración de Seguridad 2FA
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: KYC IDENTITY VERIFICATION */}
          {activeTab === 'kyc' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verificación de Identidad (KYC)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sube tu Cédula de Identidad / DNI para habilitar retiros sin restricciones.
                    </p>
                  </div>

                  <div className="shrink-0">
                    {currentUser.kycStatus === 'Aprobado' && (
                      <span className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>KYC APROBADO</span>
                      </span>
                    )}
                    {currentUser.kycStatus === 'Pendiente' && (
                      <span className="bg-amber-500/20 border border-amber-500/50 text-amber-300 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>KYC EN REVISIÓN</span>
                      </span>
                    )}
                    {(currentUser.kycStatus === 'No Enviado' || currentUser.kycStatus === 'Rechazado' || !currentUser.kycStatus) && (
                      <span className="bg-rose-500/20 border border-rose-500/50 text-rose-300 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>PAGO PENDIENTE KYC</span>
                      </span>
                    )}
                  </div>
                </div>

                {currentUser.kycData?.rejectionReason && (
                  <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-bold">
                    ⚠️ Motivo de Rechazo Anterior: {currentUser.kycData.rejectionReason}
                  </div>
                )}

                {kycSuccessMsg && (
                  <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{kycSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleKycSubmit} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Front Document Upload */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center space-y-2">
                      <span className="text-xs font-bold text-slate-300 block">
                        Cédula / DNI (Lado Frontal)
                      </span>
                      {kycFront ? (
                        <div className="relative group rounded-lg overflow-hidden border border-amber-500/40">
                          <img src={kycFront} alt="KYC Frontal" className="w-full h-28 object-cover" />
                          <button
                            type="button"
                            onClick={() => setKycFront(null)}
                            className="absolute top-1 right-1 bg-slate-950/80 p-1 text-rose-400 hover:text-rose-200 rounded-full"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSimulatedFileUpload('front')}
                          className="w-full h-28 border-2 border-dashed border-slate-700 hover:border-amber-400/80 rounded-xl flex flex-col items-center justify-center p-2 text-slate-400 hover:text-amber-300 transition-all cursor-pointer bg-slate-950/50"
                        >
                          <Upload className="w-6 h-6 mb-1 text-amber-400" />
                          <span className="text-[11px] font-bold">Cargar Foto Frontal</span>
                          <span className="text-[9px] text-slate-500">JPG, PNG o PDF</span>
                        </button>
                      )}
                    </div>

                    {/* Back Document Upload */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center space-y-2">
                      <span className="text-xs font-bold text-slate-300 block">
                        Cédula / DNI (Lado Posterior)
                      </span>
                      {kycBack ? (
                        <div className="relative group rounded-lg overflow-hidden border border-amber-500/40">
                          <img src={kycBack} alt="KYC Posterior" className="w-full h-28 object-cover" />
                          <button
                            type="button"
                            onClick={() => setKycBack(null)}
                            className="absolute top-1 right-1 bg-slate-950/80 p-1 text-rose-400 hover:text-rose-200 rounded-full"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSimulatedFileUpload('back')}
                          className="w-full h-28 border-2 border-dashed border-slate-700 hover:border-amber-400/80 rounded-xl flex flex-col items-center justify-center p-2 text-slate-400 hover:text-amber-300 transition-all cursor-pointer bg-slate-950/50"
                        >
                          <Upload className="w-6 h-6 mb-1 text-amber-400" />
                          <span className="text-[11px] font-bold">Cargar Foto Posterior</span>
                          <span className="text-[9px] text-slate-500">JPG, PNG o PDF</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={currentUser.kycStatus === 'Aprobado'}
                    className={`w-full py-3 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      currentUser.kycStatus === 'Aprobado'
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:from-amber-400 hover:to-yellow-300'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {currentUser.kycStatus === 'Aprobado'
                        ? 'Identidad Verificada Correctamente'
                        : 'Enviar Documentos para Verificación KYC'}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: WITHDRAWAL METHODS MANAGEMENT */}
          {activeTab === 'withdraw_methods' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      <span>Mis Métodos de Retiro Guardados</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Guarda tus cuentas de Pago Móvil, Bancarias o Billeteras para acelerar tus retiros.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAddMethodModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Añadir Método</span>
                  </button>
                </div>

                {(!currentUser.withdrawalMethods || currentUser.withdrawalMethods.length === 0) ? (
                  <div className="text-center py-8 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 text-slate-400 space-y-2">
                    <CreditCard className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs font-bold">No tienes ningún método de retiro guardado.</p>
                    <button
                      onClick={() => setShowAddMethodModal(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold"
                    >
                      Añadir Pago Móvil o Banco
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {currentUser.withdrawalMethods.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                          m.isDefault
                            ? 'bg-indigo-950/60 border-amber-500/60 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center font-bold">
                            {m.type === 'pago_movil' && <Smartphone className="w-5 h-5" />}
                            {m.type === 'transferencia' && <Building className="w-5 h-5" />}
                            {m.type === 'zelle' && <Mail className="w-5 h-5 text-purple-400" />}
                            {m.type === 'cripto' && <Wallet className="w-5 h-5 text-emerald-400" />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white">{m.alias}</span>
                              {m.isDefault && (
                                <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-md">
                                  PREDETERMINADO
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {m.type === 'pago_movil' && `${m.bankName} • ${m.phone} • ${m.documentId}`}
                              {m.type === 'transferencia' && `${m.bankName} • ${m.accountNumber} • ${m.holderName}`}
                              {m.type === 'zelle' && `${m.email} • ${m.holderName}`}
                              {m.type === 'cripto' && `${m.walletNetwork} • ${m.walletAddress?.slice(0, 10)}...`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!m.isDefault && (
                            <button
                              onClick={() => setDefaultWithdrawalMethod(m.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 font-bold rounded-lg cursor-pointer"
                              title="Marcar como predeterminado"
                            >
                              Predeterminar
                            </button>
                          )}
                          <button
                            onClick={() => deleteWithdrawalMethod(m.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                            title="Eliminar método"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with bottom close button */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 mt-1">
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Optimizado para dispositivos móviles y escritorio
          </span>
          <button
            onClick={onClose}
            type="button"
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700/80 transition-all cursor-pointer active:scale-95 shadow-md"
          >
            <X className="w-4 h-4 text-rose-400 stroke-[2.5]" />
            <span>Cerrar Ventana</span>
          </button>
        </div>

        {/* MODAL PARA AGREGAR MÉTODO DE RETIRO */}
        {showAddMethodModal && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Añadir Método de Retiro</span>
                </h3>
                <button
                  onClick={() => setShowAddMethodModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMethod} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Tipo de Método:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setMethodType('pago_movil')}
                      className={`p-2 rounded-xl border transition-all cursor-pointer text-center ${
                        methodType === 'pago_movil'
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      Pago Móvil
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethodType('transferencia')}
                      className={`p-2 rounded-xl border transition-all cursor-pointer text-center ${
                        methodType === 'transferencia'
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      Transferencia
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethodType('zelle')}
                      className={`p-2 rounded-xl border transition-all cursor-pointer text-center ${
                        methodType === 'zelle'
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      Zelle
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethodType('cripto')}
                      className={`p-2 rounded-xl border transition-all cursor-pointer text-center ${
                        methodType === 'cripto'
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      Cripto / USDT
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Nombre Corto / Alias del Método:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Mi Pago Móvil Banesco"
                    value={methodAlias}
                    onChange={(e) => setMethodAlias(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white px-3 py-2 rounded-xl text-xs font-bold"
                  />
                </div>

                {(methodType === 'pago_movil' || methodType === 'transferencia') && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Banco de Destino:
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white px-3 py-2 rounded-xl text-xs font-bold"
                    >
                      <option value="Banesco (0134)">Banesco (0134)</option>
                      <option value="Banco de Venezuela (0102)">Banco de Venezuela (0102)</option>
                      <option value="Mercantil (0105)">Mercantil (0105)</option>
                      <option value="BBVA Provincial (0108)">BBVA Provincial (0108)</option>
                      <option value="BNC (0191)">BNC (0191)</option>
                      <option value="Bancamiga (0172)">Bancamiga (0172)</option>
                    </select>
                  </div>
                )}

                {methodType === 'pago_movil' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Teléfono:</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Cédula:</label>
                      <input
                        type="text"
                        value={documentId}
                        onChange={(e) => setDocumentId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                {methodType === 'transferencia' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Número de Cuenta (20 dígitos):</label>
                    <input
                      type="text"
                      placeholder="0134-0000-00-0000000000"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                )}

                {methodType === 'zelle' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Correo Zelle:</label>
                    <input
                      type="email"
                      value={zelleEmail}
                      onChange={(e) => setZelleEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                )}

                {methodType === 'cripto' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Dirección de Billetera USDT:</label>
                    <input
                      type="text"
                      placeholder="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMethodModal(false)}
                    className="px-3 py-2 text-slate-400 hover:text-white text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg"
                  >
                    Guardar Método
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
