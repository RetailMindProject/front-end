import { apiClient } from "./api.client";

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

export const sessionsApi = {
  /**
   * Fetch all sessions with cashier information
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
    const response = await apiClient.get<SessionListItem[]>(endpoint);
    
    console.log("Sessions API response:", response);
    
    if (response.error) {
      console.error("Failed to fetch sessions:", response.error);
      return null;
    }
    
    if (!response.data) {
      console.error("No data in response");
      return null;
    }
    
    return response.data;
  },

  /**
   * Fetch detailed information for a specific cashier session
   * @param sessionId - The ID of the session
   */
  async fetchCashierDetail(sessionId: number): Promise<CashierDetailResponse | null> {
    const endpoint = `/api/sessions/${sessionId}`;
    console.log("Fetching cashier detail from:", endpoint);
    const response = await apiClient.get<CashierDetailResponse>(endpoint);
    
    console.log("Cashier detail API response:", response);
    
    if (response.error) {
      console.error("Failed to fetch cashier detail:", response.error);
      return null;
    }
    
    if (!response.data) {
      console.error("No data in cashier detail response");
      return null;
    }
    
    return response.data;
  },

  /**
   * Fetch only active sessions
   */
  async fetchActiveSessions(): Promise<SessionListItem[] | null> {
    console.log("Fetching active sessions from: /api/sessions/active");
    const response = await apiClient.get<SessionListItem[]>("/api/sessions/active");
    
    console.log("Active sessions API response:", response);
    
    if (response.error) {
      console.error("Failed to fetch active sessions:", response.error);
      return null;
    }
    
    if (!response.data) {
      console.error("No data in active sessions response");
      return null;
    }
    
    return response.data;
  },
};

