export type AdminTab =
  | 'dashboard'
  | 'recharges'
  | 'withdrawals'
  | 'rounds'
  | 'results'
  | 'commercial'
  | 'audit'
  | 'users'
  | 'operators';

export type AdminRole = 'Super Admin' | 'Operador Financiero' | 'Auditor';

export interface RolePermissionConfig {
  role: AdminRole | string;
  displayName: string;
  badgeColor: string;
  description: string;
  allowedTabs: AdminTab[];
  canManageOperators: boolean;
  canManageWithdrawals: boolean;
  canManageRecharges: boolean;
  canManageRounds: boolean;
  canManageResults: boolean;
  canManageCommercialConfig: boolean;
  canManageUsersAndBalances: boolean;
  canManagePasswords: boolean;
  isReadOnly: boolean;
}

export const ROLE_PERMISSIONS: Record<
  AdminRole,
  RolePermissionConfig
> = {
  'Super Admin': {
    role: 'Super Admin',
    displayName: 'Super Administrador',
    badgeColor: 'from-amber-500 to-yellow-500',
    description: 'Acceso total y administración completa de todas las funciones, módulos y personal del sistema.',
    allowedTabs: [
      'dashboard',
      'recharges',
      'withdrawals',
      'rounds',
      'results',
      'commercial',
      'audit',
      'users',
      'operators',
    ],
    canManageOperators: true,
    canManageWithdrawals: true,
    canManageRecharges: true,
    canManageRounds: true,
    canManageResults: true,
    canManageCommercialConfig: true,
    canManageUsersAndBalances: true,
    canManagePasswords: true,
    isReadOnly: false,
  },
  'Operador Financiero': {
    role: 'Operador Financiero',
    displayName: 'Operador Financiero',
    badgeColor: 'from-emerald-600 to-teal-600',
    description: 'Acceso financiero para auditar comprobantes Pago Móvil, confirmar el ingreso de fondos, aprobar recargas y liquidar retiros.',
    allowedTabs: [
      'dashboard',
      'recharges',
      'withdrawals',
      'audit',
    ],
    canManageOperators: false,
    canManageWithdrawals: true,
    canManageRecharges: true,
    canManageRounds: false,
    canManageResults: false,
    canManageCommercialConfig: false,
    canManageUsersAndBalances: false,
    canManagePasswords: false,
    isReadOnly: false,
  },
  Auditor: {
    role: 'Auditor',
    displayName: 'Auditor',
    badgeColor: 'from-cyan-600 to-blue-600',
    description: 'Acceso exclusivo de solo lectura para supervisar y verificar los registros en "Libro y Auditoría".',
    allowedTabs: ['audit'],
    canManageOperators: false,
    canManageWithdrawals: false,
    canManageRecharges: false,
    canManageRounds: false,
    canManageResults: false,
    canManageCommercialConfig: false,
    canManageUsersAndBalances: false,
    canManagePasswords: false,
    isReadOnly: true,
  },
};
