import { apiClient, storeManagerApiClient } from "./api.client";
import { sessionsApi } from "./sessions.api";
import { getUserInfo, getCurrentToken, decodeJWT } from "./tokens";
import { getCurrentUserProfile } from "./auth.api";

// Cashier Login Response
export interface CashierLoginResponse {
  userId: number;
  token: string;
  role: string;
}

// Last Session Info Response
export interface LastSessionInfoResponse {
  closingAmount: number | null;
  closedAt: string | null;
}

// Terminal Info
export interface Terminal {
  id: number;
  code: string;
  description: string;
  isActive: boolean;
  hasActiveSession: boolean;
}

// Terminal Management Request/Response
export interface CreateTerminalRequest {
  code: string;
  description: string;
}

export interface UpdateTerminalRequest {
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface TerminalManagementResponse {
  id: number;
  code: string;
  description: string;
  isActive: boolean;
  hasActiveSession?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Open Session Request
export interface OpenSessionRequest {
  terminalId: number;
  openingFloat: number;
}

// Session Response (from backend)
export interface SessionResponse {
  sessionId: number;
  terminalId: number;
  terminalCode: string;
  userId: number;
  userName: string;
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  closingAmount: number | null;
  status: "OPEN" | "CLOSED";
}

// Open Session Response (transformed)
export interface OpenSessionResponse {
  sessionId: number;
  status: string;
}

// Pairing Code Request
export interface PairingCodeRequest {
  terminalId: number;
  validityMinutes: number;
}

// Pairing Code Response
export interface PairingCodeResponse {
  terminalId: number;
  terminalCode: string;
  pairingCode: string;
  expiresAt: string;
  validityMinutes: number;
  message: string;
}

// Pair Terminal Request
export interface PairTerminalRequest {
  pairingCode: string;
  terminalId?: number; // Optional, backend may infer from pairing code
  forceOverride?: boolean;
}

// Pair Terminal Response
export interface PairTerminalResponse {
  terminalId: number;
  terminalCode: string;
  isPaired: boolean;
  terminalDescription?: string;
  sessionId?: number;
  sessionStatus?: "OPEN" | "CLOSED";
  openingFloat?: number;
  message?: string;
}

export interface UnpairResponse {
  message: string;
}

// Pairing Request Types
export interface CreatePairingRequestRequest {
  terminalId: number;
}

export interface PairingRequestResponse {
  id: number;
  terminalId: number;
  terminalCode: string;
  terminalDescription: string;
  requestedBy: number;
  requestedByName: string;
  issuedAt: string;
  expiresAt: string;
  status: "PENDING" | "USED" | "REJECTED" | "EXPIRED";
  message?: string;
  approvedBy?: number;
  approvedByName?: string;
  approvedAt?: string;
  rejectedReason?: string;
}

export interface PairingRequestStatusResponse {
  id: number;
  terminalId: number;
  status: "PENDING" | "USED" | "REJECTED" | "EXPIRED";
  message: string;
}

export interface RejectPairingRequestRequest {
  reason?: string;
}

export const terminalApi = {
  /**
   * Cashier Login
   * POST /api/auth/login
   */
  async cashierLogin(
    email: string,
    password: string
  ): Promise<{ data?: CashierLoginResponse; error?: string }> {
    try {
      const response = await fetch("http://localhost:8081/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text || "An error occurred" };
      }

      if (!response.ok) {
        return {
          error: data.message || `HTTP error! status: ${response.status}`,
        };
      }

      // Transform response to match expected format
      const loginData: CashierLoginResponse = {
        userId: data.userId || data.id || 0,
        token: data.token || data.accessToken || data.access_token || "",
        role: data.role || "CASHIER",
      };

      return { data: loginData };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
      };
    }
  },

  /**
   * Get Last Session Info
   * Uses /api/sessions API to get the last closed session for the current cashier
   * Note: /api/terminal/last-session-info endpoint is not implemented in backend yet
   */
  async getLastSessionInfo(): Promise<{
    data?: LastSessionInfoResponse;
    error?: string;
  }> {
    // Use sessions API directly since /api/terminal/last-session-info is not implemented
    try {
      const userInfo = getUserInfo();
      if (!userInfo?.email) {
        return { error: "User not logged in" };
      }

      // Get all closed sessions and find the last one for this cashier
      const allSessions = await sessionsApi.fetchSessions({ status: "CLOSED" });
      
      if (!allSessions || allSessions.length === 0) {
        // No previous sessions found
        return { data: { closingAmount: null, closedAt: null } };
      }

      // Find sessions for this cashier
      const cashierSessions = allSessions.filter(
        (s) => s.email === userInfo.email
      );

      if (cashierSessions.length === 0) {
        return { data: { closingAmount: null, closedAt: null } };
      }

      // Get the most recent closed session (sort by openedAt descending)
      const lastSession = cashierSessions.sort((a, b) => {
        if (!a.openedAt || !b.openedAt) return 0;
        return new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime();
      })[0];

      // Get detailed info for the last session to get closingAmount and closedAt
      if (lastSession.sessionId) {
        const detail = await sessionsApi.fetchCashierDetail(lastSession.sessionId);
        if (detail?.sessionInfo) {
          return {
            data: {
              closingAmount: detail.sessionInfo.closingAmount,
              closedAt: detail.sessionInfo.closingAmount !== null 
                ? (detail.sessionInfo.openedAt || null) 
                : null,
            },
          };
        }
      }

      return { data: { closingAmount: null, closedAt: null } };
    } catch (err) {
      console.error("Error getting last session info:", err);
      // Don't throw error, just return null data so user can proceed
      return { data: { closingAmount: null, closedAt: null } };
    }
  },

  /**
   * Get Available Terminals
   * GET /api/terminal/available
   * Returns terminals with structure: { id, code, description, isActive, hasActiveSession }
   */
  async getAvailableTerminals(): Promise<{
    data?: Terminal[];
    error?: string;
  }> {
    const response = await apiClient.get<Terminal[]>("/api/terminal/available");

    if (response.error) {
      return { error: response.error };
    }

    // Filter to show only active terminals that don't have active sessions
    // Or show all active terminals depending on business logic
    const terminals = response.data || [];
    const availableTerminals = terminals.filter(
      (t) => t.isActive && !t.hasActiveSession
    );

    // If no terminals without active sessions, return all active terminals
    // (user can still select, backend will handle the validation)
    return {
      data: availableTerminals.length > 0 ? availableTerminals : terminals.filter((t) => t.isActive),
    };
  },

  /**
   * Get userId from UserInfo, JWT token, or API
   */
  async getCurrentUserId(): Promise<number | null> {
    // First try to get from UserInfo (saved during login)
    const userInfo = getUserInfo();
    if (userInfo?.id) return userInfo.id;
    if (userInfo?.userId) return userInfo.userId;

    // Fallback: try to get from JWT token
    const token = getCurrentToken();
    if (token) {
      const decoded = decodeJWT(token);
      if (decoded) {
        let userId = decoded.userId || decoded.user_id || decoded.sub || decoded.id || decoded.user?.id;
        
        if (typeof userId === 'number') return userId;
        if (typeof userId === 'string') {
          const parsed = parseInt(userId, 10);
          if (!isNaN(parsed)) return parsed;
        }
      }
    }

    // Last resort: try to get from /api/auth/me endpoint
    try {
      const profile = await getCurrentUserProfile();
      if (profile.data?.id) {
        return profile.data.id;
      }
    } catch (err) {
      console.error("Failed to get userId from /api/auth/me:", err);
    }
    
    return null;
  },

  /**
   * Check Pairing Status
   * GET /api/terminal/pairing-status
   * Returns whether the current browser is paired with a terminal
   * Response: { isPaired: boolean, terminalId?: number, terminalCode?: string }
   */
  async checkPairingStatus(): Promise<{
    data?: { isPaired: boolean; terminalId?: number; terminalCode?: string };
    error?: string;
  }> {
    const response = await apiClient.get<{
      isPaired: boolean;
      terminalId?: number;
      terminalCode?: string;
    }>("/api/terminal/pairing-status");

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { data: { isPaired: false } };
    }

    return { data: response.data };
  },

