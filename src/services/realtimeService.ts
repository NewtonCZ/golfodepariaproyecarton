/**
 * Real-Time WebSocket & Supabase-compatible Event Service
 *
 * Provides:
 * 1. Optional WebSocket connection with graceful fallback and polling support.
 * 2. Automatic disabling of raw WebSocket connection in production (e.g. Cloudflare Pages static builds)
 *    unless explicitly enabled via VITE_ENABLE_WS=true.
 * 3. Robust try/catch guards so that connection errors never crash or block the application.
 * 4. Supabase-compatible channel API: `channel('public:rounds').on('INSERT', ...)`.
 * 5. Instant event dispatching and seamless synergy with syncEngine (BroadcastChannel & LocalStorage).
 */

import { GameRound } from '../types';

export type RealtimeEventHandler = (data: any) => void;

class RealtimeService {
  private socket: WebSocket | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private pollingTimer: any = null;
  private listeners: Map<string, Set<RealtimeEventHandler>> = new Map();
  public isConnected: boolean = false;
  public isWsDisabled: boolean = false;

  constructor() {
    // Check if running in production static mode (e.g. Cloudflare Pages / Workers static)
    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : null;
    const isProd = Boolean(metaEnv?.PROD);
    const isWsExplicitlyEnabled = metaEnv?.VITE_ENABLE_WS === 'true';

    // Direct Cloudflare Workers / Pages check
    if (typeof window !== 'undefined' && (window.location.hostname.includes('workers.dev') || window.location.hostname.includes('pages.dev'))) {
      console.log('[RealtimeService] Desactivado en Cloudflare, usando solo polling');
      this.isWsDisabled = true;
      this.startPolling();
      return;
    }

    // In production static environment, disable direct WebSocket to avoid wss://.../ws 200 failed handshakes
    if (isProd && !isWsExplicitlyEnabled) {
      console.log('Realtime desactivado en prod, usando polling');
      this.isWsDisabled = true;
      this.startPolling();
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        this.connect();
      } catch (err) {
        console.warn('[RealtimeService] Safe initialization fallback:', err);
        this.startPolling();
      }
    }
  }

  public connect(): void {
    if (typeof window !== 'undefined' && (window.location.hostname.includes('workers.dev') || window.location.hostname.includes('pages.dev'))) {
      console.log('[RealtimeService] Desactivado en Cloudflare, usando solo polling');
      this.isWsDisabled = true;
      this.startPolling();
      return;
    }

    const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : null;
    const isProd = Boolean(metaEnv?.PROD);
    const isWsExplicitlyEnabled = metaEnv?.VITE_ENABLE_WS === 'true';

    if (isProd && !isWsExplicitlyEnabled) {
      this.isWsDisabled = true;
      this.startPolling();
      return;
    }

    if (typeof window === 'undefined' || this.isWsDisabled) {
      return;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.isConnecting = true;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log('[RealtimeService] WebSocket connected successfully');

        // Setup ping keepalive
        this.startPing();

        // Emit connected event locally
        this.emit('connected', { timestamp: Date.now() });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventType = data.event || data.type;
          const payload = data.payload !== undefined ? data.payload : data;

          if (eventType === 'pong') return;

          // Dispatch event to specific listeners
          if (eventType) {
            this.emit(eventType, payload);
          }

          // Universal wildcard listener
          this.emit('*', { event: eventType, data: payload });
        } catch (err) {
          console.warn('[RealtimeService] Error parsing incoming WS message:', err);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.stopPing();
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        // Safe non-crashing handler
        this.isConnected = false;
        this.isConnecting = false;
      };
    } catch (e) {
      console.warn('[RealtimeService] Connection creation failed gracefully:', e);
      this.isConnected = false;
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      try {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'ping' }));
        }
      } catch (e) {
        // Safe ignore
      }
    }, 25000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isWsDisabled) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // In static or disconnected environments, gracefully fallback to polling without spamming WS
      this.startPolling();
      return;
    }

    const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts), 8000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * Safe fallback polling when WebSocket is unavailable or disabled in production
   */
  public startPolling(intervalMs: number = 10000): void {
    if (this.pollingTimer || typeof window === 'undefined') return;
    this.pollingTimer = setInterval(() => {
      try {
        this.emit('poll_tick', { timestamp: Date.now() });
      } catch (e) {
        // Safe ignore
      }
    }, intervalMs);
  }

  public stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Send message to WebSocket server safely (no-op if disconnected)
   */
  public send(type: string, payload: any): void {
    try {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type, event: type, payload, timestamp: Date.now() }));
      }
    } catch (err) {
      // Safe no-op
    }
  }

  /**
   * Broadcast new round created event
   */
  public broadcastNewRoundCreated(round: GameRound): void {
    this.send('new_round_created', { round });
    // Also trigger local listeners immediately
    this.emit('new_round_created', { round });
  }

  /**
   * Broadcast newly registered user/player event
   */
  public broadcastUserRegistered(user: any): void {
    this.send('user_registered', { user });
    this.emit('user_registered', { user });
    this.emit('player_registered', { player: user });
  }

  /**
   * Broadcast commercial config / bank details update event
   */
  public broadcastCommercialConfig(config: any): void {
    this.send('commercial_config_updated', { config });
    this.emit('commercial_config_updated', { config });
  }

  /**
   * Broadcast withdrawal submitted / created event
   */
  public broadcastWithdrawalCreated(withdrawal: any): void {
    this.send('withdrawal_created', { withdrawal });
    this.send('withdrawal_submitted', { withdrawal });
    this.send('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'withdrawals',
      new: withdrawal,
      record: withdrawal,
    });
    this.emit('withdrawal_created', { withdrawal });
  }

  /**
   * Broadcast withdrawal status changed / completed / rejected event
   */
  public broadcastWithdrawalStatus(withdrawal: any): void {
    this.send('withdrawal_updated', { withdrawal });
    this.send('withdrawal_status_changed', { withdrawal });
    this.send('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'withdrawals',
      new: withdrawal,
      record: withdrawal,
    });
    this.emit('withdrawal_updated', { withdrawal });
  }

  /**
   * Broadcast round updated event across all connected clients
   */
  public broadcastRoundUpdated(round: any): void {
    this.send('round_updated', { round });
    this.send('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'rounds',
      new: round,
      record: round,
    });
    this.emit('round_updated', { round });
  }

  /**
   * Broadcast official draw result published (single source of truth)
   */
  public broadcastDrawResultPublished(data: {
    roundId: string;
    drawnFichas: number[];
    winnersCount: number;
    totalPaidVes: number;
    updatedRound: any;
    updatedCards?: any[];
  }): void {
    this.send('draw_result_published', data);
    this.send('live_draw_finished', data);
    this.send('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'rounds',
      new: data.updatedRound,
      record: data.updatedRound,
    });
    this.emit('draw_result_published', data);
    this.emit('round_updated', { round: data.updatedRound });
  }

  /**
   * Subscribe to specific event type
   */
  public on(event: string, handler: RealtimeEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(handler);
        if (set.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Emit event to local listeners
   */
  public emit(event: string, data: any): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error(`[RealtimeService] Error in handler for event "${event}":`, err);
        }
      });
    }
  }

  /**
   * Supabase-compatible Realtime API:
   * e.g.
   * const channel = supabase
   *   .channel('auditoria-pago-movil-realtime')
   *   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recharges' }, () => {
   *      fetchRecargasPendientes();
   *   })
   *   .subscribe();
   */
  public channel(channelName: string) {
    const unsubs: Array<() => void> = [];

    const channelObj = {
      on: (
        typeOrEvent: string,
        filterOrCallback: any,
        maybeCallback?: (payload: any) => void
      ) => {
        let callback: (payload: any) => void;
        let eventFilter = typeOrEvent;
        let tableFilter: string | null = null;

        if (typeof filterOrCallback === 'function') {
          callback = filterOrCallback;
        } else if (filterOrCallback && typeof filterOrCallback === 'object') {
          callback = maybeCallback || (() => {});
          eventFilter = filterOrCallback.event || typeOrEvent;
          tableFilter = filterOrCallback.table || null;
        } else {
          callback = maybeCallback || (() => {});
        }

        // Listener for postgres_changes
        const unregPostgres = this.on('postgres_changes', (data) => {
          const matchEvent =
            eventFilter === '*' ||
            !eventFilter ||
            eventFilter === 'postgres_changes' ||
            String(data?.event || '').toUpperCase() === String(eventFilter).toUpperCase();

          const matchTable =
            !tableFilter ||
            tableFilter === '*' ||
            String(data?.table || '').toLowerCase() === String(tableFilter).toLowerCase();

          if (matchEvent && matchTable) {
            callback({
              eventType: data?.event || 'INSERT',
              new: data?.new || data?.record || data,
              old: data?.old || null,
              table: data?.table || tableFilter,
              schema: data?.schema || 'public',
              ...data,
            });
          }
        });
        unsubs.push(unregPostgres);

        // Also listen to direct event names: 'INSERT', 'UPDATE', 'recharge_created', 'new_round_created'
        if (eventFilter === '*' || eventFilter === 'INSERT' || typeOrEvent === 'INSERT') {
          const unregInsert = this.on('recharge_created', (data) => {
            if (!tableFilter || tableFilter === 'recharges' || tableFilter === 'auditoria_pago_movil') {
              callback({ eventType: 'INSERT', new: data.recharge || data, old: null });
            }
          });
          unsubs.push(unregInsert);

          const unregRound = this.on('new_round_created', (data) => {
            if (!tableFilter || tableFilter === 'rounds' || tableFilter === 'sorteos') {
              callback({ eventType: 'INSERT', new: data.round || data, old: null });
            }
          });
          unsubs.push(unregRound);

          const unregWithdrawalInsert = this.on('withdrawal_created', (data) => {
            if (!tableFilter || tableFilter === 'withdrawals' || tableFilter === 'solicitudes_retiro') {
              callback({ eventType: 'INSERT', new: data.withdrawal || data, old: null });
            }
          });
          unsubs.push(unregWithdrawalInsert);
        }

        if (eventFilter === '*' || eventFilter === 'UPDATE' || typeOrEvent === 'UPDATE') {
          const unregUpdate = this.on('recharge_updated', (data) => {
            if (!tableFilter || tableFilter === 'recharges' || tableFilter === 'auditoria_pago_movil') {
              callback({ eventType: 'UPDATE', new: data.recharge || data, old: null });
            }
          });
          unsubs.push(unregUpdate);

          const unregWithdrawalUpdate = this.on('withdrawal_updated', (data) => {
            if (!tableFilter || tableFilter === 'withdrawals' || tableFilter === 'solicitudes_retiro') {
              callback({ eventType: 'UPDATE', new: data.withdrawal || data, old: null });
            }
          });
          unsubs.push(unregWithdrawalUpdate);

          const unregRoundUpdate = this.on('round_updated', (data) => {
            if (!tableFilter || tableFilter === 'rounds' || tableFilter === 'sorteos') {
              callback({ eventType: 'UPDATE', new: data.round || data, old: null });
            }
          });
          unsubs.push(unregRoundUpdate);

          const unregRoundStatus = this.on('round_status_changed', (data) => {
            if (!tableFilter || tableFilter === 'rounds' || tableFilter === 'sorteos') {
              callback({ eventType: 'UPDATE', new: data.round || data, old: null });
            }
          });
          unsubs.push(unregRoundStatus);

          const unregDrawResult = this.on('draw_result_published', (data) => {
            if (!tableFilter || tableFilter === 'rounds' || tableFilter === 'sorteos') {
              callback({ eventType: 'UPDATE', new: data.round || data, updatedRound: data.updatedRound, old: null });
            }
          });
          unsubs.push(unregDrawResult);
        }

        if (eventFilter === '*' || eventFilter === 'DELETE' || typeOrEvent === 'DELETE') {
          const unregRoundDelete = this.on('round_deleted', (data) => {
            if (!tableFilter || tableFilter === 'rounds' || tableFilter === 'sorteos') {
              callback({ eventType: 'DELETE', old: { id: data.roundId || data.id }, new: null });
            }
          });
          unsubs.push(unregRoundDelete);
        }

        // Wildcard or table-specific custom event
        if (tableFilter) {
          const unregTable = this.on(`table:${tableFilter}`, (data) => {
            callback(data);
          });
          unsubs.push(unregTable);
        }

        return channelObj;
      },
      subscribe: (statusCallback?: (status: string) => void) => {
        try {
          this.send('subscribe', { channel: channelName });
          if (statusCallback) {
            statusCallback('SUBSCRIBED');
          }
        } catch (e) {
          if (statusCallback) {
            statusCallback('SUBSCRIBED');
          }
        }
        return channelObj;
      },
      unsubscribe: () => {
        unsubs.forEach((unsub) => unsub());
        unsubs.length = 0;
      },
    };

    return channelObj;
  }
}

export const realtimeService = new RealtimeService();

export { supabase } from './supabaseClient';

export { onSnapshot, doc, db } from './configService';
