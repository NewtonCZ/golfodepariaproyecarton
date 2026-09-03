// ==========================================
// Base Platform Types
// ==========================================

export type NavigationTab = 'overview' | 'data' | 'board' | 'analytics' | 'settings';

export type ItemStatus = 'activo' | 'pendiente' | 'en_progreso' | 'completado' | 'archivado';
export type ItemPriority = 'baja' | 'media' | 'alta' | 'urgente';

export interface DataItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: ItemStatus;
  priority: ItemPriority;
  assignedTo: string;
  dueDate: string;
  progress: number;
  tags: string[];
  createdAt: string;
}

export interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  period: string;
  iconName: string;
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete' | 'info';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  status: 'online' | 'busy' | 'away';
}

export interface AppSettings {
  appName: string;
  theme: 'light' | 'dark' | 'system';
  enableNotifications: boolean;
  compactMode: boolean;
  language: 'es' | 'en';
  autoSave: boolean;
}

// ==========================================
// Lottery, Matrix Cards & Game Types
// ==========================================

export interface Ficha {
  id: number;
  name: string;
  category: 'animal' | 'fruta' | 'objeto' | 'object' | 'symbol' | string;
  emoji: string;
  pronunciation: string;
  accentColor: string;
  bgGradient: string;
}

export type WinningPatternType =
  | 'full_card'
  | 'four_corners'
  | 'box'
  | 'cuadro'
  | 'line_horizontal'
  | 'line_vertical'
  | 'line_diagonal'
  | 'diagonal_main'
  | 'diagonal_inverse';

export interface WinningPatternResult {
  type: WinningPatternType;
  label: string;
  multiplier: number;
  prizeVes: number;
  matchedIndices: number[];
}

export interface MatrixCard {
  id: string;
  code?: string;
  userId: string;
  userName?: string;
  roundId: string;
  roundNumber?: number;
  matrix: number[]; // 16 unique Ficha IDs (4x4)
  priceVes: number;
  purchasedAt?: string;
  purchaseTime?: string;
  status: 'active' | 'winner' | 'loss' | string;
  winningPatterns: WinningPatternResult[];
  totalPrizeVes: number;
  matchedCount?: number;
  isArchived?: boolean;
  [key: string]: any;
}

export type RoundStatus = 'open' | 'closed' | 'drawing' | 'finished' | 'scheduled' | string;

export interface GameRound {
  id: string;
  code?: string;
  title?: string;
  roundNumber?: number;
  order?: number;
  scheduledTime?: string;
  drawDate?: string;
  openBetAt?: string;
  closeBetAt?: string;
  drawAt?: string;
  starts_at?: string;
  ends_at?: string;
  status: RoundStatus;
  cardPriceVes?: number;
  card_price?: number;
  drawnFichas?: number[];
  currentFichaIndex?: number;
  jackpotAccumulatedVes?: number;
  jackpotVes?: number;
  manualJackpotVes?: number;
  totalCardsSold?: number;
  totalPrizesPaidVes?: number;
  winnerCardsCount?: number;
  winnerUserIds?: string[];
  resultLocked?: boolean;
  resultSubmittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

// ==========================================
// User, Financial & Commercial Config Types
// ==========================================

export interface AppUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  documentId: string;
  email?: string;
  balanceVes?: number;
  availableBalance?: number;
  pendingBalance?: number;
  lockedBalance?: number;
  role: 'Player' | 'Super Admin' | 'Operador Financiero' | 'Auditor' | string;
  avatarUrl?: string;
  createdAt?: string;
  birthDate?: string;
  fechaNacimiento?: string;
  is_of_age?: boolean;
  isAdult?: boolean;
  isOfAge?: boolean;
  ageConfirmedAt?: string;
  kycStatus?: 'Pendiente' | 'Aprobado' | 'Verificado' | string;
  status?: 'active' | 'suspended' | 'banned' | string;
  [key: string]: any;
}

export interface AdminBankDetails {
  bankName: string;
  phone: string;
  rif: string;
  holderName: string;
  type: 'Pago Móvil' | 'Transferencia' | string;
  [key: string]: any;
}

export interface CommercialConfig {
  adminBank: AdminBankDetails;
  exchangeRateVesUsd: number;
  precio_carton_base_ves?: number;
  singleCardPriceVes?: number;
  bankName?: string;
  phone?: string;
  rif?: string;
  holderName?: string;
  cardPrices: {
    pack2: number;
    pack4: number;
    pack6: number;
    [key: string]: any;
  };
  prizeMultipliers: {
    fullCard: number;
    fourCorners: number;
    lineHorizontal: number;
    lineVertical: number;
    diagonal?: number;
    lineDiagonal?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export type TransactionStatus = 'pending' | 'approved' | 'rejected' | string;

export interface RechargeTransaction {
  id: string;
  userId: string;
  userName?: string;
  amountVes: number;
  payerPhone: string;
  payerName: string;
  payerDocumentId: string;
  bankOrigin: string;
  referenceNumber: string;
  voucherImageUrl: string;
  status: TransactionStatus;
  createdAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  [key: string]: any;
}

export interface WithdrawalTransaction {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  amountVes: number;
  destinationBank?: string;
  destinationPhone?: string;
  destinationRif?: string;
  destinationHolder?: string;
  bankDest?: string;
  phoneOrAccount?: string;
  documentId?: string;
  titularName?: string;
  accountType?: 'corriente' | 'ahorro' | string;
  channel?: 'pago_movil' | 'transferencia' | string;
  status: TransactionStatus;
  referenceNumber?: string;
  createdAt?: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
  [key: string]: any;
}

export type LedgerEntryType =
  | 'recharge'
  | 'card_purchase'
  | 'CARD_PURCHASE'
  | 'prize_won'
  | 'prize_payout'
  | 'withdrawal'
  | 'withdrawal_lock'
  | 'withdrawal_completed'
  | 'withdrawal_refund'
  | 'refund'
  | 'admin_adjustment'
  | string;

export interface WalletLedgerEntry {
  id: string;
  userId: string;
  userName?: string;
  type: LedgerEntryType;
  amountVes: number;
  balanceAfterVes?: number;
  balanceAfter?: number;
  balanceBefore?: number;
  status?: 'COMPLETED' | 'PENDING' | 'REJECTED' | string;
  sorteoId?: string;
  roundId?: string;
  timestamp?: string;
  description: string;
  referenceId?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface AuditLogEntry {
  id: string;
  operatorId?: string;
  operatorName?: string;
  operatorRole?: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
  ip?: string;
  [key: string]: any;
}
