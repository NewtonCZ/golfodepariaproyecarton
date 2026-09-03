/**
 * Real-Time Cross-Tab & Multi-Client Synchronization Service for SuperMillonario Destiny Lottery.
 *
 * Implements:
 * 1. BroadcastChannel API for sub-millisecond instant cross-tab communication.
 * 2. Window 'storage' event listener as universal fallback across all browser instances.
 * 3. Service Worker postMessage relay for background synchronization.
 * 4. Automatic de-duplication and idempotency to prevent feedback loops.
 * 5. State reconciliation that protects user session, active cards, and wallet balance.
 */

import { AppUser, GameRound, MatrixCard, Ficha, WalletLedgerEntry, CommercialConfig, RechargeTransaction, WithdrawalTransaction, AuditLogEntry } from '../types';
import { swManager } from './serviceWorkerRegistration';
import { realtimeService } from './realtimeService';

export type SyncEventType =
  | 'ROUND_CREATED'
  | 'ROUND_UPDATED'
  | 'ROUND_STATUS_CHANGED'
  | 'ROUND_DELETED'
  | 'LIVE_DRAW_STARTED'
  | 'LIVE_DRAW_TICK'
  | 'LIVE_DRAW_FINISHED'
  | 'LIVE_DRAW_STOPPED'
  | 'CARDS_PURCHASED'
  | 'RECHARGE_STATUS_CHANGED'
  | 'WITHDRAWAL_STATUS_CHANGED'
  | 'USER_BALANCE_UPDATED'
  | 'USER_REGISTERED'
  | 'COMMERCIAL_CONFIG_UPDATED'
  | 'FULL_STATE_SYNC'
  | 'PING_SYNC';

export interface LotterySyncEvent<T = any> {
  id: string;
  type: SyncEventType;
  payload: T;
  sourceTabId: string;
  timestamp: number;
}

export interface LiveDrawTickPayload {
  roundId: string;
  ficha: Ficha;
  step: number;
  totalSteps: number;
  drawnFichaIds: number[];
  isFinished: boolean;
}

export interface LiveDrawFinishedPayload {
  roundId: string;
  drawnFichas: number[];
  winnersCount: number;
  totalPaidVes: number;
  updatedRound: GameRound;
  updatedCards?: MatrixCard[];
  updatedUsers?: AppUser[];
}

export interface CardsPurchasedPayload {
  cards: MatrixCard[];
  userId: string;
  roundId: string;
  newAvailableBalance: number;
  ledgerEntry?: WalletLedgerEntry;
  totalCostVes?: number;
}

export interface RoundStatusPayload {
  roundId: string;
  status: GameRound['status'];
  roundTitle?: string;
  roundNumber?: number;
}

export interface FullSyncPayload {
  rounds?: GameRound[];
  cards?: MatrixCard[];
  users?: AppUser[];
  recharges?: RechargeTransaction[];
  withdrawals?: WithdrawalTransaction[];
  ledger?: WalletLedgerEntry[];
  auditLogs?: AuditLogEntry[];
  commercialConfig?: CommercialConfig;
}

type SyncListener = (event: LotterySyncEvent) => void;

const CHANNEL_NAME = 'supermillonario_lottery_realtime_v2';
const STORAGE_SYNC_KEY = 'supermillonario_cross_tab_sync_trigger_v2';

class LotterySyncEngine {
  private broadcastChannel: BroadcastChannel | null = null;
  private tabId: string;
  private listeners: Set<SyncListener> = new Set();
  private processedEventIds: Set<string> = new Set();
  private maxHistorySize = 100;
  public isConnected = false;

