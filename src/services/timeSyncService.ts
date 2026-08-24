/**
 * Time Synchronization Engine for Destino Millonario
 *
 * Ensures accurate real-time draw timing across multiple clients, devices,
 * and timezones by calculating server-to-client offset and validating ISO 8601 timestamps.
 */

export interface TimeSyncStatus {
  serverTimeIso: string;
  serverTimestampMs: number;
  clientTimestampMs: number;
  offsetMs: number;
  rttMs: number;
  isSynchronized: boolean;
  timezoneOffsetMinutes: number;
  lastSyncedAt: string;
}

export class LotteryTimeSyncService {
  private static instance: LotteryTimeSyncService;
  private serverOffsetMs: number = 0;
  private isSynchronized: boolean = false;
  private lastSyncMs: number = 0;
  private rttMs: number = 0;
  private syncListeners: Set<(status: TimeSyncStatus) => void> = new Set();

  private constructor() {
    this.initSync();
  }

  public static getInstance(): LotteryTimeSyncService {
    if (!LotteryTimeSyncService.instance) {
      LotteryTimeSyncService.instance = new LotteryTimeSyncService();
    }
    return LotteryTimeSyncService.instance;
  }

  /**
   * Initializes automatic periodic sync and reactive tab visibility adjustments
   */
  private initSync(): void {
    this.syncTime();

    if (typeof window !== 'undefined') {
      // Re-sync when tab regains focus or visibility (avoids timer throttling skew)
      window.addEventListener('focus', () => this.syncTime());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.syncTime();
        }
      });

      // Periodic check every 2 minutes
      setInterval(() => this.syncTime(), 2 * 60 * 1000);
    }
  }

  /**
   * Performs high-precision time synchronization with the server time endpoint or HTTP headers.
   * Returns calculated offset in milliseconds.
   */
  public async syncTime(): Promise<number> {
    const t0 = Date.now();

    try {
      // 1. Attempt to fetch dedicated ISO 8601 time endpoint with no-cache
      const res = await fetch('/api/time', {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });

      if (res.ok) {
        const data = await res.json();
        const t1 = Date.now();
        this.rttMs = t1 - t0;

        // Verify valid ISO 8601
        const serverIso = data.iso || data.serverTime;
        const parsedServerMs = this.parseIsoToEpochMs(serverIso);

        if (!isNaN(parsedServerMs)) {
          // Cristian's Algorithm: Server Time + (RTT / 2) - Client Time at receipt
          const estimatedServerNow = parsedServerMs + Math.floor(this.rttMs / 2);
          this.serverOffsetMs = estimatedServerNow - t1;
          this.isSynchronized = true;
          this.lastSyncMs = t1;
          this.notifyListeners();
          return this.serverOffsetMs;
        }
      }
    } catch {
      // Fallback: Check HTTP Date header on standard health/ping or root
      try {
        const headRes = await fetch('/', { method: 'HEAD', cache: 'no-store' });
        const dateHeader = headRes.headers.get('date');
        if (dateHeader) {
          const t1 = Date.now();
          const serverMs = new Date(dateHeader).getTime();
          if (!isNaN(serverMs)) {
            this.rttMs = t1 - t0;
            this.serverOffsetMs = (serverMs + Math.floor(this.rttMs / 2)) - t1;
            this.isSynchronized = true;
            this.lastSyncMs = t1;
            this.notifyListeners();
            return this.serverOffsetMs;
          }
        }
      } catch {
        // Fallback for isolated offline sandbox
      }
    }

    // Default fallback if network endpoint is unreachable
    this.lastSyncMs = Date.now();
    return this.serverOffsetMs;
  }

  /**
   * Returns current synchronized epoch timestamp (ms).
   */
  public getServerNow(): number {
    return Date.now() + this.serverOffsetMs;
  }

  /**
   * Returns current synchronized Date object.
   */
  public getServerDate(): Date {
    return new Date(this.getServerNow());
  }

  /**
   * Returns current synchronized ISO 8601 UTC timestamp string.
   */
  public getServerIso(): string {
    return new Date(this.getServerNow()).toISOString();
  }

  /**
   * Safely parses any date input (ISO 8601, SQL date, datetime-local, timestamp) into millisecond epoch.
   * Guarantees timezone-safe parsing without UTC/local double conversion bugs.
   */
  public parseIsoToEpochMs(dateInput: string | number | Date | null | undefined): number {
    if (!dateInput) return NaN;
    if (typeof dateInput === 'number') return dateInput;
    if (dateInput instanceof Date) return dateInput.getTime();

    const cleanStr = String(dateInput).trim();

    // 1. Direct ISO 8601 with Z or timezone offset (e.g. 2026-08-14T14:30:00.000Z or -04:00)
    let parsed = Date.parse(cleanStr);
    if (!isNaN(parsed)) {
      return parsed;
    }

    // 2. Handle HTML5 datetime-local string (e.g. "2026-08-14T15:30") without timezone designation
    // HTML5 datetime-local represents local wall-clock time in user's active timezone
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(cleanStr)) {
      const parts = cleanStr.split(/[-T:]/);
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const hours = parseInt(parts[3], 10);
      const minutes = parseInt(parts[4], 10);
      const seconds = parts[5] ? parseInt(parts[5], 10) : 0;
      return new Date(year, month, day, hours, minutes, seconds).getTime();
    }

    // 3. Fallback standard constructor
    return new Date(cleanStr).getTime();
  }

  /**
   * Validates if a given string adheres to strict ISO 8601 format.
   */
  public isValidIso8601(isoString: string): boolean {
    if (!isoString || typeof isoString !== 'string') return false;
    // ISO 8601 regex test
    const isoRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|([+-]\d{2}:\d{2}))?$/;
    if (!isoRegex.test(isoString)) return false;
    const timeMs = Date.parse(isoString);
    return !isNaN(timeMs);
  }

  /**
   * Formats a local date/datetime-local into strict ISO 8601 UTC string.
   */
  public toStrictIso8601(dateInput: string | number | Date): string {
    const epochMs = this.parseIsoToEpochMs(dateInput);
    if (isNaN(epochMs)) {
      return new Date().toISOString();
    }
    return new Date(epochMs).toISOString();
  }

  /**
   * Computes precise remaining milliseconds between server time and target ISO timestamp.
   */
  public getRemainingMs(targetIso: string): number {
    const targetMs = this.parseIsoToEpochMs(targetIso);
    if (isNaN(targetMs)) return 0;
    const nowMs = this.getServerNow();
    return Math.max(0, targetMs - nowMs);
  }

  /**
   * Subscribe to time synchronization updates
   */
  public subscribe(listener: (status: TimeSyncStatus) => void): () => void {
    this.syncListeners.add(listener);
    listener(this.getStatus());
    return () => this.syncListeners.delete(listener);
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.syncListeners.forEach((fn) => {
      try {
        fn(status);
      } catch {}
    });
  }

  public getStatus(): TimeSyncStatus {
    const clientNow = Date.now();
    const serverNow = this.getServerNow();
    return {
      serverTimeIso: new Date(serverNow).toISOString(),
      serverTimestampMs: serverNow,
      clientTimestampMs: clientNow,
      offsetMs: this.serverOffsetMs,
      rttMs: this.rttMs,
      isSynchronized: this.isSynchronized,
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      lastSyncedAt: new Date(this.lastSyncMs || clientNow).toISOString(),
    };
  }
}

export const timeSync = LotteryTimeSyncService.getInstance();