  /**
   * Generate Pairing Code
   * POST /api/terminal/pairing-code
   * Request body: { terminalId: number, validityMinutes: number }
   * Response: PairingCodeResponse with pairingCode, expiresAt, etc.
   */
  async generatePairingCode(
    request: PairingCodeRequest
  ): Promise<{ data?: PairingCodeResponse; error?: string }> {
    const response = await apiClient.post<PairingCodeResponse>(
      "/api/terminal/pairing-code",
      {
        terminalId: request.terminalId,
        validityMinutes: request.validityMinutes,
      }
    );

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No data received from server" };
    }

    return { data: response.data };
  },

  /**
   * Pair Terminal with Pairing Code
   * POST /api/terminal/pair
   * Headers: X-Browser-Token (sent via cookies with credentials: 'include')
   * Request body: { pairingCode: string }
   * Response: { terminalId, terminalCode, isPaired: true }
   */
  async pairTerminal(
    request: PairTerminalRequest
  ): Promise<{ data?: PairTerminalResponse; error?: string; status?: number }> {
    // Use pairingCode from request (terminalId is optional, backend may infer from pairing code)
    const response = await apiClient.post<PairTerminalResponse>(
      "/api/terminal/pair",
      {
        pairingCode: request.pairingCode,
        ...(request.terminalId && { terminalId: request.terminalId }),
        ...(request.forceOverride && { forceOverride: request.forceOverride }),
      }
    );

    if (response.status === 409) {
      return {
        error: response.error || "Terminal already paired with another browser",
        status: 409,
      };
    }

    if (response.error) {
      return { error: response.error, status: response.status };
    }

    if (!response.data) {
      return { error: "No data received from server", status: response.status };
    }

    return { data: response.data, status: response.status };
  },

  /**
   * Open New Session
   * POST /api/terminal/session/open
   * Request body: { terminalId: number, openingFloat: number, userId: number }
   * Response: SessionResponse with sessionId, status, etc.
   */
  async openSession(
    request: OpenSessionRequest
  ): Promise<{ data?: OpenSessionResponse; error?: string }> {
    // Get userId from UserInfo, JWT token, or API
    const userId = await this.getCurrentUserId();
    
    if (!userId) {
      return { error: "User ID not found. Please login again." };
    }

    const response = await apiClient.post<SessionResponse>(
      "/api/terminal/session/open",
      {
        terminalId: request.terminalId,
        openingFloat: request.openingFloat,
        userId: userId,
      }
    );

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No data received from server" };
    }

    // Transform backend response to our expected format
    return {
      data: {
        sessionId: response.data.sessionId,
        status: response.data.status,
      },
    };
  },

  /**
   * Unpair current browser from its terminal
   * DELETE /api/terminal/unpair
   */
  async unpairTerminal(): Promise<{ data?: UnpairResponse; error?: string }> {
    const response = await apiClient.delete<UnpairResponse>("/api/terminal/unpair");

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No data received from server" };
    }

    return { data: response.data };
  },

  /**
   * Create Terminal (STORE_MANAGER or CEO only)
   * POST /api/terminal/management
   * Request body: { code: string, description: string }
   * Response: TerminalManagementResponse
   */
  async createTerminal(
    request: CreateTerminalRequest
  ): Promise<{ data?: TerminalManagementResponse; error?: string }> {
    const response = await storeManagerApiClient.post<TerminalManagementResponse>(
      "/api/terminal/management",
      {
        code: request.code,
        description: request.description,
      }
    );

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No data received from server" };
    }

    return { data: response.data };
  },

  /**
   * Get All Terminals (STORE_MANAGER or CEO only)
   * GET /api/terminal/management
   * Response: TerminalManagementResponse[]
   */
  async getAllTerminals(): Promise<{
    data?: TerminalManagementResponse[];
    error?: string;
  }> {
    const response = await storeManagerApiClient.get<TerminalManagementResponse[]>(
      "/api/terminal/management"
    );

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data || [] };
  },

  /**
   * Get Terminal by ID (STORE_MANAGER or CEO only)
   * GET /api/terminal/management/{id}
   * Response: TerminalManagementResponse
   */
  async getTerminalById(
    id: number
  ): Promise<{ data?: TerminalManagementResponse; error?: string }> {
    const response = await storeManagerApiClient.get<TerminalManagementResponse>(
      `/api/terminal/management/${id}`
    );

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No data received from server" };
    }

    return { data: response.data };
  },

  /**
   * Update Terminal (STORE_MANAGER or CEO only)
   * PUT /api/terminal/management/{id}
   * Request body: { code?: string, description?: string, isActive?: boolean }
   * Response: TerminalManagementResponse
   */
  async updateTerminal(
    id: number,
    request: UpdateTerminalRequest
  ): Promise<{ data?: TerminalManagementResponse; error?: string }> {
    const response = await storeManagerApiClient.put<TerminalManagementResponse>(
      `/api/terminal/management/${id}`,
      {
        code: request.code,
        description: request.description,
        isActive: request.isActive,
      }
    );

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No data received from server" };
    }

    return { data: response.data };
  },

  /**
   * Delete Terminal (STORE_MANAGER or CEO only)
   * DELETE /api/terminal/management/{id}
   * This performs a soft delete (sets isActive = false)
   * Response: { message: string } or TerminalManagementResponse
   */
  async deleteTerminal(
    id: number
  ): Promise<{ data?: { message: string } | TerminalManagementResponse; error?: string }> {
    const response = await storeManagerApiClient.delete<{ message: string } | TerminalManagementResponse>(
      `/api/terminal/management/${id}`
    );

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No data received from server" };
    }

    return { data: response.data };
  },

  /**
   * Activate/Deactivate Terminal (STORE_MANAGER or CEO only)
   * PUT /api/terminal/management/{id}/activate
   * Toggles the terminal status between active and inactive
   * Response: TerminalManagementResponse
   */
  async toggleTerminalStatus(
    id: number
  ): Promise<{ data?: TerminalManagementResponse; error?: string }> {
    const response = await storeManagerApiClient.put<TerminalManagementResponse>(
      `/api/terminal/management/${id}/activate`
    );

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No data received from server" };
    }

    return { data: response.data };
  },

  /**
   * Create Pairing Request (Cashier)
   * POST /api/pairing-requests
   * Body: { terminalId: number }
   * Auth: JWT token in Authorization header + credentials: include (browser token)
   */
  async createPairingRequest(
    request: CreatePairingRequestRequest
  ): Promise<{ data?: PairingRequestResponse; error?: string; status?: number }> {
    try {
      // Get JWT token for cashier
      const token = getCurrentToken();
      if (!token) {
        return {
          error: "JWT token not found. Please login again.",
          status: 401,
        };
      }

      // Validate that token is a JWT
      if (token.split('.').length !== 3) {
        return {
          error: "Invalid JWT token format. Please login again.",
          status: 401,
        };
      }

      console.log("Creating pairing request for terminal:", request.terminalId);
      
      // Send JWT in Authorization header + browser token in cookies
      const response = await fetch("http://localhost:8081/api/pairing-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // JWT token required by backend
        },
        body: JSON.stringify({ terminalId: request.terminalId }),
        credentials: 'include', // Also send browser token via cookies
        mode: 'cors',
      });
      
      console.log("Pairing request response status:", response.status);

      if (!response.ok) {
        if (response.status === 401) {
          const errorText = await response.text();
          let errorMessage = "Unauthorized. Please make sure you are logged in as a cashier.";
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            if (errorText) errorMessage = errorText;
          }
          return {
            error: errorMessage,
            status: 401,
          };
        }
        
        if (response.status === 409) {
          const errorData = await response.json().catch(() => ({ error: "Conflict" }));
          return {
            error: errorData.error || "You already have a pending pairing request. Please wait for approval.",
            status: 409,
          };
        }
        
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }
        return { error: errorMessage, status: response.status };
      }

      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      };
    }
  },

  /**
   * Get Pairing Request Status (Cashier - Polling)
   * GET /api/pairing-requests/status?terminalId={id}
   * Auth: credentials: include (browser token)
   */
  async getPairingRequestStatus(
    terminalId: number
  ): Promise<{ data?: PairingRequestStatusResponse; error?: string }> {
    try {
      const response = await fetch(
        `http://localhost:8081/api/pairing-requests/status?terminalId=${terminalId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include', // Send browser token
        }
      );

      if (response.status === 404) {
        return { error: "No pairing request found" };
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }
        return { error: errorMessage };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Network error occurred",
      };
    }
  },

  /**
   * Get Pending Pairing Requests (Store Manager)
   * GET /api/pairing-requests/pending
   * Auth: JWT (STORE_MANAGER or CEO)
   */
  async getPendingPairingRequests(): Promise<{
    data?: PairingRequestResponse[];
    error?: string;
  }> {
    const response = await storeManagerApiClient.get<PairingRequestResponse[]>(
      "/api/pairing-requests/pending"
    );

    if (response.error) {
      return { error: response.error };
    }

    return { data: Array.isArray(response.data) ? response.data : [] };
  },

  /**
   * Approve Pairing Request (Store Manager)
   * POST /api/pairing-requests/{id}/approve
   * Auth: JWT (STORE_MANAGER or CEO)
   */
  async approvePairingRequest(
    requestId: number
  ): Promise<{ data?: PairingRequestResponse; error?: string }> {
    const response = await storeManagerApiClient.post<PairingRequestResponse>(
      `/api/pairing-requests/${requestId}/approve`
    );

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * Reject Pairing Request (Store Manager)
   * POST /api/pairing-requests/{id}/reject
   * Body: { reason?: string }
   * Auth: JWT (STORE_MANAGER or CEO)
   */
  async rejectPairingRequest(
    requestId: number,
    reason?: string
  ): Promise<{ data?: PairingRequestResponse; error?: string }> {
    const response = await storeManagerApiClient.post<PairingRequestResponse>(
      `/api/pairing-requests/${requestId}/reject`,
      { reason: reason || "" }
    );

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * Get current open session for paired terminal
   * GET /api/cashier/session/current
   * Headers: X-Browser-Token (sent via cookies)
   * Response: { sessionId, status=OPEN, terminalId, userId }
   */
  async getCurrentOpenSession(): Promise<{
    data?: {
      sessionId: number;
      status: "OPEN";
      terminalId: number;
      userId: number;
    };
    error?: string;
  }> {
    const response = await apiClient.get<{
      sessionId: number;
      status: "OPEN" | "CLOSED";
      terminalId: number;
      userId: number;
    }>("/api/cashier/session/current");

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No session data received" };
    }

    // Filter to only return OPEN sessions
    if (response.data.status !== "OPEN") {
      return { error: "No open session found" };
    }

    // Type assertion since we've verified status is "OPEN"
    return { 
      data: {
        sessionId: response.data.sessionId,
        status: "OPEN" as const,
        terminalId: response.data.terminalId,
        userId: response.data.userId,
      }
    };
  },

  /**
   * Open session (if none exists)
   * POST /api/cashier/session/open
   * Headers: X-Browser-Token (sent via cookies)
   * Body: { openingFloat?: number } (optional, may have default)
   * Response: { sessionId, status=OPEN }
   */
  async openCashierSession(openingFloat?: number): Promise<{
    data?: { sessionId: number; status: "OPEN" };
    error?: string;
  }> {
    const response = await apiClient.post<{
      sessionId: number;
      status: "OPEN";
    }>("/api/cashier/session/open", {
      ...(openingFloat !== undefined && { openingFloat }),
    });

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No session data received" };
    }

    return { data: response.data };
  },
};

