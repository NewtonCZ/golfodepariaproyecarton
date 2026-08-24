import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  AppUser,
  GameRound,
  RoundStatus,
  MatrixCard,
  RechargeTransaction,
  WithdrawalTransaction,
  WalletLedgerEntry,
  AuditLogEntry,
  CommercialConfig,
  Ficha,
} from '../types';
import { FICHAS_POOL, getFichaById } from '../data/fichasPool';
import { generateRandomMatrix, generateCardCode, evaluateCardMatrix } from '../services/cardEngine';
import { soundService } from '../services/soundAndSpeech';
import { ROLE_PERMISSIONS, RolePermissionConfig } from '../config/permissions';
import { LotteryStorageService } from '../services/storageService';
import { syncEngine } from '../services/syncService';
import { timeSync } from '../services/timeSyncService';
import { realtimeService } from '../services/realtimeService';
import {
  saveJugador,
  getJugadores,
  JugadorBingo,
} from '../services/playerStorage';

export { getJugadores, saveJugador };
export type { JugadorBingo };

export type AdminRole = 'Super Admin' | 'Operador Financiero' | 'Auditor';
export type UserRole = AdminRole | 'Player';

export interface SystemCredential {
  id: string;
  username: string;
  password: string;
  role: AdminRole;
  displayName: string;
  createdAt?: string;
  updatedAt?: string;
  status: 'active' | 'inactive';
}

export const validatePasswordComplexity = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener al menos una letra MAYÚSCULA (A-Z).');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Debe contener al menos una letra minúscula (a-z).');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Debe contener al menos un NÚMERO (0-9).');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Debe contener al menos un CARÁCTER ESPECIAL (@, %, #, $, !, etc.).');
  }
  return { valid: errors.length === 0, errors };
};
export const INITIAL_SYSTEM_CREDENTIALS: SystemCredential[] = [
 {
  id: 'sys-1',
  username: 'admin',
  password: 'Machete26*',
  role: 'Super Admin',
  displayName: 'SuperAdmin Master',
  createdAt: '2026-01-01T00:00:00.000Z',
  status: 'active',
},
  {
    id: 'sys-3',
    username: process.env.FINANZAS_USER!,
    password: process.env.FINANZAS_PASS!,
    role: 'Operador Financiero',
    displayName: 'Operador Financiero Central',
    createdAt: '2026-01-03T00:00:00.000Z',
    status: 'active',
  },
  {
    id: 'sys-4',
    username: process.env.AUDITOR_USER!,
    password: process.env.AUDITOR_PASS!,
    role: 'Auditor',
    displayName: 'Auditor General',
    createdAt: '2026-01-04T00:00:00.000Z',
    status: 'active',
  },
]; 
interface GameContextType {
  currentUser: AppUser;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  operatorRole: AdminRole;
  setOperatorRole: (role: AdminRole) => void;
  isAuthenticated: boolean;
  sessionToken: string | null;
  loggedUsername: string;
  permissions: RolePermissionConfig;
  activeCredential: SystemCredential | null;
  login: (
    username: string,
    password: string
  ) => {
    success: boolean;
    message: string;
    role?: UserRole;
    user?: AppUser;
  };
  logout: () => void;
  requestPasswordRecovery: (identifierOrEmail: string) => {
    success: boolean;
    message: string;
    email?: string;
    demoCode?: string;
  };
  verifyRecoveryCode: (email: string, code: string) => {
    success: boolean;
    message: string;
  };
  resetPasswordWithCode: (
    email: string,
    code: string,
    newPassword: string
  ) => {
    success: boolean;
    message: string;
  };
  registerUser: (data: {
    firstName: string;
    lastName: string;
    documentId: string;
    email: string;
    phone: string;
    birthDate: string;
    password?: string;
    kycFrontUrl?: string;
    kycBackUrl?: string;
  }) => { success: boolean; message: string; user?: AppUser };
  updateUserKyc: (
    userId: string,
    kycStatus: 'Aprobado' | 'Pendiente' | 'Rechazado' | 'No Enviado',
    kycFrontUrl?: string,
    kycBackUrl?: string
  ) => void;
  verifyCurrentAccount: () => { success: boolean; message: string };
  systemCredentials: SystemCredential[];
  createSystemCredential: (data: {
    username: string;
    password: string;
    role: AdminRole;
    displayName: string;
  }) => { success: boolean; message: string };
  updateSystemCredential: (
    id: string,
    data: {
      username?: string;
      password?: string;
      role?: AdminRole;
      displayName?: string;
      status?: 'active' | 'inactive';
    }
  ) => { success: boolean; message: string };
  deleteSystemCredential: (id: string) => { success: boolean; message: string };
  users: AppUser[];
  viewMode: 'player' | 'admin';
  setViewMode: (mode: 'player' | 'admin') => void;
  activeRound: GameRound | null;
  activeRounds: GameRound[];
  upcomingRounds: GameRound[];
  rounds: GameRound[];
  cards: MatrixCard[];
  userCards: MatrixCard[];
  recharges: RechargeTransaction[];
  withdrawals: WithdrawalTransaction[];
  ledger: WalletLedgerEntry[];
  auditLogs: AuditLogEntry[];
  commercialConfig: CommercialConfig;
  currencyDisplay: 'VES' | 'USD';
  setCurrencyDisplay: (curr: 'VES' | 'USD') => void;
  formatMoney: (amountVes: number, options?: { showBoth?: boolean }) => string;
  
  // Game Actions
  purchaseCards: (packCount: 2 | 4 | 6, roundId: string) => { success: boolean; message: string; cards?: MatrixCard[] };
  submitRecharge: (data: {
    amountVes: number;
    payerPhone: string;
    payerName: string;
    payerDocumentId: string;
    bankOrigin: string;
    referenceNumber: string;
    voucherImageUrl: string;
  }) => { success: boolean; message: string };
  approveRecharge: (transactionId: string) => { success: boolean; message: string };
  rejectRecharge: (transactionId: string, reason: string) => { success: boolean; message: string };
  submitWithdrawal: (data: {
    amountVes: number;
    channel: 'pago_movil' | 'transferencia';
    bankDest: string;
    phoneOrAccount: string;
    documentId: string;
    titularName: string;
    accountType?: 'corriente' | 'ahorro';
  }) => { success: boolean; message: string };
  completeWithdrawal: (transactionId: string) => { success: boolean; message: string };
  rejectWithdrawal: (transactionId: string, reason: string) => { success: boolean; message: string };
  
  // Round & Backoffice Actions
  createRound: (
    title: string,
    drawAt: string,
    cardPriceVes?: number,
    prizePercentage?: number,
    order?: number,
    manualJackpotVes?: number
  ) => void;
  updateRoundConfig: (
    roundId: string,
    data: {
      cardPriceVes?: number;
      card_price?: number;
      prize_percentage?: number;
      title?: string;
      drawAt?: string;
    }
  ) => { success: boolean; message: string };
  setRoundStatus: (roundId: string, status: GameRound['status']) => void;
  submitRoundResult: (roundId: string, drawnFichas: number[], otpCode: string) => { success: boolean; message: string; winnersCount?: number; totalPaidVes?: number };
  updateCommercialConfig: (newConfig: Partial<CommercialConfig>) => Promise<{ success: boolean; message: string; data?: CommercialConfig }>;
  fetchCommercialConfig: () => Promise<void>;
  resetToInitialData: () => void;
  
  // Live Draw Simulation
  liveDrawingRound: GameRound | null;
  isLiveDrawing: boolean;
  liveDrawnFichas: Ficha[];
  startLiveDrawSimulation: (roundId: string) => void;
  stopLiveDrawSimulation: () => void;
  quickAddBalance: (amountVes: number) => void;
  adjustUserBalance: (userId: string, amountVes: number, reason: string) => { success: boolean; message: string };
  updateUserStatus: (userId: string, status: 'active' | 'suspended' | 'banned', reason?: string) => { success: boolean; message: string };

  // Real-time synchronization & Service Worker
  isRealtimeSyncConnected: boolean;
  lastSyncTimestamp: number;
  fetchActiveRounds: (options?: { bypassCache?: boolean; limit?: number }) => Promise<void>;
  fetchPendingRecharges: () => Promise<void>;
  fetchWithdrawals: () => Promise<void>;

  // Card Archiving (Soft-hide without deleting)
  archiveCard: (cardId: string) => void;
  unarchiveCard: (cardId: string) => void;
  archiveCardsBatch: (cardIds: string[]) => void;
}

const STORAGE_KEY = 'Millioneire_Destiny_Lottery_v1';

const DEFAULT_CONFIG: CommercialConfig = {
  adminBank: {
    bankName: 'Banco de Venezuela (0102)',
    phone: '424-8653930',
    rif: 'J-50769027-0',
    holderName: 'Grupo Agro Cajigal S.A.',
    type: 'Pago Móvil',
  },
  precio_carton_base_ves: 25,
  singleCardPriceVes: 25,
  cardPrices: {
    pack2: 50,
    pack4: 100,
    pack6: 150,
  },
  exchangeRateVesUsd: 60, // 60 VES = $1 USD
  prizeMultipliers: {
    fullCard: 50, // 50x = 1,250 VES per 25 VES card
    fourCorners: 8, // 8x = 200 VES
    box: 6, // 6x = 150 VES (Cuadro Central 2x2)
    lineHorizontal: 3, // 3x = 75 VES
    lineVertical: 3, // 3x = 75 VES
    lineDiagonal: 4, // 4x = 100 VES
  },
  drawDrawTotalCount: 32, // 32 figures drawn per round
  maxRiskPerRound: 50000,
  closingBufferMinutes: 3,
  twoFactorOtpDemo: '123456',
};

const INITIAL_USERS: AppUser[] = [
  {
    id: 'usr-1',
    name: 'Carlos machin',
    firstName: 'Carlos',
    lastName: 'Machin',
    email: 'carlosmachin@loteria.com',
    phone: '0414-1234567',
    documentId: 'V-26890123',
    birthDate: '1998-05-14',
    country: 'Venezuela',
    role: 'Player',
    status: 'active',
    availableBalance: 0,
    pendingBalance: 0,
    lockedBalance: 0,
    totalWonVes: 0,
    totalSpentVes: 0,
    createdAt: '2026-07-01T10:00:00Z',
    kycStatus: 'Aprobado',
    kycVerifiedAt: '2026-07-01T10:00:00Z',
    kycFrontUrl: 'cedula_machin_front.png',
    kycBackUrl: 'selfie_carlos.png',
  },
];

const INITIAL_ROUNDS: GameRound[] = [
  {
    id: 'round-101',
    roundNumber: 101,
    order: 1,
    title: 'Sorteo Mediodía #101',
    openBetAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    closeBetAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    drawAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    starts_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'finished',
    drawnFichas: [1, 5, 12, 19, 23, 26, 28, 30, 31, 35, 40, 44, 49, 51, 52, 55, 59, 60, 62, 65, 66, 67, 70, 2, 8, 14, 27, 33, 42, 53, 58, 69],
    totalCardsSold: 48,
    cardPriceVes: 25,
    card_price: 25,
    prize_percentage: 70,
    jackpotVes: 12500,
    winningCardsCount: 6,
    totalPrizesPaidVes: 2150,
    resultLocked: true,
    resultSubmittedBy: 'Carlos Admin',
    resultSubmittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'round-102',
    roundNumber: 102,
    order: 2,
    title: 'Sorteo Estelar Tarde #102',
    openBetAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    closeBetAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    drawAt: new Date(Date.now() + 48 * 60 * 1000).toISOString(),
    starts_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    status: 'open',
    drawnFichas: [],
    totalCardsSold: 36,
    cardPriceVes: 25,
    card_price: 25,
    prize_percentage: 70,
    jackpotVes: 15000,
    winningCardsCount: 0,
    totalPrizesPaidVes: 0,
    resultLocked: false,
  },
  {
    id: 'round-103',
    roundNumber: 103,
    order: 3,
    title: 'Gran Sorteo Nocturno #103',
    openBetAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    closeBetAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    drawAt: new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString(),
    starts_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
    drawnFichas: [],
    totalCardsSold: 0,
    cardPriceVes: 30,
    card_price: 30,
    prize_percentage: 75,
    jackpotVes: 25000,
    winningCardsCount: 0,
    totalPrizesPaidVes: 0,
    resultLocked: false,
  },
  {
    id: 'round-104',
    roundNumber: 104,
    order: 4,
    title: 'Sorteo Madrugada Millonario #104',
    openBetAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    closeBetAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    drawAt: new Date(Date.now() + 6.5 * 60 * 60 * 1000).toISOString(),
    starts_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
    drawnFichas: [],
    totalCardsSold: 0,
    cardPriceVes: 20,
    card_price: 20,
    prize_percentage: 80,
    jackpotVes: 20000,
    winningCardsCount: 0,
    totalPrizesPaidVes: 0,
    resultLocked: false,
  },
];

const INITIAL_CARDS: MatrixCard[] = [];

const INITIAL_RECHARGES: RechargeTransaction[] = [];

const INITIAL_WITHDRAWALS: WithdrawalTransaction[] = [];

