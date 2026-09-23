export function normalizeAdminRole(roleStr?: string): 'Super Admin' | 'Operador Financiero' | 'Auditor' {
  if (!roleStr) return 'Super Admin';
  const clean = roleStr.toLowerCase().replace(/[\s_-]/g, '');
  
  // Operador Financiero / Operator / Operador
  if (
    clean.includes('finan') ||
    clean === 'operadorfinanciero' ||
    clean === 'operator' ||
    clean === 'operador'
  ) {
    return 'Operador Financiero';
  }
  
  // Auditor
  if (clean.includes('audit') || clean === 'auditor') {
    return 'Auditor';
  }
  
  // SuperAdmin / Super Admin / Admin
  return 'Super Admin';
}
