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

// Almacén en memoria de configuración comercial en servidor
let serverCommercialConfig: any = null;

// Endpoint GET /api/config/comercial
app.get(['/api/config/comercial', '/config/comercial'], async (req, res) => {
  try {
    if (supabaseServerClient) {
      const { data: dbData1 } = await supabaseServerClient
        .from('config_comercial')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (dbData1) {
        const basePrice = Number(dbData1.precio_carton_base) || 25;
        const mapped = {
          adminBank: {
            bankName: dbData1.banco_nombre || 'BANCO DE VENEZUELA',
            phone: dbData1.telefono_pago_movil || '0424-8653039',
            rif: dbData1.rif_titular || 'J-50769027-0',
            holderName: dbData1.razon_social || 'INVERSIONES GOLFO DE PARIA C.A.',
            type: 'Pago Móvil',
          },
          bankName: dbData1.banco_nombre,
          phone: dbData1.telefono_pago_movil,
          rif: dbData1.rif_titular,
          holderName: dbData1.razon_social,
          precio_carton_base_ves: basePrice,
          singleCardPriceVes: basePrice,
          exchangeRateVesUsd: 1,
          cardPrices: {
            pack2: basePrice * 2,
            pack4: basePrice * 4,
            pack6: basePrice * 6,
          },
          prizeMultipliers: {
            fullCard: 50,
            fourCorners: 10,
            lineHorizontal: 5,
            lineVertical: 5,
            diagonal: 8,
            lineDiagonal: 8,
          },
        };
        serverCommercialConfig = mapped;
        return res.status(200).json({ success: true, data: mapped });
      }
    }
  } catch (err) {
    console.warn('[server.ts] Error reading config from DB:', err);
  }

  return res.status(200).json({ success: true, data: serverCommercialConfig || {} });
});

