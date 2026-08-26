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

