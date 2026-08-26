export interface SystemCredential {
  id: string;
  username: string;
  password?: string;
  role: 'Super Admin' | 'Operador Financiero' | 'Auditor';
  displayName: string;
  createdAt?: string;
  updatedAt?: string;
  status: 'active' | 'inactive';
}

export const APP_NAME = 'TÚ SUPERCARTÓN';
export const BRAND_NAME = 'TÚ SUPERCARTÓN';

export const INITIAL_SYSTEM_CREDENTIALS: SystemCredential[] = [
  {
    id: 'cred-0',
    displayName: 'Administrador Principal',
    username: 'MiprimerCommit1',
    role: 'Super Admin',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    password: 'PrimerCommit123$',
  },
  {
    id: 'cred-1',
    displayName: 'Director General',
    username: 'admin',
    role: 'Super Admin',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    password: 'admin123',
  },
  {
    id: 'cred-2',
    displayName: 'Auditor Principal',
    username: 'auditor',
    role: 'Auditor',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    password: 'auditor123',
  },
  {
    id: 'cred-3',
    displayName: 'Operador Bóveda Central',
    username: 'finanzas',
    role: 'Operador Financiero',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    password: 'finanzas123',
  },
];
