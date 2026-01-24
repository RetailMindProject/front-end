import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Eye, Loader2, DollarSign, CreditCard, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { returnsApi, type ReturnOrderSummary, type OrderReturnSummary, type ReturnOrderDetails } from "../services/returns.api";
import PageHeader from "../components/PageHeader";

const fmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const fmtMoney = (n: number) => fmt.format(n);

export default function ReturnOrdersHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ReturnOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 10;

  // Selected order and its returns
  const [selectedOrder, setSelectedOrder] = useState<ReturnOrderSummary | null>(null);
  const [orderReturns, setOrderReturns] = useState<OrderReturnSummary[]>([]);
  const [loadingOrderReturns, setLoadingOrderReturns] = useState(false);
  const [showOrderReturnsModal, setShowOrderReturnsModal] = useState(false);

  // Selected return details
  const [selectedReturn, setSelectedReturn] = useState<ReturnOrderDetails | null>(null);
  const [loadingReturnDetails, setLoadingReturnDetails] = useState(false);
  const [showReturnDetailsModal, setShowReturnDetailsModal] = useState(false);

  // Load orders when filters change or on mount
  useEffect(() => {
    loadReturnOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, dateFrom, dateTo, searchQuery]);

  const loadReturnOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load all orders with returns (no filters by default)
      const result = await returnsApi.getReturnOrders({
        limit,
        offset,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        q: searchQuery || undefined,
      });
      
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setOrders(result.data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setError("An error occurred while loading return orders");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrderReturns = async (order: ReturnOrderSummary) => {
    setSelectedOrder(order);
    setLoadingOrderReturns(true);
    setError(null);
    setShowOrderReturnsModal(true);
    
    try {
      const result = await returnsApi.getOrderReturns(order.orderId);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setOrderReturns(result.data);
      }
    } catch (err) {
      setError("An error occurred while loading order returns");
      console.error(err);
    } finally {
      setLoadingOrderReturns(false);
    }
  };

  const handleViewReturnDetails = async (returnOrderId: number) => {
    setLoadingReturnDetails(true);
    setError(null);
    setShowReturnDetailsModal(true);
    
    try {
      const result = await returnsApi.getReturnDetails(returnOrderId);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setSelectedReturn(result.data);
      }
    } catch (err) {
      setError("An error occurred while loading return details");
      console.error(err);
    } finally {
      setLoadingReturnDetails(false);
    }
  };

  const handleSearch = () => {
    setOffset(0); // Reset to first page
    loadReturnOrders();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setOffset(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/70 border border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900 transition-all duration-200 shadow-sm"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-semibold">Back to Terminal</span>
        </button>

        <PageHeader
          title="Return Orders History"
          icon={<span className="text-2xl">🧾</span>}
          right={
            <button
              onClick={() => navigate("/dashboard/return")}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              New Return
            </button>
          }
        />

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search orders..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <button
                onClick={handleSearch}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Search
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <RotateCcw className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Return Orders Found</h3>
            <p className="text-gray-600 mb-6">No orders with returns match your search criteria.</p>
            <button
              onClick={() => navigate("/dashboard/return")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create New Return
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Paid
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Returns
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Returned
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Return
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.orderId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {order.orderNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {order.customerName || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {fmtMoney(order.totalPaid)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {order.returnCount} return(s)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-red-600">
                            {fmtMoney(order.totalReturned)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500">
                            {new Date(order.lastReturnAt).toLocaleDateString()}
                          </span>
                          <br />
                          <span className="text-xs text-gray-400">
                            {new Date(order.lastReturnAt).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleViewOrderReturns(order)}
                            className="text-blue-600 hover:text-blue-800 transition flex items-center gap-1 text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            View Returns
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Showing {offset + 1} to {offset + orders.length} (Page {Math.floor(offset / limit) + 1})
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={orders.length < limit}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Order Returns Modal */}
        {showOrderReturnsModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Order Returns</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Order: {selectedOrder.orderNumber} | {orderReturns.length} return(s)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowOrderReturnsModal(false);
                      setSelectedOrder(null);
                      setOrderReturns([]);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {loadingOrderReturns ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : orderReturns.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No returns found for this order.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orderReturns.map((returnOrder) => (
                      <div
                        key={returnOrder.returnOrderId}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              Return #{returnOrder.returnOrderNumber || returnOrder.returnOrderId}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {returnOrder.itemCount} item(s) | {new Date(returnOrder.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Total Refund</p>
                              <p className="text-lg font-bold text-green-600">
                                {fmtMoney(returnOrder.totalRefund)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleViewReturnDetails(returnOrder.returnOrderId)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Return Details Modal */}
        {showReturnDetailsModal && selectedReturn && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Return Order Details</h2>
                  <button
                    onClick={() => {
                      setShowReturnDetailsModal(false);
                      setSelectedReturn(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {loadingReturnDetails ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    {/* Return Info */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Return Order ID</p>
                        <p className="font-semibold text-gray-900">#{selectedReturn.returnOrderId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Original Order</p>
                        <p className="font-semibold text-gray-900">{selectedReturn.originalOrderNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Refund</p>
                        <p className="font-semibold text-green-600 text-lg">
                          {fmtMoney(selectedReturn.totalRefund)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span
                          className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                            selectedReturn.status === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {selectedReturn.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Customer</p>
                        <p className="font-semibold text-gray-900">{selectedReturn.customerName}</p>
                      </div>
                      {selectedReturn.createdBy && (
                        <div>
                          <p className="text-sm text-gray-600">Created By</p>
                          <p className="font-semibold text-gray-900">{selectedReturn.createdBy.userName}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Created At</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(selectedReturn.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Return Items */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Returned Items</h3>
                      <div className="space-y-2">
                        {selectedReturn.items.map((item) => (
                          <div
                            key={item.orderItemId}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{item.productName}</p>
                                <p className="text-sm text-gray-600">
                                  Quantity: {item.returnedQty}
                                </p>
                              </div>
                              <p className="font-semibold text-green-600">
                                {fmtMoney(item.refundAmount)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Refunds */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Refund Payments</h3>
                      <div className="space-y-2">
                        {selectedReturn.refunds.map((refund) => (
                          <div
                            key={refund.id}
                            className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
                          >
                            <div className="flex items-center gap-3">
                              {refund.method === "CASH" ? (
                                <DollarSign className="w-5 h-5 text-green-600" />
                              ) : (
                                <CreditCard className="w-5 h-5 text-blue-600" />
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{refund.method}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(refund.refundedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <p className="font-semibold text-gray-900">
                              {fmtMoney(refund.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
