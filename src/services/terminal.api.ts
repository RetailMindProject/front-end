import { apiClient } from "./api.client";
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
};

