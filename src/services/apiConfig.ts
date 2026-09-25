import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';

/**
 * Unified API Configuration for Tu Súper Cartón
 */

export const getApiBaseUrl = (): string => {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};
  const envUrl = metaEnv.VITE_API_URL || (typeof process !== 'undefined' && process.env?.VITE_API_URL);

  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/$/, '');
  }

  return '';
};

export const API_ENDPOINTS = {
  // ✅ Supabase Edge Functions (backend real)
  AUTH_SEND_RECOVERY: `${SUPABASE_URL}/functions/v1/send-otp`,
  AUTH_VERIFY_RECOVERY: `${SUPABASE_URL}/functions/v1/verify-otp`,
  AUTH_RESET_PASSWORD: `${SUPABASE_URL}/functions/v1/reset-password`,

  // Legacy / compatibilidad
  SEND_OTP: `${SUPABASE_URL}/functions/v1/send-otp`,
  VERIFY_OTP: `${SUPABASE_URL}/functions/v1/verify-otp`,
  SUPABASE_SEND_OTP: `${SUPABASE_URL}/functions/v1/send-otp`,
  SUPABASE_VERIFY_OTP: `${SUPABASE_URL}/functions/v1/verify-otp`,

  HEALTH: `${getApiBaseUrl()}/health`,
};

export const getSupabaseFunctionHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (SUPABASE_ANON_KEY) {
    headers['apikey'] = SUPABASE_ANON_KEY;
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  return headers;
};
