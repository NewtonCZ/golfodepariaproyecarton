/**
 * Backend Email Service for TÚ SUPERCARTÓN
 * Supports plug-and-play dispatch via Resend, SendGrid, or Console fallback.
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  provider: 'resend' | 'sendgrid' | 'console' | 'none';
  messageId?: string;
  error?: string;
}

export interface PasswordRecoveryEmailParams {
  to: string;
  userName?: string;
  recoveryCode: string;
  resetToken?: string;
  appUrl?: string;
  expiresInMinutes?: number;
}

export interface PasswordChangedEmailParams {
  to: string;
  userName?: string;
  dateStr?: string;
  ipAddress?: string;
}

/**
 * Reads email configuration from environment variables
 */
export function getEmailConfig() {
  const provider = (process.env.EMAIL_PROVIDER || 'auto').toLowerCase();
  const resendApiKey = process.env.RESEND_API_KEY || '';
  const sendgridApiKey = process.env.SENDGRID_API_KEY || '';
  const emailFrom =
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    process.env.SENDGRID_FROM ||
    'TÚ SUPERCARTÓN <onboarding@resend.dev>';

  // Determine active provider
  let activeProvider: 'resend' | 'sendgrid' | 'console' = 'console';
  if (provider === 'resend' && resendApiKey) {
    activeProvider = 'resend';
  } else if (provider === 'sendgrid' && sendgridApiKey) {
    activeProvider = 'sendgrid';
  } else if (provider === 'auto') {
    if (resendApiKey) {
      activeProvider = 'resend';
    } else if (sendgridApiKey) {
      activeProvider = 'sendgrid';
    }
  }

  return {
    provider: activeProvider,
    resendApiKey,
    sendgridApiKey,
    emailFrom,
    isConfigured: activeProvider !== 'console',
  };
}

/**
 * Core generic email dispatcher
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const config = getEmailConfig();
  const from = options.from || config.emailFrom;

  // 1. Dispatch via RESEND (https://resend.com)
  if (config.provider === 'resend' && config.resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
        }),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        console.error('[EmailService:Resend Error]', data);
        return {
          success: false,
          provider: 'resend',
          error: data?.message || 'Error al enviar correo vía Resend',
        };
      }

      console.log(`[EmailService:Resend Success] Email enviado a ${options.to} (ID: ${data.id})`);
      return {
        success: true,
        provider: 'resend',
        messageId: data.id,
      };
    } catch (err: any) {
      console.error('[EmailService:Resend Exception]', err);
      return {
        success: false,
        provider: 'resend',
        error: err?.message || 'Fallo de conexión con la API de Resend',
      };
    }
  }

  // 2. Dispatch via SENDGRID (https://sendgrid.com)
  if (config.provider === 'sendgrid' && config.sendgridApiKey) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: options.to }],
              subject: options.subject,
            },
          ],
          from: {
            email: from.includes('<') ? from.split('<')[1].replace('>', '').trim() : from,
            name: from.includes('<') ? from.split('<')[0].trim() : 'TÚ SUPERCARTÓN',
          },
          content: [
            {
              type: 'text/html',
              value: options.html,
            },
          ],
        }),
      });

      if (!response.ok && response.status !== 202) {
        const errorText = await response.text();
        console.error('[EmailService:SendGrid Error]', errorText);
        return {
          success: false,
          provider: 'sendgrid',
          error: `Error SendGrid (${response.status}): ${errorText}`,
        };
      }

      console.log(`[EmailService:SendGrid Success] Email enviado a ${options.to}`);
      return {
        success: true,
        provider: 'sendgrid',
      };
    } catch (err: any) {
      console.error('[EmailService:SendGrid Exception]', err);
      return {
        success: false,
        provider: 'sendgrid',
        error: err?.message || 'Fallo de conexión con la API de SendGrid',
      };
    }
  }

  // 3. Console & Dev Fallback (when no external API key is provided)
  console.log('===========================================================');
  console.log('[EmailService: Dev / Demo Simulation Mode]');
  console.log(`To: ${options.to}`);
  console.log(`From: ${from}`);
  console.log(`Subject: ${options.subject}`);
  console.log('--- HTML Preview Snippet ---');
  console.log(options.text || options.html.substring(0, 300) + '...');
  console.log('💡 Tip: Configura RESEND_API_KEY en tus variables de entorno para envío real vía Resend.');
  console.log('===========================================================');

  return {
    success: true,
    provider: 'console',
    messageId: `dev-${Date.now()}`,
  };
}

/**
 * Builds and sends the official Password Recovery email
 */
