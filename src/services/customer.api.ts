import { apiClient } from "./api.client";
import type {
  LoginRequest,
  LoginResponse,
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
   * Error handling: 404/5xx/network errors return null data (graceful degradation)
   */
  async getRecommendations(
    topK: number = 10,
    candidateLimit: number = 500,
    inStockOnly: boolean = true
  ): Promise<{ data?: RecommendationsResponse; error?: string; isEndpointMissing?: boolean }> {
    const response = await apiClient.get<RecommendationsResponse>(
      `/api/recommendations/customers/me?topK=${topK}&candidateLimit=${candidateLimit}&inStockOnly=${inStockOnly}`
    );
    
    // Handle 404 - endpoint not implemented yet (current state)
    if (response.error && response.status === 404) {
      return { 
        error: undefined, // Don't surface error to user
        isEndpointMissing: true // Flag for hook to handle gracefully
      };
    }
    
    // Handle auth errors (401/403) - should not call without valid token
    if (response.error && (response.status === 401 || response.status === 403)) {
      return { error: "Unauthorized" };
    }
    
    // Handle server errors (5xx) - graceful degradation
    if (response.error && response.status >= 500) {
      return { error: undefined, isEndpointMissing: false }; // Hide error, show empty state
    }
    
    // Handle other errors
    if (response.error) {
      return { error: undefined }; // Fail safe: hide widget on any error
    }

    // Validate response structure
    if (!response.data) {
      return { error: undefined }; // Missing data = no recommendations
    }

    // Validate response status
    if (response.data.status !== "success") {
      return { error: response.data.message || undefined }; // Use message if available, otherwise undefined
    }

    // Validate required fields
    if (!response.data.rows || !response.data.meta) {
      return { error: undefined }; // Malformed response = no recommendations
    }

    return { data: response.data };
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
   * GET /api/orders?since={ISO_date}&limit=50
   */
  async getOrders(since?: string, limit: number = 50): Promise<{ data?: OrdersResponse; error?: string }> {
    let endpoint = `/api/orders?limit=${limit}`;
    if (since) {
      endpoint += `&since=${encodeURIComponent(since)}`;
    }

    const response = await apiClient.get<OrdersResponse>(endpoint);
    
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

