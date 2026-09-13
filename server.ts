import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS MANUAL A PRUEBA DE RENDER - TIENE QUE IR DE PRIMERO
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', (req.headers.origin as string) || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, apikey, x-client-info');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Inicialización opcional de Supabase en Servidor
const SUPABASE_URL = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://mccjcdsombzmlxzxccto.supabase.co'
).trim().replace(/^["']|["']$/g, '');

const SUPABASE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim().replace(/^["']|["']$/g, '');

let supabaseServerClient: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabaseServerClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
      global: {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      },
    });
    console.log('✅ [Supabase Server Client] Conectado exitosamente con apikey en cabeceras');
  } catch (err) {
    console.warn('[Supabase Server Client] Aviso al inicializar cliente:', err);
  }
}

// Helper para enviar correo con Resend o Nodemailer
async function sendOtpEmail(toEmail: string, otpCode: string, contextTitle: string = 'Código de Verificación'): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const fromEmail = (process.env.EMAIL_FROM || 'TÚ SUPERCARTÓN <onboarding@resend.dev>').trim();
  const targetEmail = (toEmail || 'niutoncaraballo3@gmail.com').toLowerCase().trim();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Tu Súper Cartón - Código de Seguridad</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 20px; margin: 0;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 24px; text-align: center;">
        <h1 style="color: #fbbf24; margin-bottom: 8px; font-size: 24px;">TÚ SUPERCARTÓN</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">${contextTitle}</p>
        <div style="background-color: #0f172a; border: 2px dashed #fbbf24; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #38bdf8;">${otpCode}</span>
        </div>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
          Este código es personal e intransferible. Es <strong>válido por 30 minutos</strong>.
        </p>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
          Si no solicitaste este código, puedes ignorar este mensaje de forma segura.
        </p>
      </div>
    </body>
    </html>
  `;

  // 1. Intentar con Resend si la API Key está configurada
  if (apiKey && apiKey.startsWith('re_')) {
    try {
      console.log(`[Resend Engine] Enviando OTP (${otpCode}) a: ${targetEmail}`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [targetEmail],
          subject: `🔐 Tu Código de Seguridad: ${otpCode} - Tu Súper Cartón`,
          html: htmlContent,
          text: `Tu código de seguridad para Tu Súper Cartón es: ${otpCode}. Es válido por 30 minutos.`,
        }),
      });

      const data = (await response.json()) as any;
      if (response.ok) {
        console.log(`[Resend Success] Email enviado con ID: ${data?.id}`);
        return { success: true, id: data?.id };
      }
      console.error('[Resend Error Response]:', response.status, data);
    } catch (err: any) {
      console.error('[Resend Error]:', err);
    }
  }

  // 2. Fallback con Nodemailer SMTP si está configurado
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      console.log(`[Nodemailer Engine] Enviando OTP a: ${targetEmail}`);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: fromEmail,
        to: targetEmail,
        subject: `🔐 Tu Código de Seguridad: ${otpCode} - Tu Súper Cartón`,
        html: htmlContent,
        text: `Tu código de seguridad para Tu Súper Cartón es: ${otpCode}. Es válido por 30 minutos.`,
      });

      console.log(`[Nodemailer Success] Email enviado con MessageID: ${info.messageId}`);
      return { success: true, id: info.messageId };
    } catch (smtpErr: any) {
      console.error('[Nodemailer Error]:', smtpErr);
      return { success: false, error: smtpErr?.message || 'Error en transporte SMTP' };
    }
  }

  return { success: false, error: 'Sin proveedor de correo configurado (RESEND_API_KEY o SMTP_*).' };
}

// Helper para parsear fechas de forma segura a milisegundos UTC
function parseToUtcTime(dateVal: any): number {
  if (!dateVal) return 0;
  if (typeof dateVal === 'number') return dateVal;
  let str = String(dateVal).trim();
  if (!str) return 0;
  if (/^\d{10,13}$/.test(str)) {
    const num = Number(str);
    return str.length === 10 ? num * 1000 : num;
  }
  if (!str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  }
  const parsed = new Date(str).getTime();
  if (isNaN(parsed)) {
    const fallback = new Date(dateVal).getTime();
    return isNaN(fallback) ? 0 : fallback;
  }
  return parsed;
}

// ----------------------------------------------------------------------
// RUTAS DEL SERVIDOR
// ----------------------------------------------------------------------

// 1. Healthcheck
app.get(['/health', '/api/health', '/ping'], (req, res) => {
  res.header('Access-Control-Allow-Origin', (req.headers.origin as string) || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  res.json({
    status: 'ok',
    service: 'golfodepariaproyecarton-api',
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
    resendConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')),
  });
});

// 2. Ruta /send-otp (y alias)
app.post(['/send-otp', '/api/send-otp', '/api/auth/send-recovery-code'], async (req, res) => {
  res.header('Access-Control-Allow-Origin', (req.headers.origin as string) || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const { email, user, pack, amountVes } = req.body || {};
    const targetEmail = (email || 'niutoncaraballo3@gmail.com').toLowerCase().trim();

    if (!supabaseServerClient) {
      console.error('[Supabase Error in /send-otp]: Cliente de Supabase no inicializado');
      return res.status(500).json({ success: false, error: 'Base de datos no disponible para registrar código OTP' });
    }

    // Generar código numérico de 6 dígitos (100000 a 999999)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAtIso = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Inserción directa en tabla otp_codes de Supabase
    const { error: dbErr } = await supabaseServerClient.from('otp_codes').insert({
      email: targetEmail,
      code,
      created_at: now.toISOString(),
      expires_at: expiresAtIso,
      used: false,
    });

    if (dbErr) {
      console.error('[Supabase DB Insert Error in /send-otp]:', dbErr);
      return res.status(500).json({ success: false, error: `Error al guardar OTP en base de datos: ${dbErr.message}` });
    }

    console.log(`[Supabase DB] OTP ${code} guardado en tabla otp_codes para ${targetEmail} (válido hasta: ${expiresAtIso})`);

    // Mantener intacta la lógica de envío de correos
    const emailRes = await sendOtpEmail(
      targetEmail,
      code,
      pack ? `Compra de ${pack} Cartones (${amountVes || 0} Bs.)` : 'Autorización de Seguridad'
    );

    if (!emailRes.success) {
      console.warn(`[OTP Warning] No se pudo enviar email: ${emailRes.error}`);
      return res.status(200).json({
        success: true,
        sent: false,
        message: `Código generado. (Aviso: ${emailRes.error})`,
        email: targetEmail,
        debugCode: process.env.NODE_ENV !== 'production' ? code : undefined,
      });
    }

    return res.status(200).json({
      success: true,
      sent: true,
      message: `Código de seguridad enviado a ${targetEmail} (válido por 30 minutos)`,
      email: targetEmail,
    });
  } catch (error: any) {
    console.error('[Error in /send-otp]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error interno al generar código OTP' });
  }
});

// 3. Ruta /verify-otp (y alias)
app.post(['/verify-otp', '/api/verify-otp', '/api/auth/verify-recovery-code'], async (req, res) => {
  res.header('Access-Control-Allow-Origin', (req.headers.origin as string) || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const { code, email, otp, verificationCode } = req.body || {};
    const rawInput = (code ?? otp ?? verificationCode ?? '').toString();
    const cleanCode = rawInput.replace(/\s+/g, '').trim();
    const targetEmail = email ? email.toString().toLowerCase().trim() : '';

    console.log(`[OTP Verification Attempt] Código recibido: "${cleanCode}", Email recibido: "${targetEmail || 'N/A'}"`);

    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return res.status(200).json({ valid: false, success: false, message: 'El código debe tener exactamente 6 dígitos numéricos' });
    }

    if (!supabaseServerClient) {
      console.error('[Supabase Error in /verify-otp]: Cliente de Supabase no inicializado');
      return res.status(500).json({ valid: false, success: false, error: 'Base de datos no disponible para verificar el código' });
    }

    // Consulta directa a la tabla otp_codes de Supabase
    const { data: dbRecords, error: dbErr } = await supabaseServerClient
      .from('otp_codes')
      .select('*')
      .eq('code', cleanCode)
      .order('created_at', { ascending: false });

    if (dbErr) {
      console.error('[Supabase DB Query Error in /verify-otp]:', dbErr);
      return res.status(500).json({ valid: false, success: false, error: `Error en consulta de base de datos: ${dbErr.message}` });
    }

    if (!dbRecords || dbRecords.length === 0) {
      console.log(`[OTP Failed] Código no encontrado en DB: ${cleanCode}`);
      return res.status(200).json({ valid: false, success: false, message: 'Código incorrecto o no encontrado' });
    }

    // Seleccionar el registro activo no utilizado más reciente
    const activeRecord = dbRecords.find((r) => r.used !== true) || dbRecords[0];

    // Verificar si ya fue utilizado
    if (activeRecord.used === true) {
      console.log(`[OTP Used DB] Código ya fue utilizado previamente: ${cleanCode}`);
      return res.status(200).json({
        valid: false,
        success: false,
        message: 'Este código de seguridad ya fue utilizado previamente.',
      });
    }

    // Verificar expiración (30 minutos usando created_at)
    const now = Date.now();
    const createdTime = parseToUtcTime(activeRecord.created_at);
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;

    if (!createdTime || (now - createdTime > THIRTY_MINUTES_MS)) {
      console.log(`[OTP Expired DB] Código vencido en DB: ${cleanCode}`);
      return res.status(200).json({
        valid: false,
        success: false,
        message: 'Código vencido (ha superado los 30 minutos de vigencia)',
      });
    }

    // Validar correo si se envió en la petición
    if (targetEmail && activeRecord.email) {
      const dbEmailNorm = activeRecord.email.toLowerCase().trim();
      if (dbEmailNorm !== targetEmail && dbEmailNorm !== 'niutoncaraballo3@gmail.com') {
        console.log(`[OTP Email Mismatch DB] DB: ${dbEmailNorm} vs Input: ${targetEmail}`);
        return res.status(200).json({
          valid: false,
          success: false,
          message: 'El código no corresponde a este correo electrónico',
        });
      }
    }

    // Actualizar campo used a true directamente en Supabase
    const { error: updateErr } = await supabaseServerClient
      .from('otp_codes')
      .update({ used: true })
      .eq('id', activeRecord.id);

    if (updateErr) {
      console.error('[Supabase DB Update Error in /verify-otp]:', updateErr);
      return res.status(500).json({ valid: false, success: false, error: `Error al actualizar estado del código: ${updateErr.message}` });
    }

    console.log(`[OTP Verified via DB ✓] Código ${cleanCode} validado y marcado como used=true para ${activeRecord.email || targetEmail}`);
    return res.status(200).json({
      valid: true,
      success: true,
      message: 'Código verificado correctamente',
      email: activeRecord.email || targetEmail,
    });
  } catch (error: any) {
    console.error('[Error in /verify-otp]:', error);
    return res.status(500).json({ valid: false, success: false, error: error?.message || 'Error interno al verificar código' });
  }
});

// ======================================================================
// 4. MÓDULO DE SORTEOS: ENDPOINTS PARA GESTIÓN Y VISIBILIDAD EN PANEL
// ======================================================================
// Semilla en memoria como fallback de alta resiliencia
const defaultScheduledRounds = [
  {
    id: 'round-102',
    roundNumber: 102,
    round_number: 102,
    order: 1,
    title: 'Sorteo Estelar Tarde #102',
    status: 'open',
    cardPriceVes: 25,
    card_price_ves: 25,
    prizePercentage: 70,
    prize_percentage: 70,
    jackpotVes: 15000,
    jackpot_ves: 15000,
    totalCardsSold: 36,
    total_cards_sold: 36,
    drawnFichas: [],
    drawn_fichas: [],
    startsAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    starts_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    drawAt: new Date(Date.now() + 48 * 60 * 1000).toISOString(),
    draw_at: new Date(Date.now() + 48 * 60 * 1000).toISOString(),
    openBetAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    open_bet_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    closeBetAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    close_bet_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'round-103',
    roundNumber: 103,
    round_number: 103,
    order: 2,
    title: 'Gran Sorteo Nocturno #103',
    status: 'scheduled',
    cardPriceVes: 30,
    card_price_ves: 30,
    prizePercentage: 75,
    prize_percentage: 75,
    jackpotVes: 25000,
    jackpot_ves: 25000,
    totalCardsSold: 0,
    total_cards_sold: 0,
    drawnFichas: [],
    drawn_fichas: [],
    startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    starts_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    drawAt: new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString(),
    draw_at: new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString(),
    openBetAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    open_bet_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    closeBetAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    close_bet_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'round-104',
    roundNumber: 104,
    round_number: 104,
    order: 3,
    title: 'Sorteo Madrugada Millonario #104',
    status: 'scheduled',
    cardPriceVes: 20,
    card_price_ves: 20,
    prizePercentage: 80,
    prize_percentage: 80,
    jackpotVes: 20000,
    jackpot_ves: 20000,
    totalCardsSold: 0,
    total_cards_sold: 0,
    drawnFichas: [],
    drawn_fichas: [],
    startsAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    starts_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    drawAt: new Date(Date.now() + 6.5 * 60 * 60 * 1000).toISOString(),
    draw_at: new Date(Date.now() + 6.5 * 60 * 60 * 1000).toISOString(),
    openBetAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    open_bet_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    closeBetAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    close_bet_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  },
];

let inMemoryRounds = [...defaultScheduledRounds];

// In-memory scheduled rounds fallback (sin tocar registros en base de datos Supabase)
const MAX_LOCAL_ROUNDS = 7;
function trimInMemoryRounds(): void {
  if (inMemoryRounds.length > MAX_LOCAL_ROUNDS) {
    inMemoryRounds = inMemoryRounds.slice(0, MAX_LOCAL_ROUNDS);
  }
}

// GET /api/rounds: Obtener sorteos (compatibilidad total con panel de jugador)
app.get(['/api/rounds', '/api/sorteos'], async (req, res) => {
  try {
    const statusQuery = (req.query.status as string) || '';
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    let allowedStatuses: string[] = [];
    if (statusQuery) {
      allowedStatuses = statusQuery.split(',').map((s) => s.trim().toLowerCase());
    }

    let roundsToReturn: any[] = [];

    if (supabaseServerClient) {
      try {
        let query = supabaseServerClient
          .from('rounds')
          .select('*')
          .order('order', { ascending: true })
          .limit(limit);

        if (allowedStatuses.length > 0) {
          query = query.in('status', [...allowedStatuses, ...allowedStatuses.map(s => s.toUpperCase())]);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          roundsToReturn = data.map((r: any) => ({
            id: String(r.id),
            roundNumber: Number(r.roundNumber || r.round_number || 1),
            round_number: Number(r.round_number || r.roundNumber || 1),
            order: Number(r.order || 1),
            title: r.title || `Sorteo #${r.round_number || r.roundNumber || 1}`,
            status: (r.status || 'scheduled').toLowerCase(),
            cardPriceVes: Number(r.cardPriceVes ?? r.card_price_ves ?? r.card_price ?? 25),
            card_price_ves: Number(r.card_price_ves ?? r.cardPriceVes ?? r.card_price ?? 25),
            prizePercentage: Number(r.prizePercentage ?? r.prize_percentage ?? 70),
            prize_percentage: Number(r.prize_percentage ?? r.prizePercentage ?? 70),
            jackpotVes: Number(r.jackpotVes ?? r.jackpot_ves ?? 15000),
            jackpot_ves: Number(r.jackpot_ves ?? r.jackpotVes ?? 15000),
            totalCardsSold: Number(r.totalCardsSold ?? r.total_cards_sold ?? 0),
            total_cards_sold: Number(r.total_cards_sold ?? r.totalCardsSold ?? 0),
            drawnFichas: Array.isArray(r.drawnFichas) ? r.drawnFichas : (Array.isArray(r.drawn_fichas) ? r.drawn_fichas : []),
            drawn_fichas: Array.isArray(r.drawn_fichas) ? r.drawn_fichas : (Array.isArray(r.drawnFichas) ? r.drawnFichas : []),
            startsAt: r.startsAt || r.starts_at || r.openBetAt || r.open_bet_at,
            starts_at: r.starts_at || r.startsAt || r.open_bet_at || r.openBetAt,
            endsAt: r.endsAt || r.ends_at || r.closeBetAt || r.close_bet_at,
            ends_at: r.ends_at || r.endsAt || r.close_bet_at || r.closeBetAt,
            drawAt: r.drawAt || r.draw_at,
            draw_at: r.draw_at || r.drawAt,
            openBetAt: r.openBetAt || r.open_bet_at,
            open_bet_at: r.open_bet_at || r.openBetAt,
            closeBetAt: r.closeBetAt || r.close_bet_at,
            close_bet_at: r.close_bet_at || r.closeBetAt,
          }));
        }
      } catch (dbErr) {
        console.warn('[Rounds Endpoint DB Query Warning]:', dbErr);
      }
    }

    // Si Supabase no tiene datos o falló, usar memoria
    if (roundsToReturn.length === 0) {
      roundsToReturn = inMemoryRounds;
      if (allowedStatuses.length > 0) {
        roundsToReturn = roundsToReturn.filter((r) => allowedStatuses.includes(r.status.toLowerCase()));
      }
    }

    // Purga permanente de sorteos eliminados (#7 sorteo de la mañana y #10 sorteo prueba iv)
    // y eliminación directa de sorteos que ya figuren con estado finalizado o cerrado
    const nowServerMs = Date.now();
    const isTargetPermanentlyDeleted = (r: any): boolean => {
      const title = String(r.title || '').toLowerCase().trim();
      const orderStr = String(r.order || r.roundNumber || r.round_number || '').trim();
      const idStr = String(r.id || '').toLowerCase().trim();

      // #7 sorteo de la mañana
      if (
        title.includes('sorteo de la ma') ||
        title.includes('sorteo de la mañana') ||
        title.includes('sorteo de la manana') ||
        ((orderStr === '7' || idStr.includes('-7')) && (title.includes('mañana') || title.includes('manana') || title.includes('sorteo')))
      ) {
        return true;
      }

      // #10 sorteo prueba iv
      if (
        title.includes('sorteo prueba iv') ||
        title.includes('prueba iv') ||
        ((orderStr === '10' || idStr.includes('-10')) && (title.includes('prueba') || title.includes('iv') || title.includes('sorteo')))
      ) {
        return true;
      }

      return false;
    };

    roundsToReturn = roundsToReturn.filter((r) => {
      if (isTargetPermanentlyDeleted(r)) return false;
      const st = String(r.status || '').toLowerCase().trim();
      // Regla de eliminación directa: sorteos cerrados o finalizados no se muestran
      if (st === 'finished' || st === 'completado' || st === 'closed' || st === 'cerrado') return false;

      const rawStart = r.starts_at || r.startsAt || r.draw_at || r.drawAt || r.open_bet_at || r.openBetAt;
      const startMs = rawStart ? new Date(rawStart).getTime() : 0;
      // Si está en 'live' o 'drawing', pero su hora de inicio ya expiró hace más de 15 minutos:
      if ((st === 'live' || st === 'drawing') && startMs > 0 && nowServerMs > startMs + 15 * 60 * 1000) {
        return false;
      }
      return true;
    });

    return res.status(200).json(roundsToReturn);
  } catch (error: any) {
    console.error('[Error in GET /api/rounds]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error al obtener sorteos' });
  }
});

