/**
 * Cryptographic utilities for secure password hashing and verification
 * Uses standard SHA-256 algorithm.
 */

export async function hashPassword(password: string): Promise<string> {
  const trimmed = password.trim();
  if (!trimmed) return '';

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(trimmed);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('[crypto] Web Crypto subtle error, falling back to manual hash:', e);
    }
  }

  // Fallback simple hash for non-secure / SSR contexts
  let hash = 5381;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash * 33) ^ trimmed.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function normalizeAdminRole(roleStr?: string): 'Super Admin' | 'Operador Financiero' | 'Auditor' {
  if (!roleStr) return 'Super Admin';
  const clean = roleStr.toLowerCase().replace(/[\s_-]/g, '');
  if (clean.includes('finan') || clean === 'operadorfinanciero') {
    return 'Operador Financiero';
  }
  if (clean.includes('audit') || clean === 'auditor') {
    return 'Auditor';
  }
  return 'Super Admin';
}

export function toDbRole(roleStr?: string): 'super_admin' | 'operador_financiero' | 'auditor' {
  const normalized = normalizeAdminRole(roleStr);
  if (normalized === 'Operador Financiero') return 'operador_financiero';
  if (normalized === 'Auditor') return 'auditor';
  return 'super_admin';
}
