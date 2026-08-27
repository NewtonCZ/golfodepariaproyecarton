import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Hashing helper for server authentication (SHA-256)
function hashPasswordServer(password: string): string {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

function normalizeAdminRoleServer(roleStr?: string): 'Super Admin' | 'Operador Financiero' | 'Auditor' {
  if (!roleStr) return 'Super Admin';
  const clean = roleStr.toLowerCase().replace(/[\s_-]/g, '');
  if (clean.includes('finan') || clean === 'operadorfinanciero') {
    return 'Operador Financiero';
  }
  if (clean.includes('audit') || clean === 'auditor') {
    return 'Auditor';
  }
  return 'Super Admin';
}

// Supabase client para backend y VITE
function getSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.VITE_SUPABASE_URL || ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) as string) || '';
  const key = process.env.VITE_SUPABASE_ANON_KEY || ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) as string) || '';
  if (url && key && url.startsWith('http')) {
    try {
      return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } catch (e) {
      console.warn('[server] Error al inicializar Supabase Client:', e);
    }
  }
  return null;
}
interface GameRoundServer {
  id: string;
  roundNumber: number;
  order?: number;
  title: string;
  openBetAt: string;
  closeBetAt: string;
  drawAt: string;
  starts_at?: string;
  ends_at?: string;
  status: 'scheduled' | 'open' | 'closed' | 'drawing' | 'finished';
  drawnFichas: number[];
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

// In-memory persistent server state for recharges & proof audits
let serverRecharges: any[] = [];

// In-memory persistent server state for withdrawals & payout audits
let serverWithdrawals: any[] = [];

// In-memory persistent server state for player cards
let serverCards: any[] = [];

// In-memory persistent server state for commercial parameters & bank details
let serverCommercialConfig: any = {
  adminBank: {
    bankName: process.env.BANK_NAME || 'Banco de Venezuela (0102)',
    phone: process.env.BANK_PHONE || '0424-8653930',
    rif: process.env.BANK_RIF || 'J-50769027-0',
    holderName: process.env.BANK_HOLDER_NAME || 'Grupo Agro Cajigal S.A.',
    type: process.env.BANK_TYPE || 'Pago Móvil',
  },
  precio_carton_base_ves: 25,
  singleCardPriceVes: 25,
  cardPrices: {
    pack2: 50,
    pack4: 100,
    pack6: 150,
  },
  exchangeRateVesUsd: 60,
  prizeMultipliers: {
    fullCard: 50,
    fourCorners: 8,
    lineHorizontal: 3,
    lineVertical: 3,
    lineDiagonal: 4,
  },
  drawDrawTotalCount: 32,
  maxRiskPerRound: 50000,
  closingBufferMinutes: 3,
  twoFactorOtpDemo: '123456',
};

// In-memory persistent server state for registered users & players
let serverUsers: any[] = [
];

// In-memory runtime cache for credentials loaded dynamically from Supabase admin_users table
let serverCredentials: any[] = [];

let serverRounds: GameRoundServer[] = [
  {
    id: 'round-101',
    roundNumber: 101,
    order: 1,
    title: 'Sorteo Mediodía #101',
    openBetAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    closeBetAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    drawAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    starts_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'finished',
    drawnFichas: [1, 5, 12, 19, 23, 26, 28, 30, 31, 35, 40, 44, 49, 51, 52, 55, 59, 60, 62, 65, 66, 67, 70, 2, 8, 14, 27, 33, 42, 53, 58, 69],
    totalCardsSold: 48,
    cardPriceVes: 25,
    card_price: 25,
    prize_percentage: 70,
    jackpotVes: 12500,
    winningCardsCount: 6,
    totalPrizesPaidVes: 2150,
    resultLocked: true,
    resultSubmittedBy: 'Carlos Admin',
    resultSubmittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'round-102',
    roundNumber: 102,
    order: 2,
    title: 'Sorteo Estelar Tarde #102',
    openBetAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    closeBetAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    drawAt: new Date(Date.now() + 48 * 60 * 1000).toISOString(),
    starts_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    status: 'open',
    drawnFichas: [],
    totalCardsSold: 36,
    cardPriceVes: 25,
    card_price: 25,
    prize_percentage: 70,
    jackpotVes: 15000,
    winningCardsCount: 0,
    totalPrizesPaidVes: 0,
    resultLocked: false,
  },
  {
    id: 'round-103',
    roundNumber: 103,
    order: 3,
    title: 'Gran Sorteo Nocturno #103',
    openBetAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    closeBetAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    drawAt: new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString(),
    starts_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
    drawnFichas: [],
    totalCardsSold: 0,
    cardPriceVes: 30,
    card_price: 30,
    prize_percentage: 75,
    jackpotVes: 25000,
    winningCardsCount: 0,
    totalPrizesPaidVes: 0,
    resultLocked: false,
  },
  {
    id: 'round-104',
    roundNumber: 104,
    order: 4,
    title: 'Sorteo Madrugada Millonario #104',
    openBetAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    closeBetAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    drawAt: new Date(Date.now() + 6.5 * 60 * 60 * 1000).toISOString(),
    starts_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
    drawnFichas: [],
    totalCardsSold: 0,
    cardPriceVes: 20,
    card_price: 20,
    prize_percentage: 80,
    jackpotVes: 20000,
    winningCardsCount: 0,
    totalPrizesPaidVes: 0,
    resultLocked: false,
  },
];

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // WebSocket Server for Supabase / Realtime event broadcasting
  const wss = new WebSocketServer({ server, path: '/ws' });

