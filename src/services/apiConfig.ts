/**
 * Configuración de API para Tu Súper Cartón / Golfo de Paria
 * Operando 100% con URLs relativas en Render (Frontend y Backend en el mismo origen)
 */

export const API_URL = ''; // vacío, para que use relativo

export const API_ENDPOINTS = {
  SEND_OTP: `${API_URL}/send-otp`,
  VERIFY_OTP: `${API_URL}/verify-otp`,
  HEALTH: `${API_URL}/health`,
  AUTH_SEND_RECOVERY: `${API_URL}/api/auth/send-recovery-code`,
  AUTH_VERIFY_RECOVERY: `${API_URL}/api/auth/verify-recovery-code`,
};

export default API_URL;
