import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowLeft, Check, X, DollarSign, CreditCard, Loader2, RotateCcw } from "lucide-react";
import { ordersApi, type OrderForReturn, type OrderItemForReturn } from "../services/orders.api";
import { returnsApi, type ReturnItemRequest, type RefundRequest } from "../services/returns.api";

const fmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const fmtMoney = (n: number) => fmt.format(n);

export default function ReturnOrder() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState("");
  const [searching, setSearching] = useState(false);
  const [order, setOrder] = useState<OrderForReturn | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Return items state
  const [returnItems, setReturnItems] = useState<Map<number, number>>(new Map()); // orderItemId -> returnedQty
  const [refundMethod, setRefundMethod] = useState<"CASH" | "CARD" | "MIX">("CASH");
  const [cashAmount, setCashAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!orderNumber.trim()) {
      setError("Please enter an order number");
      return;
    }

    setSearching(true);
    setError(null);
    setOrder(null);
    setReturnItems(new Map());
    setRefundMethod("CASH");
    setCashAmount("");
    setCardAmount("");

    try {
      const result = await ordersApi.searchOrderByNumber(orderNumber.trim());
      
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        // Validate order can be returned
        if (result.data.status === "RETURNED") {
          setError("This order has already been fully returned");
        } else if (result.data.status !== "PAID" && result.data.status !== "PARTIALLY_RETURNED") {
          setError("Only paid orders can be returned");
        } else {
          setOrder(result.data);
        }
      }
    } catch (err) {
      setError("An error occurred while searching for the order");
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Calculate remaining quantity safely
  // API returns: id (orderItemId), quantity (soldQty)
  // We calculate: remaining = sold - alreadyReturned (default alreadyReturned = 0)
  const getRemainingQty = (item: OrderItemForReturn): number => {
    const sold = Number(item.quantity) || 0; // quantity from API = soldQty
    const alreadyReturned = Number(item.alreadyReturnedQty) || 0; // Default to 0 if not provided
    const remaining = sold - alreadyReturned;
    return Math.max(0, remaining);
  };

  const getSoldQty = (item: OrderItemForReturn): number => {
    return Number(item.quantity) || 0;
  };

  const getAlreadyReturnedQty = (item: OrderItemForReturn): number => {
    return Number(item.alreadyReturnedQty) || 0;
  };

  const handleReturnQtyChange = (itemId: number, qty: number) => {
    if (qty < 0) return;
    
    const item = order?.items.find(i => i.id === itemId); // Use id, not orderItemId
    if (!item) return;

    const remainingQty = getRemainingQty(item);
    
    if (qty > remainingQty) {
      setError(`Cannot return more than ${remainingQty} (remaining quantity)`);
      return;
    }

    setReturnItems(prev => {
      const newMap = new Map(prev);
      if (qty === 0) {
        newMap.delete(itemId);
      } else {
        newMap.set(itemId, qty);
      }
      return newMap;
    });
    setError(null);
  };

  const calculateRefundAmount = (): number => {
    if (!order) return 0;
    
    let total = 0;
    returnItems.forEach((returnedQty, itemId) => {
      const item = order.items.find(i => i.id === itemId); // Use id, not orderItemId
      if (item) {
        // Calculate refund based on snapshot: net_unit = line_total / sold_qty
        const soldQty = getSoldQty(item);
        if (soldQty > 0) {
          const netUnitPrice = item.lineTotal / soldQty;
          const itemRefund = netUnitPrice * returnedQty;
          total += itemRefund;
        }
      }
    });
    
    return total;
  };

  const totalRefund = calculateRefundAmount();

  const handleReturnAll = () => {
    if (!order) return;
    
    const allItems = new Map<number, number>();
    order.items.forEach((item) => {
      const remainingQty = getRemainingQty(item);
      if (remainingQty > 0) {
        allItems.set(item.id, remainingQty); // Use id, not orderItemId
      }
    });
    
    setReturnItems(allItems);
    setError(null);
    
    // Auto-set refund method and amount
    const total = calculateRefundAmount();
    if (total > 0) {
      setRefundMethod("CASH");
      setCashAmount(total.toFixed(2));
      setCardAmount("");
    }
  };

  const handleCreateReturn = async () => {
    if (!order) {
      setError("No order selected");
      return;
    }

    if (returnItems.size === 0) {
      setError("Please select at least one item to return");
      return;
    }

    if (totalRefund <= 0) {
      setError("Refund amount must be greater than 0");
      return;
    }

    // Validate refund amounts
    if (refundMethod === "CASH") {
      const cash = parseFloat(cashAmount);
      if (isNaN(cash) || cash !== totalRefund) {
        setError(`Cash refund amount must equal ${fmtMoney(totalRefund)}`);
        return;
      }
    } else if (refundMethod === "CARD") {
      const card = parseFloat(cardAmount);
      if (isNaN(card) || card !== totalRefund) {
        setError(`Card refund amount must equal ${fmtMoney(totalRefund)}`);
        return;
      }
    } else if (refundMethod === "MIX") {
      const cash = parseFloat(cashAmount || "0");
      const card = parseFloat(cardAmount || "0");
      if (isNaN(cash) || isNaN(card) || cash + card !== totalRefund) {
        setError(`Cash + Card refund must equal ${fmtMoney(totalRefund)}`);
        return;
      }
    }

    setProcessing(true);
    setError(null);

    try {
      // Build return items - exactly as required
      // item.id from API = originalOrderItemId in request
      const items: ReturnItemRequest[] = [];
      returnItems.forEach((returnedQty, itemId) => {
        if (returnedQty > 0) {
          items.push({
            originalOrderItemId: itemId, // item.id from API response (this is the orderItemId)
            returnedQty: returnedQty,
          });
        }
      });

      console.log("📦 Return items to send:", items);

      if (items.length === 0) {
        setError("No items to return");
        setProcessing(false);
        return;
      }

      // Build refunds - exactly as required
      const refunds: RefundRequest[] = [];
      if (refundMethod === "CASH") {
        refunds.push({
          method: "CASH",
          amount: parseFloat(cashAmount),
        });
      } else if (refundMethod === "CARD") {
        refunds.push({
          method: "CARD",
          amount: parseFloat(cardAmount),
        });
      } else if (refundMethod === "MIX") {
        const cash = parseFloat(cashAmount || "0");
        const card = parseFloat(cardAmount || "0");
        if (cash > 0) {
          refunds.push({ method: "CASH", amount: cash });
        }
        if (card > 0) {
          refunds.push({ method: "CARD", amount: card });
        }
      }

      if (refunds.length === 0) {
        setError("Please specify refund method and amount");
        setProcessing(false);
        return;
      }

      // Call the actual return API - THIS IS THE REAL RETURN, NOT JUST DISPLAY
      // IMPORTANT: originalOrderId must be order.id or order.orderId from API response
      const originalOrderId = order.orderId || order.id;
      
      if (!originalOrderId || originalOrderId === null || originalOrderId === undefined) {
        console.error("❌ ERROR: Missing order ID", { order });
        setError(`Invalid order: missing order ID. Order object: ${JSON.stringify(order)}`);
        setProcessing(false);
        return;
      }

      // Build request payload
      // Backend ignores sessionId and uses current open session automatically
      // Requirements: Browser must be paired + have open session
      const requestPayload = {
        originalOrderId: Number(originalOrderId), // Ensure it's a number
        sessionId: 0, // Send 0 (backend ignores it and uses current session)
        items,
        refunds,
      };

      console.log("🚀 EXECUTING RETURN - POST /api/returns");
      console.log("Order object:", order);
      console.log("Order ID (orderId):", order.orderId);
      console.log("Order ID (id):", order.id);
      console.log("Selected originalOrderId:", originalOrderId);
      console.log("Request payload:", JSON.stringify(requestPayload, null, 2));
      console.log("Payload originalOrderId type:", typeof requestPayload.originalOrderId);
      console.log("Payload originalOrderId value:", requestPayload.originalOrderId);

      const result = await returnsApi.createReturn(requestPayload);
      
      console.log("Return API response:", result);

      if (result.error) {
        setError(`Return failed: ${result.error}`);
        setProcessing(false);
        return;
      }

      if (!result.data) {
        setError("Return failed: No data received from server");
        setProcessing(false);
        return;
      }

      // Success - show success message
      console.log("✅ Return successful! Return Order ID:", result.data.returnOrderId);
      setReturnOrderId(result.data.returnOrderId);
      setReturnSuccess(true);

      // After success, refresh the order to show updated status
      // This will call GET /api/orders/search again to get updated status
      setTimeout(async () => {
        try {
          console.log("🔄 Refreshing order data...");
          const refreshResult = await ordersApi.searchOrderByNumber(order.orderNumber);
          if (refreshResult.data) {
            console.log("✅ Order refreshed:", refreshResult.data);
            setOrder(refreshResult.data);
            // Clear return items to reset form
            setReturnItems(new Map());
            setRefundMethod("CASH");
            setCashAmount("");
            setCardAmount("");
            setError(null);
          } else if (refreshResult.error) {
            console.error("Error refreshing order:", refreshResult.error);
          }
        } catch (err) {
          console.error("Error refreshing order:", err);
        }
      }, 1500);
    } catch (err) {
      console.error("Return error:", err);
      setError(`An error occurred while processing the return: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setProcessing(false);
    }
  };

  if (returnSuccess && returnOrderId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Return Processed Successfully</h2>
            <p className="text-gray-600 mb-4">Return Order ID: {returnOrderId}</p>
            <p className="text-gray-600 mb-6">Total Refund: {fmtMoney(totalRefund)}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={async () => {
                  setReturnSuccess(false);
                  setReturnOrderId(null);
                  setOrderNumber("");
                  setOrder(null);
                  setReturnItems(new Map());
                  setRefundMethod("CASH");
                  setCashAmount("");
                  setCardAmount("");
                  setError(null);
                  // Optionally refresh the order if we had one
                  if (orderNumber) {
                    await handleSearch();
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                New Return
              </button>
              <button
                onClick={() => navigate("/cashier/returns")}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                View Return History
              </button>
              <button
                onClick={() => navigate("/cashier")}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Back to Terminal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/cashier")}
            className="mb-4 inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition"
          >
            <ArrowLeft size={20} />
            <span>Back to Terminal</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Return Order</h1>
              <p className="text-gray-600">Search for an order by order number to process a return</p>
            </div>
            <button
              onClick={() => navigate("/cashier/returns")}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              View History
            </button>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Number
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Enter order number..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={searching}
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={searching || !orderNumber.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* Order Details */}
        {order && (
          <div className="space-y-6">
            {/* Order Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order Number</p>
                  <p className="font-medium">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium">
                    <span className={`px-2 py-1 rounded text-sm ${
                      order.status === "PAID" ? "bg-green-100 text-green-800" :
                      order.status === "PARTIALLY_RETURNED" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {order.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Paid At</p>
                  <p className="font-medium">{new Date(order.paidAt).toLocaleString()}</p>
                </div>
                {order.customer && (
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-medium">{order.customer.name} ({order.customer.phone})</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items to Return */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Select Items to Return</h2>
                {order.items.some(item => getRemainingQty(item) > 0) && (
                  <button
                    onClick={handleReturnAll}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium"
                  >
                    Return All Remaining
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {order.items.map((item) => {
                  const returnedQty = returnItems.get(item.id) || 0; // Use item.id
                  const soldQty = getSoldQty(item);
                  const alreadyReturned = getAlreadyReturnedQty(item);
                  const remainingQty = getRemainingQty(item);
                  const canReturn = remainingQty > 0;
                  
                  // Calculate net unit price for refund
                  const netUnitPrice = soldQty > 0 ? item.lineTotal / soldQty : 0;
                  
                  return (
                    <div
                      key={item.id} // Use item.id
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="mb-4">
                        <h3 className="font-semibold text-gray-800 mb-3">{item.name}</h3>
                        
                        {/* Quantity Information */}
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Sold</p>
                            <p className="text-lg font-semibold text-blue-700">{soldQty}</p>
                          </div>
                          <div className="bg-yellow-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Already Returned</p>
                            <p className="text-lg font-semibold text-yellow-700">{alreadyReturned}</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Remaining</p>
                            <p className="text-lg font-semibold text-green-700">{remainingQty}</p>
                          </div>
                        </div>

                        {/* Price Information */}
                        <div className="text-sm text-gray-600 mb-3">
                          <p>Unit Price: {fmtMoney(item.unitPrice)}</p>
                          <p>Line Total: {fmtMoney(item.lineTotal)}</p>
                        </div>
                      </div>
                      
                      {canReturn ? (
                        <div className="pt-4 border-t-2 border-gray-300 bg-gray-50 rounded-lg p-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <label className="text-base font-semibold text-gray-800">
                                Enter Return Quantity:
                              </label>
                              <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded border border-gray-300">
                                Max: <strong>{remainingQty}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <input
                                type="number"
                                min="0"
                                max={remainingQty}
                                step="0.01"
                                value={returnedQty || ""}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  handleReturnQtyChange(item.id, val); // Use item.id
                                }}
                                placeholder="Enter quantity to return"
                                className="flex-1 px-4 py-3 text-lg border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                              />
                              {returnedQty > 0 && (
                                <div className="bg-green-100 border-2 border-green-400 rounded-lg px-4 py-3 min-w-[200px]">
                                  <p className="text-xs text-gray-600 mb-1">Refund Amount:</p>
                                  <p className="text-lg font-bold text-green-700">
                                    {fmtMoney(netUnitPrice * returnedQty)}
                                  </p>
                                </div>
                              )}
                            </div>
                            {returnedQty > remainingQty && (
                              <p className="text-sm text-red-600 font-medium">
                                ⚠️ Cannot return more than {remainingQty}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-lg border border-red-200">
                            Fully returned - No items available for return (Sold: {soldQty}, Already Returned: {alreadyReturned}, Remaining: {remainingQty})
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Refund Summary - Always show when order is loaded */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Refund Summary</h2>
              
              {totalRefund > 0 ? (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Total Refund Amount</p>
                    <p className="text-2xl font-bold text-blue-600">{fmtMoney(totalRefund)}</p>
                  </div>
                </>
              ) : (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Please enter return quantities above</strong> to calculate refund amount and proceed with the return.
                  </p>
                </div>
              )}

              {/* Refund Method - Show only when totalRefund > 0 */}
              {totalRefund > 0 && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Refund Method
                    </label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          setRefundMethod("CASH");
                          setCashAmount(totalRefund.toFixed(2));
                          setCardAmount("");
                        }}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                          refundMethod === "CASH"
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <DollarSign className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-sm font-medium">Cash</span>
                      </button>
                      <button
                        onClick={() => {
                          setRefundMethod("CARD");
                          setCardAmount(totalRefund.toFixed(2));
                          setCashAmount("");
                        }}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                          refundMethod === "CARD"
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <CreditCard className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-sm font-medium">Card</span>
                      </button>
                      <button
                        onClick={() => setRefundMethod("MIX")}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                          refundMethod === "MIX"
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <span className="text-sm font-medium">Mix</span>
                      </button>
                    </div>
                  </div>

                  {/* Amount Inputs */}
                  {refundMethod === "CASH" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cash Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {refundMethod === "CARD" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={cardAmount}
                        onChange={(e) => setCardAmount(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {refundMethod === "MIX" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cash Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Card Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={cardAmount}
                          onChange={(e) => setCardAmount(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Process Return Button - Always visible, disabled when no items selected */}
              <div className="mt-6 space-y-2">
                {totalRefund > 0 ? (
                  <p className="text-xs text-gray-500 text-center">
                    Clicking this button will execute the return via POST /api/returns
                  </p>
                ) : (
                  <p className="text-xs text-yellow-600 text-center font-medium">
                    Enter return quantities above to enable return processing
                  </p>
                )}
                <button
                  onClick={handleCreateReturn}
                  disabled={processing || totalRefund <= 0 || returnItems.size === 0}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 font-medium text-lg shadow-lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing Return...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-5 h-5" />
                      Execute Return
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

