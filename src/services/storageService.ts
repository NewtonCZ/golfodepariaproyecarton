/**
 * Browser Storage & Service Worker Cache Manager for SuperMillonario Destiny Lottery.
 *
 * Utilizes:
 * - localStorage: For long-term durable database state (Users, Cards, Rounds, Balances, Ledger, Audit Logs, Settings)
 * - sessionStorage: For active user authentication, ephemeral session tokens, active navigation tab, modal visibility, and ongoing live draw state
 * - Cache API (Service Worker / Browser Cache): For offline asset caching, sound effects, and lottery pool data
 */

import { mobileCacheManager } from './mobileCacheManager';

export interface PersistedSession {
  token: string;
  userId: string;
  role: string;
  username: string;
  viewMode: 'player' | 'admin';
  lastActivity: number;
}

export interface LiveDrawProgressState {
  roundId: string;
  isDrawing: boolean;
  drawnFichaIds: number[];
  currentFichaId: number | null;
  step: number;
  timestamp: number;
}

const STORAGE_KEYS = {
  // Session-scoped keys (sessionStorage)
  AUTH_SESSION: 'supermillonario_auth_session_v1',
  LIVE_DRAW_STATE: 'supermillonario_live_draw_progress_v1',
  UI_VIEWMODEL: 'supermillonario_lottery_ui_viewmodel_v1',

  // Long-term keys (localStorage)
  USERS: 'lucky_fichas_db_v1_users',
  ROUNDS: 'lucky_fichas_db_v1_rounds',
  CARDS: 'lucky_fichas_db_v1_cards',
  RECHARGES: 'lucky_fichas_db_v1_recharges',
  WITHDRAWALS: 'lucky_fichas_db_v1_withdrawals',
  LEDGER: 'lucky_fichas_db_v1_ledger',
  AUDIT: 'lucky_fichas_db_v1_audit',
  CONFIG: 'lucky_fichas_db_v1_config',
  // Password Recovery and Lockout keys
  PASSWORD_RECOVERY_TOKENS: 'supermillonario_pwd_recovery_tokens_v1',
  LOGIN_ATTEMPTS: 'supermillonario_login_attempts_v1',
} as const;

