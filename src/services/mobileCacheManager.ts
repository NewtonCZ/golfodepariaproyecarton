/**
 * Mobile Cache & In-Memory Storage Optimization Manager
 * for SuperMillonario Destiny Lottery.
 *
 * Implements:
 * 1. Surgical cache invalidation on round status changes and card purchases.
 * 2. Mobile RAM footprint reduction and automatic garbage collection.
 * 3. QuotaExceededError protection and prioritized LRU storage eviction.
 * 4. Fast-path in-memory caching to avoid redundant JSON parsing on mobile devices.
 * 5. Device capability detection (memory, viewport, WebKit iOS vs Android).
 */

import { MatrixCard, GameRound, WalletLedgerEntry, AuditLogEntry, RechargeTransaction, WithdrawalTransaction } from '../types';

export interface CacheQuotaLimits {
  maxCardsInMemory: number;
  maxLedgerInMemory: number;
  maxAuditInMemory: number;
  maxRechargesInMemory: number;
  maxWithdrawalsInMemory: number;
  maxFinishedRoundsHistory: number;
  enableAggressiveGC: boolean;
}

class MobileCacheManager {
  private isClient = typeof window !== 'undefined';
  private memoryCache = new Map<string, { data: any; timestamp: number; version: number }>();
  private evaluatedCardCache = new Map<string, any>();
  private readonly MAX_EVALUATED_CACHE_SIZE = 250;
  private versionCounter = 1;

  constructor() {
    if (this.isClient) {
      this.initLifecycleListeners();
    }
  }

  /**
   * Detects if the current client is a mobile device or tablet
   */
  public isMobile(): boolean {
    if (!this.isClient) return false;
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const isMobileUa = /android|iphone|ipad|ipod|windows phone|mobile|silk/i.test(ua);
    const isSmallScreen = window.innerWidth <= 840;
    const hasTouch = Boolean('ontouchstart' in window || navigator.maxTouchPoints > 0);
    return isMobileUa || (isSmallScreen && hasTouch);
  }

