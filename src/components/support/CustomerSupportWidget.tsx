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
  Shield,
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
  const { currentUser } = useGame();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'channels' | 'history'>('form');

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [category, setCategory] = useState(TICKET_CATEGORIES[0].id);
  const [priority, setPriority] = useState<'Baja' | 'Normal' | 'Alta' | 'Urgente'>('Normal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedImageName, setAttachedImageName] = useState<string | null>(null);
  const [imageSizeKb, setImageSizeKb] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<SupportTicket | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedTicketNumber, setCopiedTicketNumber] = useState(false);

  const [savedTickets, setSavedTickets] = useState<SupportTicket[]>(() => {
    try {
      const stored = localStorage.getItem('tusupercarton_support_tickets');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (currentUser?.name && !name) setName(currentUser.name);
    if (currentUser?.email && !email) setEmail(currentUser.email);
    if (currentUser?.phone && !phone) setPhone(currentUser.phone);
  }, [currentUser]);

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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
    let supabaseError: string | null = null;

    // INSERT DIRECTO A SUPABASE (solo tabla 'reclamos')
    try {
      if (supabase.isConfigured) {
        const payload = {
          user_id: currentUser?.id || null,
          user_name: newTicket.userName,
          user_email: newTicket.userEmail,
          user_phone: newTicket.userPhone,
          category: newTicket.category,
          priority: newTicket.priority.toLowerCase(),
          subject: newTicket.subject,
          description: newTicket.description,
          image_url: newTicket.imageUrl || null,
          image_name: newTicket.imageName || null,
          status: 'open',
        };

        const { data, error } = await supabase
          .from('reclamos')
          .insert([payload])
          .select()
          .single();

        if (error) {
          supabaseError = error.message || 'Error al guardar el reclamo';
          console.warn('[CustomerSupport] Supabase error:', error);
        } else if (data) {
          supabaseSuccess = true;
          if (data.id) {
            newTicket.ticketNumber = String(data.id).slice(0, 8).toUpperCase();
          }
        }
      }
    } catch (err: any) {
      console.warn('[CustomerSupport] Error al insertar en Supabase:', err);
      supabaseError = err?.message || 'Error de conexión';
    }

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

    const updatedTickets = [newTicket, ...savedTickets];
    setSavedTickets(updatedTickets);
    try {
      localStorage.setItem('tusupercarton_support_tickets', JSON.stringify(updatedTickets));
    } catch (e) {}

    setIsSubmitting(false);

    if (!supabaseSuccess && supabaseError) {
      setErrorMessage(`No se pudo guardar el reclamo: ${supabaseError}. Intenta de nuevo.`);
      return;
    }

    setSubmittedTicket(newTicket);
    setSubject('');
    setDescription('');
    removeAttachedImage();
  };

  const copyTicketCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTicketNumber(true);
    setTimeout(() => setCopiedTicketNumber(false), 2000);
  };

  const WHATSAPP_DIRECT_SUPPORT = `https://api.whatsapp.com/send?phone=584120000000&text=${encodeURIComponent(
    submittedTicket
      ? `Hola soporte de Tu SúperCartón, abrí el ticket #${submittedTicket.ticketNumber} sobre "${submittedTicket.subject}".`
      : 'Hola equipo de atención al cliente de Tu SúperCartón, necesito asistencia.'
  )}`;

  return (
    <>
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
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-950"></span>
          </span>
          <Headphones className="w-4 h-4 text-slate-950 flex-shrink-0 transition-transform group-hover:rotate-12" />
          <span className="text-xs font-extrabold tracking-tight truncate whitespace-nowrap">Soporte</span>
          <span className="bg-slate-950 text-amber-300 text-[9px] font-black px-1.5 py-0.2 rounded-full tracking-wider uppercase border border-amber-400/30 flex-shrink-0">24/7</span>
        </button>
      </div>

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

            <div className="bg-slate-950/80 px-4 sm:px-6 py-3 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                id="whatsapp-channel-button"
                href="https://chat.whatsapp.com/BVlYWF58gNu82nr4VDVVPf?s=cl&p=a&mlu=4"
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

              <a
                id="telegram-channel-button"
                href="https://t.me/+qg2dckERI3k0YjM5"
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
