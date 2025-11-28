import { apiClient } from "./api.client";
import { setTokenForRole, setUserInfo, clearAllTokens, type UserRole } from "./tokens";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: UserRole;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
}

export interface AuthError {
  message: string;
  status: number;
}

/**
 * Login user with email and password
 */
export async function login(
  email: string,
  password: string
): Promise<{ data?: LoginResponse; error?: AuthError }> {
  try {
    // Note: Login endpoint doesn't need token, so we use fetch directly
    const response = await fetch("http://localhost:8081/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    // Handle non-JSON responses
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text || "An error occurred" };
    }

    if (!response.ok) {
      return {
        error: {
          message: data.message || `HTTP error! status: ${response.status}`,
          status: response.status,
        },
      };
    }

    const token = data.token || data.accessToken || data.access_token;
    const role = data.role?.toUpperCase() as UserRole;
    
    let phone = "";
    let address = "";
    
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = parts[1];
          const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
          phone = decoded.phone || decoded.phoneNumber || decoded.phone_number || "";
          address = decoded.address || decoded.userAddress || decoded.user_address || "";
        }
      } catch (e) {
        console.error("Error decoding token for phone/address:", e);
      }
    }
    
    const loginData: LoginResponse = {
      token,
      role,
      email: data.email || data.username || "",
      firstName: data.firstName || data.first_name || "",
      lastName: data.lastName || data.last_name || "",
      phone: data.phone || data.phoneNumber || data.phone_number || phone,
      address: data.address || data.userAddress || data.user_address || address,
    };

    if (loginData.role && loginData.token) {
      setTokenForRole(loginData.role, loginData.token);
      
      const userInfoToSave = {
        firstName: loginData.firstName || data.firstName || "",
        lastName: loginData.lastName || data.lastName || "",
        email: loginData.email || data.email || "",
        phone: loginData.phone || "",
        address: loginData.address || "",
        role: loginData.role,
      };
      
      setUserInfo(userInfoToSave);
    }

    return { data: loginData };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      },
    };
  }
}

/**
 * Logout current user
 */
export function logout(): void {
  // Clear all tokens and user info
  clearAllTokens();
  // Redirect to login page using window.location to ensure full page reload
  if (typeof window !== 'undefined') {
    window.location.href = "/login";
  }
}

export interface UserProfileResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
}

export async function getCurrentUserProfile(): Promise<{ data?: UserProfileResponse; error?: AuthError }> {
  try {
    const response = await apiClient.get<UserProfileResponse>("/api/auth/me");
    
    if (response.error) {
      return {
        error: {
          message: response.error,
          status: response.status || 0,
        },
      };
    }
    
    return { data: response.data };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      },
    };
  }
}

export function getCurrentUser(): LoginResponse | null {
  return null;
}

export interface CreateAccountRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  password: string;
  confirmPassword: string;
  isSelfRegistration?: boolean;
}

export interface CreateAccountResponse {
  id?: string;
  email: string;
  role: string;
  message?: string;
}

export interface CreateAccountError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

/**
 * Create a new account (for CEO and Store Manager)
 * CEO can create: CASHIER, STORE_MANAGER, INVENTORY_MANAGER
 * Store Manager can create: CASHIER only
 */
export async function createAccount(
  accountData: CreateAccountRequest
): Promise<{ data?: CreateAccountResponse; error?: CreateAccountError }> {
  try {
    // Use apiClient which automatically adds the auth token
    const response = await apiClient.post<CreateAccountResponse>("/api/auth/register", {
      firstName: accountData.firstName,
      lastName: accountData.lastName,
      email: accountData.email,
      phone: accountData.phone,
      address: accountData.address,
      role: accountData.role,
      password: accountData.password,
      confirmPassword: accountData.confirmPassword,
      isSelfRegistration: accountData.isSelfRegistration || false,
    });

    if (response.error) {
      // Try to extract validation errors if available
      let errorDetails: Record<string, string[]> | undefined;
      let errorMessage = response.error;

      try {
        // If error is a JSON string, try to parse it
        if (typeof response.error === 'string') {
          const parsed = JSON.parse(response.error);
          if (parsed.errors && typeof parsed.errors === 'object') {
            errorDetails = parsed.errors;
          }
          if (parsed.message) {
            errorMessage = parsed.message;
          }
        }
      } catch {
        // If parsing fails, use error as-is
      }

      return {
        error: {
          message: errorMessage,
          status: response.status,
          errors: errorDetails,
        },
      };
    }

    return { data: response.data };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      },
    };
  }
}