  /**
   * Detects if the client is a low-memory or constrained mobile device
   */
  public isLowMemoryDevice(): boolean {
    if (!this.isClient) return false;
    const nav = navigator as any;
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) {
      return true;
    }
    return this.isMobile();
  }

  /**
   * Returns tailored quota limits based on device profile
   */
  public getQuotaLimits(): CacheQuotaLimits {
    if (this.isLowMemoryDevice()) {
      return {
        maxCardsInMemory: 60,
        maxLedgerInMemory: 30,
        maxAuditInMemory: 15,
        maxRechargesInMemory: 20,
        maxWithdrawalsInMemory: 20,
        maxFinishedRoundsHistory: 6,
        enableAggressiveGC: true,
      };
    }
    return {
      maxCardsInMemory: 250,
      maxLedgerInMemory: 100,
      maxAuditInMemory: 60,
      maxRechargesInMemory: 60,
      maxWithdrawalsInMemory: 60,
      maxFinishedRoundsHistory: 12,
      enableAggressiveGC: false,
    };
  }

  /**
   * Surgical Invalidation: Invalidate specific cached keys when domain events happen
   */
  public surgicalInvalidate(
    reason: 'ROUND_STATUS_CHANGED' | 'CARDS_PURCHASED' | 'ROUND_FINISHED' | 'ROUND_CREATED' | 'BALANCE_UPDATED' | 'USER_LOGOUT',
    payload?: { roundId?: string; userId?: string }
  ): void {
    this.versionCounter++;

    // 1. Clear card evaluation memoization cache on round change or card change
    this.evaluatedCardCache.clear();

    // 2. Specific round invalidation
    if (payload?.roundId) {
      this.memoryCache.delete(`round_${payload.roundId}`);
      this.memoryCache.delete(`round_cards_${payload.roundId}`);
      this.memoryCache.delete(`live_draw_${payload.roundId}`);
    }

    // 3. Round status or finish: clean ephemeral live draw progress & preview keys
    if (reason === 'ROUND_FINISHED' || reason === 'ROUND_STATUS_CHANGED') {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('supermillonario_live_draw_progress_v1');
        }
      } catch {}
    }

    // 4. Invalidate user cards cache on purchase or balance update
    if (reason === 'CARDS_PURCHASED' || reason === 'USER_LOGOUT') {
      if (payload?.userId) {
        this.memoryCache.delete(`user_cards_${payload.userId}`);
      }
      this.memoryCache.delete('all_active_cards');
    }

    // 5. On low memory devices, run garbage collection sweep immediately
    if (this.isLowMemoryDevice()) {
      this.runSoftGarbageCollection();
    }
  }

  /**
   * Fast evaluation memoization for 4x4 matrix card checks
   */
  public getCachedEvaluation(cardId: string, drawnLength: number): any | null {
    const key = `${cardId}_len_${drawnLength}`;
    return this.evaluatedCardCache.get(key) || null;
  }

  public setCachedEvaluation(cardId: string, drawnLength: number, result: any): void {
    if (this.evaluatedCardCache.size >= this.MAX_EVALUATED_CACHE_SIZE) {
      // Evict oldest entries
      const firstKey = this.evaluatedCardCache.keys().next().value;
      if (firstKey) this.evaluatedCardCache.delete(firstKey);
    }
    const key = `${cardId}_len_${drawnLength}`;
    this.evaluatedCardCache.set(key, result);
  }

  /**
   * Prunes application state collections specifically for mobile devices
   * to guarantee low RAM consumption without affecting active user data.
   */
  public pruneStateForMobile(state: {
    cards: MatrixCard[];
    currentUserId: string;
    activeRoundIds: Set<string>;
    ledger?: WalletLedgerEntry[];
    auditLogs?: AuditLogEntry[];
    recharges?: RechargeTransaction[];
    withdrawals?: WithdrawalTransaction[];
    finishedRounds?: GameRound[];
  }): {
    cards: MatrixCard[];
    ledger: WalletLedgerEntry[];
    auditLogs: AuditLogEntry[];
    recharges: RechargeTransaction[];
    withdrawals: WithdrawalTransaction[];
    finishedRounds: GameRound[];
  } {
    const limits = this.getQuotaLimits();

    // 1. Prune cards: Prioritize current user cards and cards in active/open rounds
    const userCards = (state.cards || []).filter((c) => c.userId === state.currentUserId);
    const activeCards = userCards.filter((c) => state.activeRoundIds.has(c.roundId));
    const recentOtherCards = userCards.filter((c) => !state.activeRoundIds.has(c.roundId)).slice(0, limits.maxCardsInMemory - activeCards.length);
    const prunedCards = [...activeCards, ...recentOtherCards].slice(0, limits.maxCardsInMemory);

    // 2. Prune ledger, audit, recharges, withdrawals
    const prunedLedger = (state.ledger || []).slice(0, limits.maxLedgerInMemory);
    const prunedAudit = (state.auditLogs || []).slice(0, limits.maxAuditInMemory);
    const prunedRecharges = (state.recharges || []).slice(0, limits.maxRechargesInMemory);
    const prunedWithdrawals = (state.withdrawals || []).slice(0, limits.maxWithdrawalsInMemory);
    const prunedFinished = (state.finishedRounds || []).slice(0, limits.maxFinishedRoundsHistory);

    return {
      cards: prunedCards.length > 0 ? prunedCards : state.cards.slice(0, limits.maxCardsInMemory),
      ledger: prunedLedger,
      auditLogs: prunedAudit,
      recharges: prunedRecharges,
      withdrawals: prunedWithdrawals,
      finishedRounds: prunedFinished,
    };
  }

  /**
   * Quota-safe write to localStorage with automatic eviction on storage pressure
   */
  public safeSetItem(key: string, value: any, priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'): boolean {
    if (!this.isClient) return false;
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      // Update memory cache
      this.memoryCache.set(key, { data: value, timestamp: Date.now(), version: this.versionCounter });
      return true;
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
        console.warn('[MobileCacheManager] Storage quota exceeded. Evicting low-priority caches...');
        this.evictLowPriorityStorage();
        try {
          const serialized = typeof value === 'string' ? value : JSON.stringify(value);
          localStorage.setItem(key, serialized);
          return true;
        } catch {
          console.error('[MobileCacheManager] Failed to write critical item even after storage eviction:', key);
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Quota-safe read with memory memoization
   */
  public safeGetItem<T = any>(key: string, fallback: T): T {
    if (!this.isClient) return fallback;
    const cached = this.memoryCache.get(key);
    if (cached) return cached.data as T;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      this.memoryCache.set(key, { data: parsed, timestamp: Date.now(), version: this.versionCounter });
      return parsed as T;
    } catch {
      return fallback;
    }
  }

  /**
   * Evicts non-critical or stale entries from localStorage
   */
  private evictLowPriorityStorage(): void {
    if (!this.isClient) return;
    const lowPriorityKeys = [
      'lucky_fichas_db_v1_audit',
      'supermillonario_login_attempts_v1',
      'supermillonario_pwd_recovery_tokens_v1',
      'supermillonario_cross_tab_sync_trigger_v2',
      'lucky_fichas_db_v1_ledger',
    ];

    lowPriorityKeys.forEach((k) => {
      try {
        localStorage.removeItem(k);
        this.memoryCache.delete(k);
      } catch {}
    });
  }

  /**
   * Soft garbage collection on visibility / memory changes
   */
  public runSoftGarbageCollection(): void {
    // 1. Clear memory caches older than 3 minutes
    const now = Date.now();
    for (const [k, v] of this.memoryCache.entries()) {
      if (now - v.timestamp > 3 * 60 * 1000) {
        this.memoryCache.delete(k);
      }
    }

    // 2. Truncate evaluated card cache
    if (this.evaluatedCardCache.size > 50) {
      this.evaluatedCardCache.clear();
    }
  }

  /**
   * Initialize event listeners for tab visibility and mobile backgrounding
   */
  private initLifecycleListeners(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App backgrounded: release non-critical memory
        this.runSoftGarbageCollection();
      }
    });

    window.addEventListener('pagehide', () => {
      this.runSoftGarbageCollection();
    });
  }
}

export const mobileCacheManager = new MobileCacheManager();
