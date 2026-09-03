export type FichaCategory = 'animal' | 'fruta' | 'objeto';

export interface Ficha {
  id: number; // 1 - 70
  name: string;
  category: FichaCategory;
  emoji: string;
  pronunciation: string;
  accentColor: string;
  bgGradient: string;
}

export type WinningPatternType = 
  | 'line_horizontal' 
  | 'line_vertical' 
  | 'line_diagonal' 
  | 'four_corners' 
  | 'full_card';

export interface WinningPatternResult {
  type: WinningPatternType;
  label: string;
  multiplier: number;
  prizeVes: number;
  matchedIndices: number[]; // indices 0 - 15 in the 4x4 matrix
}

export interface MatrixCard {
  id: string;
  code: string; // e.g. "LF-8492"
  roundId: string;
  roundNumber: number;
  userId: string;
  userName: string;
  matrix: number[]; // 16 unique ficha IDs (0-15 indices)
  purchaseTime: string;
  priceVes: number;
  status: 'active' | 'winner' | 'loss';
  matchedCount: number;
  winningPatterns: WinningPatternResult[];
  totalPrizeVes: number;
  isClaimed?: boolean;
  is_archived?: boolean;
}

export type RoundStatus = 'scheduled' | 'open' | 'closed' | 'drawing' | 'finished';

export interface GameRound {
  id: string;
  roundNumber: number;
  order?: number;
  title: string;
  openBetAt: string;
  closeBetAt: string;
  drawAt: string;
  starts_at?: string;
  ends_at?: string;
  status: RoundStatus;
  drawnFichas: number[]; // Ordered array of ficha IDs drawn
  totalCardsSold: number;
  cardPriceVes: number;
  card_price?: number;
  prize_percentage?: number;
  jackpotVes: number;
  winningCardsCount: number;
  totalPrizesPaidVes: number;
  resultLocked: boolean;
  resultSubmittedBy?: string;
  resultSubmittedAt?: string;
}

export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface RechargeTransaction {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amountVes: number;
  payerPhone: string;
  payerName: string;
  payerDocumentId: string;
  bankOrigin: string;
  referenceNumber: string;
  voucherImageUrl: string;
  status: TransactionStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
  processedAt?: string;
  processedBy?: string;
  confirmedBankArrival?: boolean;
  correo?: string;
  email?: string;
  [key: string]: any;
}

export interface WithdrawalTransaction {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amountVes: number;
  channel: 'pago_movil' | 'transferencia';
  bankDest: string;
  phoneOrAccount: string;
  documentId: string;
  titularName: string;
  accountType?: 'corriente' | 'ahorro';
  status: TransactionStatus;
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

export type LedgerEntryType = 
  | 'recharge' 
  | 'card_purchase' 
  | 'prize_payout' 
  | 'withdrawal_lock' 
  | 'withdrawal_completed' 
  | 'withdrawal_refund'
  | 'admin_adjustment';

export interface WalletLedgerEntry {
  id: string;
  userId: string;
  userName: string;
  type: LedgerEntryType;
  amountVes: number; // positive or negative
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceId: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  operatorRole: 'Super Admin' | 'Auditor' | 'Sistema' | string;
  operatorName: string;
  action: string;
  details: string;
  ip: string;
}

export interface AppUser {
  id: string;
  name: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  emailVerified?: boolean;
  password?: string;
  role?: 'Player' | 'Super Admin' | 'Operador Financiero' | 'Auditor';
  phone: string;
  documentId: string;
  birthDate: string;
  country: string;
  status: 'active' | 'suspended' | 'banned';
  availableBalance: number;
  pendingBalance: number;
  lockedBalance: number;
  totalWonVes: number;
  totalSpentVes: number;
  createdAt: string;
  kycStatus?: 'No Enviado' | 'Pendiente' | 'Aprobado' | 'Rechazado';
  kycVerifiedAt?: string;
  kycFrontUrl?: string;
  kycBackUrl?: string;
  kycData?: {
    frontUrl?: string;
    backUrl?: string;
    submittedAt?: string;
  };
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'none' | 'email' | 'sms' | 'whatsapp';
  withdrawalMethods?: any[];
  failedLoginAttempts?: number;
  lockoutUntil?: number | null;
  options?: {
    data?: {
      name?: string;
      fullName?: string;
      full_name?: string;
      phone?: string;
      telefono?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export interface AdminBankConfig {
  bankName: string;
  phone: string;
  rif: string;
  holderName: string;
  type: string;
}

export interface CommercialConfig {
  adminBank: AdminBankConfig;
  cardPrices: {
    pack2: number; // e.g. 50 VES
    pack4: number; // e.g. 100 VES
    pack6: number; // e.g. 150 VES
  };
  singleCardPriceVes: number; // e.g. 25 VES
  exchangeRateVesUsd: number; // e.g. 60 VES per 1 USD
  prizeMultipliers: {
    fullCard: number; // Tabla Llena (50x)
    fourCorners: number; // 4 Esquinas (8x)
    lineHorizontal: number; // Línea Horizontal (3x)
    lineVertical: number; // Línea Vertical (3x)
    lineDiagonal: number; // Línea Diagonal (4x)
  };
  drawDrawTotalCount: number; // usually 30-40 drawn fichas out of 70
  maxRiskPerRound: number;
  closingBufferMinutes: number;
  twoFactorOtpDemo: string;
}
