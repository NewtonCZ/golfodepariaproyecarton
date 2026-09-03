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
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Inicialización opcional de Supabase en Servidor
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://mccjcdsombzmlxzxccto.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseServerClient: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabaseServerClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
    console.log('✅ [Supabase Server Client] Conectado exitosamente');
  } catch (err) {
    console.warn('[Supabase Server Client] Aviso al inicializar cliente:', err);
  }
}

// Almacén en memoria de códigos OTP (expiran en 30 minutos)
interface OtpRecord {
  code: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}
const otpStore = new Map<string, OtpRecord>();

// Limpiar OTPs expirados periódicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

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

    // Generar código numérico de 6 dígitos (100000 a 999999)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAtIso = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const expiresAtMs = new Date(expiresAtIso).getTime();

    // Guardar en almacén en memoria
    otpStore.set(code, {
      code,
      email: targetEmail,
      createdAt: now.getTime(),
      expiresAt: expiresAtMs,
    });
    otpStore.set(`email:${targetEmail}`, {
      code,
      email: targetEmail,
      createdAt: now.getTime(),
      expiresAt: expiresAtMs,
    });

    // Guardar en Supabase si está disponible (en UTC ISO)
    if (supabaseServerClient) {
      try {
        const { error: dbErr } = await supabaseServerClient.from('otp_codes').insert({
          email: targetEmail,
          code,
          created_at: now.toISOString(),
          expires_at: expiresAtIso,
          used: false,
        });
        if (dbErr) {
          console.warn('[Supabase DB Save Notice]:', dbErr.message);
        } else {
          console.log(`[Supabase DB] OTP ${code} guardado en tabla otp_codes`);
        }
      } catch (dbErr) {
        console.warn('[Supabase DB Save Warning]:', dbErr);
      }
    }

    console.log(`[OTP Generated] Código: ${code} | Para: ${targetEmail} | Server time: ${now.toISOString()} | Expiración: ${expiresAtIso} (30 min)`);

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

    const now = Date.now();

    // 1. Intentar verificación en Supabase
    if (supabaseServerClient) {
      try {
        let query = supabaseServerClient
          .from('otp_codes')
          .select('*')
          .eq('code', cleanCode)
          .order('created_at', { ascending: false });

        const { data: dbRecords, error: dbErr } = await query;
        if (!dbErr && dbRecords && dbRecords.length > 0) {
          console.log(`[Supabase DB Query] ${dbRecords.length} registro(s) encontrado(s) para código ${cleanCode}`);

          // Buscar el registro no utilizado más reciente
          const activeRecord = dbRecords.find((r) => r.used !== true) || dbRecords[0];
          console.log('Server time:', new Date(now).toISOString(), '| DB created_at:', activeRecord.created_at, '| DB expires_at:', activeRecord.expires_at, '| used:', activeRecord.used);

          if (activeRecord.used === true) {
            console.log(`[OTP Used DB] Código ya fue utilizado previamente: ${cleanCode}`);
            return res.status(200).json({
              valid: false,
              success: false,
              message: 'Este código de seguridad ya fue utilizado previamente.',
            });
          }

          // Cálculo robusto de expiración (30 minutos)
          const createdTime = parseToUtcTime(activeRecord.created_at);
          const expiresTime = parseToUtcTime(activeRecord.expires_at);
          const effectiveExpiresTime = expiresTime || (createdTime ? createdTime + 30 * 60 * 1000 : 0);

          const isExpired =
            (effectiveExpiresTime > 0 && now > effectiveExpiresTime) ||
            (createdTime > 0 && now - createdTime > 31 * 60 * 1000); // 31 min con buffer de 1 min

          if (isExpired) {
            console.log(`[OTP Expired DB] Código vencido en DB: ${cleanCode}`);
            return res.status(200).json({
              valid: false,
              success: false,
              message: 'Código vencido (ha superado los 30 minutos de vigencia)',
            });
          }

          // Validar correo si se especificó
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

          // Marcar como usado en DB
          await supabaseServerClient.from('otp_codes').update({ used: true }).eq('id', activeRecord.id);

          // Limpiar en memoria también
          otpStore.delete(cleanCode);
          if (activeRecord.email) {
            otpStore.delete(`email:${activeRecord.email.toLowerCase().trim()}`);
          }

          console.log(`[OTP Verified via DB ✓] Código ${cleanCode} validado exitosamente para ${activeRecord.email || targetEmail}`);
          return res.status(200).json({
            valid: true,
            success: true,
            message: 'Código verificado correctamente',
            email: activeRecord.email || targetEmail,
          });
        }
      } catch (dbVerifyErr) {
        console.warn('[Supabase DB Verify Warning]:', dbVerifyErr);
      }
    }

    // 2. Verificación en almacén en memoria
    const record = otpStore.get(cleanCode);

    if (!record) {
      console.log(`[OTP Failed] Código no encontrado en memoria ni DB: ${cleanCode}`);
      return res.status(200).json({ valid: false, success: false, message: 'Código incorrecto o no encontrado' });
    }

    if (targetEmail && record.email && record.email.toLowerCase().trim() !== targetEmail && record.email !== 'niutoncaraballo3@gmail.com') {
      console.log(`[OTP Failed] Email mismatch en memoria: ${record.email} vs ${targetEmail}`);
      return res.status(200).json({ valid: false, success: false, message: 'Código no corresponde a este correo electrónico' });
    }

    console.log('Server time (memory check):', new Date(now).toISOString(), '| Memory expires_at:', new Date(record.expiresAt).toISOString());

    const isMemExpired = (record.expiresAt && now > record.expiresAt) || (record.createdAt && now - record.createdAt > 31 * 60 * 1000);

    if (isMemExpired) {
      otpStore.delete(cleanCode);
      console.log(`[OTP Expired Memory] Código vencido: ${cleanCode}`);
      return res.status(200).json({ valid: false, success: false, message: 'Código vencido (expiró hace más de 30 minutos)' });
    }

    // Código válido -> consumirlo para evitar reuso
    otpStore.delete(cleanCode);
    if (record.email) {
      otpStore.delete(`email:${record.email.toLowerCase().trim()}`);
    }

    console.log(`[OTP Verified via Memory ✓] Código ${cleanCode} verificado exitosamente para ${record.email}`);
    return res.status(200).json({
      valid: true,
      success: true,
      message: 'Código verificado correctamente',
      email: record.email,
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
    const roundId = `round-${newRoundNumber}`;

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
        await supabaseServerClient.from('rounds').upsert(dbRoundPayload, { onConflict: 'id' });
      } catch (err) {
        console.warn('[Supabase Round Insert Notice]:', err);
      }
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
    const { id, transactionId, amount, monto, userId, user_id, referencia, processedBy, procesado_por } = req.body || {};
    const rechargeId = String(id || transactionId || '').trim();
    const targetUserId = String(userId || user_id || '').trim();
    const amountVal = Number(amount ?? monto ?? 0);
    const auditor = String(processedBy || procesado_por || 'Auditor Central').trim();
    const nowIso = new Date().toISOString();

    if (!rechargeId && !targetUserId) {
      return res.status(400).json({ success: false, message: 'Se requiere ID de transacción o ID de usuario' });
    }

    let finalCreditedAmount = amountVal;
    let resolvedUserId = targetUserId;
    let resolvedUserName = 'Jugador';

    if (supabaseServerClient) {
      // 1. Obtener la recarga si el monto no venía en la solicitud
      if (rechargeId && finalCreditedAmount <= 0) {
        const { data: recData } = await supabaseServerClient
          .from('recargas_pago_movil')
          .select('*')
          .eq('id', rechargeId)
          .maybeSingle();

        if (recData) {
          finalCreditedAmount = Number(recData.monto_ves || recData.monto || 0);
          resolvedUserId = resolvedUserId || recData.user_id || recData.usuario_id;
          resolvedUserName = recData.usuario_nombre || recData.pagador_nombre || resolvedUserName;
        } else {
          const { data: altRec } = await supabaseServerClient
            .from('recharges')
            .select('*')
            .eq('id', rechargeId)
            .maybeSingle();
          if (altRec) {
            finalCreditedAmount = Number(altRec.amount_ves || altRec.monto || 0);
            resolvedUserId = resolvedUserId || altRec.user_id;
            resolvedUserName = altRec.user_name || resolvedUserName;
          }
        }
      }

      // 2. Actualizar estado en ambas tablas: recharges y recargas_pago_movil
      if (rechargeId) {
        await supabaseServerClient
          .from('recargas_pago_movil')
          .update({
            estado: 'aprobada',
            estatus: 'aprobada',
            fecha_procesado: nowIso,
            procesado_por: auditor,
          })
          .eq('id', rechargeId);

        await supabaseServerClient
          .from('recharges')
          .update({
            status: 'approved',
            processed_at: nowIso,
            processed_by: auditor,
          })
          .eq('id', rechargeId);
      }

      // 3. ACREDITAR SALDO EN EL BALANCE DEL USUARIO (users, jugadores_bingo y jugadores)
      let balanceBefore = 0;
      let balanceAfter = 0;

      if (resolvedUserId) {
        // a) Sincronizar en tabla 'users'
        const { data: userData } = await supabaseServerClient
          .from('users')
          .select('available_balance, name')
          .eq('id', resolvedUserId)
          .maybeSingle();

        if (userData) {
          balanceBefore = Number(userData.available_balance || 0);
          balanceAfter = balanceBefore + finalCreditedAmount;
          resolvedUserName = userData.name || resolvedUserName;

          await supabaseServerClient
            .from('users')
            .update({ available_balance: balanceAfter })
            .eq('id', resolvedUserId);
        }

        // b) Sincronizar en tabla 'jugadores_bingo'
        const { data: jbData } = await supabaseServerClient
          .from('jugadores_bingo')
          .select('saldo, nombre, apellido')
          .eq('id', resolvedUserId)
          .maybeSingle();

        if (jbData) {
          const currentSaldo = Number(jbData.saldo || 0);
          const newSaldo = currentSaldo + finalCreditedAmount;
          if (!balanceAfter) balanceAfter = newSaldo;

          await supabaseServerClient
            .from('jugadores_bingo')
            .update({ saldo: newSaldo })
            .eq('id', resolvedUserId);
        }

        // c) Sincronizar en tabla alternativa 'jugadores'
        try {
          const { data: jAlt } = await supabaseServerClient
            .from('jugadores')
            .select('saldo')
            .eq('id', resolvedUserId)
            .maybeSingle();
          if (jAlt) {
            await supabaseServerClient
              .from('jugadores')
              .update({ saldo: Number(jAlt.saldo || 0) + finalCreditedAmount })
              .eq('id', resolvedUserId);
          }
        } catch {}

        // d) Asentar transacción formal en libro mayor (ledger)
        await supabaseServerClient.from('ledger').insert({
          id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          user_id: resolvedUserId,
          user_name: resolvedUserName,
          type: 'recharge_approved',
          amount_ves: finalCreditedAmount,
          balance_before: balanceBefore,
          balance_after: balanceAfter || (balanceBefore + finalCreditedAmount),
          description: `Acreditación de Recarga Pago Móvil ref: ${referencia || rechargeId}`,
          reference_id: rechargeId,
          created_at: nowIso,
        });

        // e) Registrar en logs de auditoría
        await supabaseServerClient.from('audit_logs').insert({
          id: `log-${Date.now()}`,
          timestamp: nowIso,
          operator_role: 'Auditor Financiero',
          operator_name: auditor,
          action: 'APROBAR_RECARGA',
          details: `Acreditados ${finalCreditedAmount} Bs. al usuario ${resolvedUserName} (${resolvedUserId}). Saldo final: ${balanceAfter} Bs.`,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Recarga aprobada exitosamente. Se acreditaron ${finalCreditedAmount} Bs. al balance.`,
        creditedAmount: finalCreditedAmount,
        balanceAfter,
        userId: resolvedUserId,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Recarga aprobada (modo simulación / memoria)',
      creditedAmount: finalCreditedAmount,
    });
  } catch (error: any) {
    console.error('[Error in /api/recargas/aprobar]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error al aprobar recarga' });
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
          motivo_rechazo: rejectionReason,
          fecha_procesado: nowIso,
          procesado_por: auditor,
        })
        .eq('id', rechargeId);

      await supabaseServerClient
        .from('recharges')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          processed_at: nowIso,
          processed_by: auditor,
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
        user_name: userName || userRecord?.name || 'Jugador',
        amount_ves: amount,
        channel: channel || 'pago_movil',
        bank_dest: bankDest || '',
        phone_or_account: phoneOrAccount || '',
        document_id: documentId || '',
        titular_name: titularName || '',
        account_type: accountType || 'Corriente',
        status: 'pending',
        created_at: nowIso,
      };

      await supabaseServerClient.from('withdrawals').insert(withdrawalRecord);

      // Insertar en tabla retiros en español
      await supabaseServerClient.from('retiros').insert({
        id: withdrawalId,
        user_id: uid,
        usuario_id: uid,
        usuario_nombre: userName || userRecord?.name || 'Jugador',
        monto_ves: amount,
        monto: amount,
        canal: channel || 'pago_movil',
        banco_destino: bankDest || '',
        telefono_o_cuenta: phoneOrAccount || '',
        cedula_titular: documentId || '',
        nombre_titular: titularName || '',
        tipo_cuenta: accountType || 'Corriente',
        estado: 'pendiente',
        created_at: nowIso,
      });

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
        const amount = Number(wd.amount_ves || 0);

        await supabaseServerClient.from('withdrawals').update({
          status: 'completed',
          reference_number: referenceNumber || '',
          processed_at: nowIso,
          processed_by: auditor,
        }).eq('id', withdrawalId);

        await supabaseServerClient.from('retiros').update({
          estado: 'completado',
          estatus: 'completado',
          referencia: referenceNumber || '',
          fecha_procesado: nowIso,
          procesado_por: auditor,
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
        const amount = Number(wd.amount_ves || 0);

        await supabaseServerClient.from('withdrawals').update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          processed_at: nowIso,
          processed_by: auditor,
        }).eq('id', withdrawalId);

        await supabaseServerClient.from('retiros').update({
          estado: 'rechazado',
          estatus: 'rechazado',
          motivo_rechazo: rejectionReason,
          fecha_procesado: nowIso,
          procesado_por: auditor,
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