  constructor() {
    // Unique ID for this specific browser tab/window
    this.tabId = `tab-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    // 1. Initialize BroadcastChannel if available
    if ('BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data) {
            this.handleIncomingEvent(event.data);
          }
        };
        this.isConnected = true;
      } catch (e) {
        console.warn('[SyncEngine] BroadcastChannel failed to initialize:', e);
      }
    }

    // 2. Storage event fallback for cross-tab updates
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_SYNC_KEY && event.newValue) {
        try {
          const parsed: LotterySyncEvent = JSON.parse(event.newValue);
          this.handleIncomingEvent(parsed);
        } catch (e) {
          console.warn('[SyncEngine] Error parsing storage sync event:', e);
        }
      }
    });

    // 3. Service Worker message listener
    swManager.addListener((swEvent) => {
      if (swEvent.type && swEvent.type.startsWith('BROADCAST_') && swEvent.payload) {
        this.handleIncomingEvent(swEvent.payload);
      }
    });

    // 4. WebSocket & Supabase Realtime event listener
    realtimeService.on('new_round_created', (data) => {
      const round = data.round || data.new || data;
      if (round && round.id) {
        this.handleIncomingEvent({
          id: `ws-${Date.now()}-${round.id}`,
          type: 'ROUND_CREATED',
          payload: { round },
          sourceTabId: 'websocket-server',
          timestamp: Date.now(),
        });
      }
    });

    realtimeService.on('round_updated', (data) => {
      const round = data.round || data.new || data;
      if (round && round.id) {
        this.handleIncomingEvent({
          id: `ws-upd-${Date.now()}-${round.id}`,
          type: 'ROUND_UPDATED',
          payload: { round },
          sourceTabId: 'websocket-server',
          timestamp: Date.now(),
        });
      }
    });

    realtimeService.on('round_status_changed', (data) => {
      if (data && data.roundId && data.status) {
        this.handleIncomingEvent({
          id: `ws-st-${Date.now()}-${data.roundId}`,
          type: 'ROUND_STATUS_CHANGED',
          payload: data,
          sourceTabId: 'websocket-server',
          timestamp: Date.now(),
        });
      }
    });

    realtimeService.on('draw_result_published', (data) => {
      if (data && data.roundId) {
        this.handleIncomingEvent({
          id: `ws-res-${Date.now()}-${data.roundId}`,
          type: 'LIVE_DRAW_FINISHED',
          payload: data,
          sourceTabId: 'websocket-server',
          timestamp: Date.now(),
        });
      }
    });

    realtimeService.on('commercial_config_updated', (data) => {
      const config = data.config || data.new || data;
      if (config) {
        this.handleIncomingEvent({
          id: `ws-cfg-${Date.now()}`,
          type: 'COMMERCIAL_CONFIG_UPDATED',
          payload: { config },
          sourceTabId: 'websocket-server',
          timestamp: Date.now(),
        });
      }
    });

    realtimeService.on('postgres_changes', (data) => {
      if (data && data.table === 'commercial_config') {
        const config = data.new || data.record;
        if (config) {
          this.handleIncomingEvent({
            id: `ws-pgcfg-${Date.now()}`,
            type: 'COMMERCIAL_CONFIG_UPDATED',
            payload: { config },
            sourceTabId: 'websocket-server',
            timestamp: Date.now(),
          });
        }
      }
    });
  }

  private handleIncomingEvent(event: LotterySyncEvent): void {
    if (!event || !event.id || !event.type) return;

    // Ignore events originating from this tab
    if (event.sourceTabId === this.tabId) return;

    // De-duplicate events
    if (this.processedEventIds.has(event.id)) return;

    this.processedEventIds.add(event.id);
    if (this.processedEventIds.size > this.maxHistorySize) {
      const first = this.processedEventIds.values().next().value;
      if (first) this.processedEventIds.delete(first);
    }

    // Notify local subscribers
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[SyncEngine] Error in sync listener callback:', err);
      }
    });
  }

  /**
   * Broadcast an event to all other tabs and Service Worker clients
   */
  public broadcast<T = any>(type: SyncEventType, payload: T): void {
    if (typeof window === 'undefined') return;

    const eventId = `evt-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const syncEvent: LotterySyncEvent<T> = {
      id: eventId,
      type,
      payload,
      sourceTabId: this.tabId,
      timestamp: Date.now(),
    };

    // Mark as processed locally
    this.processedEventIds.add(eventId);

    // 1. Broadcast via BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(syncEvent);
      } catch (e) {
        console.warn('[SyncEngine] BroadcastChannel postMessage error:', e);
      }
    }

    // 2. Broadcast via Storage event (triggers 'storage' in other tabs)
    try {
      localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(syncEvent));
    } catch (e) {
      // Storage might be constrained
    }

    // 3. Forward to Service Worker to relay to non-tab clients
    swManager.postMessage('BROADCAST_SYNC', syncEvent);
  }

  /**
   * Subscribe to real-time sync events
   */
  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- Specialized Helper Broadcast Methods ---

  public broadcastRoundCreated(round: GameRound): void {
    this.broadcast('ROUND_CREATED', { round });
    try {
      realtimeService.broadcastNewRoundCreated(round);
    } catch (e) {}
  }

  public broadcastRoundUpdated(round: GameRound): void {
    this.broadcast('ROUND_UPDATED', { round });
    try {
      realtimeService.broadcastRoundUpdated(round);
    } catch (e) {}
  }

  public broadcastRoundDeleted(roundId: string): void {
    this.broadcast('ROUND_DELETED', { roundId });
    try {
      realtimeService.send('round_deleted', { roundId, id: roundId });
    } catch (e) {}
  }

  public broadcastRoundStatus(roundId: string, status: GameRound['status'], roundTitle?: string, roundNumber?: number): void {
    this.broadcast<RoundStatusPayload>('ROUND_STATUS_CHANGED', {
      roundId,
      status,
      roundTitle,
      roundNumber,
    });
    try {
      realtimeService.broadcastRoundUpdated({
        id: roundId,
        status,
        title: roundTitle,
        roundNumber,
      });
    } catch (e) {}
  }

  public broadcastLiveDrawStarted(roundId: string): void {
    this.broadcast('LIVE_DRAW_STARTED', { roundId, timestamp: Date.now() });
  }

  public broadcastLiveDrawTick(payload: LiveDrawTickPayload): void {
    this.broadcast<LiveDrawTickPayload>('LIVE_DRAW_TICK', payload);
  }

  public broadcastLiveDrawFinished(payload: LiveDrawFinishedPayload): void {
    this.broadcast<LiveDrawFinishedPayload>('LIVE_DRAW_FINISHED', payload);
  }

  public broadcastLiveDrawStopped(roundId: string): void {
    this.broadcast('LIVE_DRAW_STOPPED', { roundId });
  }

  public broadcastCardsPurchased(payload: CardsPurchasedPayload): void {
    this.broadcast<CardsPurchasedPayload>('CARDS_PURCHASED', payload);
  }

  public broadcastBalanceUpdate(userId: string, newAvailableBalance: number, reason?: string): void {
    this.broadcast('USER_BALANCE_UPDATED', { userId, newAvailableBalance, reason, timestamp: Date.now() });
  }

  public broadcastUserRegistered(user: AppUser): void {
    this.broadcast('USER_REGISTERED', { user, timestamp: Date.now() });
  }

  public broadcastRechargeStatus(payload: {
    transactionId: string;
    status: 'pending' | 'approved' | 'rejected';
    userId: string;
    recharge?: RechargeTransaction;
    recharges?: RechargeTransaction[];
  }): void {
    this.broadcast('RECHARGE_STATUS_CHANGED', { ...payload, timestamp: Date.now() });
  }

  public broadcastWithdrawalStatus(payload: {
    transactionId: string;
    status: 'pending' | 'completed' | 'rejected';
    userId: string;
    withdrawal?: WithdrawalTransaction;
    withdrawals?: WithdrawalTransaction[];
  }): void {
    this.broadcast('WITHDRAWAL_STATUS_CHANGED', { ...payload, timestamp: Date.now() });
  }

  public broadcastCommercialConfig(config: CommercialConfig): void {
    this.broadcast('COMMERCIAL_CONFIG_UPDATED', { config, timestamp: Date.now() });
    try {
      realtimeService.broadcastCommercialConfig(config);
    } catch (e) {}
  }

  public broadcastFullState(payload: FullSyncPayload): void {
    this.broadcast<FullSyncPayload>('FULL_STATE_SYNC', payload);
  }
}

export const syncEngine = new LotterySyncEngine();
