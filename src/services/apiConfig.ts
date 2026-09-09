import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';

/**
 * Unified API Configuration for Tu Súper Cartón / Golfo de Paria
 * Dynamically resolves backend base URL with priority:
 * 1. import.meta.env.VITE_API_URL (Render URL on Vercel / Production)
 * 2. Fallback to https://golfodepariaproyecarton.onrender.com
 */

export const getApiBaseUrl = (): string => {
  // If running in browser, use relative base url so requests route directly to the local server
  if (typeof window !== 'undefined') {
    return '';
  }

  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};
  const envUrl = metaEnv.VITE_API_URL || (typeof process !== 'undefined' && process.env?.VITE_API_URL);

  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '' && !envUrl.includes('onrender.com')) {
    return envUrl.trim().replace(/\/$/, '');
  }

  return '';
};

export const API_ENDPOINTS = {
  SEND_OTP: `${getApiBaseUrl()}/send-otp`,
  VERIFY_OTP: `${getApiBaseUrl()}/verify-otp`,
  HEALTH: `${getApiBaseUrl()}/health`,
  AUTH_SEND_RECOVERY: `${getApiBaseUrl()}/api/auth/send-recovery-code`,
  AUTH_VERIFY_RECOVERY: `${getApiBaseUrl()}/api/auth/verify-recovery-code`,
  // Fallback Supabase Edge Functions if Render backend is sleeping/starting up
  SUPABASE_SEND_OTP: `${SUPABASE_URL}/functions/v1/send-otp`,
  SUPABASE_VERIFY_OTP: `${SUPABASE_URL}/functions/v1/verify-otp`,
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
