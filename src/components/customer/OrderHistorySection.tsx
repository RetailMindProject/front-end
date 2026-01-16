import { useState } from "react";
import { ChevronDown, ChevronUp, Package } from "lucide-react";
import type { CustomerOrder } from "../../types/customer.api";

interface OrderHistorySectionProps {
  orders: CustomerOrder[];
  loading?: boolean;
}

export default function OrderHistorySection({ orders, loading = false }: OrderHistorySectionProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  const toggleOrder = (orderId: number) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    const badges: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      completed: "bg-green-100 text-green-800",
      draft: "bg-yellow-100 text-yellow-800",
      pending: "bg-yellow-100 text-yellow-800",
      held: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
      refunded: "bg-purple-100 text-purple-800",
    };
    return badges[statusLower] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
        <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium mb-1">No recent orders</p>
        <p className="text-gray-500 text-sm">Your order history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const isExpanded = expandedOrders.has(order.id);
        return (
          <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div
              className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => toggleOrder(order.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 text-base">Order {order.orderNumber}</h3>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusBadge(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-semibold text-gray-900 text-lg">${order.grandTotal.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}</p>
                </div>
                <button className="ml-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label={isExpanded ? "Collapse order" : "Expand order"}>
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-5">
                <h4 className="font-medium text-gray-900 mb-4 text-sm uppercase tracking-wide">Order Items</h4>
                <div className="space-y-3 mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start text-sm">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-medium text-gray-900 mb-1">{item.productName}</p>
                        <p className="text-gray-600 text-xs">
                          {item.quantity} × ${item.unitPrice.toFixed(2)}
                          {item.discountAmount > 0 && (
                            <span className="text-green-600 ml-2 font-medium">
                              Save ${item.discountAmount.toFixed(2)}
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900 whitespace-nowrap">
                        ${item.lineTotal.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Order summary */}
                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900 font-medium">${order.subtotal.toFixed(2)}</span>
                  </div>
                  {order.discountTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount</span>
                      <span className="text-green-600 font-medium">-${order.discountTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900 font-medium">${order.taxTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">${order.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

