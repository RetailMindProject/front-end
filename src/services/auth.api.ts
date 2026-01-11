import { apiClient } from "./api.client";
import { setTokenForRole, setUserInfo, clearAllTokens, clearRoleData, type UserRole } from "./tokens";
import type { UserAccount } from "../types/user";

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

export interface CashierLoginResponse {
  token: string;
  userId: number;
  username: string;
  role: UserRole;
  terminalId?: number;
  terminalCode?: string;
  sessionId?: number;
  sessionStatus?: "OPEN" | "CLOSED";
  openingFloat?: number;
  message?: string;
  paired?: boolean;
}

export interface AuthError {
  message: string;
  status: number;
  details?: Record<string, unknown> | null;
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
      credentials: "include",
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
          details: typeof data === "object" && data !== null ? data : null,
        },
      };
    }

    // Log full response for debugging
    console.log("Login API response:", {
      status: response.status,
      ok: response.ok,
      data: data,
    });

    const token = data.token || data.accessToken || data.access_token;
    const role = data.role?.toUpperCase() as UserRole;
    
    // Validate token and role
    if (!token) {
      console.error("Login response missing token");
      return {
        error: {
          message: "Login response missing authentication token",
          status: response.status,
        },
      };
    }

    if (!role) {
      console.error("Login response missing role");
      return {
        error: {
          message: "Login response missing user role",
          status: response.status,
        },
      };
    }

    // Validate role is a known UserRole
    const validRoles: UserRole[] = ['STORE_MANAGER', 'INVENTORY_MANAGER', 'CEO', 'CASHIER', 'CUSTOMER'];
    if (!validRoles.includes(role)) {
      console.error("Invalid role received:", role);
      return {
        error: {
          message: `Invalid user role: ${role}`,
          status: response.status,
        },
      };
    }
    
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

    // Store token and user info
    setTokenForRole(loginData.role, loginData.token);
    
    // Extract userId from response or token
    let userId = data.userId || data.id || data.user?.id;
    if (!userId && token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = parts[1];
          const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
          userId = decoded.userId || decoded.user_id || decoded.sub || decoded.id || decoded.user?.id;
        }
      } catch (e) {
        console.error("Error decoding token for userId:", e);
      }
    }

    const userInfoToSave = {
      id: userId ? (typeof userId === 'number' ? userId : parseInt(userId, 10)) : undefined,
      userId: userId ? (typeof userId === 'number' ? userId : parseInt(userId, 10)) : undefined,
      firstName: loginData.firstName || data.firstName || "",
      lastName: loginData.lastName || data.lastName || "",
      email: loginData.email || data.email || "",
      phone: loginData.phone || "",
      address: loginData.address || "",
      role: loginData.role,
    };
    
    setUserInfo(userInfoToSave);

    console.log("Login successful:", {
      role: loginData.role,
      email: loginData.email,
      hasToken: !!loginData.token,
    });

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
 * Cashier Login with Pairing Support
 * POST /api/sessions/cashier/login
 * This endpoint handles login and returns pairing status
 */
export async function cashierLogin(
  username: string,
  password: string
): Promise<{ data?: CashierLoginResponse; error?: AuthError }> {
  try {
    console.log("Cashier login attempt for:", username);
    const response = await fetch("http://localhost:8081/api/sessions/cashier/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // CRITICAL: This sends and receives cookies (browser token)
      body: JSON.stringify({ username, password }),
    });
    
    console.log("Cashier login response status:", response.status);
    console.log("Response cookies:", document.cookie);

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
          details: typeof data === "object" && data !== null ? data : null,
        },
      };
    }

    const token = data.token;
    const role = (data.role?.toUpperCase() || "CASHIER") as UserRole;

    const loginData: CashierLoginResponse = {
      token,
      userId: data.userId,
      username: data.username,
      role,
      terminalId: data.terminalId,
      terminalCode: data.terminalCode,
      sessionId: data.sessionId,
      sessionStatus: data.sessionStatus,
      openingFloat: data.openingFloat,
      message: data.message,
      paired: data.paired || false,
    };

    // Save token and user info regardless of pairing result
    if (token) {
      setTokenForRole(role, token);
    }

    const userInfoToSave = {
      id: loginData.userId,
      userId: loginData.userId,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      email: loginData.username,
      phone: data.phone || "",
      address: data.address || "",
      role: role,
      sessionId: loginData.sessionId,
      terminalId: loginData.terminalId,
      terminalCode: loginData.terminalCode,
    };
    
    setUserInfo(userInfoToSave);

    return { data: loginData };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
        details: null,
      },
    };
  }
}

/**
 * Logout for a specific role (clears only that role's data)
 */
export function logoutForRole(role: UserRole): void {
  clearRoleData(role);
  
  // Redirect to login page using window.location to ensure full page reload
  if (typeof window !== 'undefined') {
    window.location.href = "/login";
  }
}

/**
 * Logout current user (clears all tokens - use with caution)
 * This should only be used when you want to completely log out all users
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
        details: null,
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

interface UserAccountApiResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  isActive: boolean;    
  createdAt: string;
  updatedAt: string;
}

export async function getAllAccounts(): Promise<{ data?: UserAccount[]; error?: AuthError }> {
  try {
    const response = await apiClient.get<UserAccountApiResponse[]>("/api/auth/users");

    if (response.error) {
      return {
        error: {
          message: response.error,
          status: response.status || 0,
        },
      };
    }

    const accounts: UserAccount[] =
  response.data?.map((item) => ({
    id: String(item.id),
    first_name: item.firstName,
    last_name: item.lastName,
    email: item.email,
    phone: item.phone,
    address: item.address,
    role: item.role.toUpperCase() as UserRole,
    is_active: item.isActive,          // ✅
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  })) || [];


    return { data: accounts };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      },
    };
  }
}

export interface UpdateAccountRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  isActive: boolean;
}

export interface UpdateAccountResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAccountError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

/**
 * Update an existing account (for CEO only)
 * PUT /api/users/{id}
 */
export async function updateAccount(
  userId: string,
  accountData: UpdateAccountRequest
): Promise<{ data?: UpdateAccountResponse; error?: UpdateAccountError }> {
  try {
    console.log("Updating account with userId:", userId);
    console.log("Update data:", accountData);
    
    // Convert userId to number if needed (backend expects Integer)
    const userIdNumber = parseInt(userId, 10);
    if (isNaN(userIdNumber)) {
      return {
        error: {
          message: "Invalid user ID",
          status: 400,
        },
      };
    }
    
    // Use apiClient which automatically adds the auth token
    // Based on getAllAccounts using /api/auth/users, the endpoint is likely:
    // /api/auth/users/{id} (if controller has @RequestMapping("/api/auth"))
    // OR /api/users/{id} (if controller has @RequestMapping("/api"))
    // The error suggests /api/users/{id} doesn't exist, so try /api/auth/users/{id}
    const endpoint = `/api/auth/users/${userIdNumber}`;
    console.log("Calling PUT:", endpoint);
    
    const response = await apiClient.put<UpdateAccountResponse>(endpoint, {
      firstName: accountData.firstName,
      lastName: accountData.lastName,
      email: accountData.email,
      phone: accountData.phone,
      address: accountData.address,
      role: accountData.role,
      isActive: accountData.isActive,
    });

    console.log("Update account API response:", response);

    if (response.error) {
      console.error("Update account error:", response.error);
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

    console.log("Update account success:", response.data);
    return { data: response.data };
  } catch (error) {
    console.error("Update account exception:", error);
    return {
      error: {
        message: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      },
    };
  }
}

