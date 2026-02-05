import { apiClient } from "./api.client";

// Order Item
export interface OrderItem {
  id: number;
  productId: number;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  lineTotal: number;
  offerId?: number | null; // ID of the offer applied to this item (if any)
  offerTitle?: string | null; // Title of the offer applied to this item (if any)
  originalLineTotal?: number; // Original line total before any discounts
}

// Payment
export interface Payment {
  id: number;
  paymentMethod: "CASH" | "CARD";
  amount: number;
  paidAt: string;
}

// Order Response
export interface Order {
  id: number;
  orderNumber: string;
  sessionId: number;
  status: "DRAFT" | "PAID" | "CANCELLED" | "HELD"; // أضفت HELD عشان يطابق الباك
  customerName: string | null;
  customerPhone: string | null;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  payments: Payment[];
  amountPaid: number;
  changeAmount: number;
  createdAt: string;
  paidAt: string | null;
  notes: string | null;
}

// Order History Item (simplified)
export interface OrderHistoryItem {
  id: number;
  orderNumber: string;
  status: "DRAFT" | "PAID" | "CANCELLED" | "HELD";
  customerName: string | null;
  itemCount: number;
  grandTotal: number;
  paymentMethod: "CASH" | "CARD" | "SPLIT";
  createdAt: string;
  paidAt: string | null;
}

// Add Item Request
export interface AddItemRequest {
  orderId: number;
  productId: number;
  quantity: number;       // في addItem: هذه ممكن تكون الكمية الأولية (مثلاً 1)
  discountAmount?: number;
}

/**
 * Update Item Request (increment quantity)
 * ملاحظة:
 * - quantity هنا تمثل مقدار الزيادة (delta) على الكمية الحالية.
 *   مثلاً:
 *   الكمية الحالية = 5
 *   quantity = 1  → الكمية الجديدة = 6
 */
export interface UpdateItemRequest {
  orderId: number;
  productId: number;
  quantity: number;       // delta (increment), مش الكمية النهائية
}

// Payment Request - CASH or CARD
export interface PaymentRequest {
  orderId: number;
  paymentMethod: "CASH" | "CARD";
  amount: number;
}

// Payment Request - SPLIT
export interface SplitPaymentRequest {
  orderId: number;
  paymentMethod: "SPLIT";
  cashAmount: number;
  cardAmount: number;
}

