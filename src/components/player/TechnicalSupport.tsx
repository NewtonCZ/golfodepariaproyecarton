import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from '../../context/GameContext';
import {
  LifeBuoy,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  ArrowLeft,
  Clock,
  ShieldCheck,
  CreditCard,
  ArrowUpRight,
  Sparkles,
  Ticket,
  Trophy,
  HelpCircle,
  PhoneCall,
  User,
  Hash,
  FileText,
} from 'lucide-react';

export type SupportProblemType = 'deposito' | 'retiro' | 'ticket' | 'premiacion';

export interface SupportTicketData {
  ticketId: string;
  problemType: SupportProblemType;
  problemLabel: string;
  fullName: string;
  phone: string;
  referenceNumber?: string;
  description: string;
  urgency: 'normal' | 'alta';
  createdAt: string;
  status: 'recibido' | 'en_revision' | 'resuelto';
}

interface TechnicalSupportProps {
  onClose?: () => void;
  onBackToHome?: () => void;
}

// Configurable Support Links (Placeholders)
export const SUPPORT_CONFIG = {
  telegramGroupUrl: 'https://t.me/TuSuperCartonSoporte',
  telegramChannelName: '@TuSuperCartonSoporte',
  whatsappNumber: '+58 412 0000000',
  whatsappDirectUrl: 'https://wa.me/584120000000',
  responseTimeAverage: '< 15 minutos',
  workingHours: '24 Horas / 7 Días a la semana',
};

