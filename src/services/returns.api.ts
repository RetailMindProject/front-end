import { apiClient } from "./api.client";

// Return Item Request
export interface ReturnItemRequest {
  originalOrderItemId: number;
  returnedQty: number;
}

// Refund Request
export interface RefundRequest {
  method: "CASH" | "CARD";
  amount: number;
}

// Create Return Request
export interface CreateReturnRequest {
  originalOrderId: number;
  sessionId?: number; // 0 means use current session
  items: ReturnItemRequest[];
  refunds: RefundRequest[];
}

// Return Item Response
export interface ReturnItemResponse {
  orderItemId: number;
  originalOrderItemId: number;
  returnedQty: number;
  refundAmount: number;
  productId: number;
  productName: string;
}

// Refund Response
export interface RefundResponse {
  id: number;
  method: "CASH" | "CARD";
  amount: number;
  refundedAt: string;
}

// Create Return Response
export interface CreateReturnResponse {
  returnOrderId: number;
  originalOrderId: number;
  totalRefund: number;
  items: ReturnItemResponse[];
  refunds: RefundResponse[];
  originalStatusAfter?: "PAID" | "PARTIALLY_RETURNED" | "RETURNED";
}

// Return Order Details Response
export interface ReturnOrderDetails {
  returnOrderId: number;
  originalOrderId: number;
  originalOrderNumber: string;
  customerId?: number | null;
  sessionId?: number;
  status: "COMPLETED" | "CANCELLED";
  totalRefund: number;
  createdAt: string;
  items: ReturnItemResponse[];
  refunds: RefundResponse[];
  createdBy?: {
    userId: number;
    userName: string;
  };
}

// Return Order List Item (for history page)
export interface ReturnOrderListItem {
  returnOrderId: number;
  originalOrderId: number;
  originalOrderNumber: string;
  totalRefund: number;
  createdAt: string;
  status: "COMPLETED" | "CANCELLED";
  createdBy: {
    userId: number;
    userName: string;
  };
  itemCount: number;
  refundMethods: string[]; // ["CASH", "CARD", etc.]
}

export const returnsApi = {
  /**
   * Create Return + Refund
   * POST /api/returns
   * Headers: X-Browser-Token (sent via cookies), Content-Type: application/json
   * Body: {
   *   originalOrderId: number,
   *   sessionId: 0 (means use current session),
   *   items: [{ originalOrderItemId, returnedQty }],
   *   refunds: [{ method: "CASH"|"CARD", amount }]
   * }
   * Response: {
   *   returnOrderId,
   *   originalOrderId,
   *   totalRefund,
   *   items[],
   *   refunds[],
   *   originalStatusAfter (optional)
   * }
   */
  async createReturn(
    request: CreateReturnRequest
  ): Promise<{ data?: CreateReturnResponse; error?: string }> {
    // Build request body exactly as required
    // NOTE: Backend ignores sessionId and uses current open session automatically
    // Browser must be paired with terminal and have an open session
    // Requirements before POST:
    // 1. Browser must be paired with terminal (Browser Token exists)
    // 2. Must have an open session
    // If not paired: 400 { error: "No terminal is paired with this browser" }
    // If no open session: 400 { error: "No open session. Please start a session first." }
    const requestBody = {
      originalOrderId: request.originalOrderId,
      sessionId: request.sessionId ?? 0, // Send 0 (backend ignores it and uses current session)
      items: request.items,
      refunds: request.refunds,
    };

    console.log("🚀 POST /api/returns");
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    console.log("originalOrderId value:", requestBody.originalOrderId);
    console.log("items count:", requestBody.items.length);
    console.log("refunds count:", requestBody.refunds.length);

    const response = await apiClient.post<CreateReturnResponse>(
      "/api/returns",
      requestBody
    );

    console.log("Response status:", response.status);
    console.log("Response data:", response.data);
    console.log("Response error:", response.error);

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No return data received" };
    }

    return { data: response.data };
  },

  /**
   * Get return orders list (summary of orders with returns)
   * GET /api/returns/orders?limit=10&offset=0&from=YYYY-MM-DD&to=YYYY-MM-DD&q=TEXT
   * Headers: X-Browser-Token (sent via cookies)
   * 
   * Response shape (NOT Array):
   * {
   *   items: ReturnOrderSummary[],
   *   total: number,
   *   limit: number,
   *   offset: number
   * }
   * 
   * Therefore, we need to map on response.items, not on response itself.
   */
  async getReturnOrders(params: {
    limit?: number;
    offset?: number;
    from?: string; // YYYY-MM-DD
    to?: string; // YYYY-MM-DD
    q?: string; // Search text
  }): Promise<{ data?: ReturnOrderSummary[]; error?: string }> {
    const queryParams = new URLSearchParams();
    if (params.limit !== undefined) queryParams.append("limit", String(params.limit));
    if (params.offset !== undefined) queryParams.append("offset", String(params.offset));
    if (params.from) queryParams.append("from", params.from);
    if (params.to) queryParams.append("to", params.to);
    if (params.q) queryParams.append("q", params.q);

    const queryString = queryParams.toString();
    const endpoint = `/api/returns/orders${queryString ? `?${queryString}` : ""}`;

    // API returns Object with items array, not array directly
    interface ReturnOrdersResponse {
      items: ReturnOrderSummary[];
      total: number;
      limit: number;
      offset: number;
    }

    const response = await apiClient.get<ReturnOrdersResponse>(endpoint);

    if (response.error) {
      return { error: response.error };
    }

    // Extract items from response object with safe fallback
    const orders = Array.isArray(response.data?.items) ? response.data.items : [];
    return { data: orders };
  },

  /**
   * Get returns for a specific order
   * GET /api/orders/{orderId}/returns
   * Headers: X-Browser-Token (sent via cookies)
   * Response: OrderReturnSummary[]
   */
  async getOrderReturns(orderId: number): Promise<{ data?: OrderReturnSummary[]; error?: string }> {
    const response = await apiClient.get<OrderReturnSummary[]>(`/api/orders/${orderId}/returns`);

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data || [] };
  },

  /**
   * Get return order details
   * GET /api/returns/{returnOrderId}
   * Headers: X-Browser-Token (sent via cookies)
   * Response: Return order + return_items + refunds
   */
  async getReturnDetails(
    returnOrderId: number
  ): Promise<{ data?: ReturnOrderDetails; error?: string }> {
    const response = await apiClient.get<ReturnOrderDetails>(
      `/api/returns/${returnOrderId}`
    );

    if (response.error) {
      return { error: response.error };
    }

    if (!response.data) {
      return { error: "No return data received" };
    }

    return { data: response.data };
  },
};

// Return Order Summary (from GET /api/returns/orders)
export interface ReturnOrderSummary {
  orderId: number;
  orderNumber: string;
  orderDate: string;
  customerName: string | null;
  totalPaid: number;
  returnCount: number;
  totalReturned: number;
  lastReturnAt: string;
}

// Order Return Summary (from GET /api/orders/{orderId}/returns)
export interface OrderReturnSummary {
  returnOrderId: number;
  returnOrderNumber: string;
  createdAt: string;
  totalRefund: number;
  itemCount: number;
}