export const ordersApi = {
  /**
   * Create a new order
   * POST /api/orders
   * Note: لا نرسل sessionId - الـ backend يجلب sessionId تلقائياً من browser token
   */
  async createOrder(): Promise<{ data?: Order; error?: string }> {
    // إرسال body فارغ {} - الـ backend يجلب sessionId من browser token
    const response = await apiClient.post<Order>("/api/orders", {});

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * Add item to order
   * POST /api/orders/items
   *
   * ملاحظة:
   * - الباك إند يعامل quantity هنا كـ:
   *   - كمية أولية عندما يكون المنتج جديد في الطلب
   *   - زيادة (increment) عندما يكون الـ item موجود أصلاً لنفس orderId + productId
   */
  async addItem(
    request: AddItemRequest
  ): Promise<{ data?: Order; error?: string }> {
    const response = await apiClient.post<Order>("/api/orders/items", {
      orderId: request.orderId,
      productId: request.productId,
      quantity: request.quantity,
      discountAmount: request.discountAmount || 0.0,
    });

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * Update item quantity (increment)
   * PUT /api/orders/items
   *
   * - يستخدم orderId + productId لتحديد السطر
   * - quantity هنا هي مقدار الزيادة (delta)،
   *   مثلاً:
   *   quantity = 1 → زيادة واحد
   */
  async updateItem(
    request: UpdateItemRequest
  ): Promise<{ data?: Order; error?: string }> {
    const response = await apiClient.put<Order>("/api/orders/items", {
      orderId: request.orderId,
      productId: request.productId,
      quantity: request.quantity,
    });

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },


    /**
   * Remove item from order
   * DELETE /api/orders/items/{itemId}
   */
    async removeItem(
      itemId: number
    ): Promise<{ data?: Order; error?: string }> {
      const response = await apiClient.delete<Order>(
        `/api/orders/items/${itemId}`
      );
  
      if (response.error) {
        return { error: response.error };
      }
  
      return { data: response.data };
    },
  

  /**
   * Increment item quantity by 1
   * (دالة مريحة تستخدم updateItem تحت الكواليس)
   *
   * - تستخدم عندما يضغط الكاشير على زر (+)
   * - دائماً ترسل quantity = 1 → زيادة واحدة فقط كل مرة
   */
  async incrementItem(
    orderId: number,
    productId: number
  ): Promise<{ data?: Order; error?: string }> {
    return this.updateItem({
      orderId,
      productId,
      quantity: 1,
    });
  },

  /**
   * (اختياري) Decrement item quantity by 1
   * - ممكن تستخدمها لاحقاً لزر (-) إذا سوينا دعم للـ delta السالبة في الباك.
   * - حالياً الباك يمنع الكمية <= 0، فلا تستعملها إلا إذا عدلنا المنطق.
   */
  async decrementItem(
    orderId: number,
    productId: number
  ): Promise<{ data?: Order; error?: string }> {
    return this.updateItem({
      orderId,
      productId,
      quantity: -1,
    });
  },

  /**
   * Process payment
   * POST /api/orders/payments
   */
  async processPayment(
    request: PaymentRequest | SplitPaymentRequest
  ): Promise<{ data?: Order; error?: string }> {
    const response = await apiClient.post<Order>(
      "/api/orders/payments",
      request
    );

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * Get order history for a session
   * GET /api/orders/session/{sessionId}/history
   */
  async getSessionHistory(
    sessionId: number
  ): Promise<{ data?: OrderHistoryItem[]; error?: string }> {
    const response = await apiClient.get<OrderHistoryItem[]>(
      `/api/orders/session/${sessionId}/history`
    );

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data || [] };
  },

  /**
   * Get order by ID
   * GET /api/orders/{orderId}
   */
  async getOrder(orderId: number): Promise<{ data?: Order; error?: string }> {
    const response = await apiClient.get<Order>(`/api/orders/${orderId}`);

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * Hold order
   * PUT /api/orders/{orderId}/hold
   */
  async holdOrder(orderId: number): Promise<{ data?: Order; error?: string }> {
    const response = await apiClient.put<Order>(`/api/orders/${orderId}/hold`);

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * Retrieve held order
   * PUT /api/orders/{orderId}/retrieve
   */
  async retrieveOrder(orderId: number): Promise<{ data?: Order; error?: string }> {
    const response = await apiClient.put<Order>(`/api/orders/${orderId}/retrieve`);

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * Get held orders for a session
   * GET /api/orders/session/{sessionId}/held
   */
  async getHeldOrders(sessionId: number): Promise<{ data?: Order[]; error?: string }> {
    const response = await apiClient.get<Order[]>(`/api/orders/session/${sessionId}/held`);

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data || [] };
  },

  /**
   * Attach customer to order
   * PATCH /api/orders/{orderId}/customer
   * Headers: X-Browser-Token (sent via cookies)
   * Body: { customerId: number } or { customerId: null }
   * Response: Updated order
   */
  async attachCustomerToOrder(
    orderId: number,
    customerId: number | null
  ): Promise<{ data?: Order; error?: string }> {
    const response = await apiClient.patch<Order>(
      `/api/orders/${orderId}/customer`,
      { customerId }
    );

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * Search order by orderNumber (for returns)
   * GET /api/orders/search?orderNumber=...
   * Headers: X-Browser-Token (sent via cookies)
   * Response: Order with return-specific fields (alreadyReturnedQty, remainingQty, etc.)
   */
  async searchOrderByNumber(
    orderNumber: string
  ): Promise<{ data?: OrderForReturn; error?: string }> {
    const response = await apiClient.get<OrderForReturn>(
      `/api/orders/search?orderNumber=${encodeURIComponent(orderNumber)}`
    );

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  /**
   * Get orders for sales report
   * GET /api/orders/report?from=YYYY-MM-DD&to=YYYY-MM-DD&cashierName=...&limit=50&offset=0
   */
  async getOrdersReport(params: {
    from?: string;
    to?: string;
    cashierName?: string;
    cashierId?: number;
    status?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<{ data?: OrderReportResponse; error?: string }> {
    const queryParams = new URLSearchParams();
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);
    if (params.cashierName) queryParams.append('cashierName', params.cashierName);
    if (params.cashierId) queryParams.append('cashierId', String(params.cashierId));
    if (params.status) queryParams.append('status', params.status);
    if (params.limit) queryParams.append('limit', String(params.limit));
    if (params.offset) queryParams.append('offset', String(params.offset));
    if (params.orderBy) queryParams.append('orderBy', params.orderBy);
    if (params.orderDirection) queryParams.append('orderDirection', params.orderDirection);

    const endpoint = `/api/orders/report?${queryParams.toString()}`;
    const response = await apiClient.get<OrderReportResponse>(endpoint);

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },
};

// Order Report Interfaces
export interface OrderReportItem {
  orderId: number;
  orderNumber: string;
  date: string;
  time: string;
  sessionId: number;
  cashierId: number;
  cashierName: string;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
  notes: string | null;
}

export interface OrderReportResponse {
  items: OrderReportItem[];
  total: number;
  limit: number;
  offset: number;
}

// Order for Return - includes return-specific fields
// Note: API returns id (not orderItemId) and quantity (not soldQty)
export interface OrderItemForReturn {
  id: number; // This is the orderItemId - will be sent as originalOrderItemId
  productId: number;
  name: string;
  quantity: number; // This is the soldQty
  unitPrice: number;
  lineDiscount: number;
  taxAmount: number;
  lineTotal: number;
  // These fields may not exist in API response, will be calculated
  alreadyReturnedQty?: number;
  remainingQty?: number;
}

export interface OrderForReturn {
  id?: number; // Some APIs return id instead of orderId
  orderId: number; // Primary field - order ID
  orderNumber: string;
  status: "PAID" | "PARTIALLY_RETURNED" | "RETURNED";
  paidAt: string;
  totals: {
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
  };
  customer: {
    id: number;
    name: string;
    phone: string;
  } | null;
  items: OrderItemForReturn[];
  payments: Payment[];
}

