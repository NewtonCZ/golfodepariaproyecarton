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
 * 6. Debounced/deferred storage writes to eliminate UI thread micro-stutters during card purchases.
 */

import {
  MatrixCard,
  GameRound,
  WalletLedgerEntry,
  AuditLogEntry,
  RechargeTransaction,
  WithdrawalTransaction,
} from '../types';

export interface CacheQuotaLimits {
  maxCardsInMemory: number;
  maxLedgerInMemory: number;
  maxAuditInMemory: number;
  maxRechargesInMemory: number;
  maxWithdrawalsInMemory: number;
  maxFinishedRoundsHistory: number;
  maxEvaluatedCacheSize: number;
  enableAggressiveGC: boolean;
}

export type InvalidationReason =
  | 'ROUND_STATUS_CHANGED'
  | 'CARDS_PURCHASED'
  | 'ROUND_FINISHED'
  | 'ROUND_CREATED'
  | 'BALANCE_UPDATED'
  | 'USER_LOGOUT'
  | 'MEMORY_PRESSURE';

export type InvalidationListener = (
  reason: InvalidationReason,
  payload?: { roundId?: string; userId?: string }
) => void;

class MobileCacheManager {
  private isClient = typeof window !== 'undefined';
  private memoryCache = new Map<string, { data: any; timestamp: number; version: number }>();
  private evaluatedCardCache = new Map<string, any>();
  private writeQueue = new Map<string, { value: any; priority: 'critical' | 'high' | 'normal' | 'low'; timer: any }>();
  private listeners = new Set<InvalidationListener>();
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
        maxCardsInMemory: 80,
        maxLedgerInMemory: 35,
        maxAuditInMemory: 20,
        maxRechargesInMemory: 25,
        maxWithdrawalsInMemory: 25,
        maxFinishedRoundsHistory: 6,
        maxEvaluatedCacheSize: 80,
        enableAggressiveGC: true,
      };
    }
    return {
      maxCardsInMemory: 300,
      maxLedgerInMemory: 120,
      maxAuditInMemory: 60,
      maxRechargesInMemory: 60,
      maxWithdrawalsInMemory: 60,
      maxFinishedRoundsHistory: 15,
      maxEvaluatedCacheSize: 300,
      enableAggressiveGC: false,
    };
  }

  /**
   * Register a listener for surgical cache invalidations
   */
  public onInvalidate(listener: InvalidationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Surgical Invalidation: Invalidate specific cached keys when domain events happen.
   * Cleans client-side cache automatically when round changes status or card lists update.
   */
  public surgicalInvalidate(
    reason: InvalidationReason,
    payload?: { roundId?: string; userId?: string }
  ): void {
    this.versionCounter++;

    // 1. Clear card evaluation memoization cache on round or card change
    this.evaluatedCardCache.clear();

    // 2. Specific round invalidation
    if (payload?.roundId) {
      this.memoryCache.delete(`round_${payload.roundId}`);
      this.memoryCache.delete(`round_cards_${payload.roundId}`);
      this.memoryCache.delete(`live_draw_${payload.roundId}`);
    }

    // 3. Round status, creation or finish: clean ephemeral live draw progress & wipe round schedule caches
    if (reason === 'ROUND_FINISHED' || reason === 'ROUND_STATUS_CHANGED' || reason === 'ROUND_CREATED') {
      this.invalidateRoundsCache(payload?.roundId);
    }

    // 4. Invalidate user cards cache on purchase, round finish or logout
    if (reason === 'CARDS_PURCHASED' || reason === 'USER_LOGOUT' || reason === 'ROUND_FINISHED') {
      if (payload?.userId) {
        this.memoryCache.delete(`user_cards_${payload.userId}`);
      }
      this.memoryCache.delete('all_active_cards');
      this.memoryCache.delete('Millioneire_Destiny_Lottery_v1_cards');
      this.memoryCache.delete('lucky_fichas_db_v1_cards');
    }

    // 5. On mobile/low memory devices, run garbage collection sweep immediately
    if (this.isLowMemoryDevice()) {
      this.runSoftGarbageCollection();
    }

    // 6. Notify subscribers
    this.listeners.forEach((listener) => {
      try {
        listener(reason, payload);
      } catch (err) {
        console.warn('[MobileCacheManager] Listener error on invalidation:', err);
      }
    });

    // 7. Dispatch browser custom event for decoupling if needed
    if (this.isClient) {
      try {
        window.dispatchEvent(
          new CustomEvent('supermillonario_cache_invalidated', {
            detail: { reason, payload, timestamp: Date.now() },
          })
        );
      } catch {}
    }
  }

  /**
   * Forcibly invalidates all cached rounds and schedule data
   */
  public invalidateRoundsCache(roundId?: string): void {
    this.versionCounter++;
    this.memoryCache.delete('lucky_fichas_db_v1_rounds');
    this.memoryCache.delete('lucky_fichas_db_v1_finished_rounds');
    this.memoryCache.delete('Millioneire_Destiny_Lottery_v1_rounds');
    this.memoryCache.delete('Millioneire_Destiny_Lottery_v1_finished_rounds');
    this.evaluatedCardCache.clear();

    if (roundId) {
      this.memoryCache.delete(`round_${roundId}`);
      this.memoryCache.delete(`round_cards_${roundId}`);
      this.memoryCache.delete(`live_draw_${roundId}`);
    }

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('supermillonario_live_draw_progress_v1');
      }
    } catch {}
  }

  /**
   * Fast evaluation memoization for 4x4 matrix card checks
   */
  public getCachedEvaluation(cardId: string, drawnLength: number): any | null {
    const key = `${cardId}_len_${drawnLength}`;
    return this.evaluatedCardCache.get(key) || null;
  }

  public setCachedEvaluation(cardId: string, drawnLength: number, result: any): void {
    const maxCache = this.getQuotaLimits().maxEvaluatedCacheSize;
    if (this.evaluatedCardCache.size >= maxCache) {
      // Evict oldest entries
      const firstKey = this.evaluatedCardCache.keys().next().value;
      if (firstKey) this.evaluatedCardCache.delete(firstKey);
    }
    const key = `${cardId}_len_${drawnLength}`;
    this.evaluatedCardCache.set(key, result);
  }

  /**
   * Prunes matrix cards specifically for mobile RAM conservation:
   * 1. Retains all cards belonging to the logged-in user in active/open rounds.
   * 2. Retains recent cards of the logged-in user in finished rounds up to quota.
   * 3. Retains cards of active rounds for other users (capped to 20 for count display).
   * 4. Drops stale cards of other players in finished rounds from mobile memory.
   */
  public pruneCardsForRAM(
    allCards: MatrixCard[],
    currentUserId: string,
    activeRoundIds: Set<string>
  ): MatrixCard[] {
    if (!this.isMobile()) {
      return allCards;
    }

    const limits = this.getQuotaLimits();

    // User's cards in active rounds
    const userActiveCards = allCards.filter(
      (c) => c.userId === currentUserId && activeRoundIds.has(c.roundId)
    );

    // User's cards in past rounds (sorted recent first)
    const userPastCards = allCards
      .filter((c) => c.userId === currentUserId && !activeRoundIds.has(c.roundId))
      .slice(0, Math.max(10, limits.maxCardsInMemory - userActiveCards.length));

    // Other users' cards in active rounds (only for counter / stats display)
    const otherActiveCards = allCards
      .filter((c) => c.userId !== currentUserId && activeRoundIds.has(c.roundId))
      .slice(0, 20);

    const merged = [...userActiveCards, ...userPastCards, ...otherActiveCards];
    return merged.slice(0, limits.maxCardsInMemory);
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

    const prunedCards = this.pruneCardsForRAM(
      state.cards || [],
      state.currentUserId,
      state.activeRoundIds
    );

    const prunedLedger = (state.ledger || []).slice(0, limits.maxLedgerInMemory);
    const prunedAudit = (state.auditLogs || []).slice(0, limits.maxAuditInMemory);
    const prunedRecharges = (state.recharges || []).slice(0, limits.maxRechargesInMemory);
    const prunedWithdrawals = (state.withdrawals || []).slice(0, limits.maxWithdrawalsInMemory);
    const prunedFinished = (state.finishedRounds || []).slice(0, limits.maxFinishedRoundsHistory);

    return {
      cards: prunedCards,
      ledger: prunedLedger,
      auditLogs: prunedAudit,
      recharges: prunedRecharges,
      withdrawals: prunedWithdrawals,
      finishedRounds: prunedFinished,
    };
  }

  /**
   * Debounced / non-blocking storage writer.
   * Avoids locking the UI thread during rapid card purchases or live draw ticks.
   */
  public scheduleSave(
    key: string,
    value: any,
    priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'
  ): void {
    if (!this.isClient) return;

    // Critical or high priority items are written immediately
    if (priority === 'critical' || priority === 'high') {
      const existing = this.writeQueue.get(key);
      if (existing?.timer) clearTimeout(existing.timer);
      this.writeQueue.delete(key);
      this.safeSetItem(key, value, priority);
      return;
    }

    // Normal or low priority items are debounced
    const existing = this.writeQueue.get(key);
    if (existing?.timer) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      this.writeQueue.delete(key);
      this.safeSetItem(key, value, priority);
    }, 250);

    this.writeQueue.set(key, { value, priority, timer });
  }

  /**
   * Quota-safe write to localStorage with automatic eviction on storage pressure
   */
  public safeSetItem(
    key: string,
    value: any,
    priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'
  ): boolean {
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
      'Millioneire_Destiny_Lottery_v1_audit',
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
    // 1. Clear memory caches older than 2 minutes
    const now = Date.now();
    for (const [k, v] of this.memoryCache.entries()) {
      if (now - v.timestamp > 2 * 60 * 1000) {
        this.memoryCache.delete(k);
      }
    }

    // 2. Clear evaluated card cache
    this.evaluatedCardCache.clear();

    // 3. Flush pending writeQueue
    for (const [key, item] of this.writeQueue.entries()) {
      if (item.timer) clearTimeout(item.timer);
      this.safeSetItem(key, item.value, item.priority);
    }
    this.writeQueue.clear();
  }

  /**
   * Initialize event listeners for tab visibility and mobile backgrounding
   */
  private initLifecycleListeners(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // App backgrounded: release non-critical memory and flush pending writes
        this.runSoftGarbageCollection();
      }
    });

    window.addEventListener('pagehide', () => {
      this.runSoftGarbageCollection();
    });
  }
}

export const mobileCacheManager = new MobileCacheManager();