  const broadcastRealtimeEvent = (eventType: string, payload: any) => {
    const message = JSON.stringify({
      event: eventType,
      type: eventType,
      payload,
      timestamp: Date.now(),
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          console.error('[WebSocket] Error broadcasting to client:', err);
        }
      }
    });
  };

  wss.on('connection', (ws) => {
    // Send immediate connection confirmation and initial active rounds
    ws.send(
      JSON.stringify({
        event: 'connected',
        type: 'connected',
        timestamp: Date.now(),
        serverTime: Date.now(),
      })
    );

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping' || msg.event === 'ping') {
          ws.send(JSON.stringify({ event: 'pong', type: 'pong', timestamp: Date.now() }));
        } else if (msg.type === 'new_round_created' || msg.event === 'new_round_created') {
          if (msg.round || msg.payload) {
            const roundData = msg.round || msg.payload?.round || msg.payload;
            if (roundData && roundData.id) {
              const existingIdx = serverRounds.findIndex((r) => r.id === roundData.id);
              if (existingIdx >= 0) {
                serverRounds[existingIdx] = { ...serverRounds[existingIdx], ...roundData };
              } else {
                serverRounds = [roundData, ...serverRounds];
              }
              broadcastRealtimeEvent('new_round_created', { round: roundData });
            }
          }
        } else if (msg.type === 'sync_all_rounds' && Array.isArray(msg.rounds)) {
          // Merge client rounds into server
          const incomingIds = new Set(msg.rounds.map((r: any) => r.id));
          const keptExisting = serverRounds.filter((r) => !incomingIds.has(r.id));
          serverRounds = [...msg.rounds, ...keptExisting];
        } else if (
          msg.type === 'recharge_submitted' ||
          msg.type === 'recharge_created' ||
          msg.event === 'recharge_submitted' ||
          msg.event === 'recharge_created' ||
          msg.event === 'postgres_changes'
        ) {
          const rechargeData = msg.recharge || msg.payload?.recharge || msg.new || msg.payload;
          if (rechargeData && rechargeData.id) {
            const existingIdx = serverRecharges.findIndex((r) => r.id === rechargeData.id);
            if (existingIdx >= 0) {
              serverRecharges[existingIdx] = { ...serverRecharges[existingIdx], ...rechargeData };
            } else {
              serverRecharges = [rechargeData, ...serverRecharges];
            }

            // Supabase Realtime Postgres Changes Broadcast for 'recharges' table
            broadcastRealtimeEvent('postgres_changes', {
              event: existingIdx >= 0 ? 'UPDATE' : 'INSERT',
              schema: 'public',
              table: 'recharges',
              new: rechargeData,
              record: rechargeData,
              old: existingIdx >= 0 ? serverRecharges[existingIdx] : null,
            });

            // Also broadcast direct event names
            broadcastRealtimeEvent(existingIdx >= 0 ? 'recharge_updated' : 'recharge_created', {
              recharge: rechargeData,
            });
          }
        } else if (
          msg.type === 'withdrawal_submitted' ||
          msg.type === 'withdrawal_created' ||
          msg.event === 'withdrawal_submitted' ||
          msg.event === 'withdrawal_created' ||
          (msg.event === 'postgres_changes' && (msg.table === 'withdrawals' || msg.payload?.table === 'withdrawals'))
        ) {
          const withdrawalData = msg.withdrawal || msg.payload?.withdrawal || msg.new || msg.payload?.new || msg.payload;
          if (withdrawalData && withdrawalData.id) {
            const existingIdx = serverWithdrawals.findIndex((w) => w.id === withdrawalData.id);
            if (existingIdx >= 0) {
              serverWithdrawals[existingIdx] = { ...serverWithdrawals[existingIdx], ...withdrawalData };
            } else {
              serverWithdrawals = [withdrawalData, ...serverWithdrawals];
            }

            // Supabase Realtime Postgres Changes Broadcast for 'withdrawals' table
            broadcastRealtimeEvent('postgres_changes', {
              event: existingIdx >= 0 ? 'UPDATE' : 'INSERT',
              schema: 'public',
              table: 'withdrawals',
              new: withdrawalData,
              record: withdrawalData,
              old: existingIdx >= 0 ? serverWithdrawals[existingIdx] : null,
            });

            broadcastRealtimeEvent(existingIdx >= 0 ? 'withdrawal_updated' : 'withdrawal_created', {
              withdrawal: withdrawalData,
            });
          }
        } else if (
          msg.type === 'user_registered' ||
          msg.type === 'player_registered' ||
          msg.event === 'user_registered' ||
          msg.event === 'player_registered'
        ) {
          const userData = msg.user || msg.player || msg.payload?.user || msg.payload;
          if (userData && (userData.id || userData.documentId || userData.cedula)) {
            const userId = userData.id || `usr-${Date.now()}`;
            const normalizedUser = {
              id: userId,
              name: userData.name || userData.nombre || 'Usuario',
              documentId: (userData.documentId || userData.cedula || '').toUpperCase(),
              phone: userData.phone || userData.telefono || '0412-0000000',
              role: userData.role || 'Player',
              status: userData.status || 'active',
              availableBalance: userData.availableBalance || 0,
              pendingBalance: userData.pendingBalance || 0,
              lockedBalance: userData.lockedBalance || 0,
              totalWonVes: userData.totalWonVes || 0,
              createdAt: userData.createdAt || new Date().toISOString(),
              ...userData,
            };

            const existingIdx = serverUsers.findIndex((u) => u.id === userId || (u.documentId && u.documentId.toUpperCase() === normalizedUser.documentId));
            if (existingIdx >= 0) {
              serverUsers[existingIdx] = { ...serverUsers[existingIdx], ...normalizedUser };
            } else {
              serverUsers = [normalizedUser, ...serverUsers];
            }

            // Supabase Realtime Postgres Changes Broadcast for 'users' and 'jugadores' tables
            broadcastRealtimeEvent('postgres_changes', {
              event: existingIdx >= 0 ? 'UPDATE' : 'INSERT',
              schema: 'public',
              table: 'users',
              new: normalizedUser,
              record: normalizedUser,
            });

            broadcastRealtimeEvent('user_registered', { user: normalizedUser });
            broadcastRealtimeEvent('player_registered', { player: normalizedUser });
          }
        } else if (msg.type === 'sync_all_users' && Array.isArray(msg.users)) {
          const incomingIds = new Set(msg.users.map((u: any) => u.id));
          const kept = serverUsers.filter((u) => !incomingIds.has(u.id));
          serverUsers = [...msg.users, ...kept];
        } else if (
          msg.type === 'commercial_config_updated' ||
          msg.type === 'update_commercial_config' ||
          msg.event === 'commercial_config_updated' ||
          msg.event === 'update_commercial_config'
        ) {
          const newCfg = msg.config || msg.payload?.config || msg.payload;
          if (newCfg) {
            serverCommercialConfig = {
              ...serverCommercialConfig,
              ...newCfg,
              adminBank: {
                ...serverCommercialConfig.adminBank,
                ...(newCfg.adminBank || {}),
              },
              cardPrices: {
                ...serverCommercialConfig.cardPrices,
                ...(newCfg.cardPrices || {}),
              },
              prizeMultipliers: {
                ...serverCommercialConfig.prizeMultipliers,
                ...(newCfg.prizeMultipliers || {}),
              },
            };

            broadcastRealtimeEvent('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'commercial_config',
              new: serverCommercialConfig,
              record: serverCommercialConfig,
            });

            broadcastRealtimeEvent('commercial_config_updated', { config: serverCommercialConfig });
          }
        }
      } catch (err) {
        console.warn('[WebSocket] Error processing message:', err);
      }
    });
  });

  // -------------------------------------------------------------
  // API Routes: Commercial Configuration & Bank Details (Shared State)
  // -------------------------------------------------------------

  // GET /api/commercial-config & GET /api/config
  const handleGetCommercialConfig = (req: express.Request, res: express.Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    res.json({
      success: true,
      timestamp: Date.now(),
      data: serverCommercialConfig,
    });
  };

  app.get('/api/commercial-config', handleGetCommercialConfig);
  app.get('/api/config', handleGetCommercialConfig);
  app.get('/api/config/comercial', handleGetCommercialConfig);
  app.get('/api/config/commercial', handleGetCommercialConfig);
  app.get('/api/comercial', handleGetCommercialConfig);

  // POST & PUT /api/commercial-config & /api/config/comercial - Update commercial config & broadcast in real-time
  const handleUpdateCommercialConfig = (req: express.Request, res: express.Response) => {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ success: false, message: 'Parámetros de configuración inválidos' });
    }

    const basePrice = incoming.precio_carton_base_ves !== undefined
      ? Number(incoming.precio_carton_base_ves)
      : (incoming.singleCardPriceVes !== undefined
          ? Number(incoming.singleCardPriceVes)
          : (serverCommercialConfig.precio_carton_base_ves || 25));

    serverCommercialConfig = {
      ...serverCommercialConfig,
      ...incoming,
      precio_carton_base_ves: basePrice,
      singleCardPriceVes: basePrice,
      adminBank: {
        ...serverCommercialConfig.adminBank,
        ...(incoming.adminBank || {}),
      },
      cardPrices: {
        pack2: basePrice * 2,
        pack4: basePrice * 4,
        pack6: basePrice * 6,
        ...(incoming.cardPrices || {}),
      },
      prizeMultipliers: {
        ...serverCommercialConfig.prizeMultipliers,
        ...(incoming.prizeMultipliers || {}),
      },
    };

    // Broadcast instant Supabase / WebSocket change event to all public users & admins
    broadcastRealtimeEvent('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'config/comercial',
      new: serverCommercialConfig,
      record: serverCommercialConfig,
    });

    broadcastRealtimeEvent('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'commercial_config',
      new: serverCommercialConfig,
      record: serverCommercialConfig,
    });

    broadcastRealtimeEvent('commercial_config_updated', {
      config: serverCommercialConfig,
    });

    broadcastRealtimeEvent('config/comercial', {
      config: serverCommercialConfig,
      data: serverCommercialConfig,
    });

    res.status(200).json({
      success: true,
      message: 'Parámetros comerciales y datos bancarios actualizados y sincronizados en tiempo real',
      data: serverCommercialConfig,
    });
  };

  app.post('/api/commercial-config', handleUpdateCommercialConfig);
  app.put('/api/commercial-config', handleUpdateCommercialConfig);
  app.post('/api/config', handleUpdateCommercialConfig);
  app.post('/api/config/comercial', handleUpdateCommercialConfig);
  app.put('/api/config/comercial', handleUpdateCommercialConfig);
  app.post('/api/config/commercial', handleUpdateCommercialConfig);
  app.put('/api/config/commercial', handleUpdateCommercialConfig);
  app.post('/api/comercial', handleUpdateCommercialConfig);

  // -------------------------------------------------------------
  // API Routes: Status, Real-Time Polling & Round Lifecycle
  // -------------------------------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: Date.now(), activeClients: wss.clients.size });
  });

  // GET /api/rounds - Core Real-Time Polling Endpoint
  // Supports: ?status=open,scheduled&limit=3
  app.get('/api/rounds', (req, res) => {
    // Disable any browser or proxy caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    const statusParam = req.query.status as string | undefined;
    const limitParam = req.query.limit as string | undefined;

    let filtered = [...serverRounds];

    if (statusParam) {
      const allowedStatuses = statusParam
        .split(',')
        .map((s) => s.trim().toLowerCase());
      filtered = filtered.filter((r) =>
        allowedStatuses.includes(String(r.status || '').toLowerCase())
      );
    }

    // Sort ascending by starts_at / openBetAt / drawAt
    filtered.sort((a, b) => {
      const timeA = new Date(a.starts_at || a.openBetAt || a.drawAt).getTime();
      const timeB = new Date(b.starts_at || b.openBetAt || b.drawAt).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (a.order || a.roundNumber || 0) - (b.order || b.roundNumber || 0);
    });

    if (limitParam) {
      const limitNum = parseInt(limitParam, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        filtered = filtered.slice(0, limitNum);
      }
    }

    res.json({
      success: true,
      timestamp: Date.now(),
      total: filtered.length,
      data: filtered,
    });
  });

  // POST /api/rounds - Create Round & Emit Realtime Event
  app.post('/api/rounds', (req, res) => {
    const roundData = req.body;
    if (!roundData || !roundData.id) {
      return res.status(400).json({ success: false, message: 'ID de ronda requerido' });
    }

    const existingIdx = serverRounds.findIndex((r) => r.id === roundData.id);
    if (existingIdx >= 0) {
      serverRounds[existingIdx] = { ...serverRounds[existingIdx], ...roundData };
    } else {
      serverRounds = [roundData, ...serverRounds];
    }

    // Broadcast 'new_round_created' to all connected WebSocket clients in real time
    broadcastRealtimeEvent('new_round_created', { round: roundData });

    res.json({
      success: true,
      message: 'Sorteo creado y emitido en tiempo real con éxito',
      round: roundData,
    });
  });

  // PUT /api/rounds/:id - Update Round Configuration
  app.put('/api/rounds/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const idx = serverRounds.findIndex((r) => r.id === id);
    if (idx < 0) {
      return res.status(404).json({ success: false, message: 'Sorteo no encontrado' });
    }

    serverRounds[idx] = { ...serverRounds[idx], ...updates };
    const updated = serverRounds[idx];

    // Broadcast update
    broadcastRealtimeEvent('round_updated', { round: updated });
    broadcastRealtimeEvent('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'rounds',
      new: updated,
      record: updated,
    });

    res.json({
      success: true,
      message: 'Sorteo actualizado correctamente',
      round: updated,
    });
  });

  // POST /api/rounds/:id/results - Official Draw Result Submission (Single Source of Truth)
  app.post('/api/rounds/:id/results', (req, res) => {
    const { id } = req.params;
    const {
      drawnFichas,
      winnersCount,
      totalPaidVes,
      resultSubmittedBy,
      resultSubmittedAt,
      updatedRound,
      updatedCards,
      userWinnings,
    } = req.body;

    const idx = serverRounds.findIndex((r) => r.id === id);
    if (idx < 0) {
      return res.status(404).json({ success: false, message: 'Sorteo no encontrado en base de datos central' });
    }

    const current = serverRounds[idx];
    const finalDrawn = Array.isArray(drawnFichas) ? drawnFichas : current.drawnFichas || [];
    const finalSubmittedAt = resultSubmittedAt || new Date().toISOString();
    const finalSubmittedBy = resultSubmittedBy || 'Super Admin';

    serverRounds[idx] = {
      ...current,
      ...(updatedRound || {}),
      id,
      status: 'finished',
      drawnFichas: finalDrawn,
      resultLocked: true,
      winningCardsCount: typeof winnersCount === 'number' ? winnersCount : (updatedRound?.winningCardsCount || 0),
      totalPrizesPaidVes: typeof totalPaidVes === 'number' ? totalPaidVes : (updatedRound?.totalPrizesPaidVes || 0),
      resultSubmittedBy: finalSubmittedBy,
      resultSubmittedAt: finalSubmittedAt,
      updatedAt: finalSubmittedAt,
    };

    const finalizedRound = serverRounds[idx];

    // Sync updated cards if provided
    if (Array.isArray(updatedCards) && updatedCards.length > 0) {
      const cardMap = new Map(updatedCards.map((c: any) => [c.id, c]));
      serverCards = serverCards.map((c) => cardMap.get(c.id) || c);
      updatedCards.forEach((c: any) => {
        if (!serverCards.some((sc) => sc.id === c.id)) {
          serverCards.push(c);
        }
      });
    }

    // Automatically credit prizes to winners in serverUsers
    if (userWinnings && typeof userWinnings === 'object') {
      Object.entries(userWinnings).forEach(([userId, prizeAmount]) => {
        const amount = Number(prizeAmount) || 0;
        if (amount > 0) {
          const userIdx = serverUsers.findIndex((u) => String(u.id) === String(userId));
          if (userIdx >= 0) {
            const currentBal = Number(serverUsers[userIdx].availableBalance ?? serverUsers[userIdx].balanceVes ?? 0);
            const newBal = currentBal + amount;
            serverUsers[userIdx] = {
              ...serverUsers[userIdx],
              availableBalance: newBal,
              balanceVes: newBal,
              balance: newBal,
              saldo_disponible: newBal,
              totalWonVes: (Number(serverUsers[userIdx].totalWonVes) || 0) + amount,
            };

            const updatedUser = serverUsers[userIdx];
            broadcastRealtimeEvent('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'users',
              new: updatedUser,
              record: updatedUser,
            });
            broadcastRealtimeEvent('wallet_balance_updated', {
              userId,
              availableBalance: newBal,
              prizeWon: amount,
            });
          }
        }
      });
    }

    // Broadcast official draw result and postgres_changes UPDATE to all connected devices in real time
    broadcastRealtimeEvent('draw_result_published', {
      roundId: id,
      drawnFichas: finalDrawn,
      winnersCount: finalizedRound.winningCardsCount,
      totalPaidVes: finalizedRound.totalPrizesPaidVes,
      updatedRound: finalizedRound,
      updatedCards,
    });

    broadcastRealtimeEvent('round_updated', { round: finalizedRound });

    broadcastRealtimeEvent('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'rounds',
      new: finalizedRound,
      record: finalizedRound,
    });

    console.log(`🎰 [OFICIAL] Resultado emitido para Sorteo ${id}: ${finalDrawn.length} figuras. Ganadores: ${finalizedRound.winningCardsCount}.`);

    res.json({
      success: true,
      message: 'Resultado oficial publicado y distribuido a todos los clientes en tiempo real',
      round: finalizedRound,
    });
  });

  // GET /api/cards - Retrieve cards with optional filters
  app.get('/api/cards', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const { roundId, userId } = req.query as { roundId?: string; userId?: string };
    let filtered = [...serverCards];

    if (roundId) {
      filtered = filtered.filter((c) => String(c.roundId) === String(roundId));
    }
    if (userId) {
      filtered = filtered.filter((c) => String(c.userId) === String(userId));
    }

    res.json({
      success: true,
      total: filtered.length,
      data: filtered,
    });
  });

  // POST /api/cards - Save purchased cards
  app.post('/api/cards', (req, res) => {
    const cardsData = req.body;
    const cardsToAdd = Array.isArray(cardsData) ? cardsData : cardsData?.cards || (cardsData?.id ? [cardsData] : []);

    if (cardsToAdd.length > 0) {
      const newCardIds = new Set(cardsToAdd.map((c: any) => c.id));
      serverCards = [...cardsToAdd, ...serverCards.filter((c) => !newCardIds.has(c.id))];

      broadcastRealtimeEvent('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cards',
        new: cardsToAdd,
      });

      broadcastRealtimeEvent('cards_purchased', { cards: cardsToAdd });
    }

    res.json({
      success: true,
      message: `${cardsToAdd.length} cartones sincronizados en servidor`,
      data: serverCards,
    });
  });

  // POST /api/sync-cards - Bulk sync
  app.post('/api/sync-cards', (req, res) => {
    const { cards } = req.body;
    if (Array.isArray(cards) && cards.length > 0) {
      const cardMap = new Map(cards.map((c: any) => [c.id, c]));
      serverCards = serverCards.map((c) => cardMap.get(c.id) || c);
      cards.forEach((c: any) => {
        if (!serverCards.some((sc) => sc.id === c.id)) {
          serverCards.push(c);
        }
      });
    }
    res.json({ success: true, count: serverCards.length });
  });

   // POST /api/sync-rounds - FIX F5
  app.post('/api/sync-rounds', (req, res) => {
    const { rounds } = req.body;
    if (Array.isArray(rounds) && rounds.length > 0) {
      if (serverRounds.every((r:any)=>r.totalCardsSold===0) && rounds.some((r:any)=>r.totalCardsSold>0)) {
        res.json({ success: true, count: serverRounds.length, blocked: true });
        return;
      }
      const m = new Map(rounds.map((r:any)=>[r.id,r]));
      serverRounds = serverRounds.map((r:any)=>m.get(r.id)||r);
      rounds.forEach((r:any)=>{ if(!serverRounds.some((s:any)=>s.id===r.id)) serverRounds.push(r); });
    }
    res.json({ success: true, count: serverRounds.length });
  });

  app.post('/api/reset-fabrica-total', (req, res) => {
    serverRecharges = [];
    serverWithdrawals = [];
    serverRounds = serverRounds.map((r:any)=>({...r, totalCardsSold:0, totalPrizesPaidVes:0, winningCardsCount:0, drawnFichas:[], resultLocked:false, jackpotVes:0, status: r.order===1?'open':'scheduled'}));
    console.log('✅ RESET FABRICA');
    res.json({ success: true });
  });
  // -------------------------------------------------------------
  // API Routes: Auditoría Pago Móvil & Recargas (Realtime DB)
  // -------------------------------------------------------------

  // GET /api/recharges - Instant fetch for admin auditoria
  app.get('/api/recharges', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const statusParam = req.query.status as string | undefined;
    let filtered = [...serverRecharges];

    if (statusParam) {
      const allowed = statusParam.split(',').map((s) => s.trim().toLowerCase());
      filtered = filtered.filter((r) => allowed.includes(String(r.status || '').toLowerCase()));
    }

    res.json({
      success: true,
      timestamp: Date.now(),
      total: filtered.length,
      data: filtered,
    });
  });

  // POST /api/recharges - Submit proof & broadcast instant postgres_changes INSERT
  app.post('/api/recharges', (req, res) => {
    const recharge = req.body;
    if (!recharge || !recharge.id) {
      return res.status(400).json({ success: false, message: 'Datos de recarga inválidos' });
    }

    const existingIdx = serverRecharges.findIndex((r) => r.id === recharge.id);
    if (existingIdx >= 0) {
      serverRecharges[existingIdx] = { ...serverRecharges[existingIdx], ...recharge };
    } else {
      serverRecharges = [recharge, ...serverRecharges];
    }

    // Broadcast instant Supabase Postgres INSERT / UPDATE event to all admin panels
    broadcastRealtimeEvent('postgres_changes', {
      event: existingIdx >= 0 ? 'UPDATE' : 'INSERT',
      schema: 'public',
      table: 'recharges',
      new: recharge,
      record: recharge,
    });

    broadcastRealtimeEvent('recharge_created', { recharge });

    res.json({
      success: true,
      message: 'Comprobante recibido y transmitido en tiempo real',
      data: recharge,
    });
  });

  // PATCH /api/recharges/:id - Update status (Approved / Rejected) with atomic transaction
  app.patch('/api/recharges/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const idx = serverRecharges.findIndex((r) => String(r.id) === String(id));
    if (idx < 0) {
      return res.status(404).json({ success: false, message: 'Recarga no encontrada' });
    }

    const previousStatus = String(serverRecharges[idx].status || '').toLowerCase();
    const newStatusLower = String(updates.status || '').toLowerCase();
    const isApproving = (newStatusLower === 'approved' || newStatusLower === 'aprobado') && previousStatus !== 'approved';

    serverRecharges[idx] = {
      ...serverRecharges[idx],
      ...updates,
      status: isApproving ? 'approved' : updates.status,
      confirmedBankArrival: isApproving ? true : serverRecharges[idx].confirmedBankArrival,
    };
    const updated = serverRecharges[idx];

    // TRANSACCIÓN ATÓMICA AL APROBAR RECARGA:
    // 1- Marca recarga como 'approved' de inmediato
    // 2- Suma monto ESTRICTAMENTE al Saldo Disponible Real del usuario (availableBalance / balanceVes / saldo_disponible)
    let updatedUser = null;
    if (isApproving) {
      const amountToAdd = Number(updated.amountVes) || 0;
      const targetUserId = updated.userId;

      const userIdx = serverUsers.findIndex(
        (u) =>
          String(u.id) === String(targetUserId) ||
          (updated.payerDocumentId && u.documentId && String(u.documentId).toUpperCase() === String(updated.payerDocumentId).toUpperCase()) ||
          (updated.userPhone && u.phone === updated.userPhone)
      );

      if (userIdx >= 0) {
        const currentUser = serverUsers[userIdx];
        const currentAvailable = Number(currentUser.availableBalance ?? currentUser.balanceVes ?? 0);
        const newAvailable = currentAvailable + amountToAdd;

        const currentPending = Number(currentUser.pendingBalance) || 0;
        const currentSaldoPendiente = Number(currentUser.saldo_pendiente) || 0;

        serverUsers[userIdx] = {
          ...currentUser,
          availableBalance: newAvailable,
          balanceVes: newAvailable,
          balance: newAvailable,
          saldo_disponible: newAvailable,
          pendingBalance: Math.max(0, currentPending - amountToAdd),
          saldo_pendiente: Math.max(0, currentSaldoPendiente - amountToAdd),
        };

        updatedUser = serverUsers[userIdx];

        // Difundir actualización atómica del usuario a todos los clientes en tiempo real
        broadcastRealtimeEvent('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          new: updatedUser,
          record: updatedUser,
        });

        broadcastRealtimeEvent('user_balance_updated', {
          userId: updatedUser.id,
          availableBalance: updatedUser.availableBalance,
          user: updatedUser,
        });
      }
    }

    broadcastRealtimeEvent('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'recharges',
      new: updated,
      record: updated,
    });

    broadcastRealtimeEvent('recharge_updated', { recharge: updated, user: updatedUser });
    if (isApproving) {
      broadcastRealtimeEvent('recharge_approved', { recharge: updated, user: updatedUser });
    }

    res.json({ success: true, data: updated, user: updatedUser });
  });

  // POST /api/recharges/:id/approve y /api/admin/recharges/:id/approve - Atomic approval endpoint
  const handleApproveRechargeController = (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { operatorIdentifier } = req.body || {};

    const idx = serverRecharges.findIndex((r) => String(r.id) === String(id));
    if (idx < 0) {
      return res.status(404).json({ success: false, message: 'Recarga no encontrada' });
    }

    const rec = serverRecharges[idx];
    const amountToAdd = Number(rec.amountVes) || 0;
    const processedAt = new Date().toISOString();

    // 1- Estado de la transacción queda inmediatamente como 'approved'
    serverRecharges[idx] = {
      ...rec,
      status: 'approved',
      confirmedBankArrival: true,
      processedAt,
      processedBy: operatorIdentifier || 'Super Admin (Auditoría)',
    };
    const updatedRecharge = serverRecharges[idx];

    // 2- Suma monto ESTRICTAMENTE al balance disponible del usuario
    let updatedUser = null;
    const userIdx = serverUsers.findIndex(
      (u) =>
        String(u.id) === String(rec.userId) ||
        (rec.payerDocumentId && u.documentId && String(u.documentId).toUpperCase() === String(rec.payerDocumentId).toUpperCase()) ||
        (rec.userPhone && u.phone === rec.userPhone)
    );

    if (userIdx >= 0) {
      const currentUser = serverUsers[userIdx];
      const currentAvailable = Number(currentUser.availableBalance ?? currentUser.balanceVes ?? 0);
      const newAvailable = currentAvailable + amountToAdd;

      const currentPending = Number(currentUser.pendingBalance) || 0;
      const currentSaldoPendiente = Number(currentUser.saldo_pendiente) || 0;

      serverUsers[userIdx] = {
        ...currentUser,
        availableBalance: newAvailable,
        balanceVes: newAvailable,
        balance: newAvailable,
        saldo_disponible: newAvailable,
        pendingBalance: Math.max(0, currentPending - amountToAdd),
        saldo_pendiente: Math.max(0, currentSaldoPendiente - amountToAdd),
      };

      updatedUser = serverUsers[userIdx];

      broadcastRealtimeEvent('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        new: updatedUser,
        record: updatedUser,
      });

      broadcastRealtimeEvent('user_balance_updated', {
        userId: updatedUser.id,
        availableBalance: updatedUser.availableBalance,
        user: updatedUser,
      });
    }

    broadcastRealtimeEvent('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'recharges',
      new: updatedRecharge,
      record: updatedRecharge,
    });

    broadcastRealtimeEvent('recharge_approved', { recharge: updatedRecharge, user: updatedUser });
    broadcastRealtimeEvent('recharge_updated', { recharge: updatedRecharge, user: updatedUser });

    res.json({
      success: true,
      message: `Recarga aprobada y ${amountToAdd} Bs. acreditados instantáneamente al Saldo Disponible del jugador.`,
      recharge: updatedRecharge,
      user: updatedUser,
    });
  };

  app.post('/api/recharges/:id/approve', handleApproveRechargeController);
  app.post('/api/admin/recharges/:id/approve', handleApproveRechargeController);

    // POST /api/sync-recharges - FIX F5
  app.post('/api/sync-recharges', (req, res) => {
    const { recharges } = req.body;
    if (Array.isArray(recharges) && recharges.length > 0) {
      if (serverRecharges.length === 0) {
        res.json({ success: true, count: 0, blocked: true });
        return;
      }
      const m = new Map(recharges.map((r:any)=>[r.id,r]));
      serverRecharges = serverRecharges.map((r:any)=>m.get(r.id)||r);
      recharges.forEach((r:any)=>{ if(!serverRecharges.some((s:any)=>s.id===r.id)) serverRecharges.push(r); });
    }
    res.json({ success: true, count: serverRecharges.length });
  });

  // -------------------------------------------------------------
  // API Routes: Solicitudes y Liquidación de Retiros (/api/withdrawals)
  // -------------------------------------------------------------

  // GET /api/withdrawals - Fetch withdrawals with optional status/userId filters
  app.get('/api/withdrawals', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const statusParam = req.query.status as string | undefined;
    const userIdParam = req.query.userId as string | undefined;
    let filtered = [...serverWithdrawals];

    if (statusParam) {
      const allowed = statusParam.split(',').map((s) => s.trim().toLowerCase());
      filtered = filtered.filter((w) => allowed.includes(String(w.status || '').toLowerCase()));
    }
    if (userIdParam) {
      filtered = filtered.filter((w) => w.userId === userIdParam);
    }

    res.json({
      success: true,
      timestamp: Date.now(),
      total: filtered.length,
      data: filtered,
    });
  });

  // POST /api/withdrawals - Submit withdrawal request (Locks user balance on server)
  app.post('/api/withdrawals', (req, res) => {
    const withdrawal = req.body;
    if (!withdrawal || !withdrawal.id) {
      return res.status(400).json({ success: false, message: 'Datos de retiro inválidos' });
    }

    const amountToLock = Number(withdrawal.amountVes) || 0;
    if (amountToLock < 100) {
      return res.status(400).json({ success: false, message: 'El monto mínimo de retiro es de 100 Bs.' });
    }

    const existingIdx = serverWithdrawals.findIndex((w) => w.id === withdrawal.id);
    if (existingIdx >= 0) {
      serverWithdrawals[existingIdx] = { ...serverWithdrawals[existingIdx], ...withdrawal };
    } else {
      serverWithdrawals = [withdrawal, ...serverWithdrawals];
    }

    // Atomic balance update on user record (Lock funds)
    const userIdx = serverUsers.findIndex((u) => u.id === withdrawal.userId);
    let updatedUser = null;

    if (userIdx >= 0 && existingIdx < 0) {
      serverUsers[userIdx].availableBalance = Math.max(0, (Number(serverUsers[userIdx].availableBalance) || 0) - amountToLock);
      serverUsers[userIdx].lockedBalance = (Number(serverUsers[userIdx].lockedBalance) || 0) + amountToLock;
      updatedUser = serverUsers[userIdx];

      broadcastRealtimeEvent('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        new: updatedUser,
        record: updatedUser,
      });
    }

    // Broadcast withdrawal insertion / update
    broadcastRealtimeEvent('postgres_changes', {
      event: existingIdx >= 0 ? 'UPDATE' : 'INSERT',
      schema: 'public',
      table: 'withdrawals',
      new: withdrawal,
      record: withdrawal,
    });

    broadcastRealtimeEvent('withdrawal_created', { withdrawal, user: updatedUser });

    res.json({
      success: true,
      message: 'Solicitud de retiro registrada y transmitida en tiempo real',
      data: withdrawal,
      user: updatedUser,
    });
  });

  // PATCH /api/withdrawals/:id - Partial update of withdrawal record
  app.patch('/api/withdrawals/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const idx = serverWithdrawals.findIndex((w) => String(w.id) === String(id));
    if (idx < 0) {
      return res.status(404).json({ success: false, message: 'Solicitud de retiro no encontrada' });
    }

    const previousStatus = String(serverWithdrawals[idx].status || '').toLowerCase();
    const newStatusLower = String(updates.status || '').toLowerCase();
    const isApproving = (newStatusLower === 'completed' || newStatusLower === 'approved') && previousStatus !== 'completed' && previousStatus !== 'approved';

    serverWithdrawals[idx] = { ...serverWithdrawals[idx], ...updates };
    const updated = serverWithdrawals[idx];

    let updatedUser = null;
    if (isApproving) {
      const amount = Number(updated.amountVes) || 0;
      const userIdx = serverUsers.findIndex(
        (u) =>
          String(u.id) === String(updated.userId) ||
          (updated.documentId && u.documentId && String(u.documentId).toUpperCase() === String(updated.documentId).toUpperCase()) ||
          (updated.userPhone && u.phone === updated.userPhone)
      );

      if (userIdx >= 0) {
        const currentUser = serverUsers[userIdx];
        const currentAvailable = Number(currentUser.availableBalance ?? currentUser.balanceVes ?? 0);
        const currentLocked = Number(currentUser.lockedBalance) || 0;

        let newAvailable = currentAvailable;
        let newLocked = currentLocked;

        if (currentLocked >= amount) {
          newLocked = Math.max(0, currentLocked - amount);
        } else {
          const remaining = amount - currentLocked;
          newLocked = 0;
          newAvailable = Math.max(0, currentAvailable - remaining);
        }

        serverUsers[userIdx] = {
          ...currentUser,
          availableBalance: newAvailable,
          balanceVes: newAvailable,
          balance: newAvailable,
          saldo_disponible: newAvailable,
          lockedBalance: newLocked,
        };

        updatedUser = serverUsers[userIdx];

        broadcastRealtimeEvent('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          new: updatedUser,
          record: updatedUser,
        });
      }
    }

    broadcastRealtimeEvent('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'withdrawals',
      new: updated,
      record: updated,
    });

    broadcastRealtimeEvent('withdrawal_updated', { withdrawal: updated, user: updatedUser });
    if (isApproving) {
      broadcastRealtimeEvent('withdrawal_completed', { withdrawal: updated, user: updatedUser });
      broadcastRealtimeEvent('withdrawal_approved', { withdrawal: updated, user: updatedUser });
    }

    res.json({ success: true, data: updated, user: updatedUser });
  });

  // Handler oficial para Aprobación y Liquidación de Retiros
  const handleApproveWithdrawalEndpoint = (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { operatorIdentifier, operatorRole } = req.body || {};

    const effectiveRole = String(operatorRole || operatorIdentifier || '').trim();
    const authorizedRoles = ['Super Admin', 'Operador Financiero', 'superadmin', 'operador financiero', 'super admin'];
    const isAuthorized = effectiveRole ? authorizedRoles.some((r) => r.toLowerCase() === effectiveRole.toLowerCase()) : true;

    if (effectiveRole && !isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Acceso Denegado: Solo usuarios con rol Superadministrador u Operador Financiero pueden procesar pagos de retiros.',
      });
    }

    const idx = serverWithdrawals.findIndex((w) => String(w.id) === String(id));
    if (idx < 0) {
      return res.status(404).json({ success: false, message: 'Solicitud de retiro no encontrada' });
    }

    const wth = serverWithdrawals[idx];
    const amount = Number(wth.amountVes) || 0;
    const processedAt = new Date().toISOString();

    // 1. Estado de la solicitud de retiro se actualiza a 'completed' / 'approved'
    serverWithdrawals[idx] = {
      ...wth,
      status: 'completed',
      confirmedBankArrival: true,
      processedAt,
      processedBy: effectiveRole || 'Super Admin (Liquidación)',
    };
    const updatedWithdrawal = serverWithdrawals[idx];

    // 2. Descuento atómico del saldo real del usuario
    let updatedUser = null;
    const userIdx = serverUsers.findIndex(
      (u) =>
        String(u.id) === String(wth.userId) ||
        (wth.documentId && u.documentId && String(u.documentId).toUpperCase() === String(wth.documentId).toUpperCase()) ||
        (wth.userPhone && u.phone === wth.userPhone)
    );

    if (userIdx >= 0) {
      const currentUser = serverUsers[userIdx];
      const currentAvailable = Number(currentUser.availableBalance ?? currentUser.balanceVes ?? 0);
      const currentLocked = Number(currentUser.lockedBalance) || 0;

      let newAvailable = currentAvailable;
      let newLocked = currentLocked;

      if (currentLocked >= amount) {
        newLocked = Math.max(0, currentLocked - amount);
      } else {
        const remainingToDebit = amount - currentLocked;
        newLocked = 0;
        newAvailable = Math.max(0, currentAvailable - remainingToDebit);
      }

      serverUsers[userIdx] = {
        ...currentUser,
        availableBalance: newAvailable,
        balanceVes: newAvailable,
        balance: newAvailable,
        saldo_disponible: newAvailable,
        lockedBalance: newLocked,
      };

      updatedUser = serverUsers[userIdx];

      // Difundir actualización atómica del usuario en tiempo real
      broadcastRealtimeEvent('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        new: updatedUser,
        record: updatedUser,
      });
    } else {
      console.warn(`Alerta: Retiro ${id} liquidado, pero no se encontró al usuario para actualizar saldo.`);
    }

    // Difundir actualización del retiro en tiempo real
    broadcastRealtimeEvent('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'withdrawals',
      new: updatedWithdrawal,
      record: updatedWithdrawal,
    });

    broadcastRealtimeEvent('withdrawal_completed', { withdrawal: updatedWithdrawal, user: updatedUser });
    broadcastRealtimeEvent('withdrawal_approved', { withdrawal: updatedWithdrawal, user: updatedUser });

    res.json({
      success: true,
      message: `Retiro de ${amount} Bs. aprobado, liquidado y descontado atómicamente del saldo del jugador.`,
      withdrawal: updatedWithdrawal,
      user: updatedUser,
    });
  };

  // POST /api/withdrawals/:id/complete y /api/withdrawals/:id/approve
  app.post('/api/withdrawals/:id/complete', handleApproveWithdrawalEndpoint);
  app.post('/api/withdrawals/:id/approve', handleApproveWithdrawalEndpoint);
  app.post('/api/admin/withdrawals/:id/complete', handleApproveWithdrawalEndpoint);
  app.post('/api/admin/withdrawals/:id/approve', handleApproveWithdrawalEndpoint);

  // POST /api/withdrawals/:id/reject - Admin rejects withdrawal (Refunds locked funds back to available)
  app.post('/api/withdrawals/:id/reject', (req, res) => {
    const { id } = req.params;
    const { reason, operatorIdentifier, operatorRole } = req.body || {};

    const effectiveRole = String(operatorRole || operatorIdentifier || '').trim();
    const authorizedRoles = ['Super Admin', 'Operador Financiero', 'superadmin', 'operador financiero', 'super admin'];
    const isAuthorized = effectiveRole ? authorizedRoles.some((r) => r.toLowerCase() === effectiveRole.toLowerCase()) : true;

    if (effectiveRole && !isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Acceso Denegado: Solo usuarios con rol Superadministrador u Operador Financiero pueden procesar o rechazar retiros.',
      });
    }

    const idx = serverWithdrawals.findIndex((w) => w.id === id);
    if (idx < 0) {
      return res.status(404).json({ success: false, message: 'Solicitud de retiro no encontrada' });
    }

    const wth = serverWithdrawals[idx];
    const amount = Number(wth.amountVes) || 0;
    const processedAt = new Date().toISOString();

    serverWithdrawals[idx] = {
      ...wth,
      status: 'rejected',
      rejectionReason: reason || 'Datos de cuenta erróneos o inválidos.',
      processedAt,
      processedBy: effectiveRole || 'Operador Financiero',
    };
    const updatedWithdrawal = serverWithdrawals[idx];

    // Refund locked balance back to available balance in server users
    let updatedUser = null;
    const userIdx = serverUsers.findIndex((u) => u.id === wth.userId);
    if (userIdx >= 0) {
      serverUsers[userIdx].lockedBalance = Math.max(0, (Number(serverUsers[userIdx].lockedBalance) || 0) - amount);
      serverUsers[userIdx].availableBalance = (Number(serverUsers[userIdx].availableBalance) || 0) + amount;
      updatedUser = serverUsers[userIdx];

      broadcastRealtimeEvent('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        new: updatedUser,
        record: updatedUser,
      });
    }

    broadcastRealtimeEvent('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'withdrawals',
      new: updatedWithdrawal,
      record: updatedWithdrawal,
    });

    broadcastRealtimeEvent('withdrawal_rejected', { withdrawal: updatedWithdrawal, user: updatedUser });

    res.json({
      success: true,
      message: `Retiro rechazado. Los fondos (${amount} Bs.) han sido devueltos al saldo disponible del usuario.`,
      withdrawal: updatedWithdrawal,
      user: updatedUser,
    });
  });

  // POST /api/sync-withdrawals - Sync withdrawals across sessions / tabs
  app.post('/api/sync-withdrawals', (req, res) => {
    const { withdrawals } = req.body;
    if (Array.isArray(withdrawals) && withdrawals.length > 0) {
      if (serverWithdrawals.length === 0) {
        serverWithdrawals = [...withdrawals];
        res.json({ success: true, count: serverWithdrawals.length });
        return;
      }
      const m = new Map(withdrawals.map((w: any) => [w.id, w]));
      serverWithdrawals = serverWithdrawals.map((w: any) => m.get(w.id) || w);
      withdrawals.forEach((w: any) => {
        if (!serverWithdrawals.some((s: any) => s.id === w.id)) serverWithdrawals.push(w);
      });
    }
    res.json({ success: true, count: serverWithdrawals.length });
  });

  // -------------------------------------------------------------
  // API Routes: Gestión de Usuarios y Registro Público (/api/users & /api/players)
  // Políticas de seguridad: Inserción pública permitida a usuarios anónimos (Anon RLS)
  // Rol por defecto: 'Player' (Jugador)
  // -------------------------------------------------------------

  // GET /api/users & GET /api/players - Listado inmediato para Backoffice y Admin
  const handleGetUsers = (req: express.Request, res: express.Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({
      success: true,
      timestamp: Date.now(),
      total: serverUsers.length,
      data: serverUsers,
    });
  };

  app.get('/api/users', handleGetUsers);
  app.get('/api/players', handleGetUsers);

  // POST /api/users & POST /api/players - Registro público de nuevos usuarios/jugadores
  const handlePostUser = (req: express.Request, res: express.Response) => {
    const userData = req.body;
    if (!userData) {
      return res.status(400).json({ success: false, message: 'Datos de usuario requeridos' });
    }

    const cleanDoc = (userData.documentId || userData.cedula || '').trim().toUpperCase();
    const fullName = (userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`).trim() || 'Nuevo Jugador';
    const userId = userData.id || `usr-${Date.now()}`;

    // Construcción de registro seguro con rol por defecto 'Player' y preservación de contraseña
    const newUserRecord = {
      id: userId,
      name: fullName,
      firstName: (userData.firstName || fullName.split(' ')[0] || '').trim(),
      lastName: (userData.lastName || fullName.split(' ').slice(1).join(' ') || '').trim(),
      email: (userData.email || '').trim().toLowerCase(),
      password: userData.password || '123456',
      documentId: cleanDoc,
      phone: (userData.phone || userData.telefono || '0412-0000000').trim(),
      birthDate: userData.birthDate || '2000-01-01',
      country: 'Venezuela',
      role: userData.role || 'Player',
      status: userData.status || 'active',
      availableBalance: userData.availableBalance !== undefined ? userData.availableBalance : 0,
      pendingBalance: userData.pendingBalance || 0,
      lockedBalance: userData.lockedBalance || 0,
      totalWonVes: userData.totalWonVes || 0,
      totalSpentVes: userData.totalSpentVes || 0,
      createdAt: userData.createdAt || new Date().toISOString(),
      kycStatus: userData.kycStatus || 'Aprobado',
      kycVerifiedAt: userData.kycVerifiedAt || new Date().toISOString(),
      kycFrontUrl: userData.kycFrontUrl || userData.foto || '',
      kycBackUrl: userData.kycBackUrl || '',
      twoFactorEnabled: !!userData.twoFactorEnabled,
      twoFactorMethod: userData.twoFactorMethod || 'none',
      withdrawalMethods: userData.withdrawalMethods || [],
      foto: userData.foto || userData.kycFrontUrl || '',
    };

    const existingIdx = serverUsers.findIndex(
      (u) => u.id === userId || (cleanDoc && u.documentId && u.documentId.toUpperCase() === cleanDoc)
    );

    if (existingIdx >= 0) {
      serverUsers[existingIdx] = { 
        ...serverUsers[existingIdx], 
        ...newUserRecord,
        password: userData.password || serverUsers[existingIdx].password || '123456',
      };
    } else {
      serverUsers = [newUserRecord, ...serverUsers];
    }

    // Transmisión inmediata en tiempo real por WebSocket a todos los paneles de administración
    broadcastRealtimeEvent('postgres_changes', {
      event: existingIdx >= 0 ? 'UPDATE' : 'INSERT',
      schema: 'public',
      table: 'users',
      new: existingIdx >= 0 ? serverUsers[existingIdx] : newUserRecord,
      record: existingIdx >= 0 ? serverUsers[existingIdx] : newUserRecord,
    });

    broadcastRealtimeEvent('postgres_changes', {
      event: existingIdx >= 0 ? 'UPDATE' : 'INSERT',
      schema: 'public',
      table: 'jugadores',
      new: existingIdx >= 0 ? serverUsers[existingIdx] : newUserRecord,
      record: existingIdx >= 0 ? serverUsers[existingIdx] : newUserRecord,
    });

    broadcastRealtimeEvent('user_registered', { user: existingIdx >= 0 ? serverUsers[existingIdx] : newUserRecord });
    broadcastRealtimeEvent('player_registered', { player: existingIdx >= 0 ? serverUsers[existingIdx] : newUserRecord });

    res.status(201).json({
      success: true,
      message: '¡Usuario registrado y transmitido al panel administrativo en tiempo real con éxito!',
      data: existingIdx >= 0 ? serverUsers[existingIdx] : newUserRecord,
    });
  };

  app.post('/api/users', handlePostUser);
  app.post('/api/players', handlePostUser);

  // PATCH /api/users/:id - Actualización parcial de usuario (perfil, saldo, contraseña, KYC)
  app.patch('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const idx = serverUsers.findIndex((u) => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    serverUsers[idx] = { ...serverUsers[idx], ...updates };

    broadcastRealtimeEvent('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'users',
      new: serverUsers[idx],
      record: serverUsers[idx],
    });

    res.json({ success: true, message: 'Usuario actualizado correctamente', data: serverUsers[idx] });
  });

  // POST /api/users/:id/change-password - Cambio de contraseña directo
  app.post('/api/users/:id/change-password', (req, res) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const idx = serverUsers.findIndex((u) => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const user = serverUsers[idx];
    if (currentPassword && user.password && user.password !== currentPassword.trim()) {
      return res.status(400).json({ success: false, message: 'La contraseña actual ingresada es incorrecta' });
    }

    serverUsers[idx] = {
      ...user,
      password: newPassword.trim(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
    };

    broadcastRealtimeEvent('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'users',
      new: serverUsers[idx],
      record: serverUsers[idx],
    });

    res.json({ success: true, message: '¡Contraseña actualizada con éxito!' });
  });

  // POST /api/reset-password - Restablecimiento de contraseña por email o identificador
  app.post('/api/reset-password', (req, res) => {
    const { identifier, newPassword } = req.body;
    if (!identifier || !newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Identificador y nueva contraseña válida (mínimo 6 caracteres) requeridos' });
    }

    const clean = identifier.trim().toLowerCase();
    let updatedCount = 0;

    // Buscar y actualizar en serverUsers
    const userIdx = serverUsers.findIndex(
      (u) =>
        (u.email && u.email.toLowerCase() === clean) ||
        u.name.toLowerCase() === clean ||
        (u.documentId && u.documentId.toLowerCase() === clean) ||
        u.phone === clean
    );

    if (userIdx >= 0) {
      serverUsers[userIdx] = {
        ...serverUsers[userIdx],
        password: newPassword.trim(),
        failedLoginAttempts: 0,
        lockoutUntil: null,
      };
      updatedCount++;

      broadcastRealtimeEvent('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        new: serverUsers[userIdx],
        record: serverUsers[userIdx],
      });
    }

    // Buscar y actualizar en serverCredentials
    const credIdx = serverCredentials.findIndex(
      (c) => c.username.toLowerCase() === clean || c.username.toLowerCase() === clean.split('@')[0]
    );

    if (credIdx >= 0) {
      serverCredentials[credIdx] = {
        ...serverCredentials[credIdx],
        password: newPassword.trim(),
      };
      updatedCount++;

      broadcastRealtimeEvent('credentials_updated', { credentials: serverCredentials });
    }

    if (updatedCount === 0) {
      return res.status(404).json({ success: false, message: 'No se encontró ninguna cuenta asociada a los datos proporcionados' });
    }

    res.json({ success: true, message: '¡Contraseña restablecida exitosamente en el servidor central!' });
  });

  // -------------------------------------------------------------
  // API Routes: Credenciales de Operadores y Super Admin (/api/credentials)
  // -------------------------------------------------------------
  app.get('/api/credentials', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.json({ success: true, data: serverCredentials });
  });

  app.post('/api/credentials', (req, res) => {
    const cred = req.body;
    if (!cred || !cred.username || !cred.password) {
      return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
    }

    const newCred = {
      id: cred.id || `cred-${Date.now()}`,
      displayName: cred.displayName || cred.username,
      username: cred.username.trim(),
      role: cred.role || 'Super Admin',
      status: cred.status || 'active',
      createdAt: cred.createdAt || new Date().toISOString(),
      password: cred.password ? hashPasswordServer(cred.password) : '',
    };

    const existingIdx = serverCredentials.findIndex((c) => c.username.toLowerCase() === newCred.username.toLowerCase());
    if (existingIdx >= 0) {
      serverCredentials[existingIdx] = { ...serverCredentials[existingIdx], ...newCred };
    } else {
      serverCredentials = [newCred, ...serverCredentials];
    }

    // Sync to Supabase admin_users if connected
    try {
      const supabaseServer = getSupabaseServerClient();
      if (supabaseServer) {
        supabaseServer.from('admin_users').upsert({
          username: newCred.username,
          password: newCred.password,
          role: newCred.role === 'Operador Financiero' ? 'operador_financiero' : newCred.role === 'Auditor' ? 'auditor' : 'super_admin',
          status: newCred.status,
          display_name: newCred.displayName,
        }, { onConflict: 'username' }).then(() => {});
      }
    } catch (e) {}

    broadcastRealtimeEvent('credentials_updated', { credentials: serverCredentials });
    res.status(201).json({ success: true, message: 'Credencial de operador guardada exitosamente', data: newCred });
  });

  app.put('/api/credentials/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const idx = serverCredentials.findIndex((c) => c.id === id || c.username.toLowerCase() === (updates.username || '').toLowerCase());
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Credencial no encontrada' });
    }

    serverCredentials[idx] = {
      ...serverCredentials[idx],
      ...updates,
      password: updates.password && updates.password.trim() ? hashPasswordServer(updates.password) : serverCredentials[idx].password,
    };

    broadcastRealtimeEvent('credentials_updated', { credentials: serverCredentials });
    res.json({ success: true, message: 'Credencial actualizada con éxito', data: serverCredentials[idx] });
  });

  app.delete('/api/credentials/:id', (req, res) => {
    const { id } = req.params;
    const target = serverCredentials.find((c) => c.id === id);
    serverCredentials = serverCredentials.filter((c) => c.id !== id);

    try {
      const supabaseServer = getSupabaseServerClient();
      if (supabaseServer && target) {
        supabaseServer.from('admin_users').delete().eq('username', target.username).then(() => {});
      }
    } catch (e) {}

    broadcastRealtimeEvent('credentials_updated', { credentials: serverCredentials });
    res.json({ success: true, message: 'Credencial eliminada' });
  });

  app.post('/api/sync-credentials', (req, res) => {
    const { credentials } = req.body;
    if (Array.isArray(credentials) && credentials.length > 0) {
      const m = new Map(credentials.map((c: any) => [c.id, c]));
      serverCredentials = serverCredentials.map((c: any) => m.get(c.id) || c);
      credentials.forEach((c: any) => {
        if (!serverCredentials.some((s: any) => s.id === c.id)) serverCredentials.push(c);
      });
    }
    res.json({ success: true, count: serverCredentials.length });
  });

  // POST /api/sync-users - Sincronización masiva desde clientes
  app.post('/api/sync-users', (req, res) => {
    const { users } = req.body;
    if (Array.isArray(users) && users.length > 0) {
      const m = new Map(users.map((u: any) => [u.id, u]));
      serverUsers = serverUsers.map((u: any) => {
        const incoming = m.get(u.id);
        return incoming ? { ...u, ...incoming, password: incoming.password || u.password } : u;
      });
      users.forEach((u: any) => {
        if (!serverUsers.some((s: any) => s.id === u.id)) serverUsers.push(u);
      });
    }
    res.json({ success: true, count: serverUsers.length });
  });

  // -------------------------------------------------------------
  // API Routes: Admin Login seguro validando contra la tabla 'admin_users' en Supabase
  // -------------------------------------------------------------
  const handleAdminServerLogin = async (req: express.Request, res: express.Response) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Por favor ingresa usuario y contraseña.' });
    }

    const trimmedUser = String(username).trim();
    const trimmedPass = String(password).trim();
    const hashedPass = hashPasswordServer(trimmedPass);

    // 1. Busca en la tabla admin_users en Supabase con status = 'active'
    try {
      const supabaseServer = getSupabaseServerClient();
      if (supabaseServer) {
        const { data, error } = await supabaseServer
          .from('admin_users')
          .select('*')
          .ilike('username', trimmedUser)
          .eq('status', 'active')
          .limit(1);

        const adminRow = Array.isArray(data) ? data[0] : data;

        if (!error && adminRow && adminRow.username && adminRow.password) {
          const isPasswordValid = adminRow.password === hashedPass || adminRow.password === trimmedPass;
          if (isPasswordValid) {
            const mappedRole = normalizeAdminRoleServer(adminRow.role);
            const token = `tok_admin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            return res.json({
              success: true,
              message: '¡Entraste!',
              role: mappedRole,
              username: adminRow.username,
              token,
            });
          } else {
            return res.status(401).json({
              success: false,
              message: 'Clave mala',
            });
          }
        }
      }
    } catch (err) {
      console.warn('[server] Error consultando tabla admin_users en servidor:', err);
    }

    // 2. Fallback: verificar credenciales administrativas del servidor
    const foundCred = serverCredentials.find(
      (c) => c.username.toLowerCase() === trimmedUser.toLowerCase() && (c.password === hashedPass || c.password === trimmedPass) && c.status === 'active'
    );

    if (foundCred) {
      const mappedRole = normalizeAdminRoleServer(foundCred.role);
      const token = `tok_admin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      return res.json({
        success: true,
        message: '¡Entraste!',
        role: mappedRole,
        username: foundCred.username,
        token,
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Clave mala',
    });
  };

  app.post('/api/admin/login', handleAdminServerLogin);
  app.post('/api/auth/admin-login', handleAdminServerLogin);

  // Endpoint para descargar el zip del build de producción
  app.get('/dist-production.zip', (req, res) => {
    const zipPath = path.join(process.cwd(), 'dist-production.zip');
    if (fs.existsSync(zipPath)) {
      res.download(zipPath, 'dist-production.zip');
    } else {
      const publicZip = path.join(process.cwd(), 'public', 'dist-production.zip');
      if (fs.existsSync(publicZip)) {
        res.download(publicZip, 'dist-production.zip');
      } else {
        res.status(404).send('ZIP no encontrado');
      }
    }
  });

  // -------------------------------------------------------------
  // Vite Integration (Dev Mode Middleware vs Production Static)
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] SuperMillonario backend running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] Realtime WebSocket active at ws://0.0.0.0:${PORT}/ws`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
});