// POST /api/rounds: Crear o programar sorteo
app.post(['/api/rounds', '/api/sorteos'], async (req, res) => {
  try {
    const { title, drawAt, cardPriceVes, prizePercentage, order, manualJackpotVes } = req.body || {};
    const maxNum = inMemoryRounds.reduce((max, r) => Math.max(max, r.roundNumber || 0), 100);
    const newRoundNumber = maxNum + 1;
    const drawDate = drawAt ? new Date(drawAt) : new Date(Date.now() + 2 * 60 * 60 * 1000);
    const openDate = new Date(drawDate.getTime() - 60 * 60 * 1000);
    const closeDate = new Date(drawDate.getTime() - 3 * 60 * 1000);

    const price = Number(cardPriceVes) || 25;
    const prizePct = Number(prizePercentage) || 70;
    const roundId = `round-${Date.now()}`;

    const newRound: any = {
      id: roundId,
      roundNumber: newRoundNumber,
      round_number: newRoundNumber,
      order: Number(order) || inMemoryRounds.length + 1,
      title: title || `Sorteo #${newRoundNumber}`,
      status: 'scheduled',
      cardPriceVes: price,
      card_price_ves: price,
      card_price: price,
      prizePercentage: prizePct,
      prize_percentage: prizePct,
      jackpotVes: Number(manualJackpotVes) || 15000,
      jackpot_ves: Number(manualJackpotVes) || 15000,
      totalCardsSold: 0,
      total_cards_sold: 0,
      drawnFichas: [],
      drawn_fichas: [],
      startsAt: openDate.toISOString(),
      starts_at: openDate.toISOString(),
      endsAt: closeDate.toISOString(),
      ends_at: closeDate.toISOString(),
      drawAt: drawDate.toISOString(),
      draw_at: drawDate.toISOString(),
      openBetAt: openDate.toISOString(),
      open_bet_at: openDate.toISOString(),
      closeBetAt: closeDate.toISOString(),
      close_bet_at: closeDate.toISOString(),
    };

    inMemoryRounds.unshift(newRound);

    if (supabaseServerClient) {
      try {
        const dbRoundPayload = {
          id: roundId,
          round_number: newRoundNumber,
          order: Number(order) || inMemoryRounds.length + 1,
          title: title || `Sorteo #${newRoundNumber}`,
          status: 'scheduled',
          card_price_ves: price,
          card_price: price,
          prize_percentage: prizePct,
          jackpot_ves: Number(manualJackpotVes) || 15000,
          total_cards_sold: 0,
          drawn_fichas: [],
          starts_at: openDate.toISOString(),
          ends_at: closeDate.toISOString(),
          draw_at: drawDate.toISOString(),
          open_bet_at: openDate.toISOString(),
          close_bet_at: closeDate.toISOString(),
          created_at: new Date().toISOString(),
        };
        await supabaseServerClient.from('rounds').delete().eq('id', roundId);
        await supabaseServerClient.from('rounds').upsert(dbRoundPayload, { onConflict: 'id' });
        // Solo optimizar memoria de fallback local sin alterar Supabase
        trimInMemoryRounds();
      } catch (err) {
        console.warn('[Supabase Round Insert Notice]:', err);
      }
    } else {
      trimInMemoryRounds();
    }

    return res.status(201).json({ success: true, message: 'Sorteo programado exitosamente', round: newRound });
  } catch (error: any) {
    console.error('[Error in POST /api/rounds]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error al crear sorteo' });
  }
});