export interface PasswordRecoveryToken {
  email: string;
  code: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

export interface UserLockoutInfo {
  identifier: string; // email, username or docId (lowercase)
  failedAttempts: number;
  lockoutUntil: number | null; // timestamp ms
  lastAttemptAt: number;
}

export class LotteryStorageService {
  /**
   * Save a password recovery token/code
   */
  static savePasswordRecoveryToken(record: PasswordRecoveryToken): void {
    try {
      if (typeof window === 'undefined') return;
      const tokens = this.getPasswordRecoveryTokens();
      // Remove any existing active tokens for this email
      const filtered = tokens.filter((t) => t.email.toLowerCase() !== record.email.toLowerCase());
      filtered.push(record);
      localStorage.setItem(STORAGE_KEYS.PASSWORD_RECOVERY_TOKENS, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Storage: Error saving recovery token:', e);
    }
  }

  /**
   * Get all active password recovery tokens
   */
  static getPasswordRecoveryTokens(): PasswordRecoveryToken[] {
    try {
      if (typeof window === 'undefined') return [];
      const raw = localStorage.getItem(STORAGE_KEYS.PASSWORD_RECOVERY_TOKENS);
      if (!raw) return [];
      const tokens: PasswordRecoveryToken[] = JSON.parse(raw);
      // Filter out tokens older than 24 hours
      return tokens.filter((t) => Date.now() < t.expiresAt);
    } catch (e) {
      console.warn('Storage: Error reading recovery tokens:', e);
      return [];
    }
  }

  /**
   * Validate a recovery code for an email
   */
  static verifyRecoveryCode(email: string, code: string): { valid: boolean; message: string; token?: PasswordRecoveryToken } {
    const tokens = this.getPasswordRecoveryTokens();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim().toUpperCase();

    const record = tokens.find(
      (t) => t.email.toLowerCase() === cleanEmail && !t.used
    );

    if (!record) {
      return { valid: false, message: 'No se encontró una solicitud de recuperación activa para este correo.' };
    }

    if (Date.now() > record.expiresAt) {
      return { valid: false, message: 'El código de seguridad ha expirado. Por favor solicita uno nuevo.' };
    }

    if (record.code.toUpperCase() !== cleanCode) {
      return { valid: false, message: 'El código de 6 dígitos ingresado es incorrecto.' };
    }

    return { valid: true, message: 'Código verificado exitosamente.', token: record };
  }

  /**
   * Mark a recovery code as used
   */
  static markRecoveryTokenUsed(code: string): void {
    try {
      if (typeof window === 'undefined') return;
      const tokens = this.getPasswordRecoveryTokens();
      const updated = tokens.map((t) => (t.code.toUpperCase() === code.trim().toUpperCase() ? { ...t, used: true } : t));
      localStorage.setItem(STORAGE_KEYS.PASSWORD_RECOVERY_TOKENS, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage: Error updating recovery token:', e);
    }
  }

  /**
   * Record a failed login attempt and check for lockouts (Max 3 failed attempts)
   * Lockout duration: 15 minutes (900,000 ms)
   */
  static recordFailedLoginAttempt(identifier: string): {
    attempts: number;
    isLocked: boolean;
    remainingMinutes: number;
    message: string;
  } {
    const cleanId = identifier.trim().toLowerCase();
    const allAttempts = this.getAllLockoutInfo();
    const existing = allAttempts[cleanId] || {
      identifier: cleanId,
      failedAttempts: 0,
      lockoutUntil: null,
      lastAttemptAt: Date.now(),
    };

    // If already locked out and period still active
    if (existing.lockoutUntil && Date.now() < existing.lockoutUntil) {
      const remainingMinutes = Math.ceil((existing.lockoutUntil - Date.now()) / (60 * 1000));
      return {
        attempts: existing.failedAttempts,
        isLocked: true,
        remainingMinutes,
        message: `Cuenta bloqueada temporalmente por seguridad. Inténtalo de nuevo en ${remainingMinutes} minuto(s) o recupera tu contraseña por correo.`,
      };
    }

    // If past lockout period or fresh attempts, increment
    const newAttempts = existing.failedAttempts + 1;
    let lockoutUntil: number | null = null;

    if (newAttempts >= 3) {
      // Apply 15-minute temporary lockout
      lockoutUntil = Date.now() + 15 * 60 * 1000;
    }

    allAttempts[cleanId] = {
      identifier: cleanId,
      failedAttempts: newAttempts,
      lockoutUntil,
      lastAttemptAt: Date.now(),
    };

    this.saveAllLockoutInfo(allAttempts);

    if (newAttempts >= 3) {
      return {
        attempts: newAttempts,
        isLocked: true,
        remainingMinutes: 15,
        message: 'Has alcanzado el límite de 3 intentos fallidos. Tu cuenta ha sido bloqueada temporalmente por 15 minutos. Debes restablecer tu contraseña mediante correo electrónico.',
      };
    }

    const remainingAttempts = 3 - newAttempts;
    return {
      attempts: newAttempts,
      isLocked: false,
      remainingMinutes: 0,
      message: `Contraseña incorrecta. Te queda(n) ${remainingAttempts} intento(s) antes del bloqueo de seguridad.`,
    };
  }

  /**
   * Check if an identifier is currently locked out
   */
  static checkLockoutStatus(identifier: string): {
    isLocked: boolean;
    remainingMinutes: number;
    failedAttempts: number;
    message?: string;
  } {
    const cleanId = identifier.trim().toLowerCase();
    const allAttempts = this.getAllLockoutInfo();
    const info = allAttempts[cleanId];

    if (!info) return { isLocked: false, remainingMinutes: 0, failedAttempts: 0 };

    if (info.lockoutUntil && Date.now() < info.lockoutUntil) {
      const remainingMinutes = Math.ceil((info.lockoutUntil - Date.now()) / (60 * 1000));
      return {
        isLocked: true,
        remainingMinutes,
        failedAttempts: info.failedAttempts,
        message: `Acceso bloqueado por superar los 3 intentos fallidos. Por favor espera ${remainingMinutes} minuto(s) o utiliza la opción "¿Olvidaste tu contraseña?" para desbloquear tu cuenta.`,
      };
    }

    return {
      isLocked: false,
      remainingMinutes: 0,
      failedAttempts: info.failedAttempts,
    };
  }

  /**
   * Clear failed login attempts after a successful login or successful password recovery
   */
  static clearFailedLoginAttempts(identifier: string): void {
    try {
      const cleanId = identifier.trim().toLowerCase();
      const allAttempts = this.getAllLockoutInfo();
      delete allAttempts[cleanId];
      this.saveAllLockoutInfo(allAttempts);
    } catch (e) {
      console.warn('Storage: Error clearing lockout info:', e);
    }
  }

  private static getAllLockoutInfo(): Record<string, UserLockoutInfo> {
    try {
      if (typeof window === 'undefined') return {};
      const raw = localStorage.getItem(STORAGE_KEYS.LOGIN_ATTEMPTS);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private static saveAllLockoutInfo(data: Record<string, UserLockoutInfo>): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage: Error saving lockout info:', e);
    }
  }
  /**
   * Save active user authentication session to sessionStorage
   */
  static saveSession(session: PersistedSession): void {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
    } catch (e) {
      console.warn('Storage: Error saving session to sessionStorage:', e);
    }
  }

  /**
   * Retrieve active user session from sessionStorage
   */
  static getSession(): PersistedSession | null {
    try {
      if (typeof window === 'undefined') return null;
      const raw = sessionStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      if (!raw) return null;
      const session: PersistedSession = JSON.parse(raw);
      // Valid for 24 hours of inactivity
      const maxAgeMs = 24 * 60 * 60 * 1000;
      if (Date.now() - session.lastActivity > maxAgeMs) {
        this.clearSession();
        return null;
      }
      return session;
    } catch (e) {
      console.warn('Storage: Error reading session:', e);
      return null;
    }
  }

  /**
   * Invalidate and clear active user session
   */
  static clearSession(): void {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      sessionStorage.removeItem(STORAGE_KEYS.LIVE_DRAW_STATE);
    } catch (e) {
      console.warn('Storage: Error clearing session:', e);
    }
  }

