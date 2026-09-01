/**
 * Unified API Configuration for Tu Súper Cartón / Golfo de Paria
 * Dynamically resolves backend base URL with priority:
 * 1. import.meta.env.VITE_API_URL (Render URL on Vercel / Production)
 * 2. Fallback to https://golfodepariaproyecarton.onrender.com
 */

export const getApiBaseUrl = (): string => {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};
  const envUrl = metaEnv.VITE_API_URL || (typeof process !== 'undefined' && process.env?.VITE_API_URL);

  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/$/, '');
  }

  // Default production backend on Render
  return 'https://golfodepariaproyecarton.onrender.com';
};

export const API_ENDPOINTS = {
  SEND_OTP: `${getApiBaseUrl()}/send-otp`,
  VERIFY_OTP: `${getApiBaseUrl()}/verify-otp`,
  HEALTH: `${getApiBaseUrl()}/health`,
  AUTH_SEND_RECOVERY: `${getApiBaseUrl()}/api/auth/send-recovery-code`,
  AUTH_VERIFY_RECOVERY: `${getApiBaseUrl()}/api/auth/verify-recovery-code`,
  PLAYERS_LIST: `${getApiBaseUrl()}/api/players`,
  PLAYERS_CREATE: `${getApiBaseUrl()}/api/players`,
  // Fallback Supabase Edge Functions if Render backend is sleeping/starting up
  SUPABASE_SEND_OTP: 'https://mccjcdsombzmlxzxccto.supabase.co/functions/v1/send-otp',
  SUPABASE_VERIFY_OTP: 'https://mccjcdsombzmlxzxccto.supabase.co/functions/v1/verify-otp',
};

export const getSupabaseFunctionHeaders = (): Record<string, string> => {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};
  const anonKey =
    metaEnv.VITE_SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '') ||
    metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (anonKey) {
    headers['apikey'] = anonKey;
    headers['Authorization'] = `Bearer ${anonKey}`;
  }

  return headers;
};
