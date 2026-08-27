import React, { useState, useRef, useEffect } from 'react';
import {
  Headphones,
  MessageSquare,
  Send,
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  FileImage,
  Sparkles,
  Shield,
  Phone,
  HelpCircle,
  ChevronRight,
  LifeBuoy,
  MessageCircle,
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useGame } from '../../context/GameContext';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  category: string;
  priority: 'Baja' | 'Normal' | 'Alta' | 'Urgente';
  subject: string;
  description: string;
  imageUrl?: string;
  imageName?: string;
  status: 'Abierto' | 'En Revisión' | 'Resuelto' | 'Cerrado';
  createdAt: string;
}

const TICKET_CATEGORIES = [
  { id: 'recarga', label: '💳 Problema con Recarga / Pago Móvil' },
  { id: 'retiro', label: '💸 Retiro de Ganancias Pendiente' },
  { id: 'cartones', label: '🎟️ Compra de Cartones / Jugadas' },
  { id: 'transmision', label: '📺 Transmisión en Vivo / Sorteo' },
  { id: 'cuenta', label: '🔐 Acceso, Contraseña o Cuenta' },
  { id: 'otro', label: '📝 Sugerencia o Reclamo General' },
];

const FAQS = [
  {
    q: '¿Cuánto tarda en acreditarse mi recarga por Pago Móvil?',
    a: 'Las recargas se procesan de forma inmediata o en un lapso máximo de 5 a 10 minutos una vez validada la referencia bancaria.',
  },
  {
    q: '¿Cómo solicito el cobro de mis premios?',
    a: 'Ve a la sección "Billetera" > "Retirar Fondos", ingresa tus datos bancarios de Pago Móvil y tu solicitud será procesada por nuestro equipo financiero.',
  },
  {
    q: '¿Qué hago si se interrumpe mi conexión durante el sorteo en vivo?',
    a: 'No te preocupes: tus cartones ya están registrados en el sistema central. Si tu cartón resulta ganador, el premio se acreditará automáticamente a tu saldo.',
  },
];