  /**
   * Save Live Draw current game progression (tombola state, cantadas, sequence)
   */
  static saveLiveDrawState(state: LiveDrawProgressState): void {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.setItem(STORAGE_KEYS.LIVE_DRAW_STATE, JSON.stringify(state));
    } catch (e) {
      console.warn('Storage: Error saving live draw state:', e);
    }
  }

  /**
   * Retrieve active Live Draw progress
   */
  static getLiveDrawState(roundId?: string): LiveDrawProgressState | null {
    try {
      if (typeof window === 'undefined') return null;
      const raw = sessionStorage.getItem(STORAGE_KEYS.LIVE_DRAW_STATE);
      if (!raw) return null;
      const state: LiveDrawProgressState = JSON.parse(raw);
      // If roundId is specified, ensure it matches
      if (roundId && state.roundId !== roundId) {
        return null;
      }
      // If older than 1 hour, ignore
      if (Date.now() - state.timestamp > 60 * 60 * 1000) {
        sessionStorage.removeItem(STORAGE_KEYS.LIVE_DRAW_STATE);
        return null;
      }
      return state;
    } catch (e) {
      console.warn('Storage: Error reading live draw state:', e);
      return null;
    }
  }

  /**
   * Clear active Live Draw state when completed or reset
   */
  static clearLiveDrawState(): void {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.removeItem(STORAGE_KEYS.LIVE_DRAW_STATE);
    } catch (e) {
      console.warn('Storage: Error clearing live draw state:', e);
    }
  }

  /**
   * Quota-safe localStorage writer with prioritized mobile eviction
   */
  static safeSetItem(key: string, value: any, priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'): boolean {
    return mobileCacheManager.safeSetItem(key, value, priority);
  }

  /**
   * Quota-safe and memoized localStorage reader
   */
  static safeGetItem<T = any>(key: string, fallback: T): T {
    return mobileCacheManager.safeGetItem(key, fallback);
  }

  /**
   * Surgically invalidate caches
   */
  static surgicalInvalidate(
    reason: 'ROUND_STATUS_CHANGED' | 'CARDS_PURCHASED' | 'ROUND_FINISHED' | 'ROUND_CREATED' | 'BALANCE_UPDATED' | 'USER_LOGOUT',
    payload?: { roundId?: string; userId?: string }
  ): void {
    mobileCacheManager.surgicalInvalidate(reason, payload);
  }

  /**
   * Browser Cache API helper: Warm up and cache core static resources for instant offline/reconnection stability
   */
  static async warmAssetCache(): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window)) return;
    try {
      const cacheName = 'supermillonario-lottery-static-v1';
      const cache = await window.caches.open(cacheName);
      const urlsToPrecache = [
        '/',
        '/index.html',
      ];
      await cache.addAll(urlsToPrecache).catch(() => {
        // Ignore failures in development mode
      });
    } catch (e) {
      // Benign fallback
    }
  }
}
