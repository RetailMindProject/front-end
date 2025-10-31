export type UserRole = 'CUSTOMER' | 'CASHIER' | 'STORE_MANAGER' | 'INVENTORY_MANAGER' | 'CEO';

export interface CreateAccountFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  role: UserRole;
}

export interface CreateAccountProps {
  allowedRoles: UserRole[];
  title?: string;
  onSubmit?: (data: CreateAccountFormData) => void;
  initialData?: Partial<CreateAccountFormData>;
}

// Extended user interface for account management
export interface UserAccount extends CreateAccountFormData {
  id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


