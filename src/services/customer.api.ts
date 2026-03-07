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
  RecommendationRows,
  RagChatRequest,
  RagChatResponse,
  OrdersResponse,
  UnreadCountResponse,
  SendMessageRequest,
  SendMessageResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ValidateResetTokenResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  VerifyRegistrationRequest,
  VerifyRegistrationResponse,
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
  async login(request: LoginRequest): Promise<{ data?: LoginResponse; error?: { message: string; status?: number } }> {
    try {
      const API_BASE_URL = import.meta.env.VITE_POS_BASE_URL || "http://localhost:8081";
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const contentType = response.headers.get("content-type");
      let errorData: any = null;

      if (!response.ok) {
        // Try to parse error response
        if (contentType && contentType.includes("application/json")) {
          try {
            errorData = await response.json();
          } catch (e) {
            // If JSON parsing fails, use default message
            errorData = { message: "Login failed" };
          }
        } else {
          const text = await response.text().catch(() => "");
          errorData = { message: text || "Login failed" };
        }

        return { 
          error: { 
            message: errorData.message || errorData.error || `HTTP error! status: ${response.status}`,
            status: response.status
          } 
        };
      }

      // Success - parse response
      const data = await response.json().catch(() => null);
      if (!data) {
        return { error: { message: "Invalid response from server", status: response.status } };
      }

      return { data };
    } catch (error) {
      console.error('[customerApi.login] Network error:', error);
      return { 
        error: { 
          message: error instanceof Error ? error.message : "Network error occurred",
          status: 0
        } 
      };
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

      try {
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          data = { message: text || "Registration failed" };
        }
      } catch (parseError) {
        console.error('[customerApi.register] Failed to parse response:', parseError);
        data = { message: "Invalid response from server" };
      }

      if (!response.ok) {
        // Handle validation errors
        let errorMessage = data.message || data.error || `HTTP error! status: ${response.status}`;
        
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

        console.error('[customerApi.register] Registration failed:', {
          status: response.status,
          message: errorMessage,
          data: data,
        });

        return {
          error: errorMessage,
          status: response.status,
        };
      }

      // Success - status 201 Created
      // NEW SYSTEM: Registration creates pending account, no token returned
      // Token will be returned after email verification via verifyRegistration endpoint
      const registerData: RegisterResponse = {
        id: data.id, // May be undefined for pending registration
        firstName: data.firstName,
        lastName: data.lastName || "",
        email: data.email,
        phone: data.phone || "",
        address: data.address || "",
        role: "CUSTOMER",
        isActive: data.isActive, // May be undefined for pending registration
        createdAt: data.createdAt, // May be undefined for pending registration
        token: data.token || null, // NULL in new system - token only after verification
        message: data.message || null,
      };

      // DO NOT store token - new system requires email verification first
      // Token will be saved after verifyRegistration succeeds

      return { data: registerData, status: response.status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      };
    }
  },

  // ========== Registration Verification APIs (NEW - Two-step registration) ==========

  /**
   * POST /api/auth/verify-registration
   * Verifies registration token and creates the account
   * Public endpoint - no auth required
   * Rate limit: 10 requests/min per IP
   * Returns JWT token on success (account is now created)
   */
  async verifyRegistration(request: VerifyRegistrationRequest): Promise<{ data?: VerifyRegistrationResponse; error?: string; status?: number }> {
    try {
      const API_BASE_URL = import.meta.env.VITE_POS_BASE_URL || "http://localhost:8081";
      const endpoint = `${API_BASE_URL}/api/auth/verify-registration`;
      
      const requestBody = { token: request.token };
      
      console.log('[customerApi.verifyRegistration] ===== VERIFICATION REQUEST =====');
      console.log('[customerApi.verifyRegistration] Endpoint:', endpoint);
      console.log('[customerApi.verifyRegistration] Method: POST');
      console.log('[customerApi.verifyRegistration] Headers:', { "Content-Type": "application/json" });
      console.log('[customerApi.verifyRegistration] Token length:', request.token ? request.token.length : 0);
      // Never log tokens. Preview is safe for debugging matching issues.
      console.log('[customerApi.verifyRegistration] Token preview:', request.token ? request.token.substring(0, 12) + '...' : 'NO TOKEN');
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[customerApi.verifyRegistration] ===== VERIFICATION RESPONSE =====');
      console.log('[customerApi.verifyRegistration] Status:', response.status);
      console.log('[customerApi.verifyRegistration] Status Text:', response.statusText);
      console.log('[customerApi.verifyRegistration] OK:', response.ok);
      console.log('[customerApi.verifyRegistration] Headers:', Object.fromEntries(response.headers.entries()));

      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
        // Don't log raw bodies that may contain secrets (JWT). Log shape only.
        console.log('[customerApi.verifyRegistration] Response keys:', data && typeof data === 'object' ? Object.keys(data) : typeof data);
        console.log('[customerApi.verifyRegistration] Response token present:', !!data?.token);
      } else {
        const text = await response.text();
        console.log('[customerApi.verifyRegistration] Response body (Non-JSON) length:', text?.length ?? 0);
        data = { message: text || "Verification failed", success: false };
      }

      // Check for success: 201 Created means account was created successfully
      // According to backend docs: Success = 201 with user data + token
      // CRITICAL: Only 201 Created is success, not 200 OK
      if (response.status !== 201) {
        console.log('[customerApi.verifyRegistration] ❌ Error response:', {
          status: response.status,
          ok: response.ok,
          message: data.message || data.error,
          fullData: data,
        });
        return {
          error: data.message || data.error || `HTTP error! status: ${response.status}`,
          status: response.status,
        };
      }

      // Success (201 Created) - account created, token returned
      // Backend returns: { id, firstName, lastName, email, phone, role, isActive, token, message, createdAt }
      // Note: Backend does NOT return "success: true" in success response
      const verifyData: VerifyRegistrationResponse = {
        message: data.message || "Registration verified successfully",
        success: true, // Always true if we reach here (201 status)
        token: data.token, // JWT token from backend
        user: {
          id: data.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName || "",
          role: (data.role || "CUSTOMER") as "CUSTOMER",
        },
      };

      console.log('[customerApi.verifyRegistration] ✅ Success! Parsed data:', {
        success: verifyData.success,
        hasToken: !!verifyData.token,
        hasUser: !!verifyData.user,
        tokenPreview: verifyData.token ? verifyData.token.substring(0, 20) + '...' : 'NO TOKEN',
        user: verifyData.user,
      });

      // Store token and user info automatically after successful verification
      if (verifyData.token && verifyData.user) {
        console.log('[customerApi.verifyRegistration] Saving token and user info...');
        setTokenForRole("CUSTOMER", verifyData.token);
        setUserInfo({
          id: verifyData.user.id,
          userId: verifyData.user.id,
          firstName: verifyData.user.firstName,
          lastName: verifyData.user.lastName,
          email: verifyData.user.email,
          phone: "",
          address: "",
          role: "CUSTOMER",
        });
        console.log('[customerApi.verifyRegistration] ✅ Token and user info saved!');
      } else {
        console.warn('[customerApi.verifyRegistration] ⚠️ Missing token or user data:', {
          hasToken: !!verifyData.token,
          hasUser: !!verifyData.user,
        });
      }

      return { data: verifyData, status: response.status };
    } catch (error) {
      console.error('[customerApi.verifyRegistration] Exception:', error);
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      };
    }
  },

  // ========== Email Verification APIs (for existing users) ==========

  /**
   * POST /api/auth/verify-email
   * Public endpoint - no auth required
   * Rate limit: 10 requests/min per IP
   */
  async verifyEmail(request: VerifyEmailRequest): Promise<{ data?: VerifyEmailResponse; error?: string; status?: number }> {
    try {
      const API_BASE_URL = import.meta.env.VITE_POS_BASE_URL || "http://localhost:8081";
      
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: request.token }),
      });

      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text || "Verification failed", success: false };
      }

      if (!response.ok) {
        return {
          error: data.message || `HTTP error! status: ${response.status}`,
          status: response.status,
        };
      }

      return { data, status: response.status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      };
    }
  },

  /**
   * POST /api/auth/resend-verification
   * Requires JWT Bearer token
   * Rate limit: 3 requests/hour per user
   */
  async resendVerification(): Promise<{ data?: ResendVerificationResponse; error?: string; status?: number }> {
    try {
      const API_BASE_URL = import.meta.env.VITE_POS_BASE_URL || "http://localhost:8081";
      const token = localStorage.getItem('authToken_CUSTOMER');
      
      if (!token) {
        return { error: "Authentication required", status: 401 };
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text || "Failed to resend verification", success: false };
      }

      if (!response.ok) {
        return {
          error: data.message || `HTTP error! status: ${response.status}`,
          status: response.status,
        };
      }

      return { data, status: response.status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      };
    }
  },

  // ========== Password Reset APIs ==========

  /**
   * POST /api/auth/forgot-password
   * Public endpoint - no auth required
   * Rate limit: 5 requests/hour per email, 10/hour per IP
   * Security: Always returns success to prevent email enumeration
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<{ data?: ForgotPasswordResponse; error?: string; status?: number }> {
    try {
      const API_BASE_URL = import.meta.env.VITE_POS_BASE_URL || "http://localhost:8081";
      
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: request.email }),
      });

      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text || "Failed to send reset link", success: false };
      }

      // Always show success for security (prevent email enumeration)
      // Even if email doesn't exist, backend returns success
      if (response.ok || response.status === 400) {
        return { data, status: response.status };
      }

      if (response.status === 429) {
        return {
          error: data.message || "Too many requests. Please try again later.",
          status: 429,
        };
      }

      return {
        error: data.message || `HTTP error! status: ${response.status}`,
        status: response.status,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      };
    }
  },

  /**
   * GET /api/auth/validate-reset-token?token={token}
   * Public endpoint - no auth required
   * Rate limit: 20 requests/min per IP
   * Optional: Pre-check token validity before showing reset form
   */
  async validateResetToken(token: string): Promise<{ data?: ValidateResetTokenResponse; error?: string; status?: number }> {
    try {
      const API_BASE_URL = import.meta.env.VITE_POS_BASE_URL || "http://localhost:8081";
      
      const response = await fetch(`${API_BASE_URL}/api/auth/validate-reset-token?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { valid: false, message: text || "Invalid token" };
      }

      if (!response.ok) {
        return {
          error: data.message || `HTTP error! status: ${response.status}`,
          status: response.status,
        };
      }

      return { data, status: response.status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      };
    }
  },

  /**
   * POST /api/auth/reset-password
   * Public endpoint - no auth required
   * Rate limit: 10 requests/hour per IP
   */
  async resetPassword(request: ResetPasswordRequest): Promise<{ data?: ResetPasswordResponse; error?: string; status?: number }> {
    try {
      const API_BASE_URL = import.meta.env.VITE_POS_BASE_URL || "http://localhost:8081";
      
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: request.token,
          newPassword: request.newPassword,
          confirmPassword: request.confirmPassword,
        }),
      });

      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text || "Password reset failed", success: false };
      }

      if (!response.ok) {
        return {
          error: data.message || `HTTP error! status: ${response.status}`,
          status: response.status,
        };
      }

      return { data, status: response.status };
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
    
    // Map backend row field names once: support forYou | recommendedForYou, popular, offers
    if (response.data?.rows) {
      const raw = response.data.rows as unknown as Record<string, unknown>;
      const recommendedForYou = Array.isArray(raw.recommendedForYou) ? raw.recommendedForYou : Array.isArray(raw.forYou) ? raw.forYou : [];
      const popular = Array.isArray(raw.popular) ? raw.popular : [];
      const offers = Array.isArray(raw.offers) ? raw.offers : [];
      (response.data as RecommendationsResponse).rows = { recommendedForYou, popular, offers };
    }

    console.log('[customerApi.getRecommendations] Response:', {
      status: response.status,
      hasData: !!response.data,
      dataStatus: response.data?.status,
      rowsRecommendedForYou: (response.data?.rows as RecommendationRows)?.recommendedForYou?.length,
      rowsPopular: (response.data?.rows as RecommendationRows)?.popular?.length,
      rowsOffers: (response.data?.rows as RecommendationRows)?.offers?.length,
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

    // Validate required fields: rows must have recommendedForYou, popular, offers (arrays)
    const rows = response.data.rows;
    if (!rows || !Array.isArray(rows.recommendedForYou) || !Array.isArray(rows.popular) || !Array.isArray(rows.offers)) {
      console.error('[customerApi.getRecommendations] Invalid response structure:', { hasRows: !!rows, data: response.data });
      return { error: "Invalid response structure", status: response.status };
    }

    const numRecommended = rows.recommendedForYou.length;
    const numPopular = rows.popular.length;
    const numOffers = rows.offers.length;
    const totalCount = numRecommended + numPopular + numOffers;

    console.log('[customerApi.getRecommendations] Success!', {
      status: response.data.status,
      numRecommendedForYou: numRecommended,
      numPopular,
      numOffers,
      totalCount,
      userSegment: response.data.meta?.userSegment,
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

