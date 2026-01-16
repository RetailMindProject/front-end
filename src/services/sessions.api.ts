import { storeManagerApiClient, ceoApiClient, cashierApiClient } from "./api.client";

// Sessions List Response (for Sessions page)
export interface SessionListItem {
  cashierId: number;
  firstName: string;
  lastName: string;
  email: string;
  sessionId: number | null;
  openedAt: string | null;
  status: "OPEN" | "CLOSED" | null;
  ordersCount: number;
  totalSales: number;
}

// Cashier Detail Response (for Cashier Detail page)
// The API returns data in nested structure
export interface CashierDetailResponse {
  cashierInfo: {
    cashierId: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    active: boolean;
  };
  sessionInfo: {
    sessionId: number | null;
    openedAt: string | null;
    openingFloat: number | null;
    closingAmount: number | null;
  };
  performance: {
    totalOrders: number;
    totalSales: number;
    cashIn: number;
    cardIn: number;
  };
  recentTransactions: RecentTransaction[];
}

export interface RecentTransaction {
  orderNumber: string;
  time: string;
  amount: number;
}

// Transformed cashier detail for component use (flat structure)
export interface CashierDetailTransformed {
  cashierId: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  sessionId: number | null;
  openedAt: string | null;
  openingFloat: number | null;
  closingAmount: number | null;
  totalOrders: number;
  totalSales: number;
  cashIn: number;
  cardIn: number;
  transactions: RecentTransaction[];
}

export interface SessionFilters {
  cashierName?: string;
  date?: string; // ISO date string (YYYY-MM-DD)
  time?: string; // Time string (HH:mm)
  status?: string; // "OPEN" | "CLOSED" | "ALL"
}

// Current Session Response (GET /api/sessions/cashier/session/current)
export interface CurrentSessionResponse {
  sessionId: number;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  openingFloat: number;
  userId: number;
  userName: string;
  terminalId: number;
  terminalCode: string;
  terminalDescription: string;
  pairedAt: string | null;
  message: string | null;
  paired: boolean;
}

// Session Status Response (GET /api/sessions/cashier/session/status)
export interface SessionStatusResponse {
  sessionId: number;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  closingAmount: number | null;
  terminalId: number;
  terminalCode: string;
  terminalDescription: string;
  hoursOpen: number;
  needsRotation: boolean;
}

// Close Session Request (PUT /api/sessions/{sessionId}/close)
export interface CloseSessionRequest {
  closingAmount: number;
}

// Close Cashier Session Response (POST /api/sessions/cashier/session/close)
export interface CloseCashierSessionResponse {
  message: string;
  closedSessionId: number;
}

