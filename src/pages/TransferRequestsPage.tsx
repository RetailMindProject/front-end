import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Package, Loader2, AlertCircle } from "lucide-react";
import { transferRequestsApi, type TransferRequestDTO } from "../services/transfer-requests.api";
import { productsApi, type ProductDTO } from "../services/products.api";
import PageHeader from "../components/PageHeader";

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed top-4 right-4 z-[100]"
      style={{ animation: "fade-in 0.3s ease-out, slide-in-from-right 0.3s ease-out" }}
    >
      <div
        className={`${
          type === "success" ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"
        } border rounded-lg px-4 py-3 shadow-lg flex items-start gap-3 min-w-[320px] max-w-[400px]`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {type === "success" ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
        </div>
        <div className="flex-1">
          <p
            className={`font-semibold text-sm ${
              type === "success" ? "text-green-900" : "text-red-900"
            }`}
          >
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${
            type === "success" ? "text-green-600 hover:text-green-800" : "text-red-600 hover:text-red-800"
          } transition-colors mt-0.5`}
          aria-label="Dismiss"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Transfer Request Detail View
function TransferRequestDetail({ requestId, onBack }: { requestId: number | string; onBack: () => void }) {
  const [request, setRequest] = useState<TransferRequestDTO | null>(null);
  const [productNames, setProductNames] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadRequest();
  }, [requestId]);

  const loadRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transferRequestsApi.getById(requestId);
      if (res.data) {
        setRequest(res.data);
        
        // Fetch product names for all items
        const items = res.data.items ?? [];
        const productIds = items.map(item => item.productId);
        const namesMap = new Map<number, string>();
        
        // Fetch product details in parallel
        await Promise.all(
          productIds.map(async (productId) => {
            try {
              const productRes = await productsApi.getById(productId);
              if (productRes.data) {
                namesMap.set(productId, productRes.data.name || `Product ${productId}`);
              } else {
                namesMap.set(productId, `Product ${productId}`);
              }
            } catch (err) {
              console.warn(`Failed to fetch product ${productId}:`, err);
              namesMap.set(productId, `Product ${productId}`);
            }
          })
        );
        
        setProductNames(namesMap);
      } else {
        setError(res.error || "Failed to load transfer request");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transfer request");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!request || processing) return;
    setProcessing(true);
    try {
      const res = await transferRequestsApi.approve(requestId);
      if (res.data) {
        setToast({ message: "Transfer request approved successfully", type: "success" });
        // Refresh the request to show updated status
        await loadRequest();
        // Dispatch event to refresh notifications
        window.dispatchEvent(new Event("transfer-requests-updated"));
        // Navigate back after a short delay
        setTimeout(() => {
          onBack();
        }, 1500);
      } else {
        setToast({ message: res.error || "Failed to approve request", type: "error" });
      }
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to approve request", type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!request || processing) return;
    const reason = prompt("Please provide a reason for rejection:");
    if (reason === null) return; // User cancelled
    if (reason.trim() === "") {
      setToast({ message: "Please provide a reason for rejection", type: "error" });
      return;
    }

    setProcessing(true);
    try {
      const res = await transferRequestsApi.reject(requestId, reason.trim());
      if (res.data) {
        setToast({ message: "Transfer request rejected successfully", type: "success" });
        // Refresh the request to show updated status
        await loadRequest();
        // Dispatch event to refresh notifications
        window.dispatchEvent(new Event("transfer-requests-updated"));
        // Navigate back after a short delay
        setTimeout(() => {
          onBack();
        }, 1500);
      } else {
        setToast({ message: res.error || "Failed to reject request", type: "error" });
      }
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to reject request", type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-slate-600">Loading transfer request...</span>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error || "Transfer request not found"}</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const items = request.items ?? [];
  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const requesterDisplay = request.requesterName || "Unknown Requester";
  const dateDisplay = request.requestedAt ? new Date(request.requestedAt).toLocaleString() : "-";

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Transfer Request #{request.requestId}</h2>
            <p className="text-sm text-slate-600 mt-1">
              From {requesterDisplay} • Requested {dateDisplay}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                request.status === "PENDING"
                  ? "bg-yellow-100 text-yellow-800"
                  : request.status === "APPROVED"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {request.status}
            </span>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-lg font-semibold text-slate-900">Requested Items</h3>
            <p className="text-sm text-slate-600 mt-1">
              {totalItems} {totalItems === 1 ? "item" : "items"} • {totalQuantity} total units
            </p>
          </div>
          <div className="divide-y divide-slate-200">
            {items.map((item, idx) => {
              const productName = productNames.get(item.productId) || `Product ${item.productId}`;
              return (
                <div key={idx} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{productName}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                            <span className="text-slate-500">Product ID: {item.productId}</span>
                            <span className="font-medium text-blue-600">Quantity: {item.quantity}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        {request.status === "PENDING" && (
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleReject}
              disabled={processing}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="h-5 w-5" />
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={processing}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-5 w-5" />
              {processing ? "Processing..." : "Approve"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// Transfer Requests List View
export default function TransferRequestsPage() {
  const { requestId } = useParams<{ requestId?: string }>();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<TransferRequestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) {
      loadRequests();
    }
  }, [requestId]);

  // Listen for transfer requests updates
  useEffect(() => {
    const handleUpdate = () => {
      if (!requestId) {
        loadRequests();
      }
    };
    window.addEventListener("transfer-requests-updated", handleUpdate);
    return () => window.removeEventListener("transfer-requests-updated", handleUpdate);
  }, [requestId]);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transferRequestsApi.getPending();
      const list = res.data ?? [];
      setRequests(list);
      if (!res.data && res.error) {
        setError(res.error || "Failed to load transfer requests");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transfer requests");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestClick = (id: number) => {
    navigate(`/dashboard/inventory/transfer-requests/${id}`);
  };

  const handleBack = () => {
    navigate("/dashboard/inventory/transfer-requests");
  };

  // Show detail view if requestId is provided
  if (requestId) {
    const id = parseInt(requestId);
    if (isNaN(id)) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700">Invalid request ID</p>
          <button onClick={handleBack} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg">
            Go Back
          </button>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <PageHeader title="Transfer Request Details" icon={<Package className="h-6 w-6" />} />
        <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
          <TransferRequestDetail requestId={id} onBack={handleBack} />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PageHeader title="Transfer Requests" icon={<Package className="h-6 w-6" />} />
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-slate-600">Loading transfer requests...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Pending Requests</h3>
            <p className="text-slate-600">All transfer requests have been processed.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const items = request.items ?? [];
              const totalItems = items.length;
              const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
              const requesterDisplay = request.requesterName || "Unknown Requester";
              const dateDisplay = request.requestedAt ? new Date(request.requestedAt).toLocaleString() : "-";
              
              return (
                <div
                  key={`transfer-${request.requestId}`}
                  onClick={() => handleRequestClick(request.requestId)}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
                >
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Package className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              Request #{request.requestId}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              From {requesterDisplay} •{" "}
                              {totalItems} {totalItems === 1 ? "item" : "items"} • {totalQuantity} units
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {dateDisplay}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                          PENDING
                        </span>
                        <ArrowLeft className="h-5 w-5 text-slate-400 rotate-180" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
