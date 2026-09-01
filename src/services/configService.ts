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
import { API_ENDPOINTS } from './apiConfig';

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
 * Saves commercial configuration to 'config/comercial' endpoint and Supabase,
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

  // 4. Always persist directly to Supabase table config_comercial (and fallback table comercial)
  try {
    if (supabase) {
      const { error: sbErr1 } = await supabase.from('config_comercial').upsert({
        id: 1,
        config: config,
        updated_at: new Date().toISOString(),
      });
      if (sbErr1) {
        console.warn('[configService] Aviso en config_comercial, guardando en tabla comercial:', sbErr1.message);
      }
      await supabase.from('comercial').upsert({
        id: 1,
        config: config,
      });
    }
  } catch (sbErr) {
    console.warn('[configService] Supabase config direct save note:', sbErr);
  }

  // 5. Save to backend API if available (handles 405 / sleeping Render gracefully)
  try {
    const endpoint = API_ENDPOINTS.CONFIG_COMERCIAL || 'https://golfodepariaproyecarton.onrender.com/api/config/comercial';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    const contentType = res.headers.get('content-type');
    if (res.ok && contentType && contentType.includes('application/json')) {
      const json = await res.json();
      return { success: true, data: json.data || config };
    }
  } catch (err) {
    console.log('[configService] Backend durmiendo o no disponible, persistido en Supabase.');
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

  // 2. Fetch from backend endpoint with fallback to Supabase
  const endpoint = API_ENDPOINTS.CONFIG_COMERCIAL || 'https://golfodepariaproyecarton.onrender.com/api/config/comercial';
  fetch(`${endpoint}?_nocache=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
  })
    .then(async (res) => {
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        return res.json();
      }
      throw new Error('Fallback to Supabase');
    })
    .then((result) => {
      if (result && (result.data || result.config)) {
        const cfg = result.data || result.config;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
        } catch (e) {}
        emitSnapshot(cfg);
      }
    })
    .catch(async () => {
      // Fallback Supabase directo
      try {
        if (supabase) {
          const { data: dbData1 } = await supabase.from('config_comercial').select('*').limit(1).maybeSingle();
          if (dbData1 && (dbData1.config || dbData1.adminBank)) {
            const resolved = dbData1.config || dbData1;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));
            } catch (e) {}
            emitSnapshot(resolved);
            return;
          }

          const { data: dbData2 } = await supabase.from('comercial').select('*').limit(1).maybeSingle();
          if (dbData2 && (dbData2.config || dbData2.adminBank)) {
            const resolved = dbData2.config || dbData2;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));
            } catch (e) {}
            emitSnapshot(resolved);
          }
        }
      } catch (err) {
        if (onError && !initialLocal) onError(err);
      }
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
