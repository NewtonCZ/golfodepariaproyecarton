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

export function normalizeAdminRole(
  roleStr?: string
): 'Super Admin' | 'Operador Financiero' | 'Auditor' | 'Player' {
  if (!roleStr) return 'Player';
  const clean = roleStr.toLowerCase().replace(/[\s_-]/g, '');

  // Super Admin
  if (clean === 'superadmin' || clean === 'superadministrador') {
    return 'Super Admin';
  }

  // Operador Financiero / Operator
  if (
    clean === 'operator' ||
    clean === 'operador' ||
    clean === 'operadorfinanciero' ||
    clean.includes('finan')
  ) {
    return 'Operador Financiero';
  }

  // Auditor
  if (clean === 'auditor' || clean.includes('audit')) {
    return 'Auditor';
  }

  // ✅ DEFAULT SEGURO: cualquier otra cosa es Player (sin privilegios)
  return 'Player';
}

// ✅ NUEVO: mapeo UI → DB con los strings que tu DB realmente usa
export function toDbRole(
  roleStr?: string
): 'SuperAdmin' | 'Operator' | 'Auditor' | 'Player' {
  const normalized = normalizeAdminRole(roleStr);
  if (normalized === 'Operador Financiero') return 'Operator';
  if (normalized === 'Auditor') return 'Auditor';
  if (normalized === 'Super Admin') return 'SuperAdmin';
  return 'Player';
}