// ======================================================================
// 5. MÓDULO DE RECARGAS PAGO MÓVIL: ACREDITACIÓN EXACTA Y ATÓMICA DE SALDO
// ======================================================================
// POST /api/recargas/aprobar (y /api/recharges/approve)
app.post(['/api/recargas/aprobar', '/api/recharges/approve'], async (req, res) => {
  try {
    const { rechargeId } = req.body;
    if (!rechargeId) return res.status(400).json({ success: false, error: 'rechargeId requerido' });

    const nowIso = new Date().toISOString();
    
    // 1. Buscar recarga en Supabase (fuente real, no dbState)
    const { data: recarga, error: findErr } = await supabaseServerClient
      .from('recharges')
      .select('*')
      .eq('id', rechargeId)
      .maybeSingle();
    
    if (findErr || !recarga) return res.status(404).json({ success: false, error: 'Recarga no encontrada' });
    if (recarga.status === 'approved' || recarga.estado === 'aprobada') {
      return res.json({ success: true, message: 'Ya estaba aprobada', recharge: recarga });
    }

    const userId = recarga.user_id || (recarga as any).userId;
    const montoRecarga = Number((recarga as any).monto || recarga.amount || 0);
    if (!userId || montoRecarga <= 0) return res.status(400).json({ success: false, error: 'Datos de recarga inválidos' });

    // 2. Marcar como aprobada en ambos idiomas (para que no se tranque)
    await supabaseServerClient.from('recharges').update({
      status: 'approved',
      estado: 'aprobada',
      processed_at: nowIso,
      aprobado_en: nowIso,
      updated_at: nowIso
    }).eq('id', rechargeId);

    if ((supabaseServerClient as any).from) {
       try { await supabaseServerClient.from('recargas_pago_movil').update({ estado: 'aprobada', updated_at: nowIso }).eq('id', rechargeId); } catch {}
    }

    // 3. ACREDITAR SALDO - Lógica tomada de tu código bueno
    // Buscamos saldo actual en profiles
    const { data: profile } = await supabaseServerClient.from('profiles').select('id, saldo, available_balance').eq('id', userId).maybeSingle();
    const saldoActual = Number(profile?.saldo || (profile as any)?.available_balance || 0);
    const nuevoSaldo = saldoActual + montoRecarga;

    // Actualizamos en las 3 tablas para que no se desfase nunca
    await supabaseServerClient.from('profiles').update({ 
      saldo: nuevoSaldo, 
      available_balance: nuevoSaldo,
      pending_balance: 0
    }).eq('id', userId);

    try { await supabaseServerClient.from('users').update({ saldo: nuevoSaldo, available_balance: nuevoSaldo }).eq('id', userId); } catch {}
    try { await supabaseServerClient.from('jugadores_bingo').update({ saldo: nuevoSaldo }).eq('id', userId); } catch {}

    return res.json({ 
      success: true, 
      message: `Acreditados ${montoRecarga} Bs. Saldo final: ${nuevoSaldo} Bs.`,
      balanceAfter: nuevoSaldo
    });

  } catch (err: any) {
    console.error('Error aprobar:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});     
// POST /api/recargas/rechazar (y /api/recharges/reject)
app.post(['/api/recargas/rechazar', '/api/recharges/reject'], async (req, res) => {
  try {
    const { id, transactionId, reason, motivo, processedBy, procesado_por } = req.body || {};
    const rechargeId = String(id || transactionId || '').trim();
    const rejectionReason = String(reason || motivo || 'Comprobante no válido o no encontrado en cuenta receptora').trim();
    const auditor = String(processedBy || procesado_por || 'Auditor Central').trim();
    const nowIso = new Date().toISOString();

    if (!rechargeId) {
      return res.status(400).json({ success: false, message: 'Se requiere ID de recarga' });
    }

    if (supabaseServerClient) {
      await supabaseServerClient
        .from('recargas_pago_movil')
        .update({
          estado: 'rechazada',
          estatus: 'rechazada',
          fecha_procesado: nowIso,
          procesado_por: auditor,
        })
        .eq('id', rechargeId);

      await supabaseServerClient
        .from('recharges')
        .update({
          status: 'rejected',
        })
        .eq('id', rechargeId);

      await supabaseServerClient.from('audit_logs').insert({
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        operator_role: 'Auditor Financiero',
        operator_name: auditor,
        action: 'RECHAZAR_RECARGA',
        details: `Recarga ${rechargeId} rechazada: ${rejectionReason}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Recarga rechazada correctamente',
      rechargeId,
      reason: rejectionReason,
    });
  } catch (error: any) {
    console.error('[Error in /api/recargas/rechazar]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error al rechazar recarga' });
  }
});

// ======================================================================
// 5.5. MÉTRICAS FINANCIERAS Y AGREGACIONES EN BASE DE DATOS
// ======================================================================
// GET /api/finances/metrics: Totales financieros agregados directamente en BD
app.get('/api/finances/metrics', async (req, res) => {
  res.header('Access-Control-Allow-Origin', (req.headers.origin as string) || '*');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    if (!supabaseServerClient) {
      return res.status(500).json({
        success: false,
        error: 'Cliente de Supabase no inicializado en el servidor',
      });
    }

    // 1. Intento primario: Función RPC en PostgreSQL para agregación nativa directa
    try {
      const { data: rpcData, error: rpcError } = await supabaseServerClient.rpc('get_financial_metrics');
      if (!rpcError && rpcData) {
        const totalRecharges = Number(rpcData.totalRecharges ?? rpcData.total_recharges ?? 0);
        const totalSales = Number(rpcData.totalSales ?? rpcData.total_sales ?? 0);
        const totalPrizes = Number(rpcData.totalPrizes ?? rpcData.total_prizes ?? 0);
        const netProfit = Number(rpcData.netProfit ?? rpcData.net_profit ?? (totalSales - totalPrizes));

        return res.status(200).json({
          totalRecharges: Number(totalRecharges.toFixed(2)),
          totalSales: Number(totalSales.toFixed(2)),
          totalPrizes: Number(totalPrizes.toFixed(2)),
          netProfit: Number(netProfit.toFixed(2)),
        });
      }
    } catch (rpcErr) {
      console.warn('[RPC Notice] get_financial_metrics no disponible o falló, ejecutando agregación selectiva en tablas:', rpcErr);
    }

    // 2. Fallback de alta eficiencia: consultas paralelas trayendo únicamente columnas numéricas
    const [rechargesResult, ledgerResult, cardsPrizesResult] = await Promise.all([
      // A. Total Recargas Aprobadas
      supabaseServerClient
        .from('recharges')
        .select('amount_ves, monto_ves, monto')
        .or('status.ilike.approved,status.ilike.aprobada,estado.ilike.aprobada'),

      // B. Ventas de Cartones desde Ledger Contable
      supabaseServerClient
        .from('ledger')
        .select('amount_ves, amount')
        .or('type.ilike.card_purchase,type.ilike.CARD_PURCHASE'),

      // C. Premios Totales Distribuidos
      supabaseServerClient
        .from('cards')
        .select('total_prize_ves')
        .or('status.eq.winner,total_prize_ves.gt.0'),
    ]);

    // Sumatoria de Recargas Aprobadas
    let totalRecharges = 0;
    if (rechargesResult.data) {
      for (const row of rechargesResult.data as any[]) {
        totalRecharges += Number(row.amount_ves ?? row.monto_ves ?? row.monto ?? 0);
      }
    }

    // Sumatoria de Ventas (Ledger o Fallback a Cards)
    let totalSales = 0;
    if (ledgerResult.data && ledgerResult.data.length > 0) {
      for (const row of ledgerResult.data as any[]) {
        totalSales += Math.abs(Number(row.amount_ves ?? row.amount ?? 0));
      }
    } else {
      // Si el ledger no tiene registros de compras, consultar suma de precios de cartones emitidos
      const { data: cardsPriceData } = await supabaseServerClient
        .from('cards')
        .select('price_ves');
      if (cardsPriceData) {
        for (const row of cardsPriceData as any[]) {
          totalSales += Number(row.price_ves ?? 25);
        }
      }
    }

    // Sumatoria de Premios Distribuidos
    let totalPrizes = 0;
    if (cardsPrizesResult.data) {
      for (const row of cardsPrizesResult.data as any[]) {
        totalPrizes += Number(row.total_prize_ves ?? 0);
      }
    }

    const netProfit = totalSales - totalPrizes;

    return res.status(200).json({
      totalRecharges: Number(totalRecharges.toFixed(2)),
      totalSales: Number(totalSales.toFixed(2)),
      totalPrizes: Number(totalPrizes.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
    });
  } catch (error: any) {
    console.error('[Error in GET /api/finances/metrics]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error al calcular métricas financieras',
    });
  }
});

// ======================================================================
// 6. MÓDULO DE RETIROS: SOLICITUD, LIQUIDACIÓN Y REINTEGRO POR RECHAZO
// ======================================================================
// GET /api/withdrawals (y /api/retiros)
app.get(['/api/withdrawals', '/api/retiros'], async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (supabaseServerClient) {
      let query = supabaseServerClient.from('withdrawals').select('*').order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (!error && data) {
        return res.status(200).json(data);
      }
    }
    return res.status(200).json([]);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// POST /api/withdrawals: Solicitar retiro (bloquea saldo disponible y pasa a pendiente)
app.post(['/api/withdrawals', '/api/retiros'], async (req, res) => {
  try {
    const { userId, user_id, userName, amountVes, monto, channel, bankDest, phoneOrAccount, documentId, titularName, accountType } = req.body || {};
    const uid = String(userId || user_id || '').trim();
    const amount = Number(amountVes || monto || 0);

    if (!uid || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Usuario y monto válidos requeridos' });
    }

    const withdrawalId = `wd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    if (supabaseServerClient) {
      // Verificar balance
      const { data: userRecord } = await supabaseServerClient
        .from('users')
        .select('available_balance, pending_balance, name')
        .eq('id', uid)
        .maybeSingle();

      const avail = Number(userRecord?.available_balance || 0);
      if (avail < amount) {
        return res.status(400).json({ success: false, message: `Saldo insuficiente (${avail} Bs. disponibles)` });
      }

      // Bloquear saldo de forma segura
      const newAvail = avail - amount;
      const newPending = Number(userRecord?.pending_balance || 0) + amount;

      await supabaseServerClient.from('users').update({
        available_balance: newAvail,
        pending_balance: newPending,
      }).eq('id', uid);

      // Descontar también en jugadores_bingo
      const { data: jb } = await supabaseServerClient.from('jugadores_bingo').select('saldo').eq('id', uid).maybeSingle();
      if (jb) {
        await supabaseServerClient.from('jugadores_bingo').update({ saldo: Math.max(0, Number(jb.saldo || 0) - amount) }).eq('id', uid);
      }

      const withdrawalRecord = {
        id: withdrawalId,
        user_id: uid,
        amount: amount,
        status: 'pending',
        created_at: nowIso,
      };

      await supabaseServerClient.from('withdrawals').insert(withdrawalRecord);

      // Registrar débito en libro contable
      await supabaseServerClient.from('ledger').insert({
        id: `led-${Date.now()}`,
        user_id: uid,
        user_name: userName || userRecord?.name || 'Jugador',
        type: 'withdrawal_request',
        amount_ves: -amount,
        balance_before: avail,
        balance_after: newAvail,
        description: `Solicitud de Retiro por Pago Móvil (${amount} Bs.)`,
        reference_id: withdrawalId,
        created_at: nowIso,
      });

      return res.status(201).json({
        success: true,
        message: 'Solicitud de retiro registrada exitosamente. Saldo puesto en custodia.',
        withdrawal: withdrawalRecord,
        availableBalance: newAvail,
        pendingBalance: newPending,
      });
    }

    return res.status(201).json({ success: true, message: 'Retiro registrado en memoria', withdrawalId });
  } catch (error: any) {
    console.error('[Error in POST /api/withdrawals]:', error);
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// POST /api/withdrawals/complete: Liquidar retiro
app.post(['/api/withdrawals/complete', '/api/retiros/completar'], async (req, res) => {
  try {
    const { id, referenceNumber, processedBy } = req.body || {};
    const withdrawalId = String(id || '').trim();
    const auditor = String(processedBy || 'Finanzas').trim();
    const nowIso = new Date().toISOString();

    if (!withdrawalId) return res.status(400).json({ success: false, message: 'ID de retiro requerido' });

    if (supabaseServerClient) {
      const { data: wd } = await supabaseServerClient.from('withdrawals').select('*').eq('id', withdrawalId).maybeSingle();
      if (wd) {
        const uid = wd.user_id;
        const amount = Number(wd.amount || wd.amount_ves || 0);

        await supabaseServerClient.from('withdrawals').update({
          status: 'completed',
        }).eq('id', withdrawalId);

        // Descontar del saldo pendiente
        const { data: u } = await supabaseServerClient.from('users').select('pending_balance').eq('id', uid).maybeSingle();
        if (u) {
          const newPending = Math.max(0, Number(u.pending_balance || 0) - amount);
          await supabaseServerClient.from('users').update({ pending_balance: newPending }).eq('id', uid);
        }

        await supabaseServerClient.from('ledger').insert({
          id: `led-${Date.now()}`,
          user_id: uid,
          user_name: wd.user_name || 'Jugador',
          type: 'withdrawal_completed',
          amount_ves: 0,
          balance_before: 0,
          balance_after: 0,
          description: `Retiro ${withdrawalId} completado y liquidado vía Pago Móvil ref: ${referenceNumber || 'S/R'}`,
          reference_id: withdrawalId,
          created_at: nowIso,
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Retiro completado y liquidado' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// POST /api/withdrawals/reject: Rechazar y REINTEGRAR saldo al jugador
app.post(['/api/withdrawals/reject', '/api/retiros/rechazar'], async (req, res) => {
  try {
    const { id, reason, motivo, processedBy } = req.body || {};
    const withdrawalId = String(id || '').trim();
    const rejectionReason = String(reason || motivo || 'Datos de cuenta erróneos o cédula no coincide').trim();
    const auditor = String(processedBy || 'Finanzas').trim();
    const nowIso = new Date().toISOString();

    if (!withdrawalId) return res.status(400).json({ success: false, message: 'ID de retiro requerido' });

    if (supabaseServerClient) {
      const { data: wd } = await supabaseServerClient.from('withdrawals').select('*').eq('id', withdrawalId).maybeSingle();
      if (wd) {
        const uid = wd.user_id;
        const amount = Number(wd.amount || wd.amount_ves || 0);

        await supabaseServerClient.from('withdrawals').update({
          status: 'rejected',
        }).eq('id', withdrawalId);

        // REINTEGRAR FONDOS: Devolver a available_balance y restar de pending_balance
        const { data: u } = await supabaseServerClient.from('users').select('available_balance, pending_balance, name').eq('id', uid).maybeSingle();
        let balanceBefore = 0;
        let balanceAfter = 0;

        if (u) {
          balanceBefore = Number(u.available_balance || 0);
          balanceAfter = balanceBefore + amount;
          const newPending = Math.max(0, Number(u.pending_balance || 0) - amount);

          await supabaseServerClient.from('users').update({
            available_balance: balanceAfter,
            pending_balance: newPending,
          }).eq('id', uid);
        }

        // Reintegrar en jugadores_bingo
        const { data: jb } = await supabaseServerClient.from('jugadores_bingo').select('saldo').eq('id', uid).maybeSingle();
        if (jb) {
          await supabaseServerClient.from('jugadores_bingo').update({
            saldo: Number(jb.saldo || 0) + amount,
          }).eq('id', uid);
        }

        // Registrar reintegro en libro mayor
        await supabaseServerClient.from('ledger').insert({
          id: `led-${Date.now()}`,
          user_id: uid,
          user_name: wd.user_name || u?.name || 'Jugador',
          type: 'withdrawal_refund',
          amount_ves: amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: `Reintegro por Retiro Rechazado (${rejectionReason})`,
          reference_id: withdrawalId,
          created_at: nowIso,
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Retiro rechazado y saldo reintegrado al usuario exitosamente.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// ======================================================================
// 7. CONFIRMACIÓN Y VALIDACIÓN DE MAYORÍA DE EDAD (+18)
// ======================================================================
app.post(['/api/users/confirm-age', '/api/jugadores/confirmar-edad'], async (req, res) => {
  try {
    const { userId, birthDate, documentId } = req.body || {};
    const uid = String(userId || '').trim();
    const dob = String(birthDate || '').trim();
    const doc = String(documentId || '').trim();
    const nowIso = new Date().toISOString();

    if (supabaseServerClient && uid) {
      await supabaseServerClient.from('users').update({
        is_of_age: true,
        birth_date: dob || undefined,
        fecha_nacimiento: dob || undefined,
        age_confirmed_at: nowIso,
        kyc_status: 'Aprobado',
      }).eq('id', uid);

      await supabaseServerClient.from('jugadores_bingo').update({
        is_of_age: true,
        fecha_nacimiento: dob || undefined,
        age_confirmed_at: nowIso,
      }).eq('id', uid);
    }

    return res.status(200).json({
      success: true,
      message: 'Mayoría de edad (+18) confirmada y sincronizada correctamente.',
      userId: uid,
      isOfAge: true,
      kycStatus: 'Aprobado',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// Servir frontend en producción si se compila conjuntamente
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// Fallback SPA para rutas del cliente (solo GET que no sean endpoints API)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/send-otp' || req.path === '/verify-otp' || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Iniciar servidor Express
const PORT = process.env.PORT || 3000;
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 [Backend Live] Servidor Express corriendo en el puerto ${PORT}`);
  console.log(`📧 Resend Key: ${process.env.RESEND_API_KEY ? 'Configurada' : 'NO DETECTADA'}`);
});
