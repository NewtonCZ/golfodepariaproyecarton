/**
 * Commercial Configuration Database & Real-Time Sync Service
 * 
 * Provides:
 * - Direct onSnapshot listener for 'config/comercial'
 * - getDoc / setDoc primitives compatible with Firestore/Supabase patterns
 * - Instant synchronization across tabs, WebSocket, and local memory
 */

import { CommercialConfig } from '../types';
import { realtimeService, supabase } from './realtimeService';
import { syncEngine } from './syncService';

const STORAGE_KEY = 'millionaire_lottery_v1_config';

export interface DocumentSnapshot<T = any> {
  id: string;
  exists: () => boolean;
  data: () => T;
  [key: string]: any;
}

export type SnapshotCallback<T = any> = (snapshot: DocumentSnapshot<T>) => void;
export type Unsubscribe = () => void;

/**
 * Reads the latest cached commercial configuration synchronously.
 */
export function getLocalCommercialConfig(): CommercialConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('[configService] Error reading local config:', e);
  }
  return null;
}

/**
 * Saves commercial configuration to 'config/comercial' endpoint and local DB,
 * immediately broadcasting to all open tabs and active players.
 */
export async function saveCommercialConfigToDb(config: CommercialConfig): Promise<{ success: boolean; data: CommercialConfig }> {
  // 1. Optimistic local cache
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {}

  // 2. Broadcast via SyncEngine (BroadcastChannel & localStorage)
  syncEngine.broadcastCommercialConfig(config);

  // 3. Broadcast via WebSocket
  realtimeService.broadcastCommercialConfig(config);
  realtimeService.send('config/comercial', { config });
  realtimeService.emit('config/comercial', { config });
  realtimeService.emit('commercial_config_updated', { config });

  // 4. Save to backend database API
  try {
    const res = await fetch('/api/config/comercial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (res.ok) {
      const json = await res.json();
      return { success: true, data: json.data || config };
    }
  } catch (err) {
    console.warn('[configService] Remote DB save warning (local broadcast active):', err);
  }

  return { success: true, data: config };
}

/**
 * Real-time Document Listener for 'config/comercial' or any collection/doc path.
 * Eliminates burned/hardcoded data and reflects changes immediately.
 */
export function onSnapshot(
  pathOrDocRef: string | { path: string; id?: string },
  onNext: SnapshotCallback<CommercialConfig>,
  onError?: (error: any) => void
): Unsubscribe {
  const path = typeof pathOrDocRef === 'string' ? pathOrDocRef : pathOrDocRef.path;
  const isComercialConfig = path.includes('comercial') || path.includes('commercial') || path.includes('config');

  let isUnsubscribed = false;

  const emitSnapshot = (data: any) => {
    if (isUnsubscribed || !data) return;
    const snap: DocumentSnapshot<CommercialConfig> = {
      id: 'comercial',
      exists: () => Boolean(data && (data.adminBank || data.bankName)),
      data: () => data,
      ...data,
    };
    try {
      onNext(snap);
    } catch (err) {
      if (onError) onError(err);
    }
  };

  // 1. Instant delivery from memory/local DB so no delay or flash occurs
  const initialLocal = getLocalCommercialConfig();
  if (initialLocal) {
    emitSnapshot(initialLocal);
  }

  // 2. Immediate async fetch from DB endpoint with no-cache
  fetch('/api/config/comercial?_nocache=' + Date.now(), {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((result) => {
      if (result && result.data) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
        } catch (e) {}
        emitSnapshot(result.data);
      }
    })
    .catch((err) => {
      if (onError && !initialLocal) onError(err);
    });

  // 3. Subscribe to Real-Time WebSocket events
  const unsubWs1 = realtimeService.on('commercial_config_updated', (payload: any) => {
    const config = payload?.config || payload?.data || payload;
    if (config) emitSnapshot(config);
  });

  const unsubWs2 = realtimeService.on('config/comercial', (payload: any) => {
    const config = payload?.config || payload?.data || payload;
    if (config) emitSnapshot(config);
  });

  const unsubWs3 = realtimeService.on('postgres_changes', (payload: any) => {
    if (
      payload?.table === 'config/comercial' ||
      payload?.table === 'commercial_config' ||
      payload?.table === 'config'
    ) {
      const config = payload?.new || payload?.record;
      if (config) emitSnapshot(config);
    }
  });

  // 4. Subscribe to cross-tab BroadcastChannel
  const unsubSync = syncEngine.subscribe((event) => {
    if (event.type === 'COMMERCIAL_CONFIG_UPDATED') {
      const config = event.payload?.config;
      if (config) emitSnapshot(config);
    }
  });

  // 5. Native window storage event for instant multi-tab sync
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const config = JSON.parse(e.newValue);
        if (config) emitSnapshot(config);
      } catch (err) {}
    }
  };
  window.addEventListener('storage', handleStorage);

  // Return unsubscribe cleanup function
  return () => {
    isUnsubscribed = true;
    unsubWs1();
    unsubWs2();
    unsubWs3();
    unsubSync();
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * DB document reference helper: doc(db, 'config/comercial') or doc('config/comercial')
 */
export function doc(firstArg: any, secondArg?: string) {
  const path = typeof firstArg === 'string' ? firstArg : secondArg || 'config/comercial';
  return {
    id: path.split('/').pop() || 'comercial',
    path,
  };
}

export const db = {
  collection: (name: string) => ({
    doc: (id: string) => doc(`${name}/${id}`),
  }),
};
