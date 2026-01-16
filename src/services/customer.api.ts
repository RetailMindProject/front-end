import { apiClient } from "./api.client";
import { setTokenForRole, setUserInfo } from "./tokens";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  AuthIntrospectResponse,
  UserProfileResponse,
  ProductSearchResponse,
  Product,
  ProductAvailabilityResponse,
  RecommendationsResponse,
  RagChatRequest,
  RagChatResponse,
  OrdersResponse,
  UnreadCountResponse,
  SendMessageRequest,
  SendMessageResponse,
} from "../types/customer.api";

/**
 * POS API Client for Customer "My Page"
 * All endpoints match backend contracts exactly
 */

export const customerApi = {
  // ========== Authentication APIs ==========

  /**
   * POST /api/auth/login
   * Note: Login doesn't require token, so we use fetch directly
   */
  async login(request: LoginRequest): Promise<{ data?: LoginResponse; error?: string }> {
    try {
      const API_BASE_URL = import.meta.env.VITE_POS_BASE_URL || "http://localhost:8081";
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Login failed" }));
        return { error: errorData.message || `HTTP error! status: ${response.status}` };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Network error occurred" };
    }
  },

  /**
   * GET /api/public/auth/introspect
   * Note: This endpoint requires Authorization header with token
   */
  async introspect(): Promise<{ data?: AuthIntrospectResponse; error?: string }> {
    const response = await apiClient.get<AuthIntrospectResponse>("/api/public/auth/introspect");
    
    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * GET /api/auth/me
   */
  async getCurrentUser(): Promise<{ data?: UserProfileResponse; error?: string }> {
    const response = await apiClient.get<UserProfileResponse>("/api/auth/me");
    
    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * POST /api/auth/register/customer
   * Public customer self-registration (creates both users and customers records)
   * Auth: No auth required (public)
   * Role: Always forced to CUSTOMER by backend
   */
  async register(request: RegisterRequest): Promise<{ data?: RegisterResponse; error?: string; status?: number }> {
    try {
      const API_BASE_URL = import.meta.env.VITE_POS_BASE_URL || "http://localhost:8081";
      
      // Prepare request body - backend will force role to CUSTOMER and set isSelfRegistration to true
      const requestBody = {
        firstName: request.firstName,
        ...(request.lastName && { lastName: request.lastName }),
        email: request.email,
        ...(request.phone && { phone: request.phone }),
        ...(request.address && { address: request.address }),
        role: "CUSTOMER", // Backend will ignore and force to CUSTOMER
        password: request.password,
        confirmPassword: request.confirmPassword,
        // isSelfRegistration is optional, backend sets to true automatically
      };

      const response = await fetch(`${API_BASE_URL}/api/auth/register/customer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text || "Registration failed" };
      }

      if (!response.ok) {
        // Handle validation errors
        let errorMessage = data.message || `HTTP error! status: ${response.status}`;
        
        // Handle specific error cases
        if (response.status === 400) {
          if (data.message) {
            errorMessage = data.message;
          } else if (data.errors) {
            // Format validation errors
            const errorMessages = Object.entries(data.errors)
              .map(([field, messages]) => {
                if (Array.isArray(messages)) {
                  return `${field}: ${messages.join(', ')}`;
                }
                return `${field}: ${messages}`;
              })
              .join('; ');
            errorMessage = errorMessages || errorMessage;
          }
        }

        return {
          error: errorMessage,
          status: response.status,
        };
      }

      // Success - status 201 Created
      const registerData: RegisterResponse = {
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName || "",
        email: data.email,
        phone: data.phone || "",
        address: data.address || "",
        role: "CUSTOMER",
        isActive: data.isActive,
        createdAt: data.createdAt,
        token: data.token,
        message: data.message || null,
      };

      // Store token and user info automatically
      if (registerData.token) {
        setTokenForRole("CUSTOMER", registerData.token);
        setUserInfo({
          id: registerData.id,
          userId: registerData.id,
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          email: registerData.email,
          phone: registerData.phone,
          address: registerData.address,
          role: "CUSTOMER",
        });
      }

      return { data: registerData, status: response.status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      };
    }
  },

  // ========== Product APIs ==========

  /**
   * GET /api/public/products/search?query={text}&limit={n}
   */
  async searchProducts(query: string, limit: number = 10): Promise<{ data?: ProductSearchResponse; error?: string }> {
    const response = await apiClient.get<ProductSearchResponse>(
      `/api/public/products/search?query=${encodeURIComponent(query)}&limit=${limit}`
    );
    
    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * GET /api/public/products/{id}
   */
  async getProduct(id: number): Promise<{ data?: Product; error?: string }> {
    const response = await apiClient.get<Product>(`/api/public/products/${id}`);
    
    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * GET /api/public/products/{id}/availability
   */
  async getProductAvailability(id: number): Promise<{ data?: ProductAvailabilityResponse; error?: string }> {
    const response = await apiClient.get<ProductAvailabilityResponse>(`/api/public/products/${id}/availability`);
    
    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  // ========== Recommendation API ==========

  /**
   * GET /api/recommendations/customers/me?topK=10&candidateLimit=500&inStockOnly=true
   * Backend extracts customerId from authenticated user (JWT), frontend should NOT send it
   * 
   * Contract: Follows exact backend DTO structure with camelCase fields
   * Important: Backend may return HTTP 200 with status="error" if Recommendation Service is down/timeout
   * 
   * Error handling:
   * - 401/403: Returns error (triggers logout/redirect)
   * - 404: Returns isEndpointMissing flag (graceful degradation)
   * - 5xx/network: Returns error (graceful degradation)
   * - HTTP 200 with status="error": Returns data with status="error" (non-blocking)
   */
  async getRecommendations(
    topK: number = 10,
    candidateLimit: number = 500,
    inStockOnly: boolean = true
  ): Promise<{ data?: RecommendationsResponse; error?: string; status?: number; isEndpointMissing?: boolean }> {
    // Use CUSTOMER role explicitly to ensure correct token is used
    const endpoint = `/api/recommendations/customers/me?topK=${topK}&candidateLimit=${candidateLimit}&inStockOnly=${inStockOnly}`;
    
    console.log('[customerApi.getRecommendations] Calling endpoint:', endpoint);
    console.log('[customerApi.getRecommendations] Params:', { topK, candidateLimit, inStockOnly });
    
    const response = await apiClient.get<RecommendationsResponse>(
      endpoint,
      'CUSTOMER'
    );
    
    console.log('[customerApi.getRecommendations] Response:', {
      status: response.status,
      hasError: !!response.error,
      error: response.error,
      hasData: !!response.data,
      dataStatus: response.data?.status,
      rowsForYou: response.data?.rows?.forYou?.length,
      rowsPopular: response.data?.rows?.popular?.length,
      rowsOffers: response.data?.rows?.offers?.length,
      fullData: response.data,
    });
    
    // Handle 404 - endpoint not implemented yet
    if (response.error && response.status === 404) {
      console.log('[customerApi.getRecommendations] Endpoint missing (404)');
      return { 
        error: undefined, // Don't surface error to user
        status: 404,
        isEndpointMissing: true // Flag for hook to handle gracefully
      };
    }
    
    // Handle auth errors (401/403) - trigger logout/redirect
    if (response.error && (response.status === 401 || response.status === 403)) {
      return { 
        error: response.status === 401 ? "Unauthorized" : "Forbidden - Customers only",
        status: response.status
      };
    }
    
    // Handle server errors (5xx) - graceful degradation
    if (response.error && response.status >= 500) {
      return { 
        error: "Recommendation service is temporarily unavailable",
        status: response.status
      };
    }
    
    // Handle network errors
    if (response.error && response.status === 0) {
      return { 
        error: "Network error. Please check your connection.",
        status: 0
      };
    }
    
    // Handle other HTTP errors
    if (response.error) {
      return { 
        error: response.error,
        status: response.status
      };
    }

    // Validate response structure
    if (!response.data) {
      return { 
        error: "No data received from server",
        status: response.status
      };
    }

    // IMPORTANT: Backend may return HTTP 200 with status="error" if Recommendation Service is down
    // We still return the data so the UI can show the error message non-blockingly
    if (response.data.status === "error") {
      // Return data with error status - UI will handle showing message
      return { 
        data: response.data,
        error: response.data.message || "Recommendation service error",
        status: response.status
      };
    }

    // Validate response status is "success"
    if (response.data.status !== "success") {
      return { 
        error: response.data.message || "Unexpected response status",
        status: response.status
      };
    }

    // Validate required fields
    if (!response.data.rows || !response.data.meta) {
      console.error('[customerApi.getRecommendations] Invalid response structure:', {
        hasRows: !!response.data.rows,
        hasMeta: !!response.data.meta,
        data: response.data,
      });
      return { 
        error: "Invalid response structure",
        status: response.status
      };
    }

    // Check if rows are empty (even with status="success")
    const forYouCount = response.data.rows.forYou?.length || 0;
    const popularCount = response.data.rows.popular?.length || 0;
    const offersCount = response.data.rows.offers?.length || 0;
    const totalCount = forYouCount + popularCount + offersCount;

    console.log('[customerApi.getRecommendations] Success! Returning data:', {
      status: response.data.status,
      forYouCount,
      popularCount,
      offersCount,
      totalCount,
      meta: response.data.meta,
      isColdStart: response.data.meta.isColdStart,
      isStale: response.data.meta.isStale,
    });

    // Even if rows are empty, return the data so UI can show appropriate message
    return { 
      data: response.data,
      status: response.status
    };
  },

  // ========== RAG Chatbot API ==========

  /**
   * POST /api/customer/rag/chat
   * Sends customer message to RAG assistant via backend
   * Backend forwards JWT to RAG service and returns simplified response
   */
  async askChat(request: RagChatRequest): Promise<{ data?: RagChatResponse; error?: string; status?: number }> {
    // Validate input - message is required
    if (!request.message || request.message.trim().length === 0) {
      return { error: "Message cannot be empty." };
    }

    // Prepare request body (minimum required: message)
    const chatRequest: RagChatRequest = {
      message: request.message.trim(),
      ...(request.projectId && { projectId: request.projectId }),
      ...(request.conversationId && { conversationId: request.conversationId }),
      ...(request.language && { language: request.language }),
      ...(request.channel && { channel: request.channel }),
      ...(request.metadata && { metadata: request.metadata }),
    };

    const response = await apiClient.post<RagChatResponse>("/api/customer/rag/chat", chatRequest);
    
    // Handle HTTP errors with specific status codes
    if (response.error) {
      // Check if endpoint doesn't exist (404)
      if (response.status === 404) {
        return { 
          error: "Chat service is not available. The endpoint /api/customer/rag/chat may not be configured on the backend. Please contact support.", 
          status: 404 
        };
      }
      // Check if it's a bad request (400)
      if (response.status === 400) {
        return { error: "Unable to send this message. Please check your input and try again.", status: 400 };
      }
      // Check if it's authentication error (401/403)
      if (response.status === 401 || response.status === 403) {
        return { error: "Your session has expired. Please log in again.", status: response.status };
      }
      // Check if it's a rate limit error (429)
      if (response.status === 429) {
        return { error: "Too many requests. Please wait a moment and try again.", status: 429 };
      }
      // Check if it's a service unavailable error (503)
      if (response.status === 503) {
        return { error: "Assistant service is temporarily unavailable. Please try again later.", status: 503 };
      }
      // Check if it's a server error (5xx)
      if (response.status >= 500) {
        return { error: "Assistant is currently unavailable. Please try again later.", status: response.status };
      }
      return { error: response.error, status: response.status };
    }

    // Response is valid - return data
    // Note: Backend may return 200 with fallback message in answer if RAG is unavailable
    return { data: response.data };
  },

  // ========== Order History API ==========

  /**
   * GET /api/customers/me/orders?since={ISO_date}&limit=50
   * Note: Using customer-specific endpoint with CUSTOMER role
   */
  async getOrders(since?: string, limit: number = 50): Promise<{ data?: OrdersResponse; error?: string }> {
    let endpoint = `/api/customers/me/orders?limit=${limit}`;
    if (since) {
      endpoint += `&since=${encodeURIComponent(since)}`;
    }

    const response = await apiClient.get<OrdersResponse>(endpoint, 'CUSTOMER');
    
    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  // ========== Messaging API ==========

  /**
   * GET /api/messages/unread-count
   */
  async getUnreadCount(): Promise<{ data?: UnreadCountResponse; error?: string }> {
    const response = await apiClient.get<UnreadCountResponse>("/api/messages/unread-count");
    
    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * POST /api/messages/send
   */
  async sendMessage(request: SendMessageRequest): Promise<{ data?: SendMessageResponse; error?: string }> {
    const response = await apiClient.post<SendMessageResponse>("/api/messages/send", request);
    
    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },
};

