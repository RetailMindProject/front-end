import { useState, useEffect } from "react";
import { Card } from "../components";
import { terminalApi, type PairingRequestResponse } from "../services/terminal.api";
import { Check, X, Clock } from "lucide-react";

export default function PairingRequests() {
  const [requests, setRequests] = useState<PairingRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<{ id: number; reason: string } | null>(null);

  useEffect(() => {
    loadRequests();
    // Refresh every 5 seconds
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadRequests = async () => {
    setError(null);
    const result = await terminalApi.getPendingPairingRequests();

    if (result.error) {
      setError(result.error);
      setRequests([]);
    } else if (result.data) {
      setRequests(result.data);
    }

    setLoading(false);
  };

  const handleApprove = async (requestId: number) => {
    setProcessingId(requestId);
    setError(null);

    const result = await terminalApi.approvePairingRequest(requestId);

    if (result.error) {
      setError(result.error);
      setProcessingId(null);
      return;
    }

    // Reload requests
    await loadRequests();
    setProcessingId(null);
  };

  const handleReject = async (requestId: number, reason?: string) => {
    setProcessingId(requestId);
    setError(null);

    const result = await terminalApi.rejectPairingRequest(requestId, reason);

    if (result.error) {
      setError(result.error);
      setProcessingId(null);
      setRejectReason(null);
      return;
    }

    // Reload requests
    await loadRequests();
    setProcessingId(null);
    setRejectReason(null);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Pairing Requests</h1>
        <p className="text-gray-600 mt-1">Review and approve terminal pairing requests from cashiers</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Card padded>
        {loading ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No pending pairing requests</p>
            <p className="text-sm text-gray-500 mt-2">All requests have been processed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {(request.requestedByName && request.requestedByName.trim()) 
                          ? request.requestedByName.trim() 
                          : `Cashier #${request.requestedBy}`}
                      </h3>
                      <span className="px-2 py-1 rounded-lg text-xs font-medium bg-yellow-100 text-yellow-700">
                        {request.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-gray-500">Terminal</p>
                        <p className="font-medium text-gray-900">
                          {request.terminalCode} - {request.terminalDescription}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Requested At</p>
                        <p className="font-medium text-gray-900">{formatTime(request.issuedAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Expires At</p>
                        <p className="font-medium text-gray-900">{formatTime(request.expiresAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Time Remaining</p>
                        <p className="font-medium text-orange-600">
                          {getTimeRemaining(request.expiresAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectReason({ id: request.id, reason: "" })}
                      disabled={processingId === request.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>

                {/* Reject Reason Modal */}
                {rejectReason?.id === request.id && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason (Optional)
                    </label>
                    <textarea
                      value={rejectReason.reason}
                      onChange={(e) => setRejectReason({ ...rejectReason, reason: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      rows={2}
                      placeholder="Enter reason for rejection..."
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleReject(request.id, rejectReason.reason)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Confirm Reject
                      </button>
                      <button
                        onClick={() => setRejectReason(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

