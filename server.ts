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
        await supabaseServerClient.from('otp_codes').insert({
          email: targetEmail,
          code,
          created_at: now.toISOString(),
          expires_at: expiresAtIso,
          used: false,
        });
      } catch (dbErr) {
        console.warn('[Supabase DB Save Warning]:', dbErr);
      }
    }

    console.log(`[OTP Generated] Código ${code} para ${targetEmail} | Server time: ${now.toISOString()} | expires_at: ${expiresAtIso}`);

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
    const { code, email } = req.body || {};
    const cleanCode = (code || '').toString().trim();
    const targetEmail = email ? email.toString().toLowerCase().trim() : '';

    if (!cleanCode || cleanCode.length !== 6) {
      return res.status(400).json({ valid: false, message: 'El código debe tener 6 dígitos' });
    }

    // 1. Intentar verificación en Supabase (evalúa expiración en JS para evitar problemas de timezone en DB)
    if (supabaseServerClient) {
      try {
        let query = supabaseServerClient
          .from('otp_codes')
          .select('*')
          .eq('code', cleanCode)
          .order('created_at', { ascending: false })
          .limit(1);

        if (targetEmail) {
          query = query.eq('email', targetEmail);
        }

        const { data: dbRecords, error: dbErr } = await query;
        if (!dbErr && dbRecords && dbRecords.length > 0) {
          const row = dbRecords[0];
          console.log('Server time', new Date().toISOString(), 'expires_at DB', row.expires_at);

          // Verificar si ya fue utilizado
          if (row.used === true) {
            console.log(`[OTP Used DB] Código ya fue utilizado anteriormente: ${cleanCode}`);
            return res.status(200).json({
              valid: false,
              message: 'Código de seguridad ya fue utilizado previamente',
            });
          }

          // Comparación de expiración en JS
          const dbExpiresAt = new Date(row.expires_at);
          if (isNaN(dbExpiresAt.getTime()) || dbExpiresAt < new Date()) {
            console.log(`[OTP Expired DB] Código vencido en DB: ${cleanCode}, expires_at DB: ${row.expires_at}`);
            return res.status(200).json({
              valid: false,
              message: 'Código vencido (expiró hace más de 30 minutos)',
            });
          }

          // Marcar como usado
          await supabaseServerClient.from('otp_codes').update({ used: true }).eq('id', row.id);

          // Limpiar también en memoria
          otpStore.delete(cleanCode);
          if (row.email) {
            otpStore.delete(`email:${row.email.toLowerCase().trim()}`);
          }

          console.log(`[OTP Verified via DB ✓] Código ${cleanCode} verificado para ${row.email}`);
          return res.status(200).json({
            valid: true,
            success: true,
            message: 'Código verificado correctamente',
            email: row.email,
          });
        }
      } catch (dbVerifyErr) {
        console.warn('[Supabase DB Verify Warning]:', dbVerifyErr);
      }
    }

    // 2. Verificación en almacén en memoria
    const record = otpStore.get(cleanCode);

    if (!record) {
      console.log(`[OTP Failed] Código no encontrado: ${cleanCode}`);
      return res.status(200).json({ valid: false, message: 'Código incorrecto o no encontrado' });
    }

    if (targetEmail && record.email && record.email.toLowerCase().trim() !== targetEmail) {
      console.log(`[OTP Failed] Email mismatch: ${record.email} vs ${targetEmail}`);
      return res.status(200).json({ valid: false, message: 'Código no corresponde a este correo' });
    }

    const currentServerTime = Date.now();
    console.log('Server time (memory check)', new Date(currentServerTime).toISOString(), 'expires_at memory', new Date(record.expiresAt).toISOString());

    if (currentServerTime > record.expiresAt) {
      otpStore.delete(cleanCode);
      console.log(`[OTP Expired Memory] Código vencido: ${cleanCode}`);
      return res.status(200).json({ valid: false, message: 'Código vencido (expiró hace más de 30 minutos)' });
    }

    // Código válido -> consumirlo para evitar reuso
    otpStore.delete(cleanCode);
    if (record.email) {
      otpStore.delete(`email:${record.email.toLowerCase().trim()}`);
    }

    console.log(`[OTP Verified ✓] Código ${cleanCode} verificado exitosamente para ${record.email}`);
    return res.status(200).json({
      valid: true,
      success: true,
      message: 'Código verificado correctamente',
      email: record.email,
    });
  } catch (error: any) {
    console.error('[Error in /verify-otp]:', error);
    return res.status(500).json({ valid: false, error: error?.message || 'Error interno al verificar código' });
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