export const sessionsApi = {
  /**
   * Fetch all sessions with cashier information
   * GET /api/sessions
   * Access: CEO, STORE_MANAGER
   * Auth: JWT فقط
   * @param filters - Optional filters for cashierName, date, time, status
   * Returns list of cashiers with their session data
   */
  async fetchSessions(filters?: SessionFilters): Promise<SessionListItem[] | null> {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    if (filters?.cashierName) {
      queryParams.append("cashierName", filters.cashierName);
    }
    if (filters?.date) {
      queryParams.append("date", filters.date);
    }
    if (filters?.time) {
      queryParams.append("time", filters.time);
    }
    if (filters?.status) {
      queryParams.append("status", filters.status);
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/sessions?${queryString}` : "/api/sessions";
    
    console.log("Fetching sessions from:", endpoint);
    
    // Use storeManagerApiClient (works for both STORE_MANAGER and CEO)
    const response = await storeManagerApiClient.get<SessionListItem[]>(endpoint);

    if (response.error) {
      if (response.status === 403) {
        console.error("403 Forbidden:", response.error);
        return null;
      }
      console.error("Failed to fetch sessions:", response.error);
      return null;
    }

    console.log("Sessions API response:", response.data);
    return Array.isArray(response.data) ? response.data : null;
  },

  /**
   * Fetch detailed information for a specific cashier session
   * GET /api/sessions/{id}
   * Access: Public (browser token handled backend-side)
   * Auth: لا يحتاج JWT
   */
  async fetchCashierDetail(sessionId: number): Promise<CashierDetailResponse | null> {
    const endpoint = `/api/sessions/${sessionId}`;
    console.log("Fetching cashier detail from:", endpoint);
    
    // Public endpoint - no JWT needed, browser token handled by backend
    try {
      const response = await fetch(`http://localhost:8081${endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Send browser token via cookies
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch cashier detail:", errorText);
        return null;
      }

      const data = await response.json();
      console.log("Cashier detail API response:", data);
      return data;
    } catch (error) {
      console.error("Error fetching cashier detail:", error);
      return null;
    }
  },

  /**
   * Fetch only active sessions
   * GET /api/sessions/active
   * Access: CEO, STORE_MANAGER
   * Auth: JWT فقط (لا Browser Token)
   */
  async fetchActiveSessions(): Promise<SessionListItem[] | null> {
    console.log("Fetching active sessions from: /api/sessions/active");
    
    // Use storeManagerApiClient (works for both STORE_MANAGER and CEO)
    const response = await storeManagerApiClient.get<SessionListItem[]>("/api/sessions/active");

    if (response.error) {
      if (response.status === 403) {
        console.error("403 Forbidden:", response.error);
        return null;
      }
      console.error("Failed to fetch active sessions:", response.error);
      return null;
    }

    console.log("Active sessions API response:", response.data);
    return Array.isArray(response.data) ? response.data : null;
  },

  /**
   * Get current cashier session
   * GET /api/sessions/cashier/session/current
   * يُستخدم عند تحميل التطبيق أو بعد الـ login لجلب الجلسة النشطة الحالية للكاشير
   */
  async getCurrentSession(): Promise<{ data?: CurrentSessionResponse; error?: string; status: number }> {
    const endpoint = "/api/sessions/cashier/session/current";
    console.log("Fetching current session from:", endpoint);
    const response = await cashierApiClient.get<CurrentSessionResponse>(endpoint);
    
    if (response.status === 404) {
      console.warn("No active cashier session (404)." );
      return { status: 404 };
    }
    
    if (response.error) {
      console.error("Failed to fetch current session:", response.error);
      return { error: response.error, status: response.status };
    }
    
    if (!response.data) {
      console.error("No data in current session response");
      return { error: "No session data received", status: response.status };
    }
    
    return { data: response.data, status: response.status };
  },

  /**
   * Get session status
   * GET /api/sessions/cashier/session/status
   * يُستخدم للمراقبة الدورية أثناء العمل لمعرفة حالة الجلسة
   */
  async getSessionStatus(): Promise<{ data?: SessionStatusResponse; error?: string }> {
    const endpoint = "/api/sessions/cashier/session/status";
    console.log("Fetching session status from:", endpoint);
    const response = await cashierApiClient.get<SessionStatusResponse>(endpoint);
    
    if (response.error) {
      console.error("Failed to fetch session status:", response.error);
      return { error: response.error };
    }
    
    if (!response.data) {
      console.error("No data in session status response");
      return { error: "No session status data received" };
    }
    
    return { data: response.data };
  },

  /**
   * Close a session (CEO-only)
   * POST /api/sessions/{id}/close
   * Access: CEO فقط
   * Auth: JWT (ROLE_CEO)
   */
  async closeSession(
    sessionId: number,
    closingAmount: number
  ): Promise<{ data?: { success: boolean; message?: string }; error?: string; status?: number }> {
    const endpoint = `/api/sessions/${sessionId}/close`;
    const body: CloseSessionRequest = { closingAmount };
    
    console.log(`Closing session ${sessionId} with closing amount ${closingAmount}`);
    
    // Use ceoApiClient for CEO-only operations
    const response = await ceoApiClient.post<{ success: boolean; message?: string }>(endpoint, body);

    if (response.error) {
      if (response.status === 403) {
        return { error: "Access denied. CEO role required.", status: 403 };
      }
      return { error: response.error, status: response.status };
    }

    return { data: { success: true, ...response.data }, status: response.status };
  },

  /**
   * Close current cashier session
   * POST /api/sessions/cashier/session/close
   * يُستخدم من واجهة الكاشير لإغلاق الجلسة الحالية بإرسال closingAmount فقط
   */
  async closeCashierSession(
    closingAmount: number
  ): Promise<{ data?: CloseCashierSessionResponse; error?: string }> {
    const endpoint = "/api/sessions/cashier/session/close";
    const body: CloseSessionRequest = { closingAmount };

    console.log(`Closing cashier session with closing amount ${closingAmount}`);
    const response = await cashierApiClient.post<CloseCashierSessionResponse>(endpoint, body);

    if (response.error) {
      console.error("Failed to close cashier session:", response.error);
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No response data received while closing session" };
    }

    return { data: response.data };
  },
};

