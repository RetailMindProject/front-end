import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ordersApi, type OrderHistoryItem } from "../services/orders.api";
import PageHeader from "../components/PageHeader";

const fmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const fmtMoney = (n: number) => fmt.format(n);

export default function CashierOrders() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get("sessionId");
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      if (!sessionIdParam) {
        setError("Session ID is required");
        setLoading(false);
        return;
      }

      const sessionId = parseInt(sessionIdParam, 10);
      if (isNaN(sessionId)) {
        setError("Invalid session ID");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await ordersApi.getSessionHistory(sessionId);
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setOrders(result.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [sessionIdParam]);

  return (
    <div className="h-screen flex flex-col bg-white">
      <PageHeader
        title="Orders"
        icon={<span className="text-2xl">🧾</span>}
        right={
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/70 text-slate-700 rounded-lg hover:bg-white transition-all duration-200 shadow-sm border border-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        }
        className="mb-0"
      />

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-3" />
            <p className="text-gray-600">Loading orders...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-600">Error: {error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No orders found for this session</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => {
                  // Could navigate to order detail page if needed
                  console.log("Order details:", order);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{order.orderNumber}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{fmtMoney(order.grandTotal)}</div>
                    <div className={`text-xs mt-1 px-2 py-1 rounded ${
                      order.status === "PAID"
                        ? "bg-green-100 text-green-700"
                        : order.status === "CANCELLED"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {order.status}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
                  <span>{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}</span>
                  <span className="capitalize">{order.paymentMethod.toLowerCase()}</span>
                  {order.paidAt && (
                    <span>Paid: {new Date(order.paidAt).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

