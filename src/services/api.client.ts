import { getCurrentToken, getTokenForRole, type UserRole } from "./tokens";

const API_BASE_URL = "http://localhost:8081";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

/**
 * Create API request with explicit role token
 * This ensures we use the correct token for each role
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  role?: UserRole
): Promise<ApiResponse<T>> {
  // Get token for specific role if provided, otherwise use current token
  let token: string | null = null;
  if (role) {
    token = getTokenForRole(role);
  } else {
    token = getCurrentToken();
  }
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    // Validate that token is a JWT (should contain 2 dots)
    // Skip browser tokens or other non-JWT tokens
    if (token.split('.').length === 3) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      console.warn("Invalid JWT token format, skipping Authorization header");
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // إرسال cookies (بما فيها browser_token) مع كل request
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return {
        status: 204,
      };
    }

    // Check content type before parsing
    const contentType = response.headers.get("content-type");
    let data: unknown = null;

    if (contentType && contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        console.error("Failed to parse JSON response:", text);
        return {
          error: `Invalid JSON response: ${text}`,
          status: response.status,
        };
      }
    } else {
      // Some endpoints (204/empty body) will throw on response.json()
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (err) {
          data = { message: text || "Response is not JSON" };
        }
      }
    }

    if (!response.ok) {
      // Handle 401 Unauthorized - clear only the current role's token
      if (response.status === 401) {
        // Get current role from URL or userInfo
        const { getCurrentRole, getUserInfo, clearRoleData } = await import("./tokens");
        const currentRole = getCurrentRole();
        const userInfo = getUserInfo();
        
        // Clear only the role that made this request
        if (currentRole) {
          clearRoleData(currentRole);
        } else if (userInfo?.role) {
          clearRoleData(userInfo.role);
        }
        
        // Redirect to login only if not already there
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      
      // Try to extract error message from response
      let errorMessage = `HTTP error! status: ${response.status}`;
      if (data) {
        const errorData = data as { message?: string; error?: string; errors?: Record<string, string[]> };
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.errors) {
          // Format validation errors
          const errorMessages = Object.entries(errorData.errors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('; ');
          errorMessage = errorMessages || errorMessage;
        }
      }
      
      // Provide user-friendly messages for common HTTP errors
      if (response.status === 403) {
        errorMessage = errorMessage.includes('HTTP error') 
          ? 'Access denied. You do not have permission to access this resource. Please contact your administrator.'
          : errorMessage;
      } else if (response.status === 404) {
        errorMessage = errorMessage.includes('HTTP error')
          ? 'Resource not found.'
          : errorMessage;
      } else if (response.status >= 500) {
        errorMessage = errorMessage.includes('HTTP error')
          ? 'Server error. Please try again later.'
          : errorMessage;
      }
      
      console.error('API Error Response:', {
        status: response.status,
        data: data,
        errorMessage: errorMessage
      });
      
      return {
        error: errorMessage,
        status: response.status,
      };
    }

    return {
      data: data as T,
      status: response.status,
    };
  } catch (error) {
    console.error("API request error:", error);
    return {
      error: error instanceof Error ? error.message : "Network error occurred",
      status: 0,
    };
  }
}

/**
 * Base API client - uses current token (may be ambiguous)
 * Use role-specific clients for better isolation
 */
export const apiClient = {
  get: <T>(endpoint: string, role?: UserRole) => apiRequest<T>(endpoint, { method: "GET" }, role),
  
  post: <T>(endpoint: string, body?: unknown, role?: UserRole) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }, role),
  
  put: <T>(endpoint: string, body?: unknown, role?: UserRole) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }, role),
  
  patch: <T>(endpoint: string, body?: unknown, role?: UserRole) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }, role),
  
  delete: <T>(endpoint: string, body?: unknown, role?: UserRole) =>
    apiRequest<T>(endpoint, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    }, role),
};

/**
 * Role-specific API clients - use these to ensure correct token isolation
 */
export const storeManagerApiClient = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }, 'STORE_MANAGER'),
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }, 'STORE_MANAGER'),
  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }, 'STORE_MANAGER'),
  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }, 'STORE_MANAGER'),
  delete: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    }, 'STORE_MANAGER'),
};

export const ceoApiClient = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }, 'CEO'),
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }, 'CEO'),
  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }, 'CEO'),
  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }, 'CEO'),
  delete: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    }, 'CEO'),
};

export const inventoryManagerApiClient = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }, 'INVENTORY_MANAGER'),
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }, 'INVENTORY_MANAGER'),
  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }, 'INVENTORY_MANAGER'),
  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }, 'INVENTORY_MANAGER'),
  delete: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    }, 'INVENTORY_MANAGER'),
};

export const cashierApiClient = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }, 'CASHIER'),
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }, 'CASHIER'),
  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }, 'CASHIER'),
  patch: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }, 'CASHIER'),
  delete: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    }, 'CASHIER'),
};

