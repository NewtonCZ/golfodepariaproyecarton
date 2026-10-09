const COOKIE_CONSENT_KEY = 'tusupercarton_cookie_consent_v1';

interface CookiePreferences {
  essential: boolean;
  performance: boolean;
  functionality: boolean;
  thirdParty: boolean;
  acceptedAt: string;
  expiresAt: string;
  version: string;
}

const getStoredPreferences = (): CookiePreferences | null => {
  try {
    const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!saved) return null;
    const prefs: CookiePreferences = JSON.parse(saved);
    const expiresAt = prefs.expiresAt ? new Date(prefs.expiresAt).getTime() : 0;
    if (!expiresAt || Date.now() > expiresAt) return null;
    return prefs;
  } catch {
    return null;
  }
};

/**
 * Verifica si el usuario dio consentimiento para un tipo específico de cookie.
 * Usar ANTES de inicializar servicios no esenciales.
 */
export const hasConsent = (type: 'performance' | 'functionality' | 'thirdParty'): boolean => {
  const prefs = getStoredPreferences();
  if (!prefs) return false;
  return prefs[type] === true;
};

/**
 * Verifica si hay algún consentimiento válido (cualquier tipo).
 */
export const hasAnyConsent = (): boolean => {
  return getStoredPreferences() !== null;
};

/**
 * Obtiene todas las preferencias guardadas.
 */
export const getConsentPreferences = (): CookiePreferences | null => {
  return getStoredPreferences();
};
