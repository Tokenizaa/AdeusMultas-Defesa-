export type UserRole = 'citizen' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  cpf?: string;
  phone?: string;
  cnh?: string;
  cityState?: string;
  rg?: string;
  cnhCategory?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressZipCode?: string;
  referralCode?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthState {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}