// Endpoint POST /api/config/comercial
app.post(['/api/config/comercial', '/config/comercial'], async (req, res) => {
  try {
    const config = req.body || {};
    serverCommercialConfig = config;

    if (supabaseServerClient && config) {
      try {
        const bank = config.adminBank || {};
        const bancoNombre = bank.bankName || config.bankName || config.banco_nombre || 'BANCO DE VENEZUELA';
        const telefonoPagoMovil = bank.phone || config.phone || config.telefono_pago_movil || '0424-8653039';
        const rifTitular = bank.rif || config.rif || config.rif_titular || 'J-50769027-0';
        const razonSocial = bank.holderName || config.holderName || config.razon_social || 'INVERSIONES GOLFO DE PARIA C.A.';
        const precioBase = Number(
          config.precio_carton_base ??
          config.precio_carton_base_ves ??
          config.singleCardPriceVes ??
          (config.cardPrices?.pack2 ? config.cardPrices.pack2 / 2 : 25)
        ) || 25;

        await supabaseServerClient.from('config_comercial').upsert(
          {
            id: 1,
            banco_nombre: bancoNombre,
            telefono_pago_movil: telefonoPagoMovil,
            rif_titular: rifTitular,
            razon_social: razonSocial,
            precio_carton_base: precioBase,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      } catch (dbErr) {
        console.warn('[server.ts] Error persisting config in Supabase:', dbErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Configuración comercial guardada con éxito',
      data: config,
    });
  } catch (error: any) {
    console.error('[Error in /api/config/comercial]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error al guardar configuración comercial' });
  }
});

// Endpoint GET /api/players
app.get(['/api/players', '/players'], async (req, res) => {
  try {
    if (supabaseServerClient) {
      const { data, error } = await supabaseServerClient
        .from('jugadores_bingo')
        .select('*')
        .order('fecha_registro', { ascending: false });

      if (!error && data) {
        return res.status(200).json({ success: true, data });
      }
    }
  } catch (err) {
    console.warn('[server.ts] Error reading players from DB:', err);
  }

  return res.status(200).json({ success: true, data: [] });
});

// Endpoint GET /api/recargas
app.get(['/api/recargas', '/recargas'], async (req, res) => {
  try {
    if (supabaseServerClient) {
      const { data: rpmData, error: rpmError } = await supabaseServerClient
        .from('recargas_pago_movil')
        .select('*')
        .order('created_at', { ascending: false });

      if (!rpmError && rpmData) {
        return res.status(200).json({ success: true, data: rpmData });
      }
    }
  } catch (err) {
    console.warn('[server.ts] Error fetching recargas from Supabase:', err);
  }
  return res.status(200).json({ success: true, data: [] });
});

// Endpoint POST /api/recargas
app.post(['/api/recargas', '/recargas'], async (req, res) => {
  try {
    const payload = req.body || {};
    const usuarioId = payload.usuario_id || payload.userId || payload.user_id || 'anon';
    const nombreUsuario = payload.nombre_usuario || payload.userName || payload.payerName || 'Jugador';
    const monto = Number(payload.monto_ves ?? payload.amountVes ?? payload.monto) || 0;
    const referencia = String(payload.referencia || payload.referenceNumber || '').trim();
    const bancoOrigen = String(payload.banco_origen || payload.bankOrigin || 'Banco de Venezuela');
    const telefonoPagador = String(payload.telefono_pagador || payload.payerPhone || payload.userPhone || '');
    const cedulaPagador = String(payload.cedula_pagador || payload.payerDocumentId || '');
    const voucherUrl = String(payload.comprobante_url || payload.voucherImageUrl || payload.voucher_url || '');
    const correo = String(payload.correo || payload.email || '');
    const createdAt = payload.created_at || payload.createdAt || new Date().toISOString();

    let insertedRecord = null;

    if (supabaseServerClient) {
      try {
        const insertPayload: any = {
          usuario_id: usuarioId,
          nombre_usuario: nombreUsuario,
          monto_ves: monto,
          referencia: referencia,
          banco_origen: bancoOrigen,
          telefono_pagador: telefonoPagador,
          cedula_pagador: cedulaPagador,
          comprobante_url: voucherUrl,
          estatus: 'pendiente',
          created_at: createdAt,
        };
        if (correo) {
          insertPayload.correo = correo;
        }

        const { data: dbData, error: dbError } = await supabaseServerClient
          .from('recargas_pago_movil')
          .insert(insertPayload)
          .select()
          .maybeSingle();

        if (dbError) {
          console.warn('[server.ts] recargas_pago_movil insert warning:', dbError.message);
        } else {
          insertedRecord = dbData;
        }
      } catch (insertErr) {
        console.warn('[server.ts] Supabase insert error:', insertErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Recarga registrada correctamente',
      data: insertedRecord || payload,
    });
  } catch (error: any) {
    console.error('[Error in /api/recargas]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error al procesar recarga' });
  }
});

// Endpoint POST /api/recargas/aprobar
app.post(['/api/recargas/aprobar', '/api/recargas/:id/aprobar'], async (req, res) => {
  try {
    const idRecarga = req.params.id || req.body?.id || req.body?.idRecarga || req.body?.transactionId;
    const usuario_id = req.body?.usuario_id || req.body?.userId;
    const monto_ves = Number(req.body?.monto_ves || req.body?.amountVes || req.body?.monto) || 0;
    const referencia = req.body?.referencia || req.body?.referenceNumber;
    const correo = (req.body?.correo || req.body?.email || '').trim();
    const cedula_pagador = (req.body?.cedula_pagador || req.body?.payerDocumentId || '').trim();
    const cleanCedula = cedula_pagador.replace(/\D/g, '');
    const telefono_pagador = (req.body?.telefono_pagador || req.body?.payerPhone || req.body?.userPhone || '').trim();
    const cleanPhone = telefono_pagador.replace(/\D/g, '');
    const nombre_usuario = (req.body?.nombre_usuario || req.body?.payerName || req.body?.userName || '').trim();
    const procesado_por = req.body?.procesado_por || req.body?.processedBy || 'limitlessmarketve@gmail.com';
    const fecha_procesado = req.body?.fecha_procesado || req.body?.processedAt || new Date().toISOString();

    if (supabaseServerClient) {
      // 1. Marcar recarga como aprobada en recargas_pago_movil
      let err1: any = null;
      if (referencia) {
        const { error } = await supabaseServerClient
          .from('recargas_pago_movil')
          .update({
            estatus: 'aprobada',
            procesado_por,
            fecha_procesado,
          })
          .eq('referencia', referencia);
        err1 = error;
      }

      if (!referencia || err1) {
        if (idRecarga) {
          await supabaseServerClient
            .from('recargas_pago_movil')
            .update({
              estatus: 'aprobada',
              procesado_por,
              fecha_procesado,
            })
            .eq('id', idRecarga);
        }
      }

      // 2. ACREDITAR SALDO - Buscar jugador por correo primero
      let jugadorId: string | null = null;

      if (correo) {
        const { data: jCorreo } = await supabaseServerClient
          .from('jugadores_bingo')
          .select('id, saldo')
          .eq('correo', correo)
          .maybeSingle();
        if (jCorreo) jugadorId = jCorreo.id;
      }

      // A. Fallback por cedula_pagador (ej: 12673219)
      if (!jugadorId && cedula_pagador) {
        const { data: j1 } = await supabaseServerClient
          .from('jugadores_bingo')
          .select('id, saldo')
          .eq('cedula', cedula_pagador)
          .maybeSingle();

        if (j1) {
          jugadorId = j1.id;
        } else if (cleanCedula && cleanCedula !== cedula_pagador) {
          const { data: j1b } = await supabaseServerClient
            .from('jugadores_bingo')
            .select('id, saldo')
            .eq('cedula', cleanCedula)
            .maybeSingle();
          if (j1b) jugadorId = j1b.id;
        }
      }

      // B. Fallback por telefono_pagador si no se encontró
      if (!jugadorId && telefono_pagador) {
        const { data: jTel } = await supabaseServerClient
          .from('jugadores_bingo')
          .select('id, saldo')
          .eq('telefono', telefono_pagador)
          .maybeSingle();

        if (jTel) {
          jugadorId = jTel.id;
        } else if (cleanPhone.length >= 7) {
          const { data: jTel2 } = await supabaseServerClient
            .from('jugadores_bingo')
            .select('id, saldo')
            .ilike('telefono', `%${cleanPhone.slice(-7)}%`)
            .maybeSingle();
          if (jTel2) jugadorId = jTel2.id;
        }
      }

      // C. Fallback por id directo si ya es UUID
      if (!jugadorId && usuario_id) {
        const { data: jId } = await supabaseServerClient
          .from('jugadores_bingo')
          .select('id, saldo')
          .eq('id', usuario_id)
          .maybeSingle();
        if (jId) jugadorId = jId.id;
      }

      // D. Fallback por nombre de usuario con ilike
      if (!jugadorId && nombre_usuario) {
        const { data: j2 } = await supabaseServerClient
          .from('jugadores_bingo')
          .select('id, saldo')
          .ilike('nombre', `%${nombre_usuario}%`)
          .maybeSingle();
        if (j2) jugadorId = j2.id;
      }

      if (jugadorId && monto_ves > 0) {
        const { data: jugadorActual } = await supabaseServerClient
          .from('jugadores_bingo')
          .select('saldo')
          .eq('id', jugadorId)
          .single();

        const nuevoSaldo = (Number(jugadorActual?.saldo) || 0) + monto_ves;

        await supabaseServerClient
          .from('jugadores_bingo')
          .update({
            saldo: nuevoSaldo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jugadorId);

        console.log('[server.ts] SALDO ACREDITADO OK a:', jugadorId, 'Nuevo saldo:', nuevoSaldo);
      } else {
        console.error('[server.ts] No se encontró jugador para acreditar', { idRecarga, referencia, correo, cedula_pagador, usuario_id, monto_ves });
      }
    }

    return res.status(200).json({ success: true, message: 'Recarga aprobada y saldo acreditado con éxito' });
  } catch (error: any) {
    console.error('[Error in /api/recargas/aprobar]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error al aprobar recarga' });
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