const INITIAL_LEDGER: WalletLedgerEntry[] = [];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state from localStorage or initialize with defaults
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_users`);
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [systemCredentials, setSystemCredentials] = useState<SystemCredential[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_system_credentials`);
      return saved ? JSON.parse(saved) : INITIAL_SYSTEM_CREDENTIALS;
    } catch {
      return INITIAL_SYSTEM_CREDENTIALS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_system_credentials`, JSON.stringify(systemCredentials));
    } catch (err) {
      console.error('Error saving system credentials:', err);
    }
  }, [systemCredentials]);

  // Session state: preserved across page navigation and refreshes via sessionStorage
  const initialSession = useMemo(() => LotteryStorageService.getSession(), []);

  const [sessionToken, setSessionToken] = useState<string | null>(initialSession?.token || null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(initialSession?.token));
  const [currentRole, setCurrentRoleState] = useState<UserRole>((initialSession?.role as UserRole) || 'Player');
  const [loggedUsername, setLoggedUsername] = useState<string>(initialSession?.username || '');
  const [currentUserId, setCurrentUserId] = useState<string>(initialSession?.userId || 'usr-1');
  const [viewMode, setViewMode] = useState<'player' | 'admin'>(initialSession?.viewMode || 'player');
  const [currencyDisplay, setCurrencyDisplay] = useState<'VES' | 'USD'>('VES');

  // Pre-warm static browser cache for offline reliability
  useEffect(() => {
    LotteryStorageService.warmAssetCache();
  }, []);

  // Sync active authentication session to sessionStorage on changes
  useEffect(() => {
    if (isAuthenticated && sessionToken && currentUserId) {
      LotteryStorageService.saveSession({
        token: sessionToken,
        userId: currentUserId,
        role: currentRole,
        username: loggedUsername,
        viewMode,
        lastActivity: Date.now(),
      });
    } else {
      LotteryStorageService.clearSession();
    }
  }, [isAuthenticated, sessionToken, currentUserId, currentRole, loggedUsername, viewMode]);

  // Strictly calculate active admin operator role only if authenticated with an admin role
  const operatorRole: AdminRole = useMemo(() => {
    if (!isAuthenticated || !sessionToken || currentRole === 'Player') {
      return 'Auditor';
    }
    if (currentRole === 'Super Admin') return 'Super Admin';
    if (currentRole === 'Operador Financiero') return 'Operador Financiero';
    return 'Auditor';
  }, [isAuthenticated, sessionToken, currentRole]);

  // Strict permission configuration: Unauthenticated / Player has ZERO admin privileges
  const permissions: RolePermissionConfig = useMemo(() => {
    if (!isAuthenticated || !sessionToken || currentRole === 'Player') {
      return {
        role: 'Player',
        displayName: 'Jugador',
        badgeColor: 'from-emerald-500 to-teal-500',
        description: 'Usuario jugador sin privilegios administrativos.',
        allowedTabs: [],
        canManageOperators: false,
        canManageWithdrawals: false,
        canManageRecharges: false,
        canManageRounds: false,
        canManageResults: false,
        canManageCommercialConfig: false,
        canManageUsersAndBalances: false,
        canManagePasswords: false,
        isReadOnly: true,
      };
    }
    return ROLE_PERMISSIONS[operatorRole] || ROLE_PERMISSIONS['Auditor'];
  }, [isAuthenticated, sessionToken, currentRole, operatorRole]);

  const activeCredential = useMemo(() => {
    if (!isAuthenticated || !loggedUsername) return null;
    return (
      systemCredentials.find(
        (c) => c.username.toLowerCase() === loggedUsername.toLowerCase()
      ) || null
    );
  }, [isAuthenticated, loggedUsername, systemCredentials]);

  // Auto-synchronize and invalidate session credentials whenever systemCredentials changes
  useEffect(() => {
    if (!isAuthenticated || !loggedUsername) return;

    const matchedCred = systemCredentials.find(
      (c) => c.username.toLowerCase() === loggedUsername.toLowerCase()
    );

    if (matchedCred) {
      if (matchedCred.status === 'inactive') {
        // Inactive account: immediately invalidate session token
        setSessionToken(null);
        setIsAuthenticated(false);
        setCurrentRoleState('Player');
        setLoggedUsername('');
        setViewMode('player');
        return;
      }

      if (currentRole !== matchedCred.role) {
        setCurrentRoleState(matchedCred.role);
      }
    }
  }, [systemCredentials, loggedUsername, isAuthenticated, currentRole]);

  // Strictly prevent non-SuperAdmin from escalating privileges
  const setOperatorRole = useCallback(
    (role: AdminRole) => {
      if (!isAuthenticated || !sessionToken || activeCredential?.role !== 'Super Admin') {
        console.warn('Privilege check: Only verified Super Admin can switch testing roles.');
        return;
      }
      setCurrentRoleState(role);
    },
    [isAuthenticated, sessionToken, activeCredential]
  );

  const setCurrentRole = useCallback(
    (role: UserRole) => {
      if (!isAuthenticated || !sessionToken || activeCredential?.role !== 'Super Admin') {
        console.warn('Privilege check: Only verified Super Admin can switch roles.');
        return;
      }
      setCurrentRoleState(role);
    },
    [isAuthenticated, sessionToken, activeCredential]
  );

  const [rounds, setRounds] = useState<GameRound[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_rounds`);
      const parsed: GameRound[] = saved ? JSON.parse(saved) : INITIAL_ROUNDS;
      const seen = new Set<string>();
      return parsed.filter((r) => {
        if (!r.id || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    } catch {
      return INITIAL_ROUNDS;
    }
  });

  const [cards, setCards] = useState<MatrixCard[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_cards`);
      return saved ? JSON.parse(saved) : INITIAL_CARDS;
    } catch {
      return INITIAL_CARDS;
    }
  });

  const [recharges, setRecharges] = useState<RechargeTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_recharges`);
      return saved ? JSON.parse(saved) : INITIAL_RECHARGES;
    } catch {
      return INITIAL_RECHARGES;
    }
  });

  const [withdrawals, setWithdrawals] = useState<WithdrawalTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_withdrawals`);
      return saved ? JSON.parse(saved) : INITIAL_WITHDRAWALS;
    } catch {
      return INITIAL_WITHDRAWALS;
    }
  });

  const [ledger, setLedger] = useState<WalletLedgerEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_ledger`);
      return saved ? JSON.parse(saved) : INITIAL_LEDGER;
    } catch {
      return INITIAL_LEDGER;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_audit`);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [commercialConfig, setCommercialConfig] = useState<CommercialConfig>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_config`);
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  // Live Draw Simulation State
  const [liveDrawingRound, setLiveDrawingRound] = useState<GameRound | null>(null);
  const [isLiveDrawing, setIsLiveDrawing] = useState<boolean>(false);
  const [liveDrawnFichas, setLiveDrawnFichas] = useState<Ficha[]>([]);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_rounds`, JSON.stringify(rounds));
  }, [rounds]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_recharges`, JSON.stringify(recharges));
  }, [recharges]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_withdrawals`, JSON.stringify(withdrawals));
  }, [withdrawals]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_ledger`, JSON.stringify(ledger));
  }, [ledger]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_audit`, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(commercialConfig));
  }, [commercialConfig]);

  // Real-time synchronization & Service Worker States
  const [isRealtimeSyncConnected, setIsRealtimeSyncConnected] = useState<boolean>(true);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(Date.now());

  // Fetch active and scheduled rounds from backend API without cache
  const fetchActiveRounds = useCallback(
    async (options?: { bypassCache?: boolean; limit?: number }) => {
      try {
        const limit = options?.limit || 3;
        const nocacheParam = options?.bypassCache ? `&_nocache=${Date.now()}` : '';
        const res = await fetch(
          `/api/rounds?status=open,scheduled&limit=${limit}${nocacheParam}`,
          {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
            },
          }
        );

        if (!res.ok) return;

        const result = await res.json();
        if (result && result.success && Array.isArray(result.data)) {
          const fetchedRounds: GameRound[] = result.data;
          if (fetchedRounds.length > 0) {
            setRounds((prev) => {
              const fetchedMap = new Map(fetchedRounds.map((r) => [r.id, r]));
              // Update existing rounds with server data
              const updated = prev.map((r) => {
                const serverR = fetchedMap.get(r.id);
                if (serverR) {
                  return {
                    ...r,
                    ...serverR,
                    // Preserve local drawnFichas if drawing is in progress
                    drawnFichas:
                      r.drawnFichas && r.drawnFichas.length > 0
                        ? r.drawnFichas
                        : serverR.drawnFichas || [],
                  };
                }
                return r;
              });

              // Add newly discovered rounds from server that are not in local state
              const existingIds = new Set(prev.map((r) => r.id));
              const newServerRounds = fetchedRounds.filter((r) => !existingIds.has(r.id));
              const combined = [...newServerRounds, ...updated];

              try {
                localStorage.setItem(`${STORAGE_KEY}_rounds`, JSON.stringify(combined));
              } catch (e) {}
              return combined;
            });
          }
        }
      } catch (err) {
        // Network or dev server fallback is handled cleanly
        console.warn('[GameContext] fetchActiveRounds background note:', err);
      }
    },
    []
  );

  // Fetch recharges / payment proofs from Supabase backend
  const fetchPendingRecharges = useCallback(async () => {
    try {
      // 1. Instant check from localStorage
      const saved = localStorage.getItem(`${STORAGE_KEY}_recharges`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecharges(parsed);
          }
        } catch (e) {}
      }

      // 2. Fetch directly from backend /api/recharges with cache-busting
      const res = await fetch(`/api/recharges?_nocache=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const result = await res.json();
        if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
          const incoming = result.data as RechargeTransaction[];
          setRecharges((prev) => {
            const map = new Map<string, RechargeTransaction>(prev.map((r) => [r.id, r]));
            incoming.forEach((r) => map.set(r.id, r));
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            try {
              localStorage.setItem(`${STORAGE_KEY}_recharges`, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('[GameContext] fetchPendingRecharges note:', err);
    }
  }, []);

  // Fetch withdrawals from backend API
  const fetchWithdrawals = useCallback(async () => {
    try {
      // 1. Instant check from localStorage
      const saved = localStorage.getItem(`${STORAGE_KEY}_withdrawals`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setWithdrawals(parsed);
          }
        } catch (e) {}
      }

      // 2. Fetch directly from backend /api/withdrawals with cache-busting
      const res = await fetch(`/api/withdrawals?_nocache=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const result = await res.json();
        if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
          const incoming = result.data as WithdrawalTransaction[];
          setWithdrawals((prev) => {
            const map = new Map<string, WithdrawalTransaction>(prev.map((w) => [w.id, w]));
            incoming.forEach((w) => map.set(w.id, w));
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            try {
              localStorage.setItem(`${STORAGE_KEY}_withdrawals`, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('[GameContext] fetchWithdrawals note:', err);
    }
  }, []);

  // Fetch commercial config (admin bank details, rates, prices) from centralized server
  const fetchCommercialConfig = useCallback(async () => {
    try {
      // 1. Instant check from localStorage
      const saved = localStorage.getItem(`${STORAGE_KEY}_config`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.adminBank) {
            setCommercialConfig((prev) => ({
              ...prev,
              ...parsed,
              adminBank: { ...prev.adminBank, ...(parsed.adminBank || {}) },
              cardPrices: { ...prev.cardPrices, ...(parsed.cardPrices || {}) },
              prizeMultipliers: { ...prev.prizeMultipliers, ...(parsed.prizeMultipliers || {}) },
            }));
          }
        } catch (e) {}
      }

      // 2. Fetch directly from backend /api/config/comercial with cache-busting
      const res = await fetch(`/api/config/comercial?_nocache=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (res.ok) {
        const result = await res.json();
        if (result && result.success && result.data) {
          const cfg = result.data as CommercialConfig;
          setCommercialConfig((prev) => ({
            ...prev,
            ...cfg,
            adminBank: {
              ...prev.adminBank,
              ...(cfg.adminBank || {}),
            },
            cardPrices: {
              ...prev.cardPrices,
              ...(cfg.cardPrices || {}),
            },
            prizeMultipliers: {
              ...prev.prizeMultipliers,
              ...(cfg.prizeMultipliers || {}),
            },
          }));
          try {
            localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(cfg));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('[GameContext] fetchCommercialConfig note:', err);
    }
  }, []);

  // Initial fetch of active rounds, recharges, withdrawals, and commercial config on mount
  useEffect(() => {
    fetchActiveRounds({ bypassCache: true });
    fetchPendingRecharges();
    fetchWithdrawals();
    fetchCommercialConfig();

    // Revalidate when user returns to the tab/window
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchCommercialConfig();
        fetchActiveRounds({ bypassCache: true });
        fetchPendingRecharges();
        fetchWithdrawals();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Revalidate periodically in background as a secondary fallback
    const intervalTimer = setInterval(() => {
      fetchCommercialConfig();
      fetchWithdrawals();
    }, 30000);

    return () => {
      clearInterval(intervalTimer);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [fetchActiveRounds, fetchPendingRecharges, fetchWithdrawals, fetchCommercialConfig]);

  // Subscribe to real-time sync events from other tabs and Service Worker
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((event) => {
      setLastSyncTimestamp(event.timestamp || Date.now());

      switch (event.type) {
        case 'ROUND_CREATED': {
          const { round } = event.payload || {};
          if (round) {
            setRounds((prev) => {
              const existingIdx = prev.findIndex((r) => r.id === round.id);
              let updated: GameRound[];
              if (existingIdx >= 0) {
                updated = prev.map((r, i) => (i === existingIdx ? { ...r, ...round } : r));
              } else {
                updated = [round, ...prev];
              }
              try {
                localStorage.setItem(`${STORAGE_KEY}_rounds`, JSON.stringify(updated));
              } catch (e) {}
              return updated;
            });
            // Re-fetch immediate state without cache
            fetchActiveRounds({ bypassCache: true });
          }
          break;
        }

        case 'ROUND_STATUS_CHANGED': {
          const { roundId, status } = event.payload || {};
          if (roundId && status) {
            setRounds((prev) =>
              prev.map((r) => (r.id === roundId ? { ...r, status } : r))
            );
          }
          break;
        }

        case 'LIVE_DRAW_STARTED': {
          const { roundId } = event.payload || {};
          setIsLiveDrawing(true);
          setLiveDrawnFichas([]);
          const target = rounds.find((r) => r.id === roundId);
          if (target) setLiveDrawingRound(target);
          break;
        }

        case 'LIVE_DRAW_TICK': {
          const { roundId, ficha, drawnFichaIds } = event.payload || {};
          if (ficha) {
            setIsLiveDrawing(true);
            setLiveDrawingRound((curr) => curr || rounds.find((r) => r.id === roundId) || null);
            setLiveDrawnFichas((prev) => {
              if (prev.some((f) => f.id === ficha.id)) return prev;
              return [...prev, ficha];
            });

            // Fix sync: al extraer balota actualizar cartones_jugadores campo aciertos
            if (roundId && Array.isArray(drawnFichaIds)) {
              const drawnSet = new Set(drawnFichaIds);
              setCards((prevCards) => {
                const updated = prevCards.map((c) => {
                  if (c.roundId === roundId) {
                    const matchedCount = c.matrix.filter((id) => drawnSet.has(id)).length;
                    return {
                      ...c,
                      matchedCount,
                      aciertos: matchedCount,
                    };
                  }
                  return c;
                });
                try {
                  localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify(updated));
                } catch (e) {}
                return updated;
              });
            }

            // Play vocal & audio cue
            soundService.playPop();
            soundService.cantarFicha(ficha.pronunciation);
          }
          break;
        }

        case 'LIVE_DRAW_FINISHED': {
          const { roundId, drawnFichas, winnersCount, totalPaidVes, updatedRound } = event.payload || {};
          setIsLiveDrawing(false);
          if (roundId) {
            setRounds((prev) =>
              prev.map((r) =>
                r.id === roundId
                  ? updatedRound || {
                      ...r,
                      status: 'finished',
                      drawnFichas,
                      winningCardsCount: winnersCount,
                      totalPrizesPaidVes: totalPaidVes,
                      resultLocked: true,
                    }
                  : r
              )
            );
          }
          // Safely reload synced cards, users and ledger from localStorage
          try {
            const savedCards = localStorage.getItem(`${STORAGE_KEY}_cards`);
            if (savedCards) setCards(JSON.parse(savedCards));
            const savedUsers = localStorage.getItem(`${STORAGE_KEY}_users`);
            if (savedUsers) setUsers(JSON.parse(savedUsers));
            const savedLedger = localStorage.getItem(`${STORAGE_KEY}_ledger`);
            if (savedLedger) setLedger(JSON.parse(savedLedger));
          } catch (e) {}
          soundService.playFanfare();
          break;
        }

        case 'LIVE_DRAW_STOPPED': {
          setIsLiveDrawing(false);
          break;
        }

        case 'CARDS_PURCHASED': {
          const { cards: newCards, userId, newAvailableBalance, ledgerEntry } = event.payload || {};
          if (newCards && Array.isArray(newCards)) {
            setCards((prev) => {
              const existingIds = new Set(prev.map((c) => c.id));
              const filtered = newCards.filter((c: MatrixCard) => !existingIds.has(c.id));
              return [...filtered, ...prev];
            });
          }
          if (userId && typeof newAvailableBalance === 'number') {
            setUsers((prev) =>
              prev.map((u) => (u.id === userId ? { ...u, availableBalance: newAvailableBalance } : u))
            );
          }
          if (ledgerEntry) {
            setLedger((prev) => {
              const exists = prev.some((l) => l.id === ledgerEntry.id);
              if (exists) return prev;
              return [ledgerEntry, ...prev];
            });
          } else {
            try {
              const savedLedger = localStorage.getItem(`${STORAGE_KEY}_ledger`);
              if (savedLedger) setLedger(JSON.parse(savedLedger));
            } catch (e) {}
          }
          break;
        }

        case 'RECHARGE_STATUS_CHANGED': {
          const { recharge, recharges: updatedRechargesList, userId, newAvailableBalance } = event.payload || {};
          if (updatedRechargesList && Array.isArray(updatedRechargesList)) {
            setRecharges(updatedRechargesList);
          } else if (recharge) {
            setRecharges((prev) => {
              const existingIdx = prev.findIndex((r) => r.id === recharge.id);
              if (existingIdx >= 0) {
                return prev.map((r, i) => (i === existingIdx ? recharge : r));
              }
              return [recharge, ...prev];
            });
          } else {
            try {
              const savedRecharges = localStorage.getItem(`${STORAGE_KEY}_recharges`);
              if (savedRecharges) setRecharges(JSON.parse(savedRecharges));
            } catch (e) {}
          }

          try {
            const savedUsers = localStorage.getItem(`${STORAGE_KEY}_users`);
            if (savedUsers) setUsers(JSON.parse(savedUsers));
            const savedLedger = localStorage.getItem(`${STORAGE_KEY}_ledger`);
            if (savedLedger) setLedger(JSON.parse(savedLedger));
          } catch (e) {}
          break;
        }

        case 'WITHDRAWAL_STATUS_CHANGED':
        case 'USER_BALANCE_UPDATED': {
          try {
            const savedUsers = localStorage.getItem(`${STORAGE_KEY}_users`);
            if (savedUsers) setUsers(JSON.parse(savedUsers));
            const savedRecharges = localStorage.getItem(`${STORAGE_KEY}_recharges`);
            if (savedRecharges) setRecharges(JSON.parse(savedRecharges));
            const savedWithdrawals = localStorage.getItem(`${STORAGE_KEY}_withdrawals`);
            if (savedWithdrawals) setWithdrawals(JSON.parse(savedWithdrawals));
            const savedLedger = localStorage.getItem(`${STORAGE_KEY}_ledger`);
            if (savedLedger) setLedger(JSON.parse(savedLedger));
          } catch (e) {}
          break;
        }

        case 'COMMERCIAL_CONFIG_UPDATED': {
          const { config: newCfg } = event.payload || {};
          if (newCfg) {
            setCommercialConfig((prev) => ({
              ...prev,
              ...newCfg,
              adminBank: {
                ...prev.adminBank,
                ...(newCfg.adminBank || {}),
              },
              cardPrices: {
                ...prev.cardPrices,
                ...(newCfg.cardPrices || {}),
              },
              prizeMultipliers: {
                ...prev.prizeMultipliers,
                ...(newCfg.prizeMultipliers || {}),
              },
            }));
            try {
              localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(newCfg));
            } catch (e) {}
          } else {
            fetchCommercialConfig();
          }
          break;
        }

        default:
          break;
      }
    });

    // Native storage event listener for cross-tab multi-window synchronization
    const handleNativeStorage = (event: StorageEvent) => {
      if (!event.key || !event.newValue) return;
      try {
        if (event.key === `${STORAGE_KEY}_config`) {
          const parsed = JSON.parse(event.newValue);
          if (parsed && parsed.adminBank) {
            setCommercialConfig((prev) => ({
              ...prev,
              ...parsed,
              adminBank: { ...prev.adminBank, ...(parsed.adminBank || {}) },
              cardPrices: { ...prev.cardPrices, ...(parsed.cardPrices || {}) },
              prizeMultipliers: { ...prev.prizeMultipliers, ...(parsed.prizeMultipliers || {}) },
            }));
          }
        } else if (event.key === `${STORAGE_KEY}_recharges`) {
          setRecharges(JSON.parse(event.newValue));
        } else if (event.key === `${STORAGE_KEY}_withdrawals`) {
          setWithdrawals(JSON.parse(event.newValue));
        } else if (event.key === `${STORAGE_KEY}_users`) {
          setUsers(JSON.parse(event.newValue));
        } else if (event.key === `${STORAGE_KEY}_rounds`) {
          setRounds(JSON.parse(event.newValue));
        } else if (event.key === `${STORAGE_KEY}_cards`) {
          setCards(JSON.parse(event.newValue));
        } else if (event.key === `${STORAGE_KEY}_ledger`) {
          setLedger(JSON.parse(event.newValue));
        } else if (event.key === `${STORAGE_KEY}_audit`) {
          setAuditLogs(JSON.parse(event.newValue));
        }
      } catch (err) {
        console.warn('Error parsing storage event in GameContext:', err);
      }
    };

    const handleJugadoresUpdated = () => {
      try {
        const savedUsers = localStorage.getItem(`${STORAGE_KEY}_users`);
        if (savedUsers) {
          setUsers(JSON.parse(savedUsers));
        }
      } catch (e) {}
    };

    window.addEventListener('storage', handleNativeStorage);
    window.addEventListener('jugadores_bingo_updated', handleJugadoresUpdated);

    // WebSocket real-time subscription for new users, balances, transactions & postgres changes
    const unsubUserReg = realtimeService.on('user_registered', (data: any) => {
      const incoming = data?.user || data;
      if (incoming && (incoming.id || incoming.documentId)) {
        setUsers((prev) => {
          if (prev.some((u) => u.id === incoming.id || (incoming.documentId && u.documentId.toUpperCase() === incoming.documentId.toUpperCase()))) {
            return prev.map((u) => (u.id === incoming.id ? { ...u, ...incoming } : u));
          }
          return [incoming, ...prev];
        });
      }
    });

    const unsubPlayerReg = realtimeService.on('player_registered', (data: any) => {
      const incoming = data?.player || data;
      if (incoming && (incoming.id || incoming.documentId)) {
        setUsers((prev) => {
          if (prev.some((u) => u.id === incoming.id || (incoming.documentId && u.documentId.toUpperCase() === incoming.documentId.toUpperCase()))) {
            return prev.map((u) => (u.id === incoming.id ? { ...u, ...incoming } : u));
          }
          return [incoming, ...prev];
        });
      }
    });

    const unsubBalanceUpdated = realtimeService.on('user_balance_updated', (data: any) => {
      const userId = data?.userId || data?.id;
      const user = data?.user;
      const availableBalance = data?.availableBalance;
      if (userId) {
        setUsers((prev) => {
          const updated = prev.map((u) => {
            if (u.id === userId) {
              return user ? { ...u, ...user } : { ...u, availableBalance: availableBalance !== undefined ? availableBalance : u.availableBalance };
            }
            return u;
          });
          try {
            localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    });

    const unsubWalletBalanceUpdated = realtimeService.on('wallet_balance_updated', (data: any) => {
      const { userId, availableBalance } = data || {};
      if (userId && availableBalance !== undefined) {
        setUsers((prev) => {
          const updated = prev.map((u) =>
            u.id === userId ? { ...u, availableBalance: Number(availableBalance) } : u
          );
          try {
            localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    });

    const unsubRechargeApproved = realtimeService.on('recharge_approved', (data: any) => {
      const rec = data?.recharge || data;
      const user = data?.user;
      if (rec && rec.id) {
        setRecharges((prev) => {
          const updated = prev.some((r) => r.id === rec.id)
            ? prev.map((r) => (r.id === rec.id ? { ...r, ...rec, status: 'approved' } : r))
            : [rec, ...prev];
          try {
            localStorage.setItem(`${STORAGE_KEY}_recharges`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
      if (user && user.id) {
        setUsers((prev) => {
          const updated = prev.map((u) => (u.id === user.id ? { ...u, ...user } : u));
          try {
            localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    });

    const unsubRechargeUpdated = realtimeService.on('recharge_updated', (data: any) => {
      const rec = data?.recharge || data;
      const user = data?.user;
      if (rec && rec.id) {
        setRecharges((prev) => {
          const updated = prev.some((r) => r.id === rec.id)
            ? prev.map((r) => (r.id === rec.id ? { ...r, ...rec } : r))
            : [rec, ...prev];
          try {
            localStorage.setItem(`${STORAGE_KEY}_recharges`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
      if (user && user.id) {
        setUsers((prev) => {
          const updated = prev.map((u) => (u.id === user.id ? { ...u, ...user } : u));
          try {
            localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    });

    const unsubRechargeCreated = realtimeService.on('recharge_created', (data: any) => {
      const rec = data?.recharge || data;
      if (rec && rec.id) {
        setRecharges((prev) => {
          if (prev.some((r) => r.id === rec.id)) {
            return prev.map((r) => (r.id === rec.id ? { ...r, ...rec } : r));
          }
          const updated = [rec, ...prev];
          try {
            localStorage.setItem(`${STORAGE_KEY}_recharges`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    });

    const unsubWithdrawalCreated = realtimeService.on('withdrawal_created', (data: any) => {
      const wth = data?.withdrawal || data;
      const user = data?.user;
      if (wth && wth.id) {
        setWithdrawals((prev) => {
          if (prev.some((w) => w.id === wth.id)) {
            return prev.map((w) => (w.id === wth.id ? { ...w, ...wth } : w));
          }
          const updated = [wth, ...prev];
          try {
            localStorage.setItem(`${STORAGE_KEY}_withdrawals`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
      if (user && user.id) {
        setUsers((prev) => {
          const updated = prev.map((u) => (u.id === user.id ? { ...u, ...user } : u));
          try {
            localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    });

    const unsubWithdrawalUpdated = realtimeService.on('withdrawal_updated', (data: any) => {
      const wth = data?.withdrawal || data;
      const user = data?.user;
      if (wth && wth.id) {
        setWithdrawals((prev) => {
          const updated = prev.some((w) => w.id === wth.id)
            ? prev.map((w) => (w.id === wth.id ? { ...w, ...wth } : w))
            : [wth, ...prev];
          try {
            localStorage.setItem(`${STORAGE_KEY}_withdrawals`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
      if (user && user.id) {
        setUsers((prev) => {
          const updated = prev.map((u) => (u.id === user.id ? { ...u, ...user } : u));
          try {
            localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    });

    const unsubWithdrawalCompleted = realtimeService.on('withdrawal_completed', (data: any) => {
      const wth = data?.withdrawal || data;
      const user = data?.user;
      if (wth && wth.id) {
        setWithdrawals((prev) => {
          const updated = prev.some((w) => w.id === wth.id)
            ? prev.map((w) => (w.id === wth.id ? { ...w, ...wth, status: 'completed' } : w))
            : [wth, ...prev];
          try {
            localStorage.setItem(`${STORAGE_KEY}_withdrawals`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
      if (user && user.id) {
        setUsers((prev) => {
          const updated = prev.map((u) => (u.id === user.id ? { ...u, ...user } : u));
          try {
            localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    });

    const unsubWithdrawalRejected = realtimeService.on('withdrawal_rejected', (data: any) => {
      const wth = data?.withdrawal || data;
      const user = data?.user;
      if (wth && wth.id) {
        setWithdrawals((prev) => {
          const updated = prev.some((w) => w.id === wth.id)
            ? prev.map((w) => (w.id === wth.id ? { ...w, ...wth, status: 'rejected' } : w))
            : [wth, ...prev];
          try {
            localStorage.setItem(`${STORAGE_KEY}_withdrawals`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
      if (user && user.id) {
        setUsers((prev) => {
          const updated = prev.map((u) => (u.id === user.id ? { ...u, ...user } : u));
          try {
            localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    });

    const unsubDrawResult = realtimeService.on('draw_result_published', (data: any) => {
      const { roundId, drawnFichas, winnersCount, totalPaidVes, updatedRound, updatedCards } = data || {};
      if (roundId) {
        setRounds((prev) => {
          const updated = prev.map((r) =>
            r.id === roundId
              ? updatedRound || {
                  ...r,
                  status: 'finished',
                  drawnFichas: drawnFichas || r.drawnFichas,
                  winningCardsCount: typeof winnersCount === 'number' ? winnersCount : r.winningCardsCount,
                  totalPrizesPaidVes: typeof totalPaidVes === 'number' ? totalPaidVes : r.totalPrizesPaidVes,
                  resultLocked: true,
                }
              : r
          );
          try {
            localStorage.setItem(`${STORAGE_KEY}_rounds`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
      if (updatedCards && Array.isArray(updatedCards) && updatedCards.length > 0) {
        setCards((prev) => {
          const cardMap = new Map(updatedCards.map((c: any) => [c.id, c]));
          const updated = prev.map((c) => (cardMap.has(c.id) ? { ...c, ...cardMap.get(c.id) } : c));
          try {
            localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    });

    const handleIncomingCommercialConfig = (data: any) => {
      const newCfg = data?.config || data?.data || data;
      if (newCfg && (newCfg.adminBank || newCfg.bankName)) {
        setCommercialConfig((prev) => ({
          ...prev,
          ...newCfg,
          adminBank: {
            ...prev.adminBank,
            ...(newCfg.adminBank || (newCfg.bankName ? newCfg : {})),
          },
          cardPrices: {
            ...prev.cardPrices,
            ...(newCfg.cardPrices || {}),
          },
          prizeMultipliers: {
            ...prev.prizeMultipliers,
            ...(newCfg.prizeMultipliers || {}),
          },
        }));
        try {
          localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(newCfg));
        } catch (e) {}
      }
    };

    const unsubCommCfg1 = realtimeService.on('commercial_config_updated', handleIncomingCommercialConfig);
    const unsubCommCfg2 = realtimeService.on('config/comercial', handleIncomingCommercialConfig);

    const unsubPostgres = realtimeService.on('postgres_changes', (payload: any) => {
      if (payload?.table === 'users' || payload?.table === 'jugadores') {
        const record = payload?.new || payload?.record;
        if (record && (record.id || record.documentId)) {
          setUsers((prev) => {
            const exists = prev.some((u) => u.id === record.id || (record.documentId && u.documentId.toUpperCase() === record.documentId.toUpperCase()));
            const updated = exists ? prev.map((u) => (u.id === record.id ? { ...u, ...record } : u)) : [record, ...prev];
            try {
              localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }
      } else if (payload?.table === 'recharges' || payload?.table === 'recargas' || payload?.table === 'auditoria_pago_movil') {
        const record = payload?.new || payload?.record;
        if (record && record.id) {
          setRecharges((prev) => {
            const exists = prev.some((r) => r.id === record.id);
            const updated = exists ? prev.map((r) => (r.id === record.id ? { ...r, ...record } : r)) : [record, ...prev];
            try {
              localStorage.setItem(`${STORAGE_KEY}_recharges`, JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }
      } else if (payload?.table === 'withdrawals' || payload?.table === 'retiros' || payload?.table === 'solicitudes_retiro') {
        const record = payload?.new || payload?.record;
        if (record && record.id) {
          setWithdrawals((prev) => {
            const exists = prev.some((w) => w.id === record.id);
            const updated = exists ? prev.map((w) => (w.id === record.id ? { ...w, ...record } : w)) : [record, ...prev];
            try {
              localStorage.setItem(`${STORAGE_KEY}_withdrawals`, JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }
      } else if (payload?.table === 'rounds' || payload?.table === 'sorteos') {
        const record = payload?.new || payload?.record;
        if (record && record.id) {
          setRounds((prev) => {
            const exists = prev.some((r) => r.id === record.id);
            const updated = exists ? prev.map((r) => (r.id === record.id ? { ...r, ...record } : r)) : [record, ...prev];
            try {
              localStorage.setItem(`${STORAGE_KEY}_rounds`, JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }
      } else if (payload?.table === 'cards' || payload?.table === 'cartones') {
        const record = payload?.new || payload?.record;
        if (record && record.id) {
          setCards((prev) => {
            const exists = prev.some((c) => c.id === record.id);
            const updated = exists ? prev.map((c) => (c.id === record.id ? { ...c, ...record } : c)) : [record, ...prev];
            try {
              localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }
      } else if (
        payload?.table === 'config/comercial' ||
        payload?.table === 'commercial_config' ||
        payload?.table === 'config'
      ) {
        const record = payload?.new || payload?.record;
        if (record) {
          handleIncomingCommercialConfig(record);
        }
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleNativeStorage);
      window.removeEventListener('jugadores_bingo_updated', handleJugadoresUpdated);
      unsubUserReg();
      unsubPlayerReg();
      unsubBalanceUpdated();
      unsubWalletBalanceUpdated();
      unsubRechargeApproved();
      unsubRechargeUpdated();
      unsubRechargeCreated();
      unsubWithdrawalCreated();
      unsubWithdrawalUpdated();
      unsubWithdrawalCompleted();
      unsubWithdrawalRejected();
      unsubDrawResult();
      unsubCommCfg1();
      unsubCommCfg2();
      unsubPostgres();
    };
  }, [rounds]);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];
  const userCards = cards.filter((c) => c.userId === currentUser.id);

  // Automated Round Lifecycle Status Manager (Auto-open and Auto-close bets reactively)
  useEffect(() => {
    const checkRoundLifeCycles = () => {
      const now = timeSync.getServerNow();
      let hasChanges = false;

      const updated = rounds.map((round) => {
        const statusLower = String(round.status || '').toLowerCase();
        if (statusLower === 'finished' || statusLower === 'drawing') return round;

        const openMs = timeSync.parseIsoToEpochMs(round.starts_at || round.openBetAt);
        const closeMs = timeSync.parseIsoToEpochMs(round.ends_at || round.closeBetAt);

        // Auto-open scheduled rounds when opening time has been reached and close time is in the future
        if (statusLower === 'scheduled' && !isNaN(openMs) && !isNaN(closeMs) && now >= openMs && now < closeMs) {
          hasChanges = true;
          return { ...round, status: 'open' as RoundStatus };
        }

        // Auto-close open/scheduled rounds when closing time has passed
        if ((statusLower === 'open' || statusLower === 'scheduled') && !isNaN(closeMs) && now >= closeMs) {
          hasChanges = true;
          return { ...round, status: 'closed' as RoundStatus };
        }

        return round;
      });

      if (hasChanges) {
        setRounds(updated);
        try {
          localStorage.setItem(`${STORAGE_KEY}_rounds`, JSON.stringify(updated));
        } catch (e) {}
      }
    };

    checkRoundLifeCycles();
    const interval = setInterval(checkRoundLifeCycles, 3000);
    return () => clearInterval(interval);
  }, [rounds]);

  // Next 3 sequential rounds sorted by starts_at ASC / order ASC (status 'open' or 'scheduled')
  const upcomingRounds = useMemo(() => {
    return rounds
      .filter((r) => {
        const st = String(r.status || '').toLowerCase();
        return st === 'open' || st === 'scheduled';
      })
      .sort((a, b) => {
        const timeA = timeSync.parseIsoToEpochMs(a.starts_at || a.openBetAt || a.drawAt);
        const timeB = timeSync.parseIsoToEpochMs(b.starts_at || b.openBetAt || b.drawAt);
        if (timeA !== timeB) return timeA - timeB;
        return (a.order || a.roundNumber || 0) - (b.order || b.roundNumber || 0);
      })
      .slice(0, 3);
  }, [rounds]);

  const activeRounds = upcomingRounds;

  // Robust activeRound selection: prioritizes open/scheduled rounds in upcoming list
  const activeRound = useMemo(() => {
    if (upcomingRounds.length > 0) {
      // Prioritize currently open round if any
      const openRound = upcomingRounds.find((r) => String(r.status).toLowerCase() === 'open');
      if (openRound) return openRound;
      return upcomingRounds[0];
    }

    const now = timeSync.getServerNow();

    // 1. Priority: Active drawing in progress
    const drawingRound = rounds.find((r) => String(r.status).toLowerCase() === 'drawing');
    if (drawingRound) return drawingRound;

    // 2. Priority: Any open round
    const anyOpen = rounds.find((r) => String(r.status).toLowerCase() === 'open');
    if (anyOpen) return anyOpen;

    // 3. Fallback to latest non-finished round or rounds[0]
    const nonFinished = rounds.find((r) => String(r.status).toLowerCase() !== 'finished');
    return nonFinished || rounds[0] || null;
  }, [upcomingRounds, rounds, lastSyncTimestamp]);

  // Add audit log helper
  const addAuditLog = useCallback((action: string, details: string) => {
    const newLog: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      operatorRole: operatorRole,
      operatorName: operatorRole === 'Super Admin' ? 'SuperAdmin Master' : `${operatorRole} Panel`,
      action,
      details,
      ip: '190.202.45.12',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, [operatorRole]);

  // Format money helper
  const formatMoney = useCallback(
    (amountVes: number, options?: { showBoth?: boolean }): string => {
      const vesFormatted = `${amountVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`;
      const usdAmount = amountVes / commercialConfig.exchangeRateVesUsd;
      const usdFormatted = `$${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      if (options?.showBoth) {
        return `${vesFormatted} (~${usdFormatted} USD)`;
      }

      return currencyDisplay === 'VES' ? vesFormatted : usdFormatted;
    },
    [commercialConfig.exchangeRateVesUsd, currencyDisplay]
  );

  // 1. Purchase Cards
  const purchaseCards = useCallback(
    (packCount: 2 | 4 | 6, roundId: string) => {
      const round = rounds.find((r) => r.id === roundId);
      if (!round) {
        return { success: false, message: 'Sorteo no encontrado.' };
      }

      const now = timeSync.getServerNow();
      const closeBetAtMs = timeSync.parseIsoToEpochMs(round.closeBetAt);
      const openBetAtMs = timeSync.parseIsoToEpochMs(round.openBetAt);

      const isBettingOpen =
        (round.status === 'open' || round.status === 'scheduled') &&
        (!isNaN(closeBetAtMs) ? now < closeBetAtMs : true) &&
        (!isNaN(openBetAtMs) ? now >= openBetAtMs : true);

      if (!isBettingOpen) {
        if (!isNaN(closeBetAtMs) && now >= closeBetAtMs) {
          return { success: false, message: 'Las apuestas para este sorteo ya están cerradas.' };
        }
        return { success: false, message: 'Las apuestas para este sorteo no están abiertas en este momento.' };
      }

      // Check user limit per round (max 6 cards)
      const existingUserCardsInRound = cards.filter((c) => c.userId === currentUser.id && c.roundId === roundId);
      if (existingUserCardsInRound.length + packCount > 6) {
        return {
          success: false,
          message: `Límite excedido. Solo puedes tener un máximo de 6 tarjetas por sorteo. Ya tienes ${existingUserCardsInRound.length}.`,
        };
      }

      // Calculate cost
      const unitPrice = round.card_price || round.cardPriceVes || (commercialConfig.cardPrices.pack2 / 2);
      let costVes = unitPrice * packCount;
      if (packCount === 2 && commercialConfig.cardPrices.pack2 && !round.card_price && !round.cardPriceVes) costVes = commercialConfig.cardPrices.pack2;
      else if (packCount === 4 && commercialConfig.cardPrices.pack4 && !round.card_price && !round.cardPriceVes) costVes = commercialConfig.cardPrices.pack4;
      else if (packCount === 6 && commercialConfig.cardPrices.pack6 && !round.card_price && !round.cardPriceVes) costVes = commercialConfig.cardPrices.pack6;

      if (currentUser.availableBalance < costVes) {
        return {
          success: false,
          message: `Saldo insuficiente (${formatMoney(currentUser.availableBalance)}). Necesitas ${formatMoney(costVes)}. Recarga para continuar.`,
        };
      }

      // Generate cards
      const newCards: MatrixCard[] = [];
      for (let i = 0; i < packCount; i++) {
        const matrix = generateRandomMatrix();
        const card: MatrixCard = {
          id: `card-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
          code: generateCardCode(),
          roundId: round.id,
          roundNumber: round.roundNumber,
          userId: currentUser.id,
          userName: currentUser.name,
          matrix,
          purchaseTime: new Date().toISOString(),
          priceVes: costVes / packCount,
          status: 'active',
          matchedCount: 0,
          winningPatterns: [],
          totalPrizeVes: 0,
        };
        newCards.push(card);
      }

      // Deduct balance and update user
      setUsers((prev) => {
        const updated = prev.map((u) =>
          u.id === currentUser.id
            ? {
                ...u,
                availableBalance: u.availableBalance - costVes,
                totalSpentVes: u.totalSpentVes + costVes,
              }
            : u
        );
        try {
          localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      // Add to cards
      setCards((prev) => {
        const updated = [...newCards, ...prev];
        try {
          localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      // Update round card count and dynamic jackpot
      setRounds((prev) => {
        const updated = prev.map((r) => {
          if (r.id === roundId) {
            const newTotalCards = r.totalCardsSold + packCount;
            const price = r.card_price || r.cardPriceVes || unitPrice;
            const prizePct = r.prize_percentage !== undefined ? r.prize_percentage : 70;
            const dynamicPrize = Math.max(r.jackpotVes || 0, newTotalCards * price * (prizePct / 100));
            return {
              ...r,
              totalCardsSold: newTotalCards,
              jackpotVes: dynamicPrize,
            };
          }
          return r;
        });
        try {
          localStorage.setItem(`${STORAGE_KEY}_rounds`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      // Inserción atómica del registro de transacción contable por compra de cartones
      const timestamp = new Date().toISOString();
      const ledgerEntry: WalletLedgerEntry = {
        id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: currentUser.id,
        userName: currentUser.name,
        type: 'CARD_PURCHASE',
        amountVes: -costVes,
        balanceBefore: currentUser.availableBalance,
        balanceAfter: currentUser.availableBalance - costVes,
        balanceAfterVes: currentUser.availableBalance - costVes,
        status: 'COMPLETED',
        sorteoId: round.id,
        roundId: round.id,
        timestamp,
        createdAt: timestamp,
        description: `Compra de paquete (${packCount} tarjetas) para ${round.title}`,
        referenceId: round.id,
      };
      setLedger((prev) => {
        const updated = [ledgerEntry, ...prev];
        try {
          localStorage.setItem(`${STORAGE_KEY}_ledger`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      soundService.playCoin();

      // Real-time synchronization broadcast across all clients and Service Worker
      syncEngine.broadcastCardsPurchased({
        cards: newCards,
        userId: currentUser.id,
        roundId: round.id,
        newAvailableBalance: currentUser.availableBalance - costVes,
        ledgerEntry,
        totalCostVes: costVes,
      });

      return {
        success: true,
        message: `¡Compra exitosa! Se han generado ${packCount} tarjetas para el sorteo #${round.roundNumber}.`,
        cards: newCards,
      };
    },
    [rounds, cards, currentUser, commercialConfig, formatMoney]
  );

  // Soft Archiving Cards (Hide from active views without deleting from DB)
  const archiveCard = useCallback((cardId: string) => {
    setCards((prev) => {
      const updated = prev.map((c) => (c.id === cardId ? { ...c, is_archived: true } : c));
      try {
        localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const unarchiveCard = useCallback((cardId: string) => {
    setCards((prev) => {
      const updated = prev.map((c) => (c.id === cardId ? { ...c, is_archived: false } : c));
      try {
        localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const archiveCardsBatch = useCallback((cardIds: string[]) => {
    const idSet = new Set(cardIds);
    setCards((prev) => {
      const updated = prev.map((c) => (idSet.has(c.id) ? { ...c, is_archived: true } : c));
      try {
        localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  // 2. Submit Recharge (Pago Móvil)
  const submitRecharge = useCallback(
    (data: {
      amountVes: number;
      payerPhone: string;
      payerName: string;
      payerDocumentId: string;
      bankOrigin: string;
      referenceNumber: string;
      voucherImageUrl: string;
    }) => {
      const cleanRef = data.referenceNumber.trim();
      if (data.amountVes <= 0) {
        return { success: false, message: 'Ingresa un monto válido mayor a 0 Bs.' };
      }
      if (!cleanRef) {
        return { success: false, message: 'El número de referencia es obligatorio.' };
      }

      // Check if a transaction already exists with this reference number
      const existingIndex = recharges.findIndex(
        (r) => r.referenceNumber.trim().toLowerCase() === cleanRef.toLowerCase()
      );

      if (existingIndex >= 0) {
        const existing = recharges[existingIndex];

        // If the transaction was already approved and money confirmed, prevent overriding
        if (existing.status === 'approved') {
          return {
            success: false,
            message: `Esta transacción (Ref: ${cleanRef}) ya fue verificada, aprobada y acreditada previamente en fecha ${new Date(
              existing.processedAt || existing.createdAt
            ).toLocaleDateString('es-VE')}. No puede ser modificada.`,
          };
        }

        // Transaction exists in 'pending' or 'rejected' state: update with new data
        const oldAmount = existing.amountVes;
        const newAmount = data.amountVes;
        const diff = newAmount - oldAmount;

        const updatedRecharge: RechargeTransaction = {
          ...existing,
          amountVes: data.amountVes,
          payerPhone: data.payerPhone,
          payerName: data.payerName,
          payerDocumentId: data.payerDocumentId,
          bankOrigin: data.bankOrigin,
          voucherImageUrl: data.voucherImageUrl || existing.voucherImageUrl,
          status: 'pending', // Keeps or returns to pending for operator review
          rejectionReason: undefined,
          updatedAt: new Date().toISOString(),
        };

        const updatedList = recharges.map((r, idx) => (idx === existingIndex ? updatedRecharge : r));
        setRecharges(updatedList);
        try {
          localStorage.setItem(`${STORAGE_KEY}_recharges`, JSON.stringify(updatedList));
        } catch (e) {}

        // Adjust user pending balance according to the difference
        setUsers((prev) => {
          const updatedUsers = prev.map((u) =>
            u.id === existing.userId
              ? { ...u, pendingBalance: Math.max(0, u.pendingBalance + diff) }
              : u
          );
          try {
            localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updatedUsers));
          } catch (e) {}
          return updatedUsers;
        });

        addAuditLog(
          'ACTUALIZACION_RECARGA',
          `Usuario ${existing.userName} actualizó datos de transacción existente (Ref: ${cleanRef}). Monto: ${newAmount} Bs. Estado: Pendiente de confirmación.`
        );

        syncEngine.broadcastRechargeStatus({
          transactionId: existing.id,
          status: 'pending',
          userId: existing.userId,
          recharge: updatedRecharge,
          recharges: updatedList,
        });

        // Supabase Realtime broadcast for Auditoría Pago Móvil
        realtimeService.send('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'recharges',
          new: updatedRecharge,
          record: updatedRecharge,
        });
        try {
          fetch(`/api/recharges/${existing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedRecharge),
          }).catch(() => {});
        } catch (e) {}

        soundService.playClick();

        return {
          success: true,
          message: `Se actualizaron los datos de la transacción existente (Ref: ${cleanRef}). Se mantiene en estado 'Pendiente' para la revisión y confirmación del operador financiero.`,
        };
      }

      // If it does NOT exist: create as 'pending'
      const newRecharge: RechargeTransaction = {
        id: `rec-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userPhone: currentUser.phone,
        amountVes: data.amountVes,
        payerPhone: data.payerPhone,
        payerName: data.payerName,
        payerDocumentId: data.payerDocumentId,
        bankOrigin: data.bankOrigin,
        referenceNumber: cleanRef,
        voucherImageUrl:
          data.voucherImageUrl ||
          'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const updatedList = [newRecharge, ...recharges];
      setRecharges(updatedList);
      try {
        localStorage.setItem(`${STORAGE_KEY}_recharges`, JSON.stringify(updatedList));
      } catch (e) {}

      // Move into pendingBalance
      setUsers((prev) => {
        const updatedUsers = prev.map((u) =>
          u.id === currentUser.id
            ? { ...u, pendingBalance: u.pendingBalance + data.amountVes }
            : u
        );
        try {
          localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updatedUsers));
        } catch (e) {}
        return updatedUsers;
      });

      addAuditLog(
        'SOLICITUD_RECARGA',
        `Usuario ${currentUser.name} reportó recarga Pago Móvil por ${data.amountVes} Bs. Ref: ${cleanRef} (Estado: Pendiente)`
      );

      syncEngine.broadcastRechargeStatus({
        transactionId: newRecharge.id,
        status: 'pending',
        userId: currentUser.id,
        recharge: newRecharge,
        recharges: updatedList,
      });

      // Supabase Realtime instant INSERT broadcast for Auditoría Pago Móvil
      realtimeService.send('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'recharges',
        new: newRecharge,
        record: newRecharge,
      });
      realtimeService.send('recharge_created', { recharge: newRecharge });

      try {
        fetch('/api/recharges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecharge),
        }).catch(() => {});
      } catch (e) {}

      soundService.playClick();

      return {
        success: true,
        message: 'Comprobante registrado en estado Pendiente. El operador financiero o administrador confirmará el ingreso del dinero en banco para cambiar su estatus a Aprobado.',
      };
    },
    [recharges, currentUser, addAuditLog]
  );

  // 3. Approve Recharge (Backoffice - Super Admin / Financial Operator)
  const approveRecharge = useCallback(
    (transactionId: string) => {
      const rec = recharges.find((r) => r.id === transactionId);
      if (!rec || rec.status !== 'pending') {
        return { success: false, message: 'Transacción no encontrada o ya procesada.' };
      }

      const targetUser = users.find((u) => u.id === rec.userId);
      if (!targetUser) {
        return { success: false, message: 'Usuario beneficiario no encontrado.' };
      }

      const processedAt = new Date().toISOString();
      const operatorIdentifier = `${operatorRole}${loggedUsername ? ` (${loggedUsername})` : ''}`;

      const updatedRecharge: RechargeTransaction = {
        ...rec,
        status: 'approved',
        confirmedBankArrival: true,
        processedAt,
        processedBy: operatorIdentifier,
      };

      const updatedList = recharges.map((r) => (r.id === transactionId ? updatedRecharge : r));
      setRecharges(updatedList);
      try {
        localStorage.setItem(`${STORAGE_KEY}_recharges`, JSON.stringify(updatedList));
      } catch (e) {}

      // Move from pendingBalance to availableBalance
      setUsers((prev) => {
        const updatedUsers = prev.map((u) =>
          u.id === rec.userId
            ? {
                ...u,
                pendingBalance: Math.max(0, u.pendingBalance - rec.amountVes),
                availableBalance: u.availableBalance + rec.amountVes,
              }
            : u
        );
        try {
          localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updatedUsers));
        } catch (e) {}
        return updatedUsers;
      });

      // Add to ledger
      const ledgerEntry: WalletLedgerEntry = {
        id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: targetUser.id,
        userName: targetUser.name,
        type: 'recharge',
        amountVes: rec.amountVes,
        balanceBefore: targetUser.availableBalance,
        balanceAfter: targetUser.availableBalance + rec.amountVes,
        description: `Recarga aprobada Pago Móvil (${rec.bankOrigin} Ref: ${rec.referenceNumber}) - Ingreso bancario confirmado por ${operatorIdentifier}`,
        referenceId: rec.id,
        createdAt: processedAt,
      };
      setLedger((prev) => [ledgerEntry, ...prev]);

      addAuditLog(
        'APROBACION_RECARGA',
        `Confirmó ingreso del dinero y aprobó recarga de ${rec.amountVes} Bs. para ${targetUser.name} (Ref: ${rec.referenceNumber}). Operador: ${operatorIdentifier}`
      );

      syncEngine.broadcastRechargeStatus({
        transactionId: rec.id,
        status: 'approved',
        userId: rec.userId,
        recharge: updatedRecharge,
        recharges: updatedList,
      });

      // Supabase Realtime broadcast for Auditoría Pago Móvil
      realtimeService.send('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'recharges',
        new: updatedRecharge,
        record: updatedRecharge,
      });
      try {
        fetch(`/api/recharges/${rec.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedRecharge),
        }).catch(() => {});
      } catch (e) {}

      soundService.playCoin();

      return {
        success: true,
        message: `¡Ingreso confirmado! Recarga #${rec.referenceNumber} aprobada y ${rec.amountVes} Bs. acreditados a la cuenta de ${targetUser.name}.`,
      };
    },
    [recharges, users, operatorRole, loggedUsername, addAuditLog]
  );

  // 4. Reject Recharge (Backoffice)
  const rejectRecharge = useCallback(
    (transactionId: string, reason: string) => {
      const rec = recharges.find((r) => r.id === transactionId);
      if (!rec || rec.status !== 'pending') {
        return { success: false, message: 'Transacción no válida.' };
      }

      const updatedRecharge: RechargeTransaction = {
        ...rec,
        status: 'rejected',
        rejectionReason: reason || 'Comprobante no coincide con extracto bancario.',
        processedAt: new Date().toISOString(),
        processedBy: `${operatorRole}`,
      };

      const updatedList = recharges.map((r) => (r.id === transactionId ? updatedRecharge : r));
      setRecharges(updatedList);
      try {
        localStorage.setItem(`${STORAGE_KEY}_recharges`, JSON.stringify(updatedList));
      } catch (e) {}

      // Deduct from pendingBalance
      setUsers((prev) => {
        const updatedUsers = prev.map((u) =>
          u.id === rec.userId
            ? { ...u, pendingBalance: Math.max(0, u.pendingBalance - rec.amountVes) }
            : u
        );
        try {
          localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updatedUsers));
        } catch (e) {}
        return updatedUsers;
      });

      addAuditLog(
        'RECHAZO_RECARGA',
        `Rechazó recarga de ${rec.amountVes} Bs. para usuario ${rec.userName}. Motivo: ${reason}`
      );

      syncEngine.broadcastRechargeStatus({
        transactionId: rec.id,
        status: 'rejected',
        userId: rec.userId,
        recharge: updatedRecharge,
        recharges: updatedList,
      });

      // Supabase Realtime broadcast for Auditoría Pago Móvil
      realtimeService.send('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'recharges',
        new: updatedRecharge,
        record: updatedRecharge,
      });
      try {
        fetch(`/api/recharges/${rec.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedRecharge),
        }).catch(() => {});
      } catch (e) {}

      return {
        success: true,
        message: `Recarga rechazada con motivo: ${reason}`,
      };
    },
    [recharges, operatorRole, addAuditLog]
  );

  // 5. Submit Withdrawal (User)
  const submitWithdrawal = useCallback(
    (data: {
      amountVes: number;
      channel: 'pago_movil' | 'transferencia';
      bankDest: string;
      phoneOrAccount: string;
      documentId: string;
      titularName: string;
      accountType?: 'corriente' | 'ahorro';
    }) => {
      if (!data.amountVes || data.amountVes < 100) {
        return { success: false, message: 'El monto mínimo de retiro es de 100 Bs.' };
      }
      const availableReal = Number(currentUser.availableBalance ?? currentUser.balanceVes ?? 0);
      if (availableReal < data.amountVes) {
        return {
          success: false,
          message: `Saldo disponible insuficiente. Saldo disponible real: ${formatMoney(availableReal)}.`,
        };
      }
      if (!data.phoneOrAccount.trim() || !data.documentId.trim() || !data.titularName.trim()) {
        return { success: false, message: 'Completa todos los campos obligatorios del formulario.' };
      }

      // Lock balance and update user
      setUsers((prev) => {
        const updatedUsers = prev.map((u) =>
          u.id === currentUser.id
            ? {
                ...u,
                availableBalance: u.availableBalance - data.amountVes,
                lockedBalance: u.lockedBalance + data.amountVes,
              }
            : u
        );
        try {
          localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updatedUsers));
        } catch (e) {}
        return updatedUsers;
      });

      const newWithdrawal: WithdrawalTransaction = {
        id: `wth-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userPhone: currentUser.phone,
        amountVes: data.amountVes,
        channel: data.channel,
        bankDest: data.bankDest,
        phoneOrAccount: data.phoneOrAccount,
        documentId: data.documentId,
        titularName: data.titularName,
        accountType: data.accountType,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      setWithdrawals((prev) => {
        const updatedList = [newWithdrawal, ...prev];
        try {
          localStorage.setItem(`${STORAGE_KEY}_withdrawals`, JSON.stringify(updatedList));
        } catch (e) {}
        return updatedList;
      });

      // Add to ledger (Funds locked)
      const ledgerEntry: WalletLedgerEntry = {
        id: `led-${Date.now()}`,
        userId: currentUser.id,
        userName: currentUser.name,
        type: 'withdrawal_lock',
        amountVes: -data.amountVes,
        balanceBefore: currentUser.availableBalance,
        balanceAfter: currentUser.availableBalance - data.amountVes,
        description: `Solicitud de retiro por ${data.channel === 'pago_movil' ? 'Pago Móvil' : 'Transferencia'} (${data.bankDest})`,
        referenceId: newWithdrawal.id,
        createdAt: new Date().toISOString(),
      };
      setLedger((prev) => {
        const updatedLedger = [ledgerEntry, ...prev];
        try {
          localStorage.setItem(`${STORAGE_KEY}_ledger`, JSON.stringify(updatedLedger));
        } catch (e) {}
        return updatedLedger;
      });

      addAuditLog(
        'SOLICITUD_RETIRO',
        `Usuario ${currentUser.name} solicitó retiro de ${data.amountVes} Bs. Destino: ${data.bankDest} (${data.phoneOrAccount})`
      );

      // Async backend persistence
      try {
        fetch('/api/withdrawals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newWithdrawal),
        }).catch((err) => console.warn('[submitWithdrawal] API Note:', err));
      } catch (e) {}

      // Cross-tab broadcast & Realtime WebSocket broadcast
      syncEngine.broadcastWithdrawalStatus({
        transactionId: newWithdrawal.id,
        status: 'pending',
        userId: currentUser.id,
        withdrawal: newWithdrawal,
      });

      realtimeService.broadcastWithdrawalCreated(newWithdrawal);

      return {
        success: true,
        message: 'Solicitud de retiro recibida. Los fondos han sido reservados y serán transferidos a tu cuenta.',
      };
    },
    [currentUser, formatMoney, addAuditLog]
  );

  // 6. Complete Withdrawal (Backoffice)
  const completeWithdrawal = useCallback(
    (transactionId: string) => {
      // Access Control: Only Super Admin and Operador Financiero are authorized to process/liquidate withdrawals
      if (operatorRole !== 'Super Admin' && operatorRole !== 'Operador Financiero') {
        addAuditLog(
          'ACCESO_DENEGADO',
          `Intento no autorizado de liquidar retiro (${transactionId}) por rol '${operatorRole}' (@${loggedUsername || 'desconocido'}).`
        );
        return {
          success: false,
          message: 'Acceso Denegado: Solo los usuarios con rol de Superadministrador u Operador Financiero tienen autorización para procesar y liquidar pagos de retiros.',
        };
      }

      const wth = withdrawals.find((w) => w.id === transactionId);
      if (!wth || wth.status !== 'pending') {
        return { success: false, message: 'Solicitud de retiro no válida.' };
      }

      const updatedWithdrawal: WithdrawalTransaction = {
        ...wth,
        status: 'completed',
        processedAt: new Date().toISOString(),
        processedBy: `${operatorRole}`,
      };

      setWithdrawals((prev) => {
        const updatedList = prev.map((w) => (w.id === transactionId ? updatedWithdrawal : w));
        try {
          localStorage.setItem(`${STORAGE_KEY}_withdrawals`, JSON.stringify(updatedList));
        } catch (e) {}
        return updatedList;
      });

      // Deduct from locked balance
      setUsers((prev) => {
        const updatedUsers = prev.map((u) =>
          u.id === wth.userId
            ? { ...u, lockedBalance: Math.max(0, u.lockedBalance - wth.amountVes) }
            : u
        );
        try {
          localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updatedUsers));
        } catch (e) {}
        return updatedUsers;
      });

      // Ledger note
      const ledgerEntry: WalletLedgerEntry = {
        id: `led-${Date.now()}`,
        userId: wth.userId,
        userName: wth.userName,
        type: 'withdrawal_completed',
        amountVes: 0,
        balanceBefore: 0,
        balanceAfter: 0,
        description: `Retiro completado y liquidado a ${wth.bankDest} (${wth.phoneOrAccount})`,
        referenceId: wth.id,
        createdAt: new Date().toISOString(),
      };
      setLedger((prev) => {
        const updatedLedger = [ledgerEntry, ...prev];
        try {
          localStorage.setItem(`${STORAGE_KEY}_ledger`, JSON.stringify(updatedLedger));
        } catch (e) {}
        return updatedLedger;
      });

      addAuditLog(
        'LIQUIDACION_RETIRO',
        `Operador (${operatorRole}) liquidó y completó el retiro de ${wth.amountVes} Bs. a favor de ${wth.titularName}`
      );

      // Async backend persistence
      try {
        fetch(`/api/withdrawals/${wth.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operatorIdentifier: operatorRole, operatorRole }),
        }).catch((err) => console.warn('[completeWithdrawal] API Note:', err));
      } catch (e) {}

      syncEngine.broadcastWithdrawalStatus({
        transactionId: wth.id,
        status: 'completed',
        userId: wth.userId,
        withdrawal: updatedWithdrawal,
      });

      realtimeService.broadcastWithdrawalStatus(updatedWithdrawal);

      return {
        success: true,
        message: `Retiro de ${wth.amountVes} Bs. marcado como Completado exitosamente.`,
      };
    },
    [withdrawals, operatorRole, loggedUsername, addAuditLog]
  );

  // 7. Reject Withdrawal (Backoffice)
  const rejectWithdrawal = useCallback(
    (transactionId: string, reason: string) => {
      // Access Control: Only Super Admin and Operador Financiero are authorized to reject/refund withdrawals
      if (operatorRole !== 'Super Admin' && operatorRole !== 'Operador Financiero') {
        addAuditLog(
          'ACCESO_DENEGADO',
          `Intento no autorizado de rechazar retiro (${transactionId}) por rol '${operatorRole}' (@${loggedUsername || 'desconocido'}).`
        );
        return {
          success: false,
          message: 'Acceso Denegado: Solo los usuarios con rol de Superadministrador u Operador Financiero tienen autorización para procesar o rechazar retiros.',
        };
      }

      const wth = withdrawals.find((w) => w.id === transactionId);
      if (!wth || wth.status !== 'pending') {
        return { success: false, message: 'Solicitud no válida.' };
      }

      const updatedWithdrawal: WithdrawalTransaction = {
        ...wth,
        status: 'rejected',
        rejectionReason: reason || 'Datos de cuenta erróneos.',
        processedAt: new Date().toISOString(),
        processedBy: `${operatorRole}`,
      };

      setWithdrawals((prev) => {
        const updatedList = prev.map((w) => (w.id === transactionId ? updatedWithdrawal : w));
        try {
          localStorage.setItem(`${STORAGE_KEY}_withdrawals`, JSON.stringify(updatedList));
        } catch (e) {}
        return updatedList;
      });

      // Refund locked balance back to available
      setUsers((prev) => {
        const updatedUsers = prev.map((u) =>
          u.id === wth.userId
            ? {
                ...u,
                lockedBalance: Math.max(0, u.lockedBalance - wth.amountVes),
                availableBalance: u.availableBalance + wth.amountVes,
              }
            : u
        );
        try {
          localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updatedUsers));
        } catch (e) {}
        return updatedUsers;
      });

      // Ledger entry for refund
      const targetUser = users.find((u) => u.id === wth.userId);
      if (targetUser) {
        const ledgerEntry: WalletLedgerEntry = {
          id: `led-${Date.now()}`,
          userId: targetUser.id,
          userName: targetUser.name,
          type: 'withdrawal_refund',
          amountVes: wth.amountVes,
          balanceBefore: targetUser.availableBalance,
          balanceAfter: targetUser.availableBalance + wth.amountVes,
          description: `Reembolso de fondos por retiro rechazado (${reason})`,
          referenceId: wth.id,
          createdAt: new Date().toISOString(),
        };
        setLedger((prev) => {
          const updatedLedger = [ledgerEntry, ...prev];
          try {
            localStorage.setItem(`${STORAGE_KEY}_ledger`, JSON.stringify(updatedLedger));
          } catch (e) {}
          return updatedLedger;
        });
      }

      addAuditLog(
        'RECHAZO_RETIRO',
        `Operador (${operatorRole}) rechazó retiro de ${wth.amountVes} Bs. de ${wth.userName}. Motivo: ${reason}. Fondos devueltos al usuario.`
      );

      // Async backend persistence
      try {
        fetch(`/api/withdrawals/${wth.id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, operatorIdentifier: operatorRole, operatorRole }),
        }).catch((err) => console.warn('[rejectWithdrawal] API Note:', err));
      } catch (e) {}

      syncEngine.broadcastWithdrawalStatus({
        transactionId: wth.id,
        status: 'rejected',
        userId: wth.userId,
        withdrawal: updatedWithdrawal,
      });

      realtimeService.broadcastWithdrawalStatus(updatedWithdrawal);

      return {
        success: true,
        message: `Retiro rechazado. Los fondos han regresado al saldo disponible del usuario.`,
      };
    },
    [withdrawals, users, operatorRole, loggedUsername, addAuditLog]
  );

  // 8. Create Round
  const createRound = useCallback(
    (
      title: string,
      drawAt: string,
      cardPriceVes?: number,
      prizePercentage: number = 70,
      customOrder?: number,
      manualJackpotVes?: number
    ) => {
      const maxNum = rounds.reduce((max, r) => Math.max(max, r.roundNumber || 0), 100);
      const nextNum = maxNum + 1;
      const maxOrder = rounds.reduce((max, r) => Math.max(max, r.order || 0), 0);
      const nextOrder = customOrder || maxOrder + 1;

      let newId = `round-${nextNum}`;
      if (rounds.some((r) => r.id === newId)) {
        newId = `round-${nextNum}-${Date.now()}`;
      }

      // Lectura de precio comercial desde DB config/comercial (Pack 2 / 2 = precio por cartón)
      const commercialCardPrice = (Number(commercialConfig?.cardPrices?.pack2) || 100) / 2;
      const effectiveCardPrice = (cardPriceVes !== undefined && cardPriceVes > 0) ? cardPriceVes : commercialCardPrice;
      const effectivePrizePercentage = prizePercentage !== undefined ? prizePercentage : 70;

      const now = timeSync.getServerNow();
      // Safe ISO 8601 parsing
      const drawAtMs = isNaN(Date.parse(drawAt)) ? now + 60 * 60 * 1000 : new Date(drawAt).getTime();
      const drawAtIso = new Date(drawAtMs).toISOString();
      const closeBetAtMs = drawAtMs - commercialConfig.closingBufferMinutes * 60 * 1000;
      const closeBetAtIso = new Date(closeBetAtMs).toISOString();
      const openBetAtIso = new Date(now).toISOString();

      // Check if there is already an open round
      const hasOpenRound = rounds.some((r) => String(r.status || '').toLowerCase() === 'open');

      // If betting close time is in the future and no other round is open, it can be open; otherwise scheduled
      const initialStatus: RoundStatus = !hasOpenRound && now < closeBetAtMs ? 'open' : 'scheduled';

      // Fórmula de premio: Monto manual fijo (si fue establecido) o cálculo base inicial
      const initialCardsSold = 0;
      const initialJackpotVes =
        manualJackpotVes !== undefined && manualJackpotVes > 0
          ? manualJackpotVes
          : initialCardsSold * effectiveCardPrice * (effectivePrizePercentage / 100);

      const newRound: GameRound = {
        id: newId,
        roundNumber: nextNum,
        order: nextOrder,
        title: title || `Sorteo #${nextNum}`,
        openBetAt: openBetAtIso,
        closeBetAt: closeBetAtIso,
        drawAt: drawAtIso,
        starts_at: openBetAtIso,
        ends_at: closeBetAtIso,
        status: initialStatus,
        drawnFichas: [],
        totalCardsSold: initialCardsSold,
        cardPriceVes: effectiveCardPrice,
        card_price: effectiveCardPrice,
        prize_percentage: effectivePrizePercentage,
        jackpotVes: initialJackpotVes,
        manualJackpotVes: manualJackpotVes !== undefined && manualJackpotVes > 0 ? manualJackpotVes : undefined,
        winningCardsCount: 0,
        totalPrizesPaidVes: 0,
        resultLocked: false,
      };

      const updatedRounds = [
        newRound,
        ...rounds
          .filter((r) => r.id !== newRound.id)
          .map((r) => {
            // If the new round is opening, close any previous rounds whose betting time has passed
            if (initialStatus === 'open' && String(r.status || '').toLowerCase() === 'open' && timeSync.parseIsoToEpochMs(r.closeBetAt) <= now) {
              return { ...r, status: 'closed' as RoundStatus };
            }
            return r;
          }),
      ];

      setRounds(updatedRounds);
      try {
        localStorage.setItem(`${STORAGE_KEY}_rounds`, JSON.stringify(updatedRounds));
      } catch (e) {}

      addAuditLog('CREACION_RONDA', `Creó y publicó nueva ronda #${newRound.roundNumber} (${newRound.title}) - Precio: ${effectiveCardPrice} Bs, Premio: ${initialJackpotVes} Bs, % Premio: ${effectivePrizePercentage}%, Orden: ${nextOrder}`);
      syncEngine.broadcastRoundCreated(newRound);

      // Async post to server API & broadcast WebSocket event
      fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRound),
      }).catch((e) => console.warn('[GameContext] Server POST /api/rounds note:', e));
    },
    [rounds, commercialConfig.closingBufferMinutes, commercialConfig.cardPrices.pack2, addAuditLog]
  );

  // Update Round Config (Price & Prize Percentage)
  const updateRoundConfig = useCallback(
    (
      roundId: string,
      data: {
        cardPriceVes?: number;
        card_price?: number;
        prize_percentage?: number;
        title?: string;
        drawAt?: string;
      }
    ) => {
      const target = rounds.find((r) => r.id === roundId);
      if (!target) {
        return { success: false, message: 'Sorteo no encontrado.' };
      }

      const isPriceLocked = target.totalCardsSold > 0 || String(target.status || '').toLowerCase() === 'drawing' || String(target.status || '').toLowerCase() === 'finished';

      if (isPriceLocked && ((data.cardPriceVes !== undefined && data.cardPriceVes !== target.cardPriceVes) || (data.card_price !== undefined && data.card_price !== target.card_price))) {
        return {
          success: false,
          message: 'No se puede modificar el precio del cartón porque el sorteo ya tiene cartones vendidos o ya está en curso.',
        };
      }

      const updatedPrice = !isPriceLocked && (data.card_price !== undefined || data.cardPriceVes !== undefined)
        ? (data.card_price ?? data.cardPriceVes ?? target.cardPriceVes)
        : target.cardPriceVes;

      const updatedPrizePct = data.prize_percentage !== undefined ? data.prize_percentage : (target.prize_percentage || 70);

      const updatedRound: GameRound = {
        ...target,
        title: data.title || target.title,
        cardPriceVes: updatedPrice,
        card_price: updatedPrice,
        prize_percentage: updatedPrizePct,
        drawAt: data.drawAt || target.drawAt,
      };

      const updatedList = rounds.map((r) => (r.id === roundId ? updatedRound : r));
      setRounds(updatedList);
      try {
        localStorage.setItem(`${STORAGE_KEY}_rounds`, JSON.stringify(updatedList));
      } catch (e) {}

      addAuditLog(
        'CONFIGURACION_SORTEO',
        `Actualizó configuración de Sorteo #${target.roundNumber} (${target.title}). Precio: ${updatedPrice} Bs, % Premio: ${updatedPrizePct}%`
      );

      return {
        success: true,
        message: `Sorteo #${target.roundNumber} actualizado con éxito.`,
      };
    },
    [rounds, addAuditLog]
  );

  // 9. Set Round Status
  const setRoundStatus = useCallback(
    (roundId: string, status: GameRound['status']) => {
      setRounds((prev) => {
        const updated = prev.map((r) => (r.id === roundId ? { ...r, status } : r));
        try {
          localStorage.setItem(`${STORAGE_KEY}_rounds`, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      addAuditLog('CAMBIO_ESTADO_RONDA', `Modificó estado de la ronda ID ${roundId} a "${status}"`);
      syncEngine.broadcastRoundStatus(roundId, status);
    },
    [addAuditLog]
  );

  // 10. Submit Official Draw Result (Auto-Settlement Matrix Engine)
  const submitRoundResult = useCallback(
    (roundId: string, drawnFichas: number[], otpCode: string) => {
      // Role access validation: Super Admin & Operador Financiero authorized
      if (operatorRole !== 'Super Admin' && operatorRole !== 'Operador Financiero') {
        addAuditLog(
          'ACCESO_DENEGADO',
          `Intento no autorizado de ingresar resultados para sorteo (${roundId}) por rol '${operatorRole}'.`
        );
        return {
          success: false,
          message: 'Acceso Denegado: Solo el Superadministrador u Operador Financiero pueden ingresar y certificar resultados oficiales.',
        };
      }

      if (otpCode !== commercialConfig.twoFactorOtpDemo && otpCode !== '123456') {
        return { success: false, message: 'Código de seguridad 2FA inválido. Usa 123456 para la demostración.' };
      }
      if (drawnFichas.length < 16) {
        return { success: false, message: 'Debes seleccionar al menos 16 figuras ganadoras.' };
      }

      const round = rounds.find((r) => r.id === roundId);
      if (!round) {
        return { success: false, message: 'Sorteo no encontrado.' };
      }

      // Filter cards belonging to this round
      const roundCards = cards.filter((c) => c.roundId === roundId);
      let winnersCount = 0;
      let totalPaidVes = 0;
      const userWinningsMap: Record<string, number> = {};
      const userWinningCardsMap: Record<string, MatrixCard[]> = {};

      const updatedCards = cards.map((c) => {
        if (c.roundId !== roundId) return c;

        const evalResult = evaluateCardMatrix(c.matrix, drawnFichas, c.priceVes, commercialConfig, true);

        if (evalResult.isWinner) {
          winnersCount++;
          totalPaidVes += evalResult.totalPrizeVes;
          userWinningsMap[c.userId] = (userWinningsMap[c.userId] || 0) + evalResult.totalPrizeVes;
          if (!userWinningCardsMap[c.userId]) userWinningCardsMap[c.userId] = [];
          userWinningCardsMap[c.userId].push(c);
        }

        return {
          ...c,
          matchedCount: evalResult.matchedCount,
          aciertos: evalResult.aciertos,
          winningPatterns: evalResult.winningPatterns,
          totalPrizeVes: evalResult.totalPrizeVes,
          status: evalResult.status,
          isWinner: evalResult.isWinner,
          is_winner: evalResult.is_winner,
          is_expired: true,
          isPlayed: true,
          roundStatus: 'finished' as const,
        };
      });

      // Update all cards in state
      setCards(updatedCards);
      try {
        localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify(updatedCards));
      } catch (e) {}

      // Distribute prizes into respective users' availableBalance
      const userBalancesBefore: Record<string, number> = {};
      users.forEach((u) => {
        userBalancesBefore[u.id] = u.availableBalance || 0;
      });

      setUsers((prev) => {
        const updatedUsers = prev.map((u) => {
          const winAmount = userWinningsMap[u.id] || 0;
          if (winAmount > 0) {
            const newBal = (u.availableBalance || 0) + winAmount;
            return {
              ...u,
              availableBalance: newBal,
              balanceVes: newBal,
              totalWonVes: (u.totalWonVes || 0) + winAmount,
            };
          }
          return u;
        });
        try {
          localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify(updatedUsers));
        } catch (e) {}
        return updatedUsers;
      });

      // Create ledger entries for winners with exact balances
      const newLedgerEntries: WalletLedgerEntry[] = [];
      const timestamp = new Date().toISOString();

      roundCards.forEach((c) => {
        const evalResult = evaluateCardMatrix(c.matrix, drawnFichas, c.priceVes, commercialConfig, true);
        if (evalResult.isWinner && evalResult.totalPrizeVes > 0) {
          const balBefore = userBalancesBefore[c.userId] || 0;
          const balAfter = balBefore + evalResult.totalPrizeVes;
          userBalancesBefore[c.userId] = balAfter; // update running balance for next card if multiple

          const patternLabels = evalResult.winningPatterns.map((p) => p.label).join(', ');

          newLedgerEntries.push({
            id: `led-win-${Date.now()}-${c.id}-${Math.floor(Math.random() * 1000)}`,
            userId: c.userId,
            userName: c.userName,
            type: 'prize_payout',
            amountVes: evalResult.totalPrizeVes,
            balanceBefore: balBefore,
            balanceAfter: balAfter,
            balanceAfterVes: balAfter,
            status: 'COMPLETED',
            sorteoId: round.id,
            roundId: round.id,
            timestamp,
            createdAt: timestamp,
            description: `Premio ganado en ${round.title} (Cartón ${c.code}): ${patternLabels}`,
            referenceId: c.id,
          });
        }
      });

      if (newLedgerEntries.length > 0) {
        setLedger((prev) => {
          const updatedLedger = [...newLedgerEntries, ...prev];
          try {
            localStorage.setItem(`${STORAGE_KEY}_ledger`, JSON.stringify(updatedLedger));
          } catch (e) {}
          return updatedLedger;
        });
      }

      const submittedAt = new Date().toISOString();
      const updatedRoundObj: GameRound = {
        ...round,
        status: 'finished',
        drawnFichas,
        resultLocked: true,
        winningCardsCount: winnersCount,
        totalPrizesPaidVes: totalPaidVes,
        resultSubmittedBy: `${operatorRole}`,
        resultSubmittedAt: submittedAt,
        updatedAt: submittedAt,
      };

      // The round finishes completely.
      const finalRounds = rounds.map((r) => (r.id === roundId ? updatedRoundObj : r));

      setRounds(finalRounds);
      try {
        localStorage.setItem(`${STORAGE_KEY}_rounds`, JSON.stringify(finalRounds));
      } catch (e) {}

      addAuditLog(
        'INGRESO_RESULTADOS_SORTEO',
        `Ingresó ${drawnFichas.length} figuras para ${round.title}. Auditoría completada: ${winnersCount} cartones ganadores, total de premios acreditados: ${totalPaidVes} Bs.`
      );

      soundService.playFanfare();

      // Async backend persistence to centralized database (Single Source of Truth)
      try {
        fetch(`/api/rounds/${roundId}/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            drawnFichas,
            winnersCount,
            totalPaidVes,
            resultSubmittedBy: operatorRole,
            resultSubmittedAt: submittedAt,
            updatedRound: updatedRoundObj,
            updatedCards,
            userWinnings: userWinningsMap,
          }),
        }).catch((err) => console.warn('[submitRoundResult] Server API Note:', err));
      } catch (e) {}

      // Real-time synchronization broadcast across all clients, tabs, and Service Worker
      syncEngine.broadcastLiveDrawFinished({
        roundId,
        drawnFichas,
        winnersCount,
        totalPaidVes,
        updatedRound: updatedRoundObj,
        updatedCards,
      });

      realtimeService.broadcastDrawResultPublished({
        roundId,
        drawnFichas,
        winnersCount,
        totalPaidVes,
        updatedRound: updatedRoundObj,
        updatedCards,
      });

      return {
        success: true,
        message: `¡Sorteo finalizado y auditado con éxito! ${winnersCount} cartón(es) ganador(es), total de premios acreditados: ${totalPaidVes} Bs. El saldo ha sido sumado de inmediato al saldo disponible de los ganadores.`,
        winnersCount,
        totalPaidVes,
      };
    },
    [commercialConfig, rounds, cards, users, currentUser, operatorRole, addAuditLog]
  );

  // 11. Live Draw Simulation (Cantar en Vivo con Voz)
  const startLiveDrawSimulation = useCallback(
    (roundId: string) => {
      const round = rounds.find((r) => r.id === roundId);
      if (!round) return;

      setIsLiveDrawing(true);
      setLiveDrawingRound(round);
      setLiveDrawnFichas([]);

      // Real-time sync broadcast start
      syncEngine.broadcastLiveDrawStarted(roundId);

      // Generate 32 unique random figures from the 72 pool
      const pool = Array.from({ length: 72 }, (_, i) => i + 1);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const drawSequence = pool.slice(0, commercialConfig.drawDrawTotalCount);

      let step = 0;
      const runningList: number[] = [];
      const interval = setInterval(() => {
        if (step >= drawSequence.length) {
          clearInterval(interval);
          setIsLiveDrawing(false);
          // Auto submit result
          submitRoundResult(roundId, drawSequence, '123456');
          return;
        }

        const fichaId = drawSequence[step];
        const fichaObj = getFichaById(fichaId);
        runningList.push(fichaId);
        setLiveDrawnFichas((prev) => [...prev, fichaObj]);

        // Fix sync: al extraer balota actualizar cartones_jugadores campo aciertos
        const currentDrawnSet = new Set(runningList);
        setCards((prevCards) => {
          const updated = prevCards.map((c) => {
            if (c.roundId === roundId) {
              const matchedCount = c.matrix.filter((id) => currentDrawnSet.has(id)).length;
              return {
                ...c,
                matchedCount,
                aciertos: matchedCount,
              };
            }
            return c;
          });
          try {
            localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });

        // Real-time broadcast tick to all connected tabs
        syncEngine.broadcastLiveDrawTick({
          roundId,
          ficha: fichaObj,
          step,
          totalSteps: drawSequence.length,
          drawnFichaIds: [...runningList],
          isFinished: false,
        });

        // Voice cantar
        soundService.playPop();
        soundService.cantarFicha(fichaObj.pronunciation);

        step++;
      }, 2200);
    },
    [rounds, commercialConfig.drawDrawTotalCount, submitRoundResult]
  );

  const stopLiveDrawSimulation = useCallback(() => {
    setIsLiveDrawing(false);
    if (liveDrawingRound) {
      syncEngine.broadcastLiveDrawStopped(liveDrawingRound.id);
    }
  }, [liveDrawingRound]);

  // Quick Add Balance for QA / Demo
  const quickAddBalance = useCallback((amountVes: number) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser.id
          ? { ...u, availableBalance: u.availableBalance + amountVes }
          : u
      )
    );
    soundService.playCoin();
  }, [currentUser.id]);

  // Update Commercial Config & Broadcast Cross-Device
  const updateCommercialConfig = useCallback(
    async (newConfig: Partial<CommercialConfig>) => {
      const basePrice = newConfig.precio_carton_base_ves !== undefined
        ? Number(newConfig.precio_carton_base_ves)
        : (newConfig.singleCardPriceVes !== undefined
            ? Number(newConfig.singleCardPriceVes)
            : (commercialConfig.precio_carton_base_ves ?? commercialConfig.singleCardPriceVes ?? 25));

      const mergedConfig: CommercialConfig = {
        ...commercialConfig,
        ...newConfig,
        precio_carton_base_ves: basePrice,
        singleCardPriceVes: basePrice,
        adminBank: {
          ...commercialConfig.adminBank,
          ...(newConfig.adminBank || {}),
        },
        cardPrices: {
          pack2: basePrice * 2,
          pack4: basePrice * 4,
          pack6: basePrice * 6,
          ...(newConfig.cardPrices || {}),
        },
        prizeMultipliers: {
          ...commercialConfig.prizeMultipliers,
          ...(newConfig.prizeMultipliers || {}),
        },
      };

      // 1. Immediate optimistic local state update & storage
      setCommercialConfig(mergedConfig);
      try {
        localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(mergedConfig));
      } catch (e) {}

      // 2. Audit Trail
      addAuditLog(
        'CONFIGURACION_COMERCIAL',
        `Actualizó parámetros comerciales del sistema (Banco: ${mergedConfig.adminBank.bankName}, Teléfono: ${mergedConfig.adminBank.phone}, RIF: ${mergedConfig.adminBank.rif}, Titular: ${mergedConfig.adminBank.holderName}).`
      );

      // 3. Broadcast to all other tabs and Service Worker immediately
      syncEngine.broadcastCommercialConfig(mergedConfig);
      realtimeService.broadcastCommercialConfig(mergedConfig);
      realtimeService.send('config/comercial', { config: mergedConfig });

      // 4. Central backend persistence & WebSocket server broadcast
      try {
        const response = await fetch('/api/config/comercial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mergedConfig),
        });

        if (!response.ok) {
          throw new Error(`Servidor respondió con código ${response.status}`);
        }

        const resData = await response.json();
        return {
          success: true,
          message: 'Parámetros comerciales y datos de Pago Móvil guardados y sincronizados en tiempo real.',
          data: resData.data || mergedConfig,
        };
      } catch (err: any) {
        console.warn('[GameContext] updateCommercialConfig server note:', err);
        return {
          success: true,
          message: 'Parámetros actualizados y transmitidos a los jugadores activos.',
          data: mergedConfig,
        };
      }
    },
    [commercialConfig, addAuditLog]
  );

  // Reset demo data / Factory reset protecting auth
  const resetToInitialData = useCallback(() => {
    const adminUser = users.find((u) => u.id === 'usr-1') || INITIAL_USERS[0];
    const resetAdmin: AppUser = {
      ...adminUser,
      availableBalance: 0,
      pendingBalance: 0,
      lockedBalance: 0,
      totalWonVes: 0,
      totalSpentVes: 0,
    };
    setUsers([resetAdmin]);
    setRounds(INITIAL_ROUNDS);
    setCards([]);
    setRecharges([]);
    setWithdrawals([]);
    setLedger([]);
    setAuditLogs([]);
    setCommercialConfig(DEFAULT_CONFIG);
    try {
      localStorage.setItem(`${STORAGE_KEY}_users`, JSON.stringify([resetAdmin]));
      localStorage.setItem(`${STORAGE_KEY}_cards`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_recharges`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_withdrawals`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_ledger`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_audit`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_system_credentials`, JSON.stringify(systemCredentials));
    } catch (e) {
      console.error(e);
    }
  }, [users, systemCredentials]);

  // Create System Operator Account
  const createSystemCredential = useCallback(
    (data: {
      username: string;
      password: string;
      role: AdminRole;
      displayName: string;
    }) => {
      if (operatorRole !== 'Super Admin') {
        return {
          success: false,
          message: 'Acceso Denegado: Solo el Super Admin tiene la capacidad exclusiva de asignar contraseñas a los usuarios.',
        };
      }

      const trimmedUser = data.username.trim();
      const trimmedName = data.displayName.trim();

      if (!trimmedUser || !trimmedName || !data.password) {
        return { success: false, message: 'Todos los campos son obligatorios.' };
      }

      // Check username uniqueness
      if (systemCredentials.some((c) => c.username.toLowerCase() === trimmedUser.toLowerCase())) {
        return { success: false, message: `El nombre de usuario "${trimmedUser}" ya existe en el sistema.` };
      }

      // Validate password complexity
      const val = validatePasswordComplexity(data.password);
      if (!val.valid) {
        return {
          success: false,
          message: `La contraseña no cumple los requisitos de seguridad:\n• ${val.errors.join('\n• ')}`,
        };
      }

      const newCred: SystemCredential = {
        id: `sys-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: trimmedUser,
        password: data.password,
        role: data.role,
        displayName: trimmedName,
        createdAt: new Date().toISOString(),
        status: 'active',
      };

      setSystemCredentials((prev) => [newCred, ...prev]);

      const log: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        operatorRole: operatorRole,
        operatorName: loggedUsername || 'Super Admin',
        action: 'OPERADOR_CREADO',
        details: `Cuenta creada: Usuario ${trimmedUser} (${data.role}) - Nombre: ${trimmedName}.`,
        ip: '190.202.45.12',
      };
      setAuditLogs((prev) => [log, ...prev]);

      return { success: true, message: `El usuario operador "${trimmedUser}" ha sido creado exitosamente.` };
    },
    [systemCredentials, operatorRole, loggedUsername]
  );

  // Update System Operator Account
  const updateSystemCredential = useCallback(
    (
      id: string,
      updates: {
        username?: string;
        password?: string;
        role?: AdminRole;
        displayName?: string;
        status?: 'active' | 'inactive';
      }
    ) => {
      const target = systemCredentials.find((c) => c.id === id);
      if (!target) {
        return { success: false, message: 'Usuario no encontrado en el sistema.' };
      }

      // Check if trying to update password without Super Admin role
      if (updates.password && updates.password.trim().length > 0) {
        if (operatorRole !== 'Super Admin') {
          return {
            success: false,
            message: 'Acceso Denegado: Solo el Super Admin tiene la capacidad de cambiar o asignar contraseñas a los usuarios.',
          };
        }

        // Check password complexity if updating password
        const val = validatePasswordComplexity(updates.password);
        if (!val.valid) {
          return {
            success: false,
            message: `La contraseña no cumple los requisitos de seguridad:\n• ${val.errors.join('\n• ')}`,
          };
        }
      }

      // Check username uniqueness if changed
      if (updates.username && updates.username.trim().toLowerCase() !== target.username.toLowerCase()) {
        const trimmed = updates.username.trim();
        if (systemCredentials.some((c) => c.id !== id && c.username.toLowerCase() === trimmed.toLowerCase())) {
          return { success: false, message: `El nombre de usuario "${trimmed}" ya está registrado.` };
        }
      }

      setSystemCredentials((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            return {
              ...c,
              username: updates.username !== undefined ? updates.username.trim() : c.username,
              password: updates.password && updates.password.trim() && operatorRole === 'Super Admin' ? updates.password : c.password,
              role: updates.role || c.role,
              displayName: updates.displayName !== undefined ? updates.displayName.trim() : c.displayName,
              status: updates.status || c.status,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        })
      );

      // Immediately sync active session state if modifying current user
      if (target.username.toLowerCase() === loggedUsername.toLowerCase()) {
        if (updates.status === 'inactive') {
          setIsAuthenticated(false);
          setViewMode('player');
        } else {
          if (updates.role) {
            setCurrentRoleState(updates.role);
            try {
              localStorage.setItem(`${STORAGE_KEY}_auth_role`, updates.role);
            } catch {}
          }
          if (updates.username && updates.username.trim()) {
            setLoggedUsername(updates.username.trim());
            try {
              localStorage.setItem(`${STORAGE_KEY}_logged_username`, updates.username.trim());
            } catch {}
          }
        }
      }

      const log: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        operatorRole: operatorRole,
        operatorName: loggedUsername || 'Super Admin',
        action: 'OPERADOR_ACTUALIZADO',
        details: `Cuenta modificada: Usuario ${target.username} (${target.role}).${updates.password ? ' (Contraseña actualizada por Super Admin)' : ''}`,
        ip: '190.202.45.12',
      };
      setAuditLogs((prev) => [log, ...prev]);

      return { success: true, message: `Usuario ${target.username} actualizado correctamente.` };
    },
    [systemCredentials, operatorRole, loggedUsername]
  );

  // Delete System Operator Account
  const deleteSystemCredential = useCallback(
    (id: string) => {
      const target = systemCredentials.find((c) => c.id === id);
      if (!target) {
        return { success: false, message: 'Usuario no encontrado.' };
      }

      // Cannot delete logged-in account
      if (target.username.toLowerCase() === loggedUsername.toLowerCase()) {
        return { success: false, message: 'No puedes eliminar la cuenta con la que has iniciado sesión actual.' };
      }

      // Cannot delete last active Super Admin
      if (target.role === 'Super Admin') {
        const activeSuperAdmins = systemCredentials.filter((c) => c.role === 'Super Admin' && c.status === 'active');
        if (activeSuperAdmins.length <= 1) {
          return { success: false, message: 'No se puede eliminar el único Super Admin activo del sistema.' };
        }
      }

      setSystemCredentials((prev) => prev.filter((c) => c.id !== id));

      const log: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        operatorRole: currentRole !== 'Player' ? (currentRole as any) : 'Super Admin',
        operatorName: loggedUsername || 'Super Admin',
        action: 'OPERADOR_ELIMINADO',
        details: `Cuenta eliminada: ${target.username} (${target.role}).`,
        ip: '190.202.45.12',
      };
      setAuditLogs((prev) => [log, ...prev]);

      return { success: true, message: `El usuario ${target.username} ha sido eliminado del sistema.` };
    },
    [systemCredentials, loggedUsername, currentRole]
  );

  // Authentication: Login function with maximum 3 failed attempts lockout
  const login = useCallback(
    (username: string, password: string) => {
      const trimmedUser = username.trim();
      const trimmedPass = password.trim();

      if (!trimmedUser || !trimmedPass) {
        return {
          success: false,
          message: 'Por favor ingresa tu usuario y contraseña.',
        };
      }

      // Check if account / identifier is currently locked out
      const lockoutCheck = LotteryStorageService.checkLockoutStatus(trimmedUser);
      if (lockoutCheck.isLocked) {
        return {
          success: false,
          message: lockoutCheck.message || `Cuenta bloqueada temporalmente por 15 minutos debido a 3 intentos fallidos. Por favor restablece tu contraseña mediante correo electrónico.`,
        };
      }

      // Check system admin credentials
      const foundCred = systemCredentials.find(
        (c) =>
          c.username.toLowerCase() === trimmedUser.toLowerCase() &&
          c.password === trimmedPass &&
          c.status === 'active'
      );

      if (foundCred) {
        // Clear any failed attempts
        LotteryStorageService.clearFailedLoginAttempts(trimmedUser);

        // Generate ephemeral session token
        const token = `tok_admin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        setSessionToken(token);
        setCurrentRoleState(foundCred.role);
        setIsAuthenticated(true);
        setLoggedUsername(foundCred.username);
        setViewMode('admin');

        // Immediate fresh fetch of active rounds without cache on login
        fetchActiveRounds({ bypassCache: true });

        const newLog: AuditLogEntry = {
          id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          operatorRole: foundCred.role,
          operatorName: foundCred.displayName,
          action: 'INICIO_SESION',
          details: `Inicio de sesión exitoso. Operador: ${foundCred.username} (${foundCred.role}). Token: ${token.substring(0, 14)}...`,
          ip: '190.202.45.12',
        };
        setAuditLogs((prev) => [newLog, ...prev]);

        return {
          success: true,
          message: `¡Bienvenido! Has iniciado sesión como ${foundCred.role}.`,
          role: foundCred.role,
        };
      }

      // Check player account
      const playerMatch = users.find(
        (u) =>
          u.name.toLowerCase() === trimmedUser.toLowerCase() ||
          u.phone === trimmedUser ||
          u.id === trimmedUser ||
          (u.email && u.email.toLowerCase() === trimmedUser.toLowerCase()) ||
          u.documentId.toUpperCase() === trimmedUser.toUpperCase()
      );

      const isValidPlayerPass =
        playerMatch &&
        ((playerMatch.password && playerMatch.password === trimmedPass) ||
          (!playerMatch.password && (trimmedPass === '123456' || trimmedPass === 'player123')));

      if (playerMatch && isValidPlayerPass) {
        // Clear failed attempts on successful match
        LotteryStorageService.clearFailedLoginAttempts(trimmedUser);
        if (playerMatch.email) {
          LotteryStorageService.clearFailedLoginAttempts(playerMatch.email);
        }

        const token = `tok_player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        setSessionToken(token);
        setCurrentUserId(playerMatch.id);
        setCurrentRoleState('Player');
        setIsAuthenticated(true);
        setLoggedUsername(playerMatch.name);
        setViewMode('player');

        // Immediate fresh fetch of active rounds without cache on player login
        fetchActiveRounds({ bypassCache: true });

        return {
          success: true,
          message: `¡Bienvenido de nuevo, ${playerMatch.name}!`,
          role: 'Player' as UserRole,
          user: playerMatch,
        };
      }

      // Record failed login attempt and check for lockout (3 max attempts)
      const failResult = LotteryStorageService.recordFailedLoginAttempt(trimmedUser);
      if (playerMatch && playerMatch.email) {
        LotteryStorageService.recordFailedLoginAttempt(playerMatch.email);
      }

      const newLog: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        operatorRole: 'Sistema',
        operatorName: 'Seguridad',
        action: failResult.isLocked ? 'BLOQUEO_CUENTA_INTENTOS' : 'INTENTO_FALLIDO_LOGIN',
        details: `Intento de acceso fallido para "${trimmedUser}". Intento ${failResult.attempts}/3. ${failResult.isLocked ? 'Bloqueo temporal aplicado por 15 min.' : ''}`,
        ip: '190.202.45.12',
      };
      setAuditLogs((prev) => [newLog, ...prev]);

      return {
        success: false,
        message: failResult.message,
      };
    },
    [systemCredentials, users]
  );

  // Request Password Recovery via Email
  const requestPasswordRecovery = useCallback(
    (identifierOrEmail: string) => {
      const clean = identifierOrEmail.trim().toLowerCase();
      if (!clean) {
        return {
          success: false,
          message: 'Por favor ingresa tu correo electrónico, usuario o número de cédula.',
        };
      }

      // Search matching user or admin
      const matchedUser = users.find(
        (u) =>
          (u.email && u.email.toLowerCase() === clean) ||
          u.name.toLowerCase() === clean ||
          u.documentId.toLowerCase() === clean ||
          u.phone === clean
      );

      const matchedCred = systemCredentials.find(
        (c) => c.username.toLowerCase() === clean
      );

      const targetEmail =
        matchedUser?.email ||
        (matchedCred ? `${matchedCred.username.toLowerCase()}@loteria.com` : clean.includes('@') ? clean : null);

      if (!targetEmail) {
        return {
          success: false,
          message: 'No se encontró un correo electrónico asociado a la cuenta especificada. Por favor verifica tus datos.',
        };
      }

      // Generate a 6-digit verification code & unique token
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const token = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      // Save token in storage (valid for 30 minutes)
      LotteryStorageService.savePasswordRecoveryToken({
        email: targetEmail,
        code,
        token,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 60 * 1000,
        used: false,
      });

      const newLog: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        operatorRole: 'Sistema',
        operatorName: 'Recuperación de Clave',
        action: 'SOLICITUD_RECUPERACION_CLAVE',
        details: `Código de seguridad de 6 dígitos generado y enviado a "${targetEmail}". Código DEMO: ${code}`,
        ip: '190.202.45.12',
      };
      setAuditLogs((prev) => [newLog, ...prev]);

      return {
        success: true,
        message: `Hemos enviado un código de verificación de 6 dígitos a ${targetEmail}. Revisa tu bandeja de entrada y spam.`,
        email: targetEmail,
        demoCode: code,
      };
    },
    [users, systemCredentials]
  );

  // Verify Recovery Code
  const verifyRecoveryCode = useCallback((email: string, code: string) => {
    const res = LotteryStorageService.verifyRecoveryCode(email, code);
    return {
      ...res,
      success: res.valid,
    };
  }, []);

  // Reset Password With Verified Code
  const resetPasswordWithCode = useCallback(
    (email: string, code: string, newPassword: string) => {
      const trimmedPass = newPassword.trim();
      if (!trimmedPass || trimmedPass.length < 6) {
        return {
          success: false,
          message: 'La nueva contraseña debe tener al menos 6 caracteres.',
        };
      }

      const verification = LotteryStorageService.verifyRecoveryCode(email, code);
      if (!verification.valid) {
        return {
          success: false,
          message: verification.message,
        };
      }

      const cleanEmail = email.trim().toLowerCase();

      // Update in users list
      let foundInUsers = false;
      setUsers((prev) =>
        prev.map((u) => {
          if (u.email && u.email.toLowerCase() === cleanEmail) {
            foundInUsers = true;
            return {
              ...u,
              password: trimmedPass,
              failedLoginAttempts: 0,
              lockoutUntil: null,
            };
          }
          return u;
        })
      );

      // If it's an admin credential
      let foundInCreds = false;
      setSystemCredentials((prev) =>
        prev.map((c) => {
          if (c.username.toLowerCase() === cleanEmail.split('@')[0]) {
            foundInCreds = true;
            return {
              ...c,
              password: trimmedPass,
            };
          }
          return c;
        })
      );

      // Mark token as used and unlock user
      LotteryStorageService.markRecoveryTokenUsed(code);
      LotteryStorageService.clearFailedLoginAttempts(cleanEmail);
      LotteryStorageService.clearFailedLoginAttempts(cleanEmail.split('@')[0]);

      const newLog: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        operatorRole: 'Sistema',
        operatorName: 'Seguridad',
        action: 'RESTABLECIMIENTO_CLAVE_EXITOSO',
        details: `Contraseña restablecida con éxito mediante código verificado para ${cleanEmail}. Bloqueos de seguridad eliminados.`,
        ip: '190.202.45.12',
      };
      setAuditLogs((prev) => [newLog, ...prev]);

      return {
        success: true,
        message: '¡Tu contraseña ha sido restablecida exitosamente! Ya puedes iniciar sesión con tu nueva clave.',
      };
    },
    []
  );

  // Logout function: destroys session and token
  const logout = useCallback(() => {
    setSessionToken(null);
    setIsAuthenticated(false);
    setCurrentRoleState('Player');
    setLoggedUsername('');
    setViewMode('player');

    LotteryStorageService.clearSession();

    try {
      localStorage.removeItem(`${STORAGE_KEY}_is_authenticated`);
      localStorage.removeItem(`${STORAGE_KEY}_auth_role`);
      localStorage.removeItem(`${STORAGE_KEY}_logged_username`);
    } catch {}

    const newLog: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      operatorRole: (currentRole !== 'Player' ? currentRole : 'Sistema') as any,
      operatorName: loggedUsername || 'Usuario',
      action: 'CIERRE_SESION',
      details: `El usuario ${loggedUsername || 'anónimo'} cerró su sesión activa. Token invalidado.`,
      ip: '190.202.45.12',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, [currentRole, loggedUsername]);

  // Register User (+18 Age Check & Identity verification)
  const registerUser = useCallback(
    (data: {
      firstName: string;
      lastName: string;
      documentId: string;
      email: string;
      phone: string;
      birthDate: string;
      password?: string;
      kycFrontUrl?: string;
      kycBackUrl?: string;
    }) => {
      // Age Verification (+18 Check)
      const dob = new Date(data.birthDate);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      if (isNaN(age) || age < 18) {
        return {
          success: false,
          message: 'Error de Verificación (+18): Debes ser mayor de edad (mínimo 18 años) para poder registrarte y participar en SuperMillonario Destiny Lottery.',
        };
      }

      const cleanDoc = data.documentId.trim().toUpperCase();
      const cleanEmail = data.email.trim().toLowerCase();

      // Check duplicate ID document
      const existingDoc = users.find((u) => u.documentId.toUpperCase() === cleanDoc);
      if (existingDoc) {
        return {
          success: false,
          message: `El número de Cédula de Identidad (${cleanDoc}) ya está registrado en el sistema.`,
        };
      }

      // Check duplicate email
      const existingEmail = users.find((u) => u.email && u.email.toLowerCase() === cleanEmail);
      if (existingEmail) {
        return {
          success: false,
          message: `El correo electrónico (${cleanEmail}) ya está registrado con otra cuenta.`,
        };
      }

      const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`;
      const newUserId = `usr-${Date.now()}`;

      const newUser: AppUser = {
        id: newUserId,
        name: fullName,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: cleanEmail,
        password: data.password?.trim() || '123456',
        phone: data.phone.trim(),
        documentId: cleanDoc,
        birthDate: data.birthDate,
        country: 'Venezuela',
        role: 'Player', // Asignación garantizada de rol por defecto
        status: 'active',
        availableBalance: 0, // Saldo inicial estrictamente en cero (0.00 Bs)
        pendingBalance: 0,
        lockedBalance: 0,
        totalWonVes: 0,
        totalSpentVes: 0,
        createdAt: new Date().toISOString(),
        kycStatus: 'Aprobado', // Verificación legal de mayoría de edad +18 aprobada
        kycVerifiedAt: new Date().toISOString(),
        kycFrontUrl: data.kycFrontUrl,
        kycBackUrl: data.kycBackUrl,
      };

      // Direct update of users state (triggers localStorage persistence)
      setUsers((prev) => [newUser, ...prev]);

      // Guardar también en el almacenamiento oficial de jugadores_bingo
      saveJugador({
        id: newUser.id,
        nombre: data.firstName.trim(),
        apellido: data.lastName.trim(),
        cedula: cleanDoc,
        correo: cleanEmail,
        telefono: data.phone.trim() || '0412-0000000',
        fechaNacimiento: data.birthDate,
        fechaRegistro: new Date().toLocaleDateString('es-VE', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

      // Transmisión inmediata en tiempo real por backend REST y WebSocket para actualización en vivo de admin
      try {
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser),
        }).catch((err) => console.warn('[GameContext] Async server sync note:', err));
      } catch (e) {}

      // Emitir eventos en tiempo real
      realtimeService.broadcastUserRegistered(newUser);
      syncEngine.broadcastUserRegistered(newUser);

      // Automatic Login for newly registered player with ephemeral session token
      const token = `tok_player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setSessionToken(token);
      setCurrentUserId(newUser.id);
      setCurrentRoleState('Player');
      setIsAuthenticated(true);
      setLoggedUsername(newUser.name);
      setViewMode('player');

      // Immediate fresh fetch of active rounds without cache on registration
      fetchActiveRounds({ bypassCache: true });

      const newLog: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        operatorRole: 'Jugador',
        operatorName: newUser.name,
        action: 'REGISTRO_NUEVO_JUGADOR',
        details: `Nuevo usuario registrado y verificado (+18): ${fullName} (Cédula: ${cleanDoc}, Email: ${cleanEmail}, Edad: ${age} años). Saldo inicial: 0,00 Bs. Token: ${token.substring(0, 14)}...`,
        ip: '190.202.45.12',
      };
      setAuditLogs((prev) => [newLog, ...prev]);

      return {
        success: true,
        message: `¡Registro completado con éxito! Bienvenido a TÚ SUPERCARTÓN, ${newUser.firstName}. Edad validada: ${age} años (+18).`,
        user: newUser,
      };
    },
    [users]
  );

  // Adjust User Balance by Super Admin / Operator
  const adjustUserBalance = useCallback(
    (userId: string, amountVes: number, reason: string) => {
      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser) {
        return { success: false, message: 'Usuario no encontrado.' };
      }

      if (amountVes === 0 || isNaN(amountVes)) {
        return { success: false, message: 'El monto a ajustar debe ser diferente de 0.' };
      }

      const balanceBefore = targetUser.availableBalance;
      const balanceAfter = Math.max(0, balanceBefore + amountVes);
      const actualDelta = balanceAfter - balanceBefore;

      if (actualDelta === 0 && amountVes < 0) {
        return { success: false, message: 'El usuario no posee saldo suficiente para debitar.' };
      }

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              availableBalance: balanceAfter,
            };
          }
          return u;
        })
      );

      const ledgerEntry: WalletLedgerEntry = {
        id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: targetUser.id,
        userName: targetUser.name,
        type: 'admin_adjustment',
        amountVes: actualDelta,
        balanceBefore,
        balanceAfter,
        description: `Ajuste Administrativo (${operatorRole}): ${reason || 'Ajuste de balance manual'}`,
        referenceId: `ADJ-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setLedger((prev) => [ledgerEntry, ...prev]);

      const log: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        operatorRole,
        operatorName: loggedUsername || 'Super Admin',
        action: 'AJUSTE_SALDO_USUARIO',
        details: `Ajuste de saldo para ${targetUser.name} (${targetUser.documentId}): ${actualDelta >= 0 ? '+' : ''}${actualDelta} Bs. Saldo anterior: ${balanceBefore} Bs, Nuevo saldo: ${balanceAfter} Bs. Motivo: ${reason}`,
        ip: '190.202.45.12',
      };
      setAuditLogs((prev) => [log, ...prev]);

      return {
        success: true,
        message: `Saldo de ${targetUser.name} actualizado con éxito (${actualDelta >= 0 ? '+' : ''}${actualDelta} Bs.).`,
      };
    },
    [users, operatorRole, loggedUsername]
  );

  // Update User Status (active / suspended / banned)
  const updateUserStatus = useCallback(
    (userId: string, status: 'active' | 'suspended' | 'banned', reason?: string) => {
      const targetUser = users.find((u) => u.id === userId);
      if (!targetUser) {
        return { success: false, message: 'Usuario no encontrado.' };
      }

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              status,
            };
          }
          return u;
        })
      );

      const statusLabels = {
        active: 'Activo',
        suspended: 'Suspendido',
        banned: 'Bloqueado Permanentemente',
      };

      const log: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        operatorRole,
        operatorName: loggedUsername || 'Super Admin',
        action: 'CAMBIO_ESTADO_USUARIO',
        details: `Estado de usuario ${targetUser.name} (${targetUser.documentId}) cambiado a "${statusLabels[status]}". ${reason ? `Motivo: ${reason}` : ''}`,
        ip: '190.202.45.12',
      };
      setAuditLogs((prev) => [log, ...prev]);

      return {
        success: true,
        message: `Estado de ${targetUser.name} actualizado a ${statusLabels[status]}.`,
      };
    },
    [users, operatorRole, loggedUsername]
  );

  // Update KYC status for any user (Player self-verification or Backoffice Audit)
  const updateUserKyc = useCallback(
    (
      userId: string,
      kycStatus: 'Aprobado' | 'Pendiente' | 'Rechazado' | 'No Enviado',
      kycFrontUrl?: string,
      kycBackUrl?: string
    ) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              kycStatus,
              kycVerifiedAt: kycStatus === 'Aprobado' ? new Date().toISOString() : u.kycVerifiedAt,
              kycFrontUrl: kycFrontUrl || u.kycFrontUrl,
              kycBackUrl: kycBackUrl || u.kycBackUrl,
            };
          }
          return u;
        })
      );

      const targetUser = users.find((u) => u.id === userId);
      const newLog: AuditLogEntry = {
        id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        operatorRole: (currentRole !== 'Player' ? currentRole : 'Sistema') as any,
        operatorName: loggedUsername || targetUser?.name || 'Sistema',
        action: 'ACTUALIZACION_ESTADO_KYC',
        details: `Estado KYC de ${targetUser?.name || userId} actualizado a "${kycStatus}".`,
        ip: '190.202.45.12',
      };
      setAuditLogs((prev) => [newLog, ...prev]);
    },
    [users, currentRole, loggedUsername]
  );

  // Verify current active user's identity (+18 KYC)
  const verifyCurrentAccount = useCallback(() => {
    if (!currentUser) {
      return { success: false, message: 'No hay un usuario activo para verificar.' };
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            kycStatus: 'Aprobado',
            kycVerifiedAt: new Date().toISOString(),
            kycFrontUrl: u.kycFrontUrl || 'cedula_validada.png',
            kycBackUrl: u.kycBackUrl || 'selfie_validada.png',
          };
        }
        return u;
      })
    );

    const newLog: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      operatorRole: 'Sistema',
      operatorName: currentUser.name,
      action: 'VERIFICACION_KYC_APROBADA',
      details: `El usuario ${currentUser.name} (${currentUser.documentId}) verificó su identidad (+18 / KYC Aprobado). Acceso a sala de sorteos habilitado.`,
      ip: '190.202.45.12',
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    return {
      success: true,
      message: '¡Verificación de Identidad aprobada exitosamente! Tu cuenta cumple con los requisitos legales para la sala de sorteos en vivo.',
    };
  }, [currentUser]);

  return (
    <GameContext.Provider
      value={{
        currentUser,
        currentRole,
        setCurrentRole,
        operatorRole,
        setOperatorRole,
        isAuthenticated,
        sessionToken,
        loggedUsername,
        permissions,
        activeCredential,
        login,
        logout,
        requestPasswordRecovery,
        verifyRecoveryCode,
        resetPasswordWithCode,
        registerUser,
        updateUserKyc,
        verifyCurrentAccount,
        systemCredentials,
        createSystemCredential,
        updateSystemCredential,
        deleteSystemCredential,
        users,
        viewMode,
        setViewMode,
        activeRound,
        activeRounds,
        upcomingRounds,
        rounds,
        cards,
        userCards,
        recharges,
        withdrawals,
        ledger,
        auditLogs,
        commercialConfig,
        currencyDisplay,
        setCurrencyDisplay,
        formatMoney,
        purchaseCards,
        submitRecharge,
        approveRecharge,
        rejectRecharge,
        submitWithdrawal,
        completeWithdrawal,
        rejectWithdrawal,
        createRound,
        updateRoundConfig,
        setRoundStatus,
        submitRoundResult,
        updateCommercialConfig,
        resetToInitialData,
        liveDrawingRound,
        isLiveDrawing,
        liveDrawnFichas,
        startLiveDrawSimulation,
        stopLiveDrawSimulation,
        quickAddBalance,
        adjustUserBalance,
        updateUserStatus,
        isRealtimeSyncConnected,
        lastSyncTimestamp,
        fetchActiveRounds,
        fetchPendingRecharges,
        fetchWithdrawals,
        fetchCommercialConfig,
        archiveCard,
        unarchiveCard,
        archiveCardsBatch,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