const PROBLEM_TYPES: Array<{
  id: SupportProblemType;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderColor: string;
  badgeBg: string;
}> = [
  {
    id: 'deposito',
    title: 'Depósito / Recarga',
    subtitle: 'Pago Móvil, fondos no acreditados, confirmación de comprobante.',
    icon: CreditCard,
    accentColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'retiro',
    title: 'Retiro / Cobro',
    subtitle: 'Solicitudes en espera, validación de cuenta bancaria o liquidación.',
    icon: ArrowUpRight,
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/40 hover:border-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  {
    id: 'ticket',
    title: 'Cartón / Fichas',
    subtitle: 'Compra de cartones 4x4, visualización de fichas o rondas de juego.',
    icon: Ticket,
    accentColor: 'text-sky-400',
    borderColor: 'border-sky-500/40 hover:border-sky-400',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  {
    id: 'premiacion',
    title: 'Premiación / Pagos',
    subtitle: 'Verificación de líneas, 4 esquinas, cartón lleno y cálculo de premios.',
    icon: Trophy,
    accentColor: 'text-purple-400',
    borderColor: 'border-purple-500/40 hover:border-purple-400',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
];

export const TechnicalSupport: React.FC<TechnicalSupportProps> = ({
  onClose,
  onBackToHome,
}) => {
  const { currentUser, isAuthenticated, loggedUsername } = useGame();

  // Form States
  const [selectedType, setSelectedType] = useState<SupportProblemType>('deposito');
  const [fullName, setFullName] = useState<string>(
    currentUser?.name || loggedUsername || ''
  );
  const [phone, setPhone] = useState<string>(currentUser?.phone || '');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [urgency, setUrgency] = useState<'normal' | 'alta'>('normal');

  // UI Flow States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdTicket, setCreatedTicket] = useState<SupportTicketData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Local storage history of submitted tickets
  const [submittedTickets, setSubmittedTickets] = useState<SupportTicketData[]>(() => {
    try {
      const saved = localStorage.getItem('supercarton_support_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const generateTicketId = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `TK-${randomNum}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Form Validations
    if (!fullName.trim()) {
      setValidationError('Por favor ingresa tu nombre completo o usuario.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 7) {
      setValidationError('Por favor ingresa un número de teléfono o WhatsApp válido.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setValidationError(
        'Por favor describe brevemente el problema (mínimo 10 caracteres).'
      );
      return;
    }

    setIsSubmitting(true);

    const problemConfig = PROBLEM_TYPES.find((p) => p.id === selectedType);
    const newTicket: SupportTicketData = {
      ticketId: generateTicketId(),
      problemType: selectedType,
      problemLabel: problemConfig?.title || 'Soporte General',
      fullName: fullName.trim(),
      phone: phone.trim(),
      referenceNumber: referenceNumber.trim() || undefined,
      description: description.trim(),
      urgency,
      createdAt: new Date().toLocaleString('es-VE', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }),
      status: 'recibido',
    };

    setTimeout(() => {
      setCreatedTicket(newTicket);
      setIsSubmitting(false);

      // Save to local tickets history
      try {
        const updated = [newTicket, ...submittedTickets].slice(0, 10);
        setSubmittedTickets(updated);
        localStorage.setItem(
          'supercarton_support_tickets',
          JSON.stringify(updated)
        );
      } catch (err) {
        console.warn('Error saving ticket history:', err);
      }
    }, 600);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetForm = () => {
    setCreatedTicket(null);
    setDescription('');
    setReferenceNumber('');
    setValidationError(null);
  };

  // WhatsApp formatted link generator with ticket data pre-filled
  const getWhatsAppLink = (ticket: SupportTicketData) => {
    const rawMsg = `¡Hola Soporte Técnico de TÚ SUPERCARTÓN! 👋\n\nHe generado el Ticket: *#${ticket.ticketId}*\n• *Tipo:* ${ticket.problemLabel}\n• *Usuario:* ${ticket.fullName}\n• *Teléfono:* ${ticket.phone}${ticket.referenceNumber ? `\n• *Referencia:* ${ticket.referenceNumber}` : ''}\n• *Prioridad:* ${ticket.urgency.toUpperCase()}\n\n*Detalle:* ${ticket.description}\n\nSolicito su apoyo para la resolución. ¡Gracias!`;
    return `${SUPPORT_CONFIG.whatsappDirectUrl}?text=${encodeURIComponent(rawMsg)}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-2 sm:py-6 px-2 sm:px-4">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-800/80 p-5 sm:p-8 shadow-2xl mb-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-600 p-0.5 shadow-lg shadow-sky-500/20 flex-shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-indigo-950 rounded-[14px] flex items-center justify-center text-sky-400">
                <LifeBuoy className="w-6 h-6 sm:w-7 sm:h-7 animate-spin-slow" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Centro de Soporte Técnico
                </h1>
                <span className="bg-sky-500/20 text-sky-300 border border-sky-400/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                  Atención 24/7
                </span>
              </div>
              <p className="text-xs sm:text-sm text-indigo-200/80 mt-1 max-w-xl">
                Crea tu ticket de incidencia para resolución inmediata por nuestro equipo financiero y de auditoría de <span className="text-amber-300 font-bold">TÚ SUPERCARTÓN</span>.
              </p>
            </div>
          </div>

          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="self-start md:self-center flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Sorteos</span>
            </button>
          )}
        </div>

        {/* Quick Information Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-6 pt-5 border-t border-indigo-800/60 text-xs">
          <div className="flex items-center gap-2 bg-indigo-900/40 border border-indigo-700/40 rounded-xl px-3 py-2 text-slate-300">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Respuesta Promedio</span>
              <span className="font-bold text-white">{SUPPORT_CONFIG.responseTimeAverage}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-indigo-900/40 border border-indigo-700/40 rounded-xl px-3 py-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Canales Verificados</span>
              <span className="font-bold text-white">Telegram & WhatsApp</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-indigo-900/40 border border-indigo-700/40 rounded-xl px-3 py-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Estado del Servicio</span>
              <span className="font-bold text-emerald-400">100% Operativo</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!createdTicket ? (
          /* =========================================================================
             FORMULARIO: CREAR TICKET DE SOPORTE
             ========================================================================= */
          <motion.div
            key="ticket-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="bg-slate-900/90 rounded-3xl border border-slate-800 p-5 sm:p-8 shadow-xl"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. SELECCIÓN DE TIPO DE PROBLEMA */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-white">
                    1. Selecciona el Tipo de Problema <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Categoría obligatoria</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROBLEM_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedType === type.id;
                    return (
                      <button
                        type="button"
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex items-start gap-3 ${
                          isSelected
                            ? `bg-indigo-950/80 ${type.borderColor} shadow-lg shadow-sky-500/10 ring-1 ring-sky-400/30`
                            : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? `${type.badgeBg} border`
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${isSelected ? type.accentColor : 'text-slate-400'}`} />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-black text-sm block ${
                                isSelected ? 'text-white' : 'text-slate-200'
                              }`}
                            >
                              {type.title}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            {type.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. DATOS DE IDENTIFICACIÓN Y CONTACTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Tu Nombre o Usuario <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej: Juan Pérez o @juan12"
                      required
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Número de Contacto / WhatsApp <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej: 04121234567"
                      required
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 3. NÚMERO DE REFERENCIA / DETALLE OPCIONAL */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    N° de Referencia Bancaria / ID Sorteo (Opcional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Hash className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="Ej: 4892348 o Sorteo #14"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Nivel de Prioridad
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as 'normal' | 'alta')}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all cursor-pointer"
                  >
                    <option value="normal">🟢 Normal</option>
                    <option value="alta">🔴 Alta / Urgente</option>
                  </select>
                </div>
              </div>

              {/* 4. DESCRIPCIÓN BREVE DEL PROBLEMA */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Descripción Breve de la Incidencia <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {description.length}/500 caracteres
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Por favor explica brevemente lo sucedido (ej: Realicé una recarga por Pago Móvil con ref #9832 y aún no se refleja en mi saldo tras 10 minutos)..."
                  required
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all resize-none"
                />
              </div>

              {/* Validation Error Message */}
              {validationError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* SUBMIT ACTION BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-sm py-3.5 px-6 rounded-2xl shadow-lg shadow-sky-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registrando Ticket Oficial...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Crear Ticket de Soporte</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          /* =========================================================================
             PANTALLA DE CONFIRMACIÓN: TICKET CREADO & ENLACES DE SOPORTE
             ========================================================================= */
          <motion.div
            key="ticket-confirmation"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* 1. Success Banner Card */}
            <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-indigo-950 rounded-3xl border border-emerald-500/40 p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11" />
              </div>

              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[11px] font-black uppercase px-3 py-1 rounded-full inline-block mb-2">
                Ticket Registrado con Éxito
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                ¡Tu Solicitud está en Revisión!
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mb-6">
                Hemos asignado tu incidencia a los operadores de turno. Para agilizar la atención personalizada, puedes ingresar directamente a nuestros grupos oficiales de <strong className="text-sky-300">Telegram</strong> y <strong className="text-emerald-300">WhatsApp</strong> con tu código de ticket.
              </p>

              {/* Ticket ID Box with Copy Button */}
              <div className="inline-flex items-center gap-3 bg-slate-900/90 border border-indigo-700/60 rounded-2xl px-5 py-3 shadow-inner">
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Código de Ticket Oficial
                  </span>
                  <span className="font-mono font-black text-xl sm:text-2xl text-amber-300">
                    #{createdTicket.ticketId}
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(createdTicket.ticketId, 'ticket-code')
                  }
                  className="p-2.5 rounded-xl bg-indigo-800/60 hover:bg-indigo-700 text-amber-300 border border-indigo-600 transition-all active:scale-95 cursor-pointer"
                  title="Copiar Código de Ticket"
                >
                  {copiedId === 'ticket-code' ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* 2. ENLACES DIRECTOS A LOS GRUPOS DE SOPORTE (TELEGRAM & WHATSAPP) */}
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-5 sm:p-7 shadow-xl">
              <div className="mb-4">
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-sky-400" />
                  <span>Canales Directos de Atención al Cliente</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Haz clic en el canal de tu preferencia para contactar al equipo de soporte de inmediato:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* A. CANAL / GRUPO TELEGRAM */}
                <div className="bg-gradient-to-br from-sky-950/60 via-slate-900 to-sky-900/40 rounded-2xl border-2 border-sky-500/50 p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-28 h-28 bg-sky-500/10 rounded-full blur-xl pointer-events-none" />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/30">
                          {/* Telegram Icon */}
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-black text-white text-base">
                            Grupo Telegram Oficial
                          </h4>
                          <span className="text-[11px] text-sky-300 font-medium">
                            {SUPPORT_CONFIG.telegramChannelName}
                          </span>
                        </div>
                      </div>
                      <span className="bg-sky-500/20 text-sky-300 border border-sky-400/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                        Comunidad
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                      Únete a nuestro grupo oficial para recibir soporte de los moderadores, consultar estatus de rondas y premios.
                    </p>

                    {/* Placeholder URL Box */}
                    <div className="bg-slate-950/80 border border-sky-800/60 rounded-xl px-3 py-2 text-[11px] text-sky-200 font-mono flex items-center justify-between mb-4">
                      <span className="truncate">{SUPPORT_CONFIG.telegramGroupUrl}</span>
                      <button
                        onClick={() =>
                          handleCopy(
                            SUPPORT_CONFIG.telegramGroupUrl,
                            'telegram-url'
                          )
                        }
                        className="text-slate-400 hover:text-sky-300 ml-2"
                        title="Copiar Enlace"
                      >
                        {copiedId === 'telegram-url' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <a
                    href={SUPPORT_CONFIG.telegramGroupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <span>Abrir Grupo en Telegram</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* B. SOPORTE DIRECTO WHATSAPP */}
                <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-emerald-900/40 rounded-2xl border-2 border-emerald-500/50 p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                          {/* WhatsApp Icon */}
                          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.8 14.16c-.24.68-1.39 1.3-1.92 1.38-.5.08-1.14.12-3.7-0.94-2.18-.9-3.58-3.13-3.69-3.28-.11-.15-.88-1.17-.88-2.23s.55-1.58.75-1.8c.2-.21.43-.27.58-.27.15 0 .29.01.42.01.14.01.32-.05.5.38.18.44.62 1.52.68 1.63.06.11.09.24.02.39-.08.15-.11.24-.23.38-.11.14-.24.31-.34.42-.11.11-.23.23-.1.46.13.22.58.96 1.24 1.55.86.76 1.58 1 1.8 1.11.23.11.36.09.49-.06.14-.15.58-.68.74-.91.15-.24.31-.2.52-.12.22.08 1.38.65 1.62.77.24.12.4.18.46.28.06.11.06.63-.18 1.31z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-black text-white text-base">
                            Atención 1 a 1 WhatsApp
                          </h4>
                          <span className="text-[11px] text-emerald-300 font-medium">
                            {SUPPORT_CONFIG.whatsappNumber}
                          </span>
                        </div>
                      </div>
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                        Atención 1:1
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                      Habla directamente con un operador financiero de guardia con tu mensaje pre-llenado con el ID de ticket.
                    </p>

                    {/* Placeholder URL Box */}
                    <div className="bg-slate-950/80 border border-emerald-800/60 rounded-xl px-3 py-2 text-[11px] text-emerald-200 font-mono flex items-center justify-between mb-4">
                      <span className="truncate">{SUPPORT_CONFIG.whatsappDirectUrl}</span>
                      <button
                        onClick={() =>
                          handleCopy(
                            SUPPORT_CONFIG.whatsappDirectUrl,
                            'whatsapp-url'
                          )
                        }
                        className="text-slate-400 hover:text-emerald-300 ml-2"
                        title="Copiar Enlace"
                      >
                        {copiedId === 'whatsapp-url' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <a
                    href={getWhatsAppLink(createdTicket)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-emerald-950 font-black text-xs py-3 px-4 rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <span>Contactar por WhatsApp</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* 3. RESUMEN COMPLETO DEL TICKET GENERADO */}
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-5 sm:p-7 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Resumen de la Incidencia Registrada</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Tipo de Problema
                  </span>
                  <span className="font-bold text-white">
                    {createdTicket.problemLabel}
                  </span>
                </div>

                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Usuario / Contacto
                  </span>
                  <span className="font-bold text-white">
                    {createdTicket.fullName} ({createdTicket.phone})
                  </span>
                </div>

                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Fecha y Hora
                  </span>
                  <span className="font-bold text-slate-300 font-mono">
                    {createdTicket.createdAt}
                  </span>
                </div>

                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Referencia / Prioridad
                  </span>
                  <span className="font-bold text-amber-300">
                    {createdTicket.referenceNumber || 'N/A'} • {createdTicket.urgency.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 text-xs text-slate-300">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                  Descripción enviada:
                </span>
                <p className="leading-relaxed whitespace-pre-wrap">
                  {createdTicket.description}
                </p>
              </div>

              {/* Action Buttons: Create another or return */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-800">
                <button
                  onClick={handleResetForm}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer"
                >
                  ← Crear Otro Ticket
                </button>

                {onBackToHome && (
                  <button
                    onClick={onBackToHome}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-950 font-black text-xs shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    Volver a Sorteos Oficiales
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HISTORIAL LOCAL DE TICKETS (Collapsible/Visible) */}
      {submittedTickets.length > 0 && !createdTicket && (
        <div className="mt-8 bg-slate-900/60 rounded-3xl border border-slate-800/80 p-5 shadow-lg">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tus Tickets Enviados Recientemente en esta Sesión</span>
          </h4>

          <div className="space-y-2">
            {submittedTickets.map((t) => (
              <div
                key={t.ticketId}
                className="flex items-center justify-between bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-amber-300">
                    #{t.ticketId}
                  </span>
                  <div>
                    <span className="font-bold text-white">{t.problemLabel}</span>
                    <span className="text-[10px] text-slate-400 block truncate max-w-xs sm:max-w-md">
                      {t.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    {t.createdAt}
                  </span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Recibido
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
