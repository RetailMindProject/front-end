import { apiClient } from "./api.client";

// Customer Response
export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Create Customer Request
export interface CreateCustomerRequest {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

// Create Customer Response
export interface CreateCustomerResponse {
  customerId: number;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
}

export const customersApi = {
  /**
   * Lookup customer by phone number
   * GET /api/customers/by-phone?phone=...
   * Headers: X-Browser-Token (sent via cookies)
   * Response: Customer or 404
   */
  async getCustomerByPhone(
    phone: string
  ): Promise<{ data?: Customer; error?: string; status?: number }> {
    const response = await apiClient.get<Customer>(
      `/api/customers/by-phone?phone=${encodeURIComponent(phone)}`
    );

    if (response.status === 404) {
      return { error: "Customer not found", status: 404 };
    }

    if (response.error) {
      return { error: response.error, status: response.status };
    }

    return { data: response.data, status: response.status };
  },

  /**
   * Create a new customer
   * POST /api/customers
   * Headers: X-Browser-Token (sent via cookies)
   * Body: { name: string, phone: string, email?: string, address?: string }
   * Response: { customerId, name, phone, ... }
   */
  async createCustomer(
    request: CreateCustomerRequest
  ): Promise<{ data?: CreateCustomerResponse; error?: string }> {
    const response = await apiClient.post<CreateCustomerResponse>(
      "/api/customers",
      {
        name: request.name,
        phone: request.phone,
        ...(request.email && { email: request.email }),
        ...(request.address && { address: request.address }),
      }
    );

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No customer data received" };
    }

    return { data: response.data };
  },
};

