import { getCurrentToken } from "./tokens";

const API_BASE_URL = "http://localhost:8081";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getCurrentToken();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Some endpoints (204/empty body) will throw on response.json()
    let data: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : "Invalid JSON response",
          status: response.status,
        };
      }
    }

    if (!response.ok) {
      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        // Clear tokens and redirect to login
        localStorage.clear();
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
    return {
      error: error instanceof Error ? error.message : "Network error occurred",
      status: 0,
    };
  }
}

export const apiClient = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }),
  
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  
  delete: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    }),
};

