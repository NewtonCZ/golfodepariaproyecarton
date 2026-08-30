import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS Totalmente Permisivo para producción y desarrollo
const allowedOrigins = [
  'http://www.golfodepariaproyecarton.com',
  'https://www.golfodepariaproyecarton.com',
  'http://golfodepariaproyecarton.com',
  'https://golfodepariaproyecarton.com',
  'https://golfodepariaproyecarton.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permitir llamadas sin origin (curl, server-to-server, scripts, apps móviles)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.includes('golfodepariaproyecarton') ||
      origin.includes('vercel.app') ||
      origin.includes('onrender.com') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    // Permisivo por defecto para evitar bloqueos CORS
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

app.use(cors(corsOptions));
// REGLA CRÍTICA: Preflight handler explícito para TODAS las rutas
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Almacén en memoria de códigos OTP (expiran en 10 minutos)
interface OtpRecord {
  code: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}
const otpStore = new Map<string, OtpRecord>();

// Limpiar OTPs expirados cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Helper para enviar correo con Resend
async function sendResendOtpEmail(toEmail: string, otpCode: string, contextTitle: string = 'Código de Verificación'): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const fromEmail = (process.env.EMAIL_FROM || 'TÚ SUPERCARTÓN <onboarding@resend.dev>').trim();

  console.log(`[Resend Engine] Intentando enviar OTP (${otpCode}) a: ${toEmail}`);
  console.log(`[Resend Engine] Remitente: ${fromEmail}`);
  console.log(`[Resend Engine] Key configurada: ${apiKey ? apiKey.substring(0, 7) + '...' : 'NO CONFIGURADA'}`);

  if (!apiKey || !apiKey.startsWith('re_')) {
    const msg = 'RESEND_API_KEY no está configurada o no empieza con "re_". Revisa Render > Environment.';
    console.error(`[Resend Error] ${msg}`);
    return { success: false, error: msg };
  }

  // Nota: onboarding@resend.dev en cuenta gratuita solo puede entregar correos al email verificado del propietario
  const targetEmail = toEmail || 'niutoncaraballo3@gmail.com';

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
          Este código es personal e intransferible. Vence en <strong>10 minutos</strong>.
        </p>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
          Si no solicitaste este código, puedes ignorar este mensaje de forma segura.
        </p>
      </div>
    </body>
    </html>
  `;

  try {
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
        text: `Tu código de seguridad para Tu Súper Cartón es: ${otpCode}. Vence en 10 minutos.`,
      }),
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      console.error('[Resend API Error Response]:', response.status, data);
      return { success: false, error: data?.message || `Error de Resend (${response.status})` };
    }

    console.log(`[Resend Success] Email entregado a Resend con ID: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('[Resend Network Error]:', err);
    return { success: false, error: err?.message || 'Error de conexión con Resend' };
  }
}

// ----------------------------------------------------------------------
// RUTAS DEL SERVIDOR
// ----------------------------------------------------------------------

// 1. Healthcheck
app.get(['/health', '/api/health', '/ping'], (req, res) => {
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
  try {
    const { email, user, pack, amountVes } = req.body || {};
    const targetEmail = (email || 'niutoncaraballo3@gmail.com').trim().toLowerCase();

    // Generar código numérico de 6 dígitos (100000 a 999999)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutos

    // Guardar en almacén
    otpStore.set(code, { code, email: targetEmail, createdAt: now, expiresAt });
    // También guardar por email para búsquedas
    otpStore.set(`email:${targetEmail}`, { code, email: targetEmail, createdAt: now, expiresAt });

    console.log(`[OTP Generated] Código ${code} para ${targetEmail}`);

    const emailRes = await sendResendOtpEmail(
      targetEmail,
      code,
      pack ? `Compra de ${pack} Cartones (${amountVes || 0} Bs.)` : 'Autorización de Seguridad'
    );

    if (!emailRes.success) {
      // Si falla Resend, retornamos advertencia pero no rompemos el flujo en desarrollo
      console.warn(`[OTP Warning] No se pudo enviar email vía Resend: ${emailRes.error}`);
      return res.status(200).json({
        success: true,
        sent: false,
        message: `Código generado. (Aviso de correo: ${emailRes.error})`,
        email: targetEmail,
        // Solo como fallback en caso de testing
        debugCode: process.env.NODE_ENV !== 'production' ? code : undefined,
      });
    }

    return res.status(200).json({
      success: true,
      sent: true,
      message: `Código de seguridad enviado a ${targetEmail}`,
      email: targetEmail,
    });
  } catch (error: any) {
    console.error('[Error in /send-otp]:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error interno al generar código OTP' });
  }
});

// 3. Ruta /verify-otp (y alias)
app.post(['/verify-otp', '/api/verify-otp', '/api/auth/verify-recovery-code'], (req, res) => {
  try {
    const { code, email } = req.body || {};
    const cleanCode = (code || '').toString().trim();

    if (!cleanCode || cleanCode.length !== 6) {
      return res.status(400).json({ valid: false, message: 'El código debe tener 6 dígitos' });
    }

    const record = otpStore.get(cleanCode);

    if (!record) {
      console.log(`[OTP Failed] Código no encontrado: ${cleanCode}`);
      return res.status(200).json({ valid: false, message: 'Código incorrecto o no encontrado' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanCode);
      console.log(`[OTP Expired] Código vencido: ${cleanCode}`);
      return res.status(200).json({ valid: false, message: 'Código vencido (expiró hace más de 10 minutos)' });
    }

    // Código válido -> consumirlo para evitar reuso
    otpStore.delete(cleanCode);
    if (record.email) {
      otpStore.delete(`email:${record.email}`);
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

// Iniciar servidor Express
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 [Backend Live] Servidor Express corriendo en el puerto ${PORT}`);
  console.log(`📡 CORS configurado para: https://www.golfodepariaproyecarton.com`);
  console.log(`📧 Resend Key: ${process.env.RESEND_API_KEY ? 'Presente (re_...)' : 'NO DETECTADA'}`);
});
