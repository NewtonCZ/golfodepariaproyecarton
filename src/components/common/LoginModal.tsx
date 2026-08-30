import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import {
  LogIn,
  LogOut,
  Lock,
  User,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  UserPlus,
  Calendar,
  Mail,
  FileText,
  Phone,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  KeyRound,
  RefreshCw,
  Send,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { LotteryStorageService } from '../../services/storageService';
import {
  saveJugador,
  JugadorBingo,
} from '../../services/playerStorage';
import { supabase } from '../../services/supabaseClient';
import { SuperSparkleBadge } from './SuperSparkleBadge';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
}) => {
  const {
    login,
    logout,
    registerUser,
    requestPasswordRecovery,
    verifyRecoveryCode,
    resetPasswordWithCode,
    isAuthenticated,
    loggedUsername,
    currentRole,
  } = useGame();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'recover'>(initialTab);

  // Registration step wizard: 1 = Personal Data (+18), 2 = Password & Confirmation (+18)
  const [regStep, setRegStep] = useState<1 | 2>(1);

  // Login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Password Recovery state
  // Steps: 1 = Enter Email / Username, 2 = Enter 6-digit Code, 3 = Enter New Password
  const [recoverStep, setRecoverStep] = useState<1 | 2 | 3>(1);
  const [recoverIdentifier, setRecoverIdentifier] = useState('');
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverCode, setRecoverCode] = useState('');
  const [recoverNewPassword, setRecoverNewPassword] = useState('');
  const [recoverConfirmPassword, setRecoverConfirmPassword] = useState('');
  const [demoRecoveryCode, setDemoRecoveryCode] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);

  // Register state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Visibility toggles for password fields (Show/Hide with eye icon)
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRecoverNewPassword, setShowRecoverNewPassword] = useState(false);
  const [showRecoverConfirmPassword, setShowRecoverConfirmPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Status feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check if current typed username is locked out
  const currentLockoutStatus = useMemo(() => {
    if (!username.trim()) return null;
    const check = LotteryStorageService.checkLockoutStatus(username.trim());
    return check.isLocked ? check : null;
  }, [username]);

  // Sync tab with initialTab prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialTab]);

  // Age calculation
  const calculatedAge = useMemo(() => {
    if (!birthDate) return null;
    const dob = new Date(birthDate);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }, [birthDate]);

  const isAdult = calculatedAge !== null && calculatedAge >= 18;

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanInput = username.trim();
    const cleanPass = password.trim();

    if (!cleanInput || !cleanPass) {
      setErrorMsg('Por favor ingresa tu correo electrónico y contraseña.');
      return;
    }

    const res = await login(cleanInput, cleanPass);
    if (res.success) {
      setSuccessMsg(res.message || '¡Sesión iniciada con éxito!');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        if (res.role === 'Super Admin' || res.role === 'Operador Financiero' || res.role === 'Auditor') {
          if (typeof window !== 'undefined' && window.history?.pushState) {
            window.history.pushState({}, '', '/admin');
          }
        }
      }, 1000);
    } else {
      setErrorMsg(res.message || 'Error de autenticación. Verifica tu correo y contraseña.');
    }
  };

  const validateStep1 = () => {
    if (!firstName.trim() || !lastName.trim() || !documentId.trim() || !email.trim() || !birthDate) {
      setErrorMsg('Por favor completa todos los campos obligatorios (*).');
      return false;
    }
    if (calculatedAge === null || calculatedAge < 18) {
      setErrorMsg('Debes ser mayor de edad (mínimo 18 años) para registrarte en TÚ SUPERCARTÓN.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleNextStep = () => {
    if (regStep === 1) {
      if (validateStep1()) setRegStep(2);
    }
  };

  const handleRegisterSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateStep1()) {
      setRegStep(1);
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMsg('Debes declarar tu mayoría de edad (+18) y aceptar los términos y condiciones.');
      return;
    }

    const cleanDoc = documentId.trim().toUpperCase();
    const cleanPhone = phone.trim() || '0412-0000000';
    const jugadorId = `jug-${Date.now()}`;

    // Guardar objeto {id, nombre, apellido, cedula, correo, telefono, fechaNacimiento} en localStorage con key 'jugadores_bingo'
    const nuevoJugador: JugadorBingo = {
      id: jugadorId,
      nombre: firstName.trim(),
      apellido: lastName.trim(),
      cedula: cleanDoc,
      correo: email.trim().toLowerCase(),
      telefono: cleanPhone,
      fechaNacimiento: birthDate,
      fechaRegistro: new Date().toLocaleDateString('es-VE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    saveJugador(nuevoJugador);

    const res = registerUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      documentId: cleanDoc,
      email: email.trim().toLowerCase(),
      phone: cleanPhone,
      birthDate,
      password: regPassword,
    });

    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1600);
    } else {
      setErrorMsg(res.message);
    }
  };

  // Password Recovery Step 1: Send Code via Supabase & Resend
  const handleRequestRecovery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetIdentifier = (recoverIdentifier || username).trim();
    if (!targetIdentifier) {
      setErrorMsg('Por favor ingresa tu correo electrónico, usuario o número de cédula.');
      return;
    }

    setIsSendingCode(true);

    try {
      let targetEmail: string | null = null;
      let targetName = 'Jugador';

      // 1. Consultar usuario/operador en Supabase
      if (supabase.isConfigured) {
        try {
          // Buscar en tabla jugadores
          const { data: jugData } = await supabase
            .from('jugadores')
            .select('*')
            .or(`correo.ilike.${targetIdentifier.toLowerCase()},cedula.ilike.${targetIdentifier.toUpperCase()},nombre.ilike.${targetIdentifier}`)
            .limit(1);

          if (jugData && jugData.length > 0) {
            targetEmail = jugData[0].correo || jugData[0].email;
            targetName = jugData[0].nombre || 'Jugador';
          }
        } catch (err) {
          console.warn('[LoginModal] Error consultando jugadores en Supabase:', err);
        }

        if (!targetEmail) {
          try {
            // Buscar en tabla admin_users
            const { data: adminData } = await supabase
              .from('admin_users')
              .select('*')
              .ilike('username', targetIdentifier.toLowerCase())
              .limit(1);

            if (adminData && adminData.length > 0) {
              targetName = adminData[0].display_name || adminData[0].username;
              targetEmail =
                adminData[0].email ||
                (targetIdentifier.includes('@') ? targetIdentifier : `${targetIdentifier.toLowerCase()}@loteria.com`);
            }
          } catch (err) {
            console.warn('[LoginModal] Error consultando admin_users en Supabase:', err);
          }
        }
      }

      // 2. Intentar despacho de código real a través del backend relativo (/send-otp)
      let sentViaApi = false;
      try {
        const resp = await fetch('/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: targetEmail,
            user: targetName || targetIdentifier,
          }),
        });

        if (resp.ok) {
          const apiData = await resp.json().catch(() => ({}));
          if (apiData.success) {
            sentViaApi = true;
            setRecoverEmail(apiData.email || targetEmail || targetIdentifier);
            setDemoRecoveryCode(apiData.debugCode || null);
            setRecoverStep(2);
            setSuccessMsg(apiData.message || `Código de seguridad de 6 dígitos enviado a ${apiData.email || targetEmail}.`);
            setIsSendingCode(false);
            return;
          }
        }
      } catch (fetchErr) {
        console.warn('[LoginModal] send-otp fetch error:', fetchErr);
      }

      // 3. Fallback de cliente con GameContext
      if (!sentViaApi) {
        const res = await requestPasswordRecovery(targetIdentifier);
        setIsSendingCode(false);

        if (res.success && res.email) {
          setRecoverEmail(res.email);
          setDemoRecoveryCode(res.demoCode || null);
          setRecoverStep(2);
          setSuccessMsg(res.message);
        } else {
          setErrorMsg(res.message);
        }
      }
    } catch (err: any) {
      setIsSendingCode(false);
      setErrorMsg(err?.message || 'Ocurrió un error al enviar el código de recuperación.');
    }
  };

  // Password Recovery Step 2: Verify Code
  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanCode = recoverCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('Por favor ingresa el código de 6 dígitos enviado a tu correo.');
      return;
    }

    try {
      const resp = await fetch('/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoverEmail, code: cleanCode }),
      });

      const verifyData = await resp.json().catch(() => ({}));

      if (resp.ok && verifyData && (verifyData.valid === true || verifyData.success === true)) {
        setSuccessMsg(verifyData.message || 'Código verificado con éxito.');
        setRecoverStep(3);
        return;
      } else if (verifyData && verifyData.valid === false) {
        setErrorMsg(verifyData.message || 'Código incorrecto o expirado.');
        return;
      }
    } catch (fetchErr) {}

    const res = verifyRecoveryCode(recoverEmail, cleanCode);
    if (res.success || (res as any).valid) {
      setSuccessMsg(res.message);
      setRecoverStep(3);
    } else {
      setErrorMsg(res.message);
    }
  };

  // Password Recovery Step 3: Set New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!recoverNewPassword || recoverNewPassword.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (recoverNewPassword !== recoverConfirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    try {
      const resp = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recoverEmail,
          code: recoverCode,
          newPassword: recoverNewPassword,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          resetPasswordWithCode(recoverEmail, recoverCode, recoverNewPassword);
          setSuccessMsg(data.message || '¡Contraseña restablecida exitosamente!');
          setTimeout(() => {
            setActiveTab('login');
            setUsername(recoverEmail);
            setPassword(recoverNewPassword);
            setRecoverStep(1);
            setRecoverCode('');
            setRecoverNewPassword('');
            setRecoverConfirmPassword('');
            setDemoRecoveryCode(null);
          }, 1500);
          return;
        }
      }
    } catch (fetchErr) {}

    const res = resetPasswordWithCode(recoverEmail, recoverCode, recoverNewPassword);
    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        setActiveTab('login');
        setUsername(recoverEmail);
        setPassword(recoverNewPassword);
        setRecoverStep(1);
        setRecoverCode('');
        setRecoverNewPassword('');
        setRecoverConfirmPassword('');
        setDemoRecoveryCode(null);
      }, 1500);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleLogout = () => {
    logout();
    setSuccessMsg('Ha cerrado su sesión de manera segura.');
    setTimeout(() => {
      onClose();
      setSuccessMsg(null);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-3 sm:p-6 lg:p-8 animate-fadeIn overflow-hidden">
      {/* Container aligned to full viewport height without internal scrollbars */}
      <div className="max-w-2xl mx-auto w-full h-full flex flex-col justify-between overflow-hidden">
        
        {/* Top Header */}
        <div className="shrink-0 space-y-2.5 pb-2 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
                {activeTab === 'login' ? (
                  <LogIn className="w-5 h-5 stroke-[2.5]" />
                ) : activeTab === 'recover' ? (
                  <KeyRound className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <UserPlus className="w-5 h-5 stroke-[2.5]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-white leading-tight">TÚ SUPERCARTÓN</h1>
                  <SuperSparkleBadge size="sm" />
                </div>
                <p className="text-xs text-amber-400 font-extrabold">
                  {activeTab === 'login'
                    ? 'Acceso Oficial de Usuario'
                    : activeTab === 'recover'
                    ? 'Recuperación de Contraseña por Correo'
                    : 'Registro de Jugador (+18 Verificado)'}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="close-login-modal-btn"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-bold cursor-pointer"
            >
              <span>Volver</span>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1">
            <button
              type="button"
              id="login-tab-btn"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Iniciar Sesión</span>
            </button>

            <button
              type="button"
              id="register-tab-btn"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Registro (+18)</span>
            </button>

            <button
              type="button"
              id="recover-tab-btn"
              onClick={() => {
                setActiveTab('recover');
                setRecoverStep(1);
                if (username) setRecoverIdentifier(username);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'recover'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Recuperar Clave</span>
            </button>
          </div>

          {/* Step Progress Bar (Register mode - 2 Steps) */}
          {activeTab === 'register' && (
            <div className="flex items-center justify-between text-xs pt-1">
              {[
                { step: 1, label: '1. Datos Personales y Edad (+18)' },
                { step: 2, label: '2. Clave y Confirmación (+18)' },
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => {
                    if (s.step === 1) setRegStep(1);
                    else if (s.step === 2 && validateStep1()) setRegStep(2);
                  }}
                  className={`flex items-center gap-1.5 font-black text-[11px] sm:text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    regStep === s.step
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : regStep > s.step
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                  }`}
                >
                  {regStep > s.step ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  ) : (
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        regStep === s.step ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {s.step}
                    </span>
                  )}
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step Progress Bar (Recover mode) */}
          {activeTab === 'recover' && (
            <div className="flex items-center justify-between text-xs pt-1">
              {[
                { step: 1, label: '1. Solicitar Código' },
                { step: 2, label: '2. Validar Código' },
                { step: 3, label: '3. Nueva Clave' },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`flex items-center gap-1.5 font-black text-[11px] sm:text-xs px-2.5 py-1 rounded-lg transition-all ${
                    recoverStep === s.step
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : recoverStep > s.step
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                  }`}
                >
                  {recoverStep > s.step ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  ) : (
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        recoverStep === s.step ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {s.step}
                    </span>
                  )}
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Middle Body Section (Fits screen without internal scroll bars) */}
        <div className="flex-1 my-auto flex flex-col justify-center py-2 space-y-3 overflow-hidden">
          
          {/* Active Session Notice */}
          {isAuthenticated && (
            <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase block">
                    Sesión Activa ({currentRole})
                  </span>
                  <span className="text-xs font-black text-white">@{loggedUsername || 'Usuario'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}

          {/* Security Alert: Temporary Lockout Active */}
          {currentLockoutStatus && (
            <div className="p-2.5 bg-rose-950/90 border border-rose-600 rounded-xl text-xs text-rose-200 flex items-start gap-2 animate-fadeIn shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-100">
                  ¡Cuenta Bloqueada por Seguridad (3 intentos fallidos)!
                </p>
                <p className="text-[11px] text-rose-300 leading-tight">
                  Tiempo restante de bloqueo: {currentLockoutStatus.remainingMinutes} minuto(s). Puedes restablecer tu clave inmediatamente con tu correo electrónico.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('recover');
                    setRecoverIdentifier(username);
                    setRecoverStep(1);
                    setErrorMsg(null);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-amber-300 underline hover:text-amber-200 cursor-pointer pt-0.5"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Restablecer contraseña por correo ahora</span>
                </button>
              </div>
            </div>
          )}

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="p-2.5 bg-rose-950/90 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-center gap-2 animate-fadeIn shrink-0">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-semibold leading-tight">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-950/90 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center gap-2 animate-fadeIn shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold leading-tight">{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN FORM */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3 my-auto">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">Protección contra ataques de fuerza bruta:</span>
                <span className="text-[11px] font-black text-amber-400">Máx. 3 intentos fallidos</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Correo Electrónico (Email) / Usuario</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej. limitlessmarketve@gmail.com"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-white pl-9 pr-3 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('recover');
                      setRecoverIdentifier(username);
                      setRecoverStep(1);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-white pl-9 pr-10 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer p-0.5"
                    tabIndex={-1}
                    title={showLoginPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>Ingresar a la Lotería</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1 px-1">
                <span className="text-slate-400">¿No posees cuenta?</span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-black text-amber-400 hover:underline cursor-pointer"
                >
                  Regístrate gratis (+18 y KYC)
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PASSWORD RECOVERY (EMAIL 3-STEP FLOW) */}
          {activeTab === 'recover' && (
            <div className="space-y-3 my-auto">
              {/* Recover Step 1: Request code to email */}
              {recoverStep === 1 && (
                <form onSubmit={handleRequestRecovery} className="space-y-3 animate-fadeIn">
                  <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
                    <Mail className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black text-amber-200">Recuperación Segura por Correo Electrónico</p>
                      <p className="text-[11px] text-amber-300/90 mt-0.5 leading-tight">
                        Ingresa tu correo electrónico registrado, nombre de usuario o Cédula. Te enviaremos un código de seguridad de 6 dígitos para restablecer tu clave y desbloquear tu cuenta.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Correo Electrónico, Usuario o Cédula *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={recoverIdentifier}
                        onChange={(e) => setRecoverIdentifier(e.target.value)}
                        placeholder="Ej: niuton@loteria.com o V-26890123"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-white pl-9 pr-3 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingCode}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSendingCode ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Enviando código de verificación...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 stroke-[2.5]" />
                        <span>Enviar Código de Recuperación</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="text-xs text-slate-400 hover:text-white font-bold cursor-pointer inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Volver al inicio de sesión</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Recover Step 2: Validate 6-digit Code */}
              {recoverStep === 2 && (
                <form onSubmit={handleVerifyCodeSubmit} className="space-y-3 animate-fadeIn">
                  <div className="p-3 bg-indigo-950/50 border border-indigo-500/40 rounded-xl space-y-1.5 text-xs text-indigo-200">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white uppercase text-[11px] flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-amber-400" />
                        Código de Verificación Enviado
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                        Válido por 30 min
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Hemos enviado un código a: <strong className="text-amber-300">{recoverEmail}</strong>
                    </p>

                    {/* Simulation helper banner for quick testing */}
                    {demoRecoveryCode && (
                      <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-[11px]">
                        <span className="text-amber-200">Código de seguridad (Bandeja / Demo):</span>
                        <button
                          type="button"
                          onClick={() => setRecoverCode(demoRecoveryCode)}
                          className="font-black text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-600 hover:bg-amber-900 cursor-pointer"
                        >
                          Usar {demoRecoveryCode}
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Código de 6 Dígitos *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={recoverCode}
                      onChange={(e) => setRecoverCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-amber-400 tracking-widest text-center py-2.5 rounded-xl text-base font-black focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Verificar Código</span>
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <button
                      type="button"
                      onClick={() => setRecoverStep(1)}
                      className="text-slate-400 hover:text-white font-bold cursor-pointer inline-flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Cambiar correo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestRecovery()}
                      className="text-amber-400 hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reenviar código</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Recover Step 3: Enter New Password */}
              {recoverStep === 3 && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3 animate-fadeIn">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-black text-emerald-100">Identidad Confirmada</p>
                      <p className="text-[11px] text-emerald-300">
                        Crea tu nueva contraseña para la cuenta <strong>{recoverEmail}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Nueva Contraseña *
                      </label>
                      <div className="relative">
                        <input
                          type={showRecoverNewPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={recoverNewPassword}
                          onChange={(e) => setRecoverNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-white pl-3 pr-8 py-2 rounded-xl text-xs font-medium focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRecoverNewPassword((prev) => !prev)}
                          className="absolute right-2 top-2 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer p-0.5"
                          tabIndex={-1}
                          title={showRecoverNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          {showRecoverNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Confirmar Nueva Clave *
                      </label>
                      <div className="relative">
                        <input
                          type={showRecoverConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={recoverConfirmPassword}
                          onChange={(e) => setRecoverConfirmPassword(e.target.value)}
                          placeholder="Repite la contraseña"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-white pl-3 pr-8 py-2 rounded-xl text-xs font-medium focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRecoverConfirmPassword((prev) => !prev)}
                          className="absolute right-2 top-2 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer p-0.5"
                          tabIndex={-1}
                          title={showRecoverConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          {showRecoverConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 stroke-[2.5]" />
                    <span>Guardar Nueva Contraseña e Iniciar Sesión</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: REGISTER FORM (FULL SCREEN 2-STEP FLOW) */}
          {activeTab === 'register' && (
            <form onSubmit={(e) => { e.preventDefault(); if (regStep === 1) handleNextStep(); else handleRegisterSubmit(e); }} className="space-y-3 my-auto">
              
              {/* STEP 1: PERSONAL DATA (+18 VALIDATION) */}
              {regStep === 1 && (
                <div className="space-y-2.5 animate-fadeIn">
                  <div className="bg-amber-950/40 border border-amber-500/40 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-300">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-[11px] font-medium leading-tight">
                        <strong className="font-black text-amber-200">Requisito de Mayoría de Edad (+18):</strong> Registro rápido mediante validación de fecha de nacimiento y documento oficial.
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold shrink-0">Paso 1 de 2</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Nombre *</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ej. Juan"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-white px-3 py-2 rounded-xl text-xs font-medium focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Apellido *</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Ej. Pérez"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-white px-3 py-2 rounded-xl text-xs font-medium focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Cédula de Identidad (DNI) *</label>
                      <input
                        type="text"
                        required
                        value={documentId}
                        onChange={(e) => setDocumentId(e.target.value)}
                        placeholder="V-28123456"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-white px-3 py-2 rounded-xl text-xs font-medium focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Correo Electrónico *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-white px-3 py-2 rounded-xl text-xs font-medium focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Teléfono Móvil</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0412-1234567"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-white px-3 py-2 rounded-xl text-xs font-medium focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Fecha de Nacimiento *</label>
                      <input
                        type="date"
                        required
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-white px-3 py-2 rounded-xl text-xs font-medium focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Dynamic Age Badge */}
                  {birthDate && (
                    <div
                      className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                        isAdult
                          ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                      }`}
                    >
                      {isAdult ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>
                        {isAdult
                          ? `Edad: ${calculatedAge} años — Mayoría de Edad Aprobada (+18)`
                          : `Edad: ${calculatedAge !== null ? calculatedAge : 0} años — Menor de 18 años. Registro restringido por ley.`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: PASSWORD & CONFIRMATION */}
              {regStep === 2 && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Resumen de Registro</span>
                      <p className="text-xs font-bold text-amber-300">{firstName} {lastName} ({documentId})</p>
                      <p className="text-[11px] text-slate-400">{email} • {calculatedAge} años (Mayor de Edad +18)</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 border border-slate-700">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Saldo: 0,00 Bs.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Crear Contraseña *</label>
                      <div className="relative">
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-white pl-3 pr-8 py-2 rounded-xl text-xs font-medium focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((prev) => !prev)}
                          className="absolute right-2 top-2 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer p-0.5"
                          tabIndex={-1}
                          title={showRegPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Confirmar Contraseña *</label>
                      <div className="relative">
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Repite la contraseña"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-amber-400 text-white pl-3 pr-8 py-2 rounded-xl text-xs font-medium focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword((prev) => !prev)}
                          className="absolute right-2 top-2 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer p-0.5"
                          tabIndex={-1}
                          title={showRegConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Tu cuenta se creará con estado <strong>Aprobado</strong> y saldo inicial de <strong>0,00 Bs.</strong> Podrás recargar saldo vía Pago Móvil cuando lo desees.</span>
                  </div>

                  <div className="flex items-start gap-2 pt-0.5">
                    <input
                      type="checkbox"
                      id="terms-checkbox-step2"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                    <label htmlFor="terms-checkbox-step2" className="text-xs text-slate-300 font-medium leading-tight cursor-pointer">
                      Declaro bajo fe de juramento ser mayor de 18 años y acepto los Términos, Políticas de Privacidad y Reglamento de Juego Responsable (+18) de SuperMillonario Destiny.
                    </label>
                  </div>
                </div>
              )}

            </form>
          )}

        </div>

        {/* Bottom Footer Navigation Bar (Only for Register Mode) */}
        {activeTab === 'register' && (
          <div className="shrink-0 pt-2 border-t border-slate-800 flex items-center gap-2">
            {regStep === 2 && (
              <button
                type="button"
                onClick={() => setRegStep(1)}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
            )}

            {regStep === 1 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={calculatedAge !== null && calculatedAge < 18}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                  calculatedAge !== null && calculatedAge < 18
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 active:scale-95'
                }`}
              >
                <span>Siguiente: Crear Clave (+18)</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegisterSubmit}
                disabled={calculatedAge !== null && calculatedAge < 18}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  calculatedAge !== null && calculatedAge < 18
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 shadow-amber-500/20 active:scale-95'
                }`}
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Completar Registro (+18)</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
