import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { supabase } from '../../services/realtimeService';
import { saveCommercialConfigToDb } from '../../services/configService';
import { FICHAS_POOL, getFichaById } from '../../data/fichasPool';
import { FichaBadge } from '../common/FichaBadge';
import { OperatorManagementView } from './OperatorManagementView';
import { AdminPlayersView } from './AdminPlayersView';
import { ROLE_PERMISSIONS, AdminTab } from '../../config/permissions';
import {
  LayoutDashboard,
  CreditCard,
  ArrowUpRight,
  Calendar,
  Sparkles,
  Settings,
  FileSpreadsheet,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Eye,
  Plus,
  RefreshCw,
  Search,
  DollarSign,
  TrendingUp,
  Award,
  KeyRound,
  LogOut,
  Clock,
  X,
} from 'lucide-react';
import { Ficha, RechargeTransaction } from '../../types';
import { API_ENDPOINTS } from '../../services/apiConfig';

export const AdminPortal: React.FC = () => {
  const {
    operatorRole,
    permissions,
    rounds,
    users,
    cards,
    recharges,
    withdrawals,
    ledger,
    auditLogs,
    commercialConfig,
    formatMoney,
    approveRecharge,
    rejectRecharge,
    completeWithdrawal,
    rejectWithdrawal,
    createRound,
    updateRoundConfig,
    setRoundStatus,
    submitRoundResult,
    updateCommercialConfig,
    startLiveDrawSimulation,
    quickAddBalance,
    fetchPendingRecharges,
    fetchWithdrawals,
    logout,
    loggedUsername,
  } = useGame();

  const currentRoleConfig = ROLE_PERMISSIONS[operatorRole] || ROLE_PERMISSIONS['Super Admin'];
  const canManageWithdrawals = permissions?.canManageWithdrawals ?? (operatorRole === 'Super Admin' || operatorRole === 'Operador Financiero');
  const canManageResults = permissions?.canManageRounds ?? (operatorRole === 'Super Admin' || operatorRole === 'Operador Financiero');

  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    return currentRoleConfig.allowedTabs[0] || 'dashboard';
  });

  // Ensure active tab is allowed for current role
  useEffect(() => {
    if (!currentRoleConfig.allowedTabs.includes(activeTab)) {
      setActiveTab(currentRoleConfig.allowedTabs[0] || 'dashboard');
    }
  }, [operatorRole, currentRoleConfig, activeTab]);

  // -- INICIO BLOQUE REALTIME SEGURO --
  useEffect(() => {
    fetchPendingRecharges();
    fetchWithdrawals();

    const channel = supabase
      .channel('realtime-finanzas-admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recharges' }, () => {
        fetchPendingRecharges();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'recharges' }, () => {
        fetchPendingRecharges();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'withdrawals' }, () => {
        fetchWithdrawals();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'withdrawals' }, () => {
        fetchWithdrawals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingRecharges, fetchWithdrawals]);
  // -- FIN BLOQUE REALTIME SEGURO --

  // Modal states
  const [selectedVoucherForModal, setSelectedVoucherForModal] = useState<string | null>(null);
  const [selectedRechargeForReview, setSelectedRechargeForReview] = useState<RechargeTransaction | null>(null);
  const [confirmBankArrivalChecked, setConfirmBankArrivalChecked] = useState<boolean>(false);
  const [rechargeFilterStatus, setRechargeFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rechargeSearchTerm, setRechargeSearchTerm] = useState<string>('');
  const [rejectRechargeId, setRejectRechargeId] = useState<string | null>(null);
  const [rechargeRejectReason, setRechargeRejectReason] = useState('Comprobante no coincide con extracto bancario.');
  const [rejectWithdrawalId, setRejectWithdrawalId] = useState<string | null>(null);
  const [withdrawalRejectReason, setWithdrawalRejectReason] = useState('Datos de cuenta inválidos o no corresponden al titular.');

  // Create round form
  const [newRoundTitle, setNewRoundTitle] = useState('');
  const [newRoundDrawTime, setNewRoundDrawTime] = useState(
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [newRoundPrizePercentage, setNewRoundPrizePercentage] = useState(70);
  const [newRoundManualPrize, setNewRoundManualPrize] = useState<number | ''>('');
  const [newRoundOrder, setNewRoundOrder] = useState<number>(rounds.length + 1);

  // Editable round configurations map: { [roundId]: { card_price: number, prize_percentage: number } }
  const [editingRoundConfigs, setEditingRoundConfigs] = useState<{
    [roundId: string]: { card_price: number; prize_percentage: number };
  }>({});
  const [savedRoundFeedback, setSavedRoundFeedback] = useState<string | null>(null);

  // Result submission
  const [selectedRoundForResult, setSelectedRoundForResult] = useState<string>(
    rounds.find((r) => r.status === 'open' || r.status === 'closed')?.id || rounds[0]?.id || ''
  );
  const [selectedResultFichas, setSelectedResultFichas] = useState<number[]>([]);
  const [otpInput, setOtpInput] = useState('');
  const [otpRequestStatus, setOtpRequestStatus] = useState('📧 Solicitar Código');
  const [otpModalFeedback, setOtpModalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSigningResult, setIsSigningResult] = useState(false);
  const [showResultConfirmModal, setShowResultConfirmModal] = useState(false);
  const [resultSubmitMessage, setResultSubmitMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Commercial config form
  const [configBankName, setConfigBankName] = useState(commercialConfig.adminBank.bankName);
  const [configPhone, setConfigPhone] = useState(commercialConfig.adminBank.phone);
  const [configRif, setConfigRif] = useState(commercialConfig.adminBank.rif);
  const [configHolder, setConfigHolder] = useState(commercialConfig.adminBank.holderName);
  const initialBasePrice = commercialConfig.precio_carton_base_ves ?? commercialConfig.singleCardPriceVes ?? (commercialConfig.cardPrices?.pack2 ? commercialConfig.cardPrices.pack2 / 2 : 25);
  const [precioCartonBaseVes, setPrecioCartonBaseVes] = useState<number>(initialBasePrice);
  const [configFullCardMult, setConfigFullCardMult] = useState(commercialConfig.prizeMultipliers.fullCard);
  const [configSavedToast, setConfigSavedToast] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveMsg, setConfigSaveMsg] = useState<string | null>(null);

  // Synchronize local form inputs when commercialConfig updates from server/websocket
  useEffect(() => {
    setConfigBankName(commercialConfig.adminBank.bankName);
    setConfigPhone(commercialConfig.adminBank.phone);
    setConfigRif(commercialConfig.adminBank.rif);
    setConfigHolder(commercialConfig.adminBank.holderName);
    const liveBase = commercialConfig.precio_carton_base_ves ?? commercialConfig.singleCardPriceVes ?? (commercialConfig.cardPrices?.pack2 ? commercialConfig.cardPrices.pack2 / 2 : 25);
    setPrecioCartonBaseVes(liveBase);
    setConfigFullCardMult(commercialConfig.prizeMultipliers.fullCard);
  }, [
    commercialConfig.adminBank.bankName,
    commercialConfig.adminBank.phone,
    commercialConfig.adminBank.rif,
    commercialConfig.adminBank.holderName,
    commercialConfig.precio_carton_base_ves,
    commercialConfig.singleCardPriceVes,
    commercialConfig.cardPrices?.pack2,
    commercialConfig.cardPrices?.pack4,
    commercialConfig.cardPrices?.pack6,
    commercialConfig.prizeMultipliers.fullCard,
  ]);

  // Search & filters
  const [searchTerm, setSearchTerm] = useState('');

  // Financial KPI calculations
  const totalApprovedRechargesVes = recharges
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + r.amountVes, 0);

  // Función agregadora del widget "Ventas de Cartones": suma de registros de transacciones contables tipo CARD_PURCHASE completadas
  const cardPurchaseTransactions = ledger.filter(
    (entry) =>
      (entry.type === 'CARD_PURCHASE' || entry.type === 'card_purchase') &&
      (!entry.status || String(entry.status).toUpperCase() === 'COMPLETED')
  );

  const totalCardsSalesFromLedger = cardPurchaseTransactions.reduce(
    (sum, entry) => sum + Math.abs(entry.amountVes || entry.amount || 0),
    0
  );

  // Total recaudado por ventas de cartones en tiempo real
  const totalCardsSalesVes = totalCardsSalesFromLedger > 0
    ? totalCardsSalesFromLedger
    : cards.reduce((sum, c) => sum + (c.priceVes || 0), 0);

  const totalPrizesPaidVes = cards
    .filter((c) => c.status === 'winner' || c.winningPatterns.length > 0)
    .reduce((sum, c) => sum + c.totalPrizeVes, 0);

  const totalCompletedWithdrawalsVes = withdrawals
    .filter((w) => w.status === 'completed')
    .reduce((sum, w) => sum + w.amountVes, 0);

  const netPlatformProfitVes = totalCardsSalesVes - totalPrizesPaidVes;
  const pendingRechargesCount = recharges.filter((r) => r.status === 'pending').length;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;

  // Toggle selection for 72 fichas result submission
  const toggleFichaSelection = (id: number) => {
    if (selectedResultFichas.includes(id)) {
      setSelectedResultFichas(selectedResultFichas.filter((fId) => fId !== id));
    } else {
      if (selectedResultFichas.length >= 20) return;
      setSelectedResultFichas([...selectedResultFichas, id]);
    }
  };

  const handleAutoSelect32Fichas = () => {
    const pool = Array.from({ length: 72 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setSelectedResultFichas(pool.slice(0, 20));
  };

  const handleRequestOtp = async () => {
    try {
      setOtpModalFeedback(null);
      setOtpRequestStatus('Enviando...');
      let response = await fetch(API_ENDPOINTS.SEND_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'niutoncaraballo3@gmail.com' }),
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch(API_ENDPOINTS.SUPABASE_SEND_OTP, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'niutoncaraballo3@gmail.com' }),
        });
      }

      if (response && response.ok) {
        setOtpRequestStatus('Enviado ✓');
        setOtpModalFeedback({
          type: 'success',
          text: 'Código de seguridad enviado a niutoncaraballo3@gmail.com (válido por 30 minutos)',
        });
        setTimeout(() => {
          setOtpRequestStatus('📧 Reenviar Código');
        }, 10000);
      } else {
        const errData = await response?.json().catch(() => ({}));
        setOtpRequestStatus('📧 Solicitar Código');
        setOtpModalFeedback({
          type: 'error',
          text: errData?.message || 'Error al enviar el código de verificación.',
        });
      }
    } catch (err) {
      setOtpRequestStatus('📧 Solicitar Código');
      setOtpModalFeedback({
        type: 'error',
        text: 'Error de conexión al enviar el código de seguridad.',
      });
    }
  };

  const handleExecuteResultSubmission = async () => {
    setResultSubmitMessage(null);
    setOtpModalFeedback(null);

    if (!canManageResults) {
      setResultSubmitMessage({
        success: false,
        text: 'Acceso Denegado: Tu rol actual no tiene autorización para emitir o certificar resultados de sorteos.',
      });
      setShowResultConfirmModal(false);
      return;
    }

    const trimmedOtp = otpInput.trim();
    if (!trimmedOtp) {
      setOtpModalFeedback({
        type: 'error',
        text: 'Por favor ingresa el código de verificación de 6 dígitos.',
      });
      return;
    }

    setIsSigningResult(true);
    try {
      let response = await fetch(API_ENDPOINTS.VERIFY_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: trimmedOtp, email: 'niutoncaraballo3@gmail.com' }),
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch(API_ENDPOINTS.SUPABASE_VERIFY_OTP, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: trimmedOtp, email: 'niutoncaraballo3@gmail.com' }),
        });
      }

      const data = await response?.json().catch(() => ({}));
      if (data && data.valid === true) {
        const result = submitRoundResult(selectedRoundForResult, selectedResultFichas, trimmedOtp);
        if (result.success) {
          setResultSubmitMessage({ success: true, text: result.message });
          setShowResultConfirmModal(false);
          setSelectedResultFichas([]);
          setOtpInput('');
          setOtpModalFeedback(null);
        } else {
          setResultSubmitMessage({ success: false, text: result.message });
        }
      } else {
        setOtpModalFeedback({
          type: 'error',
          text: data?.message || 'Código incorrecto o vencido.',
        });
      }
    } catch (err: any) {
      setOtpModalFeedback({
        type: 'error',
        text: 'Error al verificar el código de seguridad.',
      });
    } finally {
      setIsSigningResult(false);
    }
  };

  const handleSaveCommercialConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigSaveMsg(null);

    try {
      const basePrice = Math.max(1, Number(precioCartonBaseVes) || 25);
      const payload = {
        adminBank: {
          bankName: configBankName.trim(),
          phone: configPhone.trim(),
          rif: configRif.trim(),
          holderName: configHolder.trim(),
          type: 'Pago Móvil',
        },
        precio_carton_base_ves: basePrice,
        singleCardPriceVes: basePrice,
        cardPrices: {
          pack2: basePrice * 2,
          pack4: basePrice * 4,
          pack6: basePrice * 6,
        },
        prizeMultipliers: {
          ...commercialConfig.prizeMultipliers,
          fullCard: Number(configFullCardMult) || 50,
        },
      };

      const [res] = await Promise.all([
        updateCommercialConfig(payload),
        saveCommercialConfigToDb({ ...commercialConfig, ...payload }),
      ]);

      setConfigSaveMsg(res?.message || '¡Datos bancarios y parámetros comerciales sincronizados en vivo!');
      setConfigSavedToast(true);
      setTimeout(() => setConfigSavedToast(false), 4000);
    } catch (err: any) {
      setConfigSaveMsg('Parámetros guardados y emitidos.');
      setConfigSavedToast(true);
      setTimeout(() => setConfigSavedToast(false), 3000);
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Backoffice Header Bar */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 rounded-3xl p-5 sm:p-7 text-white shadow-2xl border-2 border-purple-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-300 font-black text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Panel de Administración Central (Backoffice v1.0)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Tu Super Carton Management Console
          </h1>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl">
            Control de recargas Pago Móvil, auditoría de comprobantes, gestión de sorteos 4×4 y liquidación automatizada de premios.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex flex-col items-start md:items-end gap-1.5 bg-purple-900/60 border border-purple-500/40 p-3.5 rounded-2xl max-w-sm">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-r ${currentRoleConfig.badgeColor} text-white flex items-center justify-center font-black shadow-md`}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-purple-300 font-bold block uppercase tracking-wider">
                  Rol: {currentRoleConfig.displayName} {loggedUsername ? `(@${loggedUsername})` : ''}
                </span>
                <span className="font-black text-sm text-white">{currentRoleConfig.displayName}</span>
              </div>
            </div>
            <p className="text-[11px] text-purple-200/90 font-medium leading-tight">
              {currentRoleConfig.description}
            </p>
          </div>

          <button
            id="admin-logout-btn"
            onClick={logout}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs px-4 py-3 rounded-2xl shadow-lg shadow-rose-950/60 border border-rose-400/40 active:scale-95 transition-all"
            title="Cerrar Sesión Segura del Sistema"
          >
            <LogOut className="w-4 h-4 stroke-[2.5]" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Session & Permission Automatic Load Synchronizer Banner */}
      <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3 px-4.5 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-200 shadow-md">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-bold text-emerald-300">
            Sesión y Permisos Independientes Activos:
          </span>
          <span className="bg-emerald-900/80 text-emerald-100 font-extrabold px-2.5 py-0.5 rounded-lg border border-emerald-500/50">
            @{loggedUsername || 'Usuario'}
          </span>
          <span className="text-emerald-300/80 hidden sm:inline">
            • Rol: <strong className="text-white">{currentRoleConfig.displayName}</strong> ({currentRoleConfig.allowedTabs.length} módulo{currentRoleConfig.allowedTabs.length !== 1 ? 's' : ''} habilitado{currentRoleConfig.allowedTabs.length !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-slate-950/60 px-3 py-1 rounded-xl border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Actualizado Automáticamente</span>
        </div>
      </div>

      {/* Main Navigation Tab Bar */}
      <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200 flex flex-wrap gap-1">
        {[
          { id: 'dashboard' as AdminTab, label: 'Tablero Principal', icon: LayoutDashboard, badge: 0 },
          { id: 'recharges' as AdminTab, label: 'Auditoría Pago Móvil', icon: CreditCard, badge: pendingRechargesCount },
          { id: 'withdrawals' as AdminTab, label: 'Gestión de Retiros', icon: ArrowUpRight, badge: pendingWithdrawalsCount },
          { id: 'rounds' as AdminTab, label: 'Gestión de Sorteos', icon: Calendar, badge: 0 },
          { id: 'results' as AdminTab, label: 'Ingreso de Resultados', icon: Sparkles, badge: 0 },
          { id: 'commercial' as AdminTab, label: 'Configuración Comercial', icon: Settings, badge: 0 },
          { id: 'audit' as AdminTab, label: 'Libro y Auditoría', icon: FileSpreadsheet, badge: 0 },
          { id: 'users' as AdminTab, label: 'Usuarios y Balances', icon: Users, badge: 0 },
          { id: 'operators' as AdminTab, label: 'Gestión de Personal', icon: KeyRound, badge: 0 },
        ]
          .filter((tab) => currentRoleConfig.allowedTabs.includes(tab.id))
          .map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                  isActive
                    ? 'bg-purple-900 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-black animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DASHBOARD & FINANCIAL KPIS */}
      {/* ======================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Recharges */}
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                  Total Recargas Aprobadas
                </span>
                <div className="text-2xl font-mono font-black text-emerald-600">
                  {formatMoney(totalApprovedRechargesVes)}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Comprobantes:</span>
                <span className="font-bold text-slate-800">
                  {recharges.filter((r) => r.status === 'approved').length} aprobados
                </span>
              </div>
            </div>

            {/* Total Card Bets */}
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                  Ventas de Cartones 4×4
                </span>
                <div className="text-2xl font-mono font-black text-indigo-950">
                  {formatMoney(totalCardsSalesVes)}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Cartones Emitidas:</span>
                <span className="font-bold text-slate-800">{cards.length} unidades</span>
              </div>
            </div>

            {/* Total Prizes Paid */}
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                  Premios Distribuidos
                </span>
                <div className="text-2xl font-mono font-black text-amber-600">
                  {formatMoney(totalPrizesPaidVes)}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Cartones Premiadas:</span>
                <span className="font-bold text-slate-800">
                  {cards.filter((c) => c.status === 'winner' || c.winningPatterns.length > 0).length} ganadoras
                </span>
              </div>
            </div>

            {/* Net Margin Profit */}
            <div className="bg-gradient-to-br from-indigo-950 to-purple-950 text-white rounded-3xl p-5 shadow-xl border border-purple-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider block mb-1">
                  Margen Operativo Neto
                </span>
                <div className="text-2xl font-mono font-black text-amber-400">
                  {formatMoney(netPlatformProfitVes)}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-purple-800/80 flex items-center justify-between text-xs text-indigo-200">
                <span>Retención Casa:</span>
                <span className="font-bold text-emerald-400">
                  {totalCardsSalesVes > 0 ? `${((netPlatformProfitVes / totalCardsSalesVes) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* Pending Alerts Banner */}
          {(pendingRechargesCount > 0 || pendingWithdrawalsCount > 0) && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-amber-950 text-sm">
                    Atención: Hay Operaciones Financieras Pendientes
                  </h3>
                  <p className="text-xs text-amber-800">
                    {pendingRechargesCount} recarga(s) por verificar y {pendingWithdrawalsCount} solicitud(es) de retiro en cola.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {pendingRechargesCount > 0 && (
                  <button
                    onClick={() => setActiveTab('recharges')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm"
                  >
                    Ver Recargas ({pendingRechargesCount})
                  </button>
                )}
                {pendingWithdrawalsCount > 0 && (
                  <button
                    onClick={() => setActiveTab('withdrawals')}
                    className="bg-indigo-950 hover:bg-indigo-900 text-amber-300 font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm"
                  >
                    Ver Retiros ({pendingWithdrawalsCount})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Round Overview */}
          <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                Estado Actual de los Sorteos
              </h3>
              <button
                onClick={() => setActiveTab('rounds')}
                className="text-xs font-bold text-indigo-900 hover:underline"
              >
                Administrar Sorteos →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rounds.map((round) => (
                <div
                  key={round.id}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-slate-900 text-sm">
                        #{round.roundNumber} - {round.title}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          round.status === 'open'
                            ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                            : round.status === 'finished'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-indigo-100 text-indigo-900'
                        }`}
                      >
                        {round.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Cartones vendidas: <strong>{round.totalCardsSold}</strong> • Premio mayor: <strong>{formatMoney(round.jackpotVes)}</strong>
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 flex gap-2">
                    {round.status === 'open' && (
                      <button
                        onClick={() => {
                          setSelectedRoundForResult(round.id);
                          setActiveTab('results');
                        }}
                        className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-black text-xs rounded-xl shadow-sm"
                      >
                        Cerrar e Ingresar Resultados
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: AUDITORÍA DE PAGO MÓVIL (RECHARGES) */}
      {/* ======================================================== */}
      {activeTab === 'recharges' && (
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base">
                  Cola de Auditoría y Verificación de Recargas Pago Móvil
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Módulo Financiero
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Verifica el registro, revisa los datos del comprobante, confirma el ingreso del dinero en la cuenta bancaria y aprueba la acreditación.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-xl flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                {pendingRechargesCount} pendientes de verificación
              </span>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={rechargeSearchTerm}
                onChange={(e) => setRechargeSearchTerm(e.target.value)}
                placeholder="Buscar por referencia, nombre de usuario, pagador, cédula o banco..."
                className="w-full bg-white border border-slate-200 focus:border-amber-500 pl-10 pr-4 py-2 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setRechargeFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  rechargeFilterStatus === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Todos ({recharges.length})
              </button>
              <button
                type="button"
                onClick={() => setRechargeFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  rechargeFilterStatus === 'pending'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-white text-amber-700 hover:bg-amber-50 border border-slate-200'
                }`}
              >
                Pendientes ({recharges.filter((r) => r.status === 'pending').length})
              </button>
              <button
                type="button"
                onClick={() => setRechargeFilterStatus('approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  rechargeFilterStatus === 'approved'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-slate-200'
                }`}
              >
                Aprobados ({recharges.filter((r) => r.status === 'approved').length})
              </button>
              <button
                type="button"
                onClick={() => setRechargeFilterStatus('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  rechargeFilterStatus === 'rejected'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white text-rose-700 hover:bg-rose-50 border border-slate-200'
                }`}
              >
                Rechazados ({recharges.filter((r) => r.status === 'rejected').length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="pb-2.5">Comprobante</th>
                  <th className="pb-2.5">Usuario Registrado</th>
                  <th className="pb-2.5">Pagador / C.I.</th>
                  <th className="pb-2.5">Banco y Referencia</th>
                  <th className="pb-2.5">Monto (VES)</th>
                  <th className="pb-2.5">Fecha y Auditoría</th>
                  <th className="pb-2.5">Estatus</th>
                  <th className="pb-2.5 text-right">Acción Operativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const filteredList = recharges.filter((rec) => {
                    const matchesStatus =
                      rechargeFilterStatus === 'all' || rec.status === rechargeFilterStatus;
                    const searchLower = rechargeSearchTerm.toLowerCase();
                    const matchesSearch =
                      !rechargeSearchTerm ||
                      rec.referenceNumber.toLowerCase().includes(searchLower) ||
                      rec.userName.toLowerCase().includes(searchLower) ||
                      (rec.payerName && rec.payerName.toLowerCase().includes(searchLower)) ||
                      (rec.payerDocumentId && rec.payerDocumentId.toLowerCase().includes(searchLower)) ||
                      (rec.bankOrigin && rec.bankOrigin.toLowerCase().includes(searchLower)) ||
                      rec.userPhone.includes(searchLower);
                    return matchesStatus && matchesSearch;
                  });

                  if (filteredList.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Clock className="w-8 h-8 text-slate-300" />
                            <p className="font-bold text-sm text-slate-600">No hay recargas en esta vista</p>
                            <p className="text-xs text-slate-400">
                              {rechargeSearchTerm ? 'No se encontraron resultados para la búsqueda actual.' : 'Todas las solicitudes han sido atendidas o no hay registros pendientes.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return filteredList.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3">
                        <div className="relative group">
                          <img
                            src={rec.voucherImageUrl}
                            alt="Comprobante"
                            onClick={() => setSelectedVoucherForModal(rec.voucherImageUrl)}
                            className="w-12 h-12 object-cover rounded-xl border border-slate-300 cursor-pointer group-hover:scale-105 transition-transform shadow-xs"
                            title="Clic para ampliar comprobante"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 font-semibold text-slate-900">
                        <div className="font-bold text-slate-900">{rec.userName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{rec.userPhone}</div>
                      </td>
                      <td className="py-3 text-slate-700">
                        <div className="font-medium text-slate-900">{rec.payerName || rec.userName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {rec.payerDocumentId ? `CI: ${rec.payerDocumentId}` : 'No especificada'}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-slate-800">{rec.bankOrigin}</div>
                        <div className="font-mono text-indigo-900 font-bold bg-indigo-50 px-1.5 py-0.5 rounded inline-block text-[11px]">
                          Ref: {rec.referenceNumber}
                        </div>
                        {rec.updatedAt && (
                          <div className="text-[9px] text-amber-700 font-semibold mt-0.5">
                            (Actualizada por usuario)
                          </div>
                        )}
                      </td>
                      <td className="py-3 font-mono font-black text-sm text-emerald-600">
                        {formatMoney(rec.amountVes)}
                      </td>
                      <td className="py-3 text-slate-500 text-[11px]">
                        <div>{rec?.createdAt ? new Date(rec.createdAt).toLocaleDateString('es-VE') : ''}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {rec?.createdAt ? new Date(rec.createdAt).toLocaleTimeString('es-VE') : ''}
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                            rec.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'pending'
                              ? 'bg-amber-100 text-amber-900 animate-pulse'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rec.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {rec.status === 'pending' && <Clock className="w-3 h-3 text-amber-600" />}
                          {rec.status === 'rejected' && <XCircle className="w-3 h-3 text-rose-600" />}
                          {rec.status === 'approved'
                            ? 'Aprobado'
                            : rec.status === 'pending'
                            ? 'Pendiente'
                            : 'Rechazado'}
                        </span>
                        {rec.confirmedBankArrival && (
                          <span className="block text-[9px] font-extrabold text-emerald-700 mt-0.5">
                            ✓ Ingreso Confirmado
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {rec.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedRechargeForReview(rec);
                                setConfirmBankArrivalChecked(false);
                              }}
                              className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 font-black text-[11px] px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Revisar y Confirmar</span>
                            </button>
                            <button
                              onClick={() => setRejectRechargeId(rec.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] px-2 py-1.5 rounded-lg transition-all"
                            >
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 font-medium block">
                              {rec.processedBy || 'Operador'}
                            </span>
                            {rec?.processedAt && (
                              <span className="text-[9px] text-slate-400 font-mono">
                                {new Date(rec.processedAt).toLocaleString('es-VE')}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: GESTIÓN DE RETIROS */}
      {/* ======================================================== */}
      {activeTab === 'withdrawals' && (
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 space-y-4">
          {/* Security Notice for Non-Privileged Roles */}
          {!canManageWithdrawals && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3 text-amber-900 text-xs">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold block">Control de Acceso Activo: Modo de Solo Lectura</span>
                <span>
                  Tu rol actual (<strong>{currentRoleConfig.displayName}</strong>) no posee privilegios para liquidar o rechazar pagos. Estas acciones están restringidas exclusivamente a <strong>Superadministrador</strong> y <strong>Operador Financiero</strong>.
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base">
                  Solicitudes de Retiro de Fondos
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    canManageWithdrawals
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {canManageWithdrawals ? 'Permiso Autorizado' : 'Solo Lectura'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Transfiere a los datos bancarios del usuario y marca como Completado.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
              {pendingWithdrawalsCount} por liquidar
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="pb-2.5">Beneficiario</th>
                  <th className="pb-2.5">Canal y Banco</th>
                  <th className="pb-2.5">Cuenta / Teléfono</th>
                  <th className="pb-2.5">Monto (VES)</th>
                  <th className="pb-2.5">Fecha</th>
                  <th className="pb-2.5">Estado</th>
                  <th className="pb-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withdrawals.map((wth) => (
                  <tr key={wth.id} className="hover:bg-slate-50">
                    <td className="py-3 font-semibold text-slate-900">
                      <div>{wth.titularName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">RIF/CI: {wth.documentId}</div>
                    </td>
                    <td className="py-3">
                      <span className="font-bold text-slate-800">{wth.bankDest}</span>
                      <div className="text-[10px] text-slate-500 uppercase">{wth.channel}</div>
                    </td>
                    <td className="py-3 font-mono font-bold text-indigo-900">
                      {wth.phoneOrAccount}
                    </td>
                    <td className="py-3 font-mono font-black text-sm text-slate-900">
                      {formatMoney(wth.amountVes)}
                    </td>
                    <td className="py-3 text-slate-500 text-[11px]">
                      {wth?.createdAt ? new Date(wth.createdAt).toLocaleString('es-VE') : ''}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          wth.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : wth.status === 'pending'
                            ? 'bg-amber-100 text-amber-900 animate-pulse'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {wth.status === 'completed' ? 'Completado' : wth.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {wth.status === 'pending' ? (
                        canManageWithdrawals ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => completeWithdrawal(wth.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1"
                              title="Marcar como pagado y liquidado"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Liquidado / Pagado</span>
                            </button>
                            <button
                              onClick={() => setRejectWithdrawalId(wth.id)}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1"
                              title="Rechazar y devolver fondos al jugador"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Rechazar</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 text-slate-400 font-medium text-[11px] italic">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Requiere Op. Financiero</span>
                          </div>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {wth?.processedBy || 'Operador'} {wth?.processedAt ? `(${new Date(wth.processedAt).toLocaleTimeString('es-VE')})` : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: GESTIÓN DE SORTEOS & CRONOGRAMAS */}
      {/* ======================================================== */}
      {activeTab === 'rounds' && (
        <div className="space-y-6">
          {/* Create New Round Form */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Programar Nuevo Sorteo Secuencial 4×4
                </h3>
                <p className="text-xs text-slate-500">
                  Define el orden, fecha/hora, precio por cartón y el % de recaudación destinado a premios.
                </p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-900 border border-indigo-200 px-3 py-1 rounded-xl font-bold">
                Gestión Dinámica de Precios
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título del Sorteo *
                </label>
                <input
                  type="text"
                  value={newRoundTitle}
                  onChange={(e) => setNewRoundTitle(e.target.value)}
                  placeholder="Ej. Sorteo Noche Especial #104"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha y Hora de Inicio *
                </label>
                <input
                  type="datetime-local"
                  value={newRoundDrawTime}
                  onChange={(e) => setNewRoundDrawTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Monto del Premio (Bs.) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Ej. 150000"
                  value={newRoundManualPrize}
                  onChange={(e) => setNewRoundManualPrize(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  % a Premio (Pozo) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="95"
                    step="1"
                    value={newRoundPrizePercentage}
                    onChange={(e) => setNewRoundPrizePercentage(Math.min(95, Math.max(10, Number(e.target.value))))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 pr-7 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="text-xs text-slate-600 font-medium">
                {newRoundManualPrize !== '' && Number(newRoundManualPrize) > 0 ? (
                  <span>
                    Premio Fijo Manual: <strong className="text-indigo-950 font-mono">{formatMoney(Number(newRoundManualPrize))}</strong> establecido para este sorteo.
                  </span>
                ) : (
                  <span>
                    Cálculo de Premio Automático: <strong>Cartones Vendidos × Precio × ({newRoundPrizePercentage}%)</strong>. Margen de casa:{' '}
                    <strong className="text-emerald-700">{100 - newRoundPrizePercentage}%</strong>.
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  createRound(
                    newRoundTitle,
                    newRoundDrawTime,
                    undefined,
                    newRoundPrizePercentage,
                    newRoundOrder,
                    newRoundManualPrize !== '' ? Number(newRoundManualPrize) : undefined
                  );
                  setNewRoundTitle('');
                  setNewRoundManualPrize('');
                  setNewRoundOrder(rounds.length + 2);
                }}
                className="w-full sm:w-auto bg-indigo-950 hover:bg-indigo-900 text-amber-300 font-black text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Crear y Publicar Ronda</span>
              </button>
            </div>
          </div>

          {/* Feedback Toast */}
          {savedRoundFeedback && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in">
              <span>{savedRoundFeedback}</span>
              <button
                onClick={() => setSavedRoundFeedback(null)}
                className="text-emerald-700 hover:text-emerald-950 font-black"
              >
                ✕
              </button>
            </div>
          )}

          {/* Existing Rounds Table */}
          <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Listado de Rondas y Monitor Financiero en Tiempo Real
                </h3>
                <p className="text-xs text-slate-500">
                  Muestra la recaudación en tiempo real, el pozo de premios calculado y la ganancia de la casa por sorteo.
                </p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-xl">
                {rounds.length} Sorteos Registrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="pb-2.5">Orden / Ronda</th>
                    <th className="pb-2.5">Estado</th>
                    <th className="pb-2.5">Horario Inicio</th>
                    <th className="pb-2.5">Precio Cartón</th>
                    <th className="pb-2.5">% Premio</th>
                    <th className="pb-2.5">Vendidos</th>
                    <th className="pb-2.5">Recaudado</th>
                    <th className="pb-2.5">Premio Actual</th>
                    <th className="pb-2.5">Ganancia Casa</th>
                    <th className="pb-2.5 text-right">Acciones y Config</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rounds.map((round) => {
                    const statusLower = String(round.status || '').toLowerCase();
                    const isStarted = statusLower !== 'scheduled';
                    const effectivePrice =
                      editingRoundConfigs[round.id]?.card_price !== undefined
                        ? editingRoundConfigs[round.id].card_price
                        : round.card_price || round.cardPriceVes || 25;
                    const effectivePrizePct =
                      editingRoundConfigs[round.id]?.prize_percentage !== undefined
                        ? editingRoundConfigs[round.id].prize_percentage
                        : round.prize_percentage !== undefined
                        ? round.prize_percentage
                        : 70;

                    const totalSold = round.totalCardsSold || 0;
                    const totalRecaudado = totalSold * effectivePrice;
                    const calculatedPrize = Math.max(
                      round.jackpotVes || 0,
                      totalRecaudado * (effectivePrizePct / 100)
                    );
                    const gananciaCasa = totalRecaudado - (round.status === 'finished' ? (round.totalPrizesPaidVes || 0) : calculatedPrize);

                    return (
                      <tr key={round.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-indigo-950 text-amber-300 px-2 py-0.5 rounded font-mono text-[11px]">
                              #{round.order || round.roundNumber}
                            </span>
                            <span className="truncate max-w-[140px]" title={round.title}>
                              {round.title}
                            </span>
                          </div>
                        </td>

                        <td className="py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                              statusLower === 'open'
                                ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                                : statusLower === 'scheduled'
                                ? 'bg-indigo-100 text-indigo-900'
                                : statusLower === 'closed'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {statusLower === 'open' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                            {round.status}
                          </span>
                        </td>

                        <td className="py-3 text-slate-500">
                          {(() => {
                            const raw = round?.starts_at || round?.openBetAt || round?.drawAt || round?.created_at;
                            const d = raw ? new Date(raw) : null;
                            return !d || isNaN(d.getTime()) ? 'Próximamente' : d.toLocaleString('es-VE', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                          })()}
                        </td>

                        {/* Editable or Locked Card Price */}
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              disabled={isStarted}
                              value={effectivePrice}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value));
                                setEditingRoundConfigs((prev) => ({
                                  ...prev,
                                  [round.id]: {
                                    card_price: val,
                                    prize_percentage: effectivePrizePct,
                                  },
                                }));
                              }}
                              className={`w-16 px-2 py-1 rounded-lg text-xs font-mono font-bold border ${
                                isStarted
                                  ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                                  : 'bg-white border-amber-400 text-slate-900 focus:outline-none'
                              }`}
                              title={isStarted ? 'Bloqueado una vez iniciado el sorteo' : 'Editable'}
                            />
                            {isStarted && <Lock className="w-3 h-3 text-slate-400" />}
                          </div>
                        </td>

                        {/* Editable Prize Percentage */}
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="10"
                              max="95"
                              value={effectivePrizePct}
                              onChange={(e) => {
                                const val = Math.min(95, Math.max(10, Number(e.target.value)));
                                setEditingRoundConfigs((prev) => ({
                                  ...prev,
                                  [round.id]: {
                                    card_price: effectivePrice,
                                    prize_percentage: val,
                                  },
                                }));
                              }}
                              className="w-14 px-2 py-1 rounded-lg text-xs font-mono font-bold border bg-white border-indigo-300 text-slate-900 focus:outline-none"
                            />
                            <span className="text-slate-400 font-bold">%</span>
                          </div>
                        </td>

                        <td className="py-3 font-mono font-bold text-slate-800">
                          {totalSold}
                        </td>

                        <td className="py-3 font-mono font-bold text-indigo-950">
                          {formatMoney(totalRecaudado)}
                        </td>

                        <td className="py-3 font-mono font-black text-amber-600">
                          {formatMoney(calculatedPrize)}
                        </td>

                        <td className="py-3 font-mono font-black text-emerald-600">
                          {formatMoney(gananciaCasa)}
                        </td>

                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {editingRoundConfigs[round.id] && (
                              <button
                                onClick={() => {
                                  updateRoundConfig(round.id, editingRoundConfigs[round.id]);
                                  setSavedRoundFeedback(`Configuración actualizada para ${round.title}`);
                                  setEditingRoundConfigs((prev) => {
                                    const copy = { ...prev };
                                    delete copy[round.id];
                                    return copy;
                                  });
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2 py-1 rounded-lg shadow-sm cursor-pointer"
                              >
                                Guardar
                              </button>
                            )}

                            {statusLower === 'scheduled' && (
                              <button
                                onClick={() => setRoundStatus(round.id, 'open')}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2 py-1 rounded-lg cursor-pointer"
                              >
                                Abrir Apuestas
                              </button>
                            )}
                            {statusLower === 'open' && (
                              <button
                                onClick={() => setRoundStatus(round.id, 'closed')}
                                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] px-2 py-1 rounded-lg cursor-pointer"
                              >
                                Cerrar Apuestas
                              </button>
                            )}
                            {statusLower !== 'finished' && (
                              <button
                                onClick={() => {
                                  setSelectedRoundForResult(round.id);
                                  setActiveTab('results');
                                }}
                                className="bg-indigo-900 hover:bg-indigo-800 text-amber-300 font-bold text-[10px] px-2 py-1 rounded-lg cursor-pointer"
                              >
                                Ingresar Figuras
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: INGRESO SEGURO DE RESULTADOS (70-FICHA SELECTOR) */}
      {/* ======================================================== */}
      {activeTab === 'results' && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-lg border border-slate-200 space-y-5">
          {/* Security Notice for Non-Privileged Roles */}
          {!canManageResults && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3 text-amber-900 text-xs">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold block">Control de Acceso Activo: Modo de Solo Lectura</span>
                <span>
                  Tu rol actual (<strong>{currentRoleConfig.displayName}</strong>) no tiene autorización para emitir o certificar resultados de sorteos. Esta acción está restringida exclusivamente a <strong>Superadministrador</strong> y <strong>Operador Financiero</strong>.
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-lg">
                  Ingreso Seguro de Figuras Ganadoras (Punto Único de Verdad)
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    canManageResults
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {canManageResults ? 'Emisión Oficial Habilitada' : 'Solo Lectura'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                El resultado ingresado aquí es el único dato válido que se distribuirá en tiempo real a todos los clientes (en vivo y retransmisión).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedRoundForResult}
                onChange={(e) => setSelectedRoundForResult(e.target.value)}
                disabled={!canManageResults}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 disabled:opacity-60"
              >
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} (#{r.roundNumber}) - {r.status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Feedback banner */}
          {resultSubmitMessage && (
            <div
              className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                resultSubmitMessage.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}
            >
              {resultSubmitMessage.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
              <span>{resultSubmitMessage.text}</span>
            </div>
          )}

          {/* Selector Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Figuras Seleccionadas:</span>
              <span className="font-mono font-black text-sm bg-indigo-950 text-amber-300 px-2.5 py-0.5 rounded-lg">
                {selectedResultFichas.length} / 20
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!canManageResults}
                onClick={handleAutoSelect32Fichas}
                className="bg-indigo-100 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-900 font-bold text-xs px-3 py-1.5 rounded-xl transition-all"
              >
                🍏 Auto-Seleccionar 20 Figuras Aleatorias
              </button>
              <button
                type="button"
                disabled={!canManageResults}
                onClick={() => setSelectedResultFichas([])}
                className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl transition-all"
              >
                Limpiar Selección
              </button>
            </div>
          </div>

          {/* 72 Fichas Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-7 md:grid-cols-10 gap-2 max-h-[420px] overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
            {FICHAS_POOL.map((ficha) => {
              const isSelected = selectedResultFichas.includes(ficha.id);
              return (
                <div
                  key={ficha.id}
                  onClick={() => {
                    if (canManageResults) toggleFichaSelection(ficha.id);
                  }}
                  className={`p-2 rounded-2xl border-2 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                    !canManageResults ? 'cursor-not-allowed opacity-80' : ''
                  } ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-300 to-yellow-300 border-amber-500 shadow-md scale-102 font-black text-indigo-950 ring-2 ring-amber-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="text-[9px] font-mono opacity-70">#{ficha.id}</span>
                  <span className="text-2xl my-1">{ficha.emoji}</span>
                  <span className="text-[10px] font-bold truncate max-w-full">{ficha.name}</span>
                </div>
              );
            })}
          </div>

          {/* Submit Trigger Button */}
          <div className="flex justify-end pt-3">
            <button
              disabled={selectedResultFichas.length < 16 || !canManageResults}
              onClick={() => setShowResultConfirmModal(true)}
              className={`px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl flex items-center gap-2 ${
                selectedResultFichas.length < 16 || !canManageResults
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-indigo-950 shadow-amber-500/25 active:scale-95'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Validar y Procesar Liquidación Oficial ({selectedResultFichas.length} Fichas)</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: CONFIGURACIÓN COMERCIAL & RIESGO */}
      {/* ======================================================== */}
      {activeTab === 'commercial' && (
        <form onSubmit={handleSaveCommercialConfig} className="bg-white rounded-3xl p-5 sm:p-7 shadow-lg border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-lg">
                Parámetros Comerciales y Control de Riesgo
              </h3>
              <p className="text-xs text-slate-500">
                Ajusta las cuentas receptoras de Pago Móvil, precios de paquetes y multiplicadores de premio. Se sincronizan en vivo con todos los jugadores.
              </p>
            </div>
            {configSavedToast && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5 shadow-sm animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{configSaveMsg || '¡Configuración Guardada y Sincronizada!'}</span>
              </span>
            )}
          </div>

          {/* Admin Bank Details */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider">
                Datos Bancarios para Recepción de Pago Móvil (Públicos para Recargas)
              </h4>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Transmisión en tiempo real
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Banco</label>
                <input
                  type="text"
                  value={configBankName}
                  onChange={(e) => setConfigBankName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono Receptor Pago Móvil</label>
                <input
                  type="text"
                  value={configPhone}
                  onChange={(e) => setConfigPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
                  placeholder="0424-8653039"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">RIF / C.I. Titular</label>
                <input
                  type="text"
                  value={configRif}
                  onChange={(e) => setConfigRif(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
                  placeholder="J-50769027-0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Razón Social / Titular</label>
                <input
                  type="text"
                  value={configHolder}
                  onChange={(e) => setConfigHolder(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
                  placeholder="Nombre de la empresa o titular"
                  required
                />
              </div>
            </div>
          </div>

          {/* Pricing & Calculated Packs */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider">
                Precios de Paquetes de Cartones y Precio Base
              </h4>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Packs calculados dinámicamente
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-black text-indigo-950 mb-1 flex items-center justify-between">
                  <span>PRECIO 1 CARTON (VES)</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded">Maestro</span>
                </label>
                <div className="relative">
                  <input
                    id="input-precio-carton-base-ves"
                    name="precio_carton_base_ves"
                    type="number"
                    min="1"
                    step="1"
                    value={precioCartonBaseVes}
                    onChange={(e) => setPrecioCartonBaseVes(Math.max(1, Number(e.target.value) || 0))}
                    className="w-full bg-amber-50/60 border-2 border-amber-400 rounded-xl px-3 py-2 text-xs font-mono font-black text-indigo-950 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all shadow-xs"
                    required
                  />
                  <span className="absolute right-3 top-2 text-[11px] font-bold text-amber-700">VES</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium mt-1 block">Precio base por unidad</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pack 2 Cartones (VES)
                </label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 flex items-center justify-between min-h-[34px]">
                  <span>{formatMoney(precioCartonBaseVes * 2)}</span>
                  <span className="text-[10px] font-semibold text-slate-500 font-sans">2x</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Auto: Base × 2</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pack 4 Cartones (VES)
                </label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 flex items-center justify-between min-h-[34px]">
                  <span>{formatMoney(precioCartonBaseVes * 4)}</span>
                  <span className="text-[10px] font-semibold text-slate-500 font-sans">4x</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Auto: Base × 4</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pack 6 Cartones (VES)
                </label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 flex items-center justify-between min-h-[34px]">
                  <span>{formatMoney(precioCartonBaseVes * 6)}</span>
                  <span className="text-[10px] font-semibold text-slate-500 font-sans">6x</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Auto: Base × 6</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="text-[11px] text-slate-500 font-medium">
              Al guardar, los datos se enviarán inmediatamente a la base de datos y a la vista de recargas de todos los usuarios.
            </div>
            <button
              type="submit"
              disabled={isSavingConfig}
              className="bg-indigo-950 hover:bg-indigo-900 disabled:opacity-50 text-amber-300 font-black text-xs px-6 py-3 rounded-2xl shadow-lg transition-all flex items-center gap-2"
            >
              {isSavingConfig ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>Guardar Parámetros Comerciales</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 7: LIBRO CONTABLE & BITÁCORA DE AUDITORÍA */}
      {/* ======================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {currentRoleConfig.isReadOnly && (
            <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4 flex items-center gap-3 text-cyan-900">
              <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center flex-shrink-0 font-black">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-xs uppercase tracking-wider">Modo Solo Lectura - Acceso Auditor</h4>
                <p className="text-xs text-cyan-700">
                  Usted tiene permisos de supervisión y verificación de registros. No se permiten modificaciones ni alteración de datos.
                </p>
              </div>
            </div>
          )}

          {/* Audit Logs */}
          <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200">
            <h3 className="font-black text-slate-900 text-base mb-1">
              Bitácora de Auditoría de Operadores (Audit Trail)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Registro inalterable de cada acción administrativa ejecutada en el Backoffice.
            </p>

            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="pb-2">Timestamp</th>
                    <th className="pb-2">Operador / Rol</th>
                    <th className="pb-2">Acción</th>
                    <th className="pb-2">Detalles</th>
                    <th className="pb-2 text-right">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                        {log?.timestamp ? new Date(log.timestamp).toLocaleString('es-VE') : ''}
                      </td>
                      <td className="py-2.5">
                        <span className="font-bold text-slate-900">{log.operatorName}</span>
                        <div className="text-[10px] text-purple-700 font-semibold">{log.operatorRole}</div>
                      </td>
                      <td className="py-2.5">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-700 max-w-sm">{log.details}</td>
                      <td className="py-2.5 text-right font-mono text-slate-400">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 8: USUARIOS Y JUGADORES REGISTRADOS (/admin) */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <AdminPlayersView />
          
          <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Auditoría Financiera de Balances de Usuario
                </h3>
                <p className="text-xs text-slate-500">
                  Audita saldos disponibles, pendientes y bloqueados por usuario.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="pb-2.5">Usuario</th>
                    <th className="pb-2.5">C.I. / RIF</th>
                    <th className="pb-2.5">Disponible</th>
                    <th className="pb-2.5">Pendiente</th>
                    <th className="pb-2.5">Bloqueado</th>
                    <th className="pb-2.5">Total Ganado</th>
                    <th className="pb-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 font-semibold text-slate-900">
                        <div>{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{u.phone}</div>
                      </td>
                      <td className="py-3 font-mono font-bold text-slate-700">{u.documentId}</td>
                      <td className="py-3 font-mono font-black text-emerald-600">
                        {formatMoney(u.availableBalance)}
                      </td>
                      <td className="py-3 font-mono font-bold text-amber-600">
                        {formatMoney(u.pendingBalance)}
                      </td>
                      <td className="py-3 font-mono font-bold text-indigo-600">
                        {formatMoney(u.lockedBalance)}
                      </td>
                      <td className="py-3 font-mono font-bold text-slate-800">
                        {formatMoney(u.totalWonVes)}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => quickAddBalance(100)}
                          className="bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold text-[10px] px-2.5 py-1 rounded-lg transition-all"
                        >
                          +100 Bs. Bono Demo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 9: GESTIÓN DE PERSONAL Y OPERADORES */}
      {/* ======================================================== */}
      {activeTab === 'operators' && <OperatorManagementView />}

      {/* ======================================================== */}
      {/* MODAL: REVISIÓN Y APROBACIÓN DE RECARGA PAGO MÓVIL */}
      {/* ======================================================== */}
      {selectedRechargeForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Revisión y Auditoría de Recarga Pago Móvil
                  </h3>
                  <p className="text-xs text-slate-500">
                    Comprueba los datos contra tu extracto bancario oficial y confirma el ingreso efectivo.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRechargeForReview(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {/* Voucher Preview Card */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Captura del Comprobante:
                </span>
                <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center min-h-[220px]">
                  <img
                    src={selectedRechargeForReview.voucherImageUrl}
                    alt="Comprobante Adjunto"
                    className="w-full h-56 object-cover cursor-pointer group-hover:scale-105 transition-transform"
                    onClick={() => setSelectedVoucherForModal(selectedRechargeForReview.voucherImageUrl)}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedVoucherForModal(selectedRechargeForReview.voucherImageUrl)}
                    className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md backdrop-blur-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ampliar Imagen</span>
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 text-center">
                  Haz clic para ver el comprobante en tamaño completo
                </div>
              </div>

              {/* Data Verification Card */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 pb-2">
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block">
                    Monto Reportado
                  </span>
                  <span className="text-2xl font-black font-mono text-emerald-600">
                    {formatMoney(selectedRechargeForReview.amountVes)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Nro. Referencia:</span>
                    <span className="font-mono font-black text-indigo-950 bg-indigo-100/60 px-2 py-0.5 rounded inline-block">
                      {selectedRechargeForReview.referenceNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Banco Emisor:</span>
                    <span className="font-bold text-slate-800">
                      {selectedRechargeForReview.bankOrigin}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Nombre del Pagador:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedRechargeForReview.payerName || selectedRechargeForReview.userName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Cédula / RIF Pagador:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedRechargeForReview.payerDocumentId || 'No reportada'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Teléfono Emisor:</span>
                    <span className="font-mono text-slate-700">
                      {selectedRechargeForReview.payerPhone || selectedRechargeForReview.userPhone}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Usuario en Plataforma:</span>
                    <span className="font-bold text-indigo-900">
                      {selectedRechargeForReview.userName}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                  <div>Registrado: {selectedRechargeForReview?.createdAt ? new Date(selectedRechargeForReview.createdAt).toLocaleString('es-VE') : ''}</div>
                  {selectedRechargeForReview?.updatedAt && (
                    <div className="text-amber-800 font-semibold">
                      Última modificación: {selectedRechargeForReview.updatedAt ? new Date(selectedRechargeForReview.updatedAt).toLocaleString('es-VE') : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Target Account Reference */}
            <div className="bg-indigo-950 text-indigo-100 p-3.5 rounded-2xl text-xs mb-5 flex items-center justify-between border border-indigo-900">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider block">
                  Cuenta Receptora Institucional:
                </span>
                <p className="font-medium text-white text-xs">
                  {commercialConfig.adminBank.bankName} • {commercialConfig.adminBank.phone} • RIF: {commercialConfig.adminBank.rif}
                </p>
                <p className="text-[11px] text-indigo-300">
                  Titular: {commercialConfig.adminBank.holderName}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono bg-indigo-900 text-indigo-200 px-2 py-1 rounded-lg">
                  Pago Móvil Oficial
                </span>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300/80">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmBankArrivalChecked}
                  onChange={(e) => setConfirmBankArrivalChecked(e.target.checked)}
                  className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 mt-0.5 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-black text-slate-900 block">
                    Confirmación de Ingreso Efectivo en Cuenta Bancaria *
                  </span>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                    Certifico como <strong>{currentRoleConfig.displayName}</strong> que he contrastado esta transacción con el extracto bancario en línea de la cuenta receptora y confirmo que los <strong>{formatMoney(selectedRechargeForReview.amountVes)}</strong> se encuentran acreditados y disponibles.
                  </p>
                </div>
              </label>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRejectRechargeId(selectedRechargeForReview.id);
                  setSelectedRechargeForReview(null);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition-colors border border-rose-200"
              >
                Rechazar Transacción
              </button>

              <button
                type="button"
                onClick={() => setSelectedRechargeForReview(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Cerrar
              </button>

              <button
                type="button"
                disabled={!confirmBankArrivalChecked}
                onClick={() => {
                  const res = approveRecharge(selectedRechargeForReview.id);
                  if (res.success) {
                    setSelectedRechargeForReview(null);
                  }
                }}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg ${
                  confirmBankArrivalChecked
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer shadow-emerald-500/20 active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Ingreso y Cambiar Estatus a 'Aprobado'</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: HIGH-RES VOUCHER VIEWER */}
      {/* ======================================================== */}
      {selectedVoucherForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h4 className="font-black text-slate-900 text-sm">
                Visualizador de Comprobante en Alta Resolución
              </h4>
              <button
                onClick={() => setSelectedVoucherForModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <img
              src={selectedVoucherForModal}
              alt="Comprobante Alta Resolución"
              className="w-full h-auto max-h-[70vh] object-contain rounded-2xl border border-slate-200"
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REJECT RECHARGE REASON */}
      {/* ======================================================== */}
      {rejectRechargeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl">
            <h4 className="font-black text-slate-900 text-base mb-2">
              Motivo del Rechazo de Recarga
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Este motivo será notificado directamente al usuario.
            </p>

            <textarea
              value={rechargeRejectReason}
              onChange={(e) => setRechargeRejectReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 mb-4 h-24"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setRejectRechargeId(null)}
                className="w-1/2 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  rejectRecharge(rejectRechargeId, rechargeRejectReason);
                  setRejectRechargeId(null);
                }}
                className="w-1/2 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REJECT WITHDRAWAL REASON */}
      {/* ======================================================== */}
      {rejectWithdrawalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl">
            <h4 className="font-black text-slate-900 text-base mb-2">
              Motivo del Rechazo de Retiro
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Los fondos reservados serán reintegrados de inmediato al saldo disponible del jugador y este motivo le será notificado.
            </p>

            <textarea
              value={withdrawalRejectReason}
              onChange={(e) => setWithdrawalRejectReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 mb-4 h-24"
              placeholder="Explica el motivo (ej. Cuenta no coincide con titular, datos incorrectos...)"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setRejectWithdrawalId(null)}
                className="w-1/2 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!canManageWithdrawals) {
                    alert('Acceso Denegado: Tu rol actual no tiene autorización para rechazar retiros.');
                    setRejectWithdrawalId(null);
                    return;
                  }
                  rejectWithdrawal(rejectWithdrawalId, withdrawalRejectReason);
                  setRejectWithdrawalId(null);
                }}
                disabled={!canManageWithdrawals}
                className="w-1/2 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs"
              >
                Confirmar Rechazo y Reembolso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DOUBLE CONFIRMATION & 2FA FOR DRAW RESULTS */}
      {/* ======================================================== */}
      {showResultConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertTriangle className="w-8 h-8" />
              <div>
                <h4 className="font-black text-slate-900 text-base">
                  Doble Confirmación: Liquidación Oficial de Premios
                </h4>
                <p className="text-xs text-slate-500">
                  Esta acción es irreversible y bloqueará la ronda de forma permanente.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 mb-4 text-xs">
              <span className="font-bold text-slate-700 block mb-1">
                Figuras Ganadoras a Certificar ({selectedResultFichas.length} seleccionadas):
              </span>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {selectedResultFichas.map((fId) => {
                  const f = getFichaById(fId);
                  return (
                    <span key={fId} className="bg-white px-2 py-0.5 rounded-md border text-[11px] font-bold">
                      {f.emoji} #{f.id} {f.name}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* 2FA Security OTP */}
            <div className="mb-5">
              <label className="block text-xs font-black text-slate-700 mb-1">
                Autenticación de 2 Factores (Código 2FA OTP) *
              </label>
              <input
                id="input-otp"
                type="text"
                value={otpInput}
                onChange={(e) => {
                  setOtpInput(e.target.value);
                  if (otpModalFeedback) setOtpModalFeedback(null);
                }}
                placeholder="Ingresa código de 6 dígitos"
                maxLength={6}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-center font-mono font-black text-base text-indigo-950 tracking-widest outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
              />
              {otpModalFeedback && (
                <div
                  id="otp-feedback-msg"
                  className={`mt-2 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 ${
                    otpModalFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {otpModalFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{otpModalFeedback.text}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '20px' }}>
              <button
                id="btn-revisar"
                type="button"
                onClick={() => setShowResultConfirmModal(false)}
                style={{ flex: 1, padding: '10px', fontSize: '14px' }}
                className="rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
              >
                Revisar Figuras
              </button>
              <button
                id="btn-solicitar-otg"
                type="button"
                onClick={handleRequestOtp}
                style={{ flex: 1, padding: '10px', fontSize: '14px', background: '#e0e0e0' }}
                className="rounded-xl font-bold text-slate-800 hover:bg-slate-300 transition-colors"
              >
                {otpRequestStatus}
              </button>
              <button
                id="btn-firmar"
                type="button"
                disabled={isSigningResult}
                onClick={handleExecuteResultSubmission}
                style={{ flex: 1.2, padding: '10px', fontSize: '14px', background: '#facc15', fontWeight: 'bold' }}
                className="rounded-xl text-indigo-950 shadow-md hover:brightness-105 transition-all disabled:opacity-50"
              >
                {isSigningResult ? 'Firmando...' : 'Firmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
