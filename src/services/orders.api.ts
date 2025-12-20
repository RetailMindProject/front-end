import { apiClient } from "./api.client";

// Order Item
export interface OrderItem {
  id: number;
  productId: number;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  lineTotal: number;
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

// Create Order Request
export interface CreateOrderRequest {
  sessionId: number;
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
   */
  async createOrder(
    request: CreateOrderRequest
  ): Promise<{ data?: Order; error?: string }> {
    const response = await apiClient.post<Order>("/api/orders", request);

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
};