export const CustomerSupportWidget: React.FC = () => {
  const { currentUser, isAuthenticated } = useGame();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'channels' | 'history'>('form');

  // Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [category, setCategory] = useState(TICKET_CATEGORIES[0].id);
  const [priority, setPriority] = useState<'Baja' | 'Normal' | 'Alta' | 'Urgente'>('Normal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // Image Attachment State
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [imageSizeKb, setImageSizeKb] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status & Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<SupportTicket | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedTicketNumber, setCopiedTicketNumber] = useState(false);

  // Saved Tickets in LocalStorage
  const [savedTickets, setSavedTickets] = useState<SupportTicket[]>(() => {
    try {
      const stored = localStorage.getItem('tusupercarton_support_tickets');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Keep name & email in sync when user logs in
  useEffect(() => {
    if (currentUser?.name && !name) setName(currentUser.name);
    if (currentUser?.email && !email) setEmail(currentUser.email);
    if (currentUser?.phone && !phone) setPhone(currentUser.phone);
  }, [currentUser]);

  // Handle File Selection
  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Solo se permiten archivos de imagen (.jpg, .png, .jpeg, .webp)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('La imagen no debe superar los 5 MB de tamaño.');
      return;
    }

    setErrorMessage(null);
    setAttachedImageName(file.name);
    setImageSizeKb(Math.round(file.size / 1024));

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAttachedImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const removeAttachedImage = () => {
    setAttachedImage(null);
    setAttachedImageName(null);
    setImageSizeKb(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Ticket to Supabase & Backend
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo o usuario.');
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setErrorMessage('Por favor proporciona al menos un medio de contacto (correo o teléfono/WhatsApp).');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Por favor ingresa un asunto breve para tu reclamo.');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setErrorMessage('Por favor describe tu reclamo con mayor detalle (mínimo 10 caracteres).');
      return;
    }

    setIsSubmitting(true);

    const ticketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const newTicket: SupportTicket = {
      id: `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ticketNumber,
      userName: name.trim(),
      userEmail: email.trim(),
      userPhone: phone.trim(),
      category: TICKET_CATEGORIES.find((c) => c.id === category)?.label || category,
      priority,
      subject: subject.trim(),
      description: description.trim(),
      imageUrl: attachedImage || undefined,
      imageName: attachedImageName || undefined,
      status: 'Abierto',
      createdAt: new Date().toISOString(),
    };

    let supabaseSuccess = false;

    // 1. Envío directo a Supabase
    try {
      if (supabase.isConfigured) {
        const payload = {
          ticket_number: newTicket.ticketNumber,
          user_name: newTicket.userName,
          user_email: newTicket.userEmail,
          user_phone: newTicket.userPhone,
          category: newTicket.category,
          priority: newTicket.priority,
          subject: newTicket.subject,
          description: newTicket.description,
          image_url: newTicket.imageUrl,
          image_name: newTicket.imageName,
          status: 'open',
          created_at: newTicket.createdAt,
        };

        // Guardar en tabla support_tickets o reclamos
        const { error: err1 } = await supabase.from('support_tickets').insert([payload]);
        if (!err1) {
          supabaseSuccess = true;
        } else {
          // Intentar en reclamos
          const { error: err2 } = await supabase.from('reclamos').insert([payload]);
          if (!err2) supabaseSuccess = true;
        }
      }
    } catch (err) {
      console.warn('[CustomerSupport] Error al insertar en Supabase:', err);
    }

    // 2. Envío al Backend API para redundancia y notificación a operadores
    try {
      await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket: newTicket,
          supabaseSynced: supabaseSuccess,
        }),
      });
    } catch (apiErr) {
      console.warn('[CustomerSupport] Error notificando al backend:', apiErr);
    }

    // 3. Guardar en Storage Local
    const updatedTickets = [newTicket, ...savedTickets];
    setSavedTickets(updatedTickets);
    try {
      localStorage.setItem('tusupercarton_support_tickets', JSON.stringify(updatedTickets));
    } catch (e) {}

    setIsSubmitting(false);
    setSubmittedTicket(newTicket);

    // Limpiar formulario para futuros tickets
    setSubject('');
    setDescription('');
    removeAttachedImage();
  };

  const copyTicketCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTicketNumber(true);
    setTimeout(() => setCopiedTicketNumber(false), 2000);
  };

  // Official links
  const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/TuSuperCartonOficial';
  const WHATSAPP_DIRECT_SUPPORT = `https://api.whatsapp.com/send?phone=584120000000&text=${encodeURIComponent(
    submittedTicket
      ? `Hola soporte de Tu SúperCartón, abrí el ticket #${submittedTicket.ticketNumber} sobre "${submittedTicket.subject}".`
      : 'Hola equipo de atención al cliente de Tu SúperCartón, necesito asistencia.'
  )}`;
  const TELEGRAM_GROUP_URL = 'https://t.me/tusupercarton';

  return (
    <>
      {/* ========================================================= */}
      {/* BOTÓN FLOTANTE INFERIOR (Floating Action Button)          */}
      {/* ========================================================= */}
      <div
        id="customer-support-fab-container"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3"
      >
        <button
          id="customer-support-open-button"
          onClick={() => setIsOpen(true)}
          style={{ height: '39.9688px', width: '124.98px' }}
          className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 font-bold px-3 py-2 rounded-full shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all duration-200 border border-amber-300/60 overflow-hidden"
          aria-label="Abrir Atención al Cliente y Soporte"
        >
          {/* Indicador de estado en línea */}
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-950"></span>
          </span>

          <Headphones className="w-4 h-4 text-slate-950 flex-shrink-0 transition-transform group-hover:rotate-12" />

          <span className="text-xs font-extrabold tracking-tight truncate whitespace-nowrap">
            Soporte
          </span>

          {/* Badge de Soporte 24/7 */}
          <span className="bg-slate-950 text-amber-300 text-[9px] font-black px-1.5 py-0.2 rounded-full tracking-wider uppercase border border-amber-400/30 flex-shrink-0">
            24/7
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* MODAL DE ATENCIÓN AL CLIENTE Y TICKETS                    */}
      {/* ========================================================= */}
      {isOpen && (
        <div
          id="customer-support-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            id="customer-support-modal-card"
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 p-4 sm:p-5 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                  <LifeBuoy className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                      Centro de Atención al Cliente
                    </h2>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      En Línea
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Tu SúperCartón • Soporte oficial, reclamos y comunidad
                  </p>
                </div>
              </div>

              <button
                id="customer-support-modal-close-btn"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Accesos Rápidos a Canales Oficiales (WhatsApp y Telegram) */}
            <div className="bg-slate-950/80 px-4 sm:px-6 py-3 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Enlace WhatsApp */}
              <a
                id="whatsapp-channel-button"
                href={WHATSAPP_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-600/30 hover:border-emerald-500/60 transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      Grupo WhatsApp
                      <ExternalLink className="w-3 h-3 text-emerald-400 opacity-80 group-hover:opacity-100" />
                    </div>
                    <div className="text-[11px] text-emerald-300/80">
                      Comunidad y soporte en vivo
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </a>

              {/* Enlace Telegram */}
              <a
                id="telegram-channel-button"
                href={TELEGRAM_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-sky-950/40 hover:bg-sky-900/50 border border-sky-600/30 hover:border-sky-500/60 transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500 text-slate-950 flex items-center justify-center font-bold">
                    <Send className="w-4 h-4 -rotate-45 ml-0.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      Canal Telegram
                      <ExternalLink className="w-3 h-3 text-sky-400 opacity-80 group-hover:opacity-100" />
                    </div>
                    <div className="text-[11px] text-sky-300/80">
                      Sorteos y avisos oficiales
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>

            {/* Pestañas de Navegación del Modal */}
            <div className="flex border-b border-slate-800 bg-slate-900/90 px-4 sm:px-6">
              <button
                id="tab-open-ticket"
                onClick={() => {
                  setActiveTab('form');
                  setSubmittedTicket(null);
                }}
                className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'form'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Abrir Ticket / Reclamo
              </button>

              <button
                id="tab-channels-faq"
                onClick={() => setActiveTab('channels')}
                className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'channels'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                Preguntas Frecuentes
              </button>

              <button
                id="tab-history"
                onClick={() => setActiveTab('history')}
                className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                Mis Tickets ({savedTickets.length})
              </button>
            </div>

            {/* Cuerpo del Modal con Scroll */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* TAB 1: FORMULARIO DE TICKET / RECLAMO */}
              {activeTab === 'form' && (
                <>
                  {submittedTicket ? (
                    // Vista de Confirmación de Ticket Creado
                    <div
                      id="ticket-success-confirmation"
                      className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-5 sm:p-6 text-center space-y-4 animate-in zoom-in-95 duration-200"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-white">
                          ¡Reclamo Registrado en Supabase!
                        </h3>
                        <p className="text-xs text-slate-300 mt-1">
                          Tu solicitud ha sido radicada correctamente con el siguiente número:
                        </p>
                      </div>

                      {/* Tarjeta de Radicado */}
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between max-w-sm mx-auto">
                        <div className="text-left">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                            Número de Radicado
                          </span>
                          <span className="text-lg font-mono font-black text-amber-400">
                            #{submittedTicket.ticketNumber}
                          </span>
                        </div>
                        <button
                          id="copy-ticket-btn"
                          onClick={() => copyTicketCode(submittedTicket.ticketNumber)}
                          className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                        >
                          {copiedTicketNumber ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copiar
                            </>
                          )}
                        </button>
                      </div>

                      <div className="text-xs text-slate-400 space-y-1">
                        <p>
                          <strong>Categoría:</strong> {submittedTicket.category}
                        </p>
                        <p>
                          <strong>Tiempo estimado de atención:</strong> Menos de 15 minutos en horario activo.
                        </p>
                      </div>

                      {/* Acciones directas post-envío */}
                      <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                        <a
                          id="whatsapp-followup-btn"
                          href={WHATSAPP_DIRECT_SUPPORT}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-md"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Consultar por WhatsApp con este Ticket
                        </a>

                        <button
                          id="create-another-ticket-btn"
                          onClick={() => setSubmittedTicket(null)}
                          className="inline-flex items-center justify-center text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl transition-colors border border-slate-700"
                        >
                          Abrir otro Ticket
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Formulario de Envío
                    <form onSubmit={handleSubmitTicket} className="space-y-4">
                      {errorMessage && (
                        <div
                          id="ticket-error-alert"
                          className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                      )}

                      {/* Fila 1: Nombre y Correo */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="ticket-user-name"
                            className="block text-xs font-bold text-slate-300 mb-1"
                          >
                            Nombre Completo / Usuario *
                          </label>
                          <input
                            id="ticket-user-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Carlos Pérez"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="ticket-user-email"
                            className="block text-xs font-bold text-slate-300 mb-1"
                          >
                            Correo Electrónico
                          </label>
                          <input
                            id="ticket-user-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Ej. usuario@correo.com"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Fila 2: Teléfono / WhatsApp y Categoría */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="ticket-user-phone"
                            className="block text-xs font-bold text-slate-300 mb-1"
                          >
                            Teléfono / WhatsApp *
                          </label>
                          <input
                            id="ticket-user-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Ej. 0412-1234567"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="ticket-category"
                            className="block text-xs font-bold text-slate-300 mb-1"
                          >
                            Categoría del Reclamo *
                          </label>
                          <select
                            id="ticket-category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                          >
                            {TICKET_CATEGORIES.map((cat) => (
                              <option key={cat.id} value={cat.id} className="bg-slate-900">
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Fila 3: Asunto y Prioridad */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label
                            htmlFor="ticket-subject"
                            className="block text-xs font-bold text-slate-300 mb-1"
                          >
                            Asunto del Reclamo *
                          </label>
                          <input
                            id="ticket-subject"
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Ej. Pago Móvil no acreditado Ref: 123456"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="ticket-priority"
                            className="block text-xs font-bold text-slate-300 mb-1"
                          >
                            Prioridad
                          </label>
                          <select
                            id="ticket-priority"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as any)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                          >
                            <option value="Baja">Baja</option>
                            <option value="Normal">Normal</option>
                            <option value="Alta">Alta</option>
                            <option value="Urgente">Urgente</option>
                          </select>
                        </div>
                      </div>

                      {/* Descripción del Reclamo */}
                      <div>
                        <label
                          htmlFor="ticket-description"
                          className="block text-xs font-bold text-slate-300 mb-1"
                        >
                          Descripción Detallada del Reclamo / Mensaje *
                        </label>
                        <textarea
                          id="ticket-description"
                          rows={4}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Indica todos los detalles posibles: número de referencia bancaria, hora del movimiento, monto en Bs o $, número de cartón, etc."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors resize-none"
                          required
                        />
                      </div>

                      {/* Adjuntar Imagen / Comprobante */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Adjuntar Captura de Pantalla / Comprobante (Opcional)
                        </label>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileChange(e.target.files[0]);
                            }
                          }}
                        />

                        {attachedImage ? (
                          <div
                            id="attached-image-preview"
                            className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <img
                                src={attachedImage}
                                alt="Comprobante adjunto"
                                className="w-12 h-12 rounded-lg object-cover border border-slate-700 flex-shrink-0"
                              />
                              <div className="truncate">
                                <div className="text-xs font-bold text-white truncate">
                                  {attachedImageName}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {imageSizeKb} KB • Imagen lista para enviar a Supabase
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={removeAttachedImage}
                              className="text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-950/40 transition-colors"
                              title="Remover imagen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                              isDragging
                                ? 'border-amber-400 bg-amber-950/20'
                                : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                            }`}
                          >
                            <UploadCloud className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                            <p className="text-xs text-slate-300 font-medium">
                              Arrastra aquí tu captura o{' '}
                              <span className="text-amber-400 underline font-bold">
                                haz clic para buscar
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Formatos permitidos: JPG, PNG, WEBP (Máx 5MB)
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Botón de Envío */}
                      <button
                        id="submit-ticket-button"
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                            Enviando ticket a Supabase...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Enviar Reclamo a Atención al Cliente
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </>
              )}

              {/* TAB 2: PREGUNTAS FRECUENTES Y CANALES */}
              {activeTab === 'channels' && (
                <div className="space-y-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                    <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider mb-2">
                      Horarios de Atención
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Nuestro equipo de soporte atiende de lunes a domingo de{' '}
                      <strong>8:00 AM a 11:00 PM (Hora de Venezuela)</strong>. Fuera de ese horario, los
                      tickets radicados serán atendidos a primera hora del día siguiente.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                      Preguntas Frecuentes
                    </h3>
                    {FAQS.map((faq, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/70 border border-slate-850 rounded-xl p-3.5 space-y-1.5"
                      >
                        <div className="text-xs font-bold text-white flex items-start gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                          <span>{faq.q}</span>
                        </div>
                        <div className="text-xs text-slate-400 pl-5.5 leading-relaxed">
                          {faq.a}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: HISTORIAL DE TICKETS DEL USUARIO */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  {savedTickets.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      No tienes tickets o reclamos radicados en este dispositivo.
                    </div>
                  ) : (
                    savedTickets.map((t) => (
                      <div
                        key={t.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-amber-400">
                            #{t.ticketNumber}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                            {t.status}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-white">{t.subject}</div>

                        <p className="text-[11px] text-slate-400 line-clamp-2">{t.description}</p>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                          <span>{t.category}</span>
                          <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="bg-slate-950 px-4 sm:px-6 py-3 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Soporte Seguro y Auditoría de Reclamos</span>
              </div>
              <span className="text-slate-600">v2.4</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