export async function sendPasswordRecoveryEmail(params: PasswordRecoveryEmailParams): Promise<SendEmailResult> {
  const {
    to,
    userName = 'Estimado/a Usuario',
    recoveryCode,
    resetToken,
    appUrl = process.env.APP_URL || 'https://tusupercarton.com',
    expiresInMinutes = 15,
  } = params;

  const subject = `🔐 Código de Recuperación de Contraseña: ${recoveryCode} - TÚ SUPERCARTÓN`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperación de Contraseña</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" max-width="560" style="max-width: 560px; background: linear-gradient(180deg, #131b2e 0%, #0f172a 100%); border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid #312e81;">
              <table align="center" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #f59e0b 0%, #eab308 100%); border-radius: 12px; padding: 8px 14px; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px;">
                    🍍 TÚ SUPERCARTÓN
                  </td>
                </tr>
              </table>
              <h2 style="margin: 18px 0 0 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                Restablecimiento de Contraseña
              </h2>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #cbd5e1; line-height: 1.6;">
                Hola <strong style="color: #ffffff;">${userName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                Hemos recibido una solicitud para restablecer la contraseña de acceso a tu cuenta en <strong style="color: #fbbf24;">TÚ SUPERCARTÓN</strong>. Utiliza el siguiente código de verificación de 6 dígitos para continuar:
              </p>

              <!-- Verification Code Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <div style="background: #020617; border: 2px dashed #0284c7; border-radius: 16px; padding: 20px; display: inline-block; min-width: 240px; box-shadow: 0 0 25px rgba(2, 132, 199, 0.25);">
                      <span style="display: block; font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                        Código de Seguridad
                      </span>
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; color: #fde047; letter-spacing: 8px; text-shadow: 0 0 10px rgba(253, 224, 71, 0.4);">
                        ${recoveryCode}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="background: rgba(30, 41, 59, 0.6); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin: 24px 0 20px 0;">
                <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                  ⏱️ <strong>Validez:</strong> Este código expira en <strong>${expiresInMinutes} minutos</strong>.<br/>
                  🛡️ <strong>Seguridad:</strong> Nunca compartas este código con nadie. Nuestro personal nunca te pedirá tu código por mensaje.
                </p>
              </div>

              <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Si tú no realizaste esta solicitud, puedes ignorar este correo de forma segura. Tu contraseña actual no cambiará hasta que ingreses este código.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 32px 32px; background: #090d16; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b;">
                ¿Necesitas ayuda inmediata? Visita nuestro soporte 24/7 en Telegram:
              </p>
              <a href="https://t.me/TuSuperCartonSoporte" style="display: inline-block; font-size: 12px; font-weight: 700; color: #38bdf8; text-decoration: none; border: 1px solid #0284c7; padding: 6px 14px; border-radius: 8px;">
                💬 Soporte Oficial Telegram
              </a>
              <p style="margin: 18px 0 0 0; font-size: 11px; color: #475569;">
                © ${new Date().getFullYear()} TÚ SUPERCARTÓN. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `Hola ${userName},\n\nTu código de recuperación para TÚ SUPERCARTÓN es: ${recoveryCode}\n\nEste código expira en ${expiresInMinutes} minutos.\nSi no solicitaste este código, puedes ignorar este mensaje.\n\nSoporte: https://t.me/TuSuperCartonSoporte`;

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}

/**
 * Builds and sends a security confirmation email after password reset
 */
export async function sendPasswordChangedEmail(params: PasswordChangedEmailParams): Promise<SendEmailResult> {
  const {
    to,
    userName = 'Usuario',
    dateStr = new Date().toLocaleString('es-VE'),
    ipAddress = 'Detectada por el servidor',
  } = params;

  const subject = `✅ Tu contraseña ha sido actualizada - TÚ SUPERCARTÓN`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Contraseña Actualizada</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 540px; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px;">
          <tr>
            <td>
              <h2 style="color: #10b981; margin: 0 0 16px 0; font-size: 20px;">
                ✅ Contraseña Actualizada Exitosamente
              </h2>
              <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                Hola <strong>${userName}</strong>,<br/><br/>
                Te confirmamos que la contraseña de tu cuenta en <strong>TÚ SUPERCARTÓN</strong> ha sido cambiada el <strong>${dateStr}</strong>.
              </p>
              <div style="background: #020617; border: 1px solid #334155; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 12px; color: #94a3b8;">
                • Dispositivo / IP: <strong>${ipAddress}</strong><br/>
                • Estado: <strong>Contraseña segura activa</strong>
              </div>
              <p style="color: #ef4444; font-size: 12px;">
                Si no fuiste tú quien realizó este cambio, contacta de urgencia a nuestro soporte en <a href="https://t.me/TuSuperCartonSoporte" style="color: #38bdf8;">@TuSuperCartonSoporte</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
}
