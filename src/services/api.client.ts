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

    // Check content type before parsing
    const contentType = response.headers.get("content-type");
    let data: any;
    
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
      const text = await response.text();
      data = { message: text || "Response is not JSON" };
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
      
      return {
        error: data.message || data.error || `HTTP error! status: ${response.status}`,
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
  
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "DELETE" }),
};

