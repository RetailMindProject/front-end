import { useState } from "react";
import { ChevronDown, ChevronUp, Package } from "lucide-react";
import type { Order } from "../../types/customer.api";

interface OrderHistorySectionProps {
  orders: Order[];
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

  const getStatusBadge = (status: Order["status"]) => {
    const badges = {
      completed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
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
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500 text-lg">No orders in the past 30 days.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Order History (Last 30 Days)</h2>
      {orders.map((order) => {
        const isExpanded = expandedOrders.has(order.id);
        return (
          <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleOrder(order.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">Order #{order.id}</h3>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(order.status)}`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(order.orderDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${order.totalAmount.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{order.items.length} item(s)</p>
                </div>
                <button className="ml-4 text-gray-400 hover:text-gray-600">
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {isExpanded && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-3">Items:</h4>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

