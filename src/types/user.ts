export type UserRole = 'CUSTOMER' | 'CASHIER' | 'STORE_MANAGER' | 'INVENTORY_MANAGER' | 'CEO';

export interface CreateAccountFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
  password: string;
  confirmPassword: string;
}

export interface EditAccountFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
  is_active: boolean;
}

export interface CreateAccountProps {
  allowedRoles: UserRole[];
  title?: string;
  onSubmit?: (data: CreateAccountFormData) => void;
  initialData?: Partial<CreateAccountFormData>;
}

export interface EditAccountProps {
  allowedRoles: UserRole[];
  title?: string;
  onSubmit?: (data: EditAccountFormData) => void;
  initialData?: Partial<EditAccountFormData>;
}
  
// Extended user interface for account management
export interface UserAccount extends EditAccountFormData {
  id: string;
  created_at: string;
  updated_at: string;
}
