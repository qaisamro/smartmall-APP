export type SmartMallRole =
  | 'customer'
  | 'mall-owner'
  | 'supermarket-owner'
  | 'admin'
  | 'super-admin'
  | 'delivery-person'
  | 'order-tracker'
  | 'cashier';

export interface AuthUser {
  id: number;
  name: string;
  email: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  birthdate?: string | null;
  gender?: 'male' | 'female' | null;
  status?: string | null;
  is_active?: boolean | number | null;
  roles?: Array<{ name: SmartMallRole } | SmartMallRole>;
}

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  phone: string;
  password: string;
  password_confirmation: string;
  role?: string;
}

export interface AuthResponse {
  user: AuthUser;
  access_token: string;
  token_type: 'Bearer';
}