import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { terminalApi, type Terminal, type LastSessionInfoResponse } from "../services/terminal.api";

interface SessionSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionOpened: (sessionId: number) => void;
}

const fmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const fmtMoney = (n: number) => fmt.format(n);

export default function SessionSetupDialog({
  isOpen,
  onClose,
  onSessionOpened,
}: SessionSetupDialogProps) {
  const [step, setStep] = useState<"loading" | "last-session" | "select-terminal" | "opening">(
    "loading"
  );
  const [lastSessionInfo, setLastSessionInfo] =
    useState<LastSessionInfoResponse | null>(null);
  const [openingFloat, setOpeningFloat] = useState("");
  const [availableTerminals, setAvailableTerminals] = useState<Terminal[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLastSessionInfo();
    } else {
      // Reset state when dialog closes
      setStep("loading");
      setLastSessionInfo(null);
      setOpeningFloat("");
      setAvailableTerminals([]);
      setSelectedTerminalId(null);
      setError(null);
    }
  }, [isOpen]);

  const loadLastSessionInfo = async () => {
    setLoading(true);
    setError(null);
    setStep("loading");

    try {
      const result = await terminalApi.getLastSessionInfo();
      if (result.error) {
        // If no last session or error, proceed to terminal selection (don't block user)
        console.warn("Could not load last session info:", result.error);
        setStep("select-terminal");
        await loadAvailableTerminals();
      } else if (result.data) {
        // Check if we have valid last session data
        if (result.data.closingAmount !== null && result.data.closingAmount !== undefined) {
          setLastSessionInfo(result.data);
          setStep("last-session");
          // Pre-fill opening float with closing amount if available
          setOpeningFloat(result.data.closingAmount.toString());
        } else {
          // No valid last session data, proceed to terminal selection
          setStep("select-terminal");
          await loadAvailableTerminals();
        }
      } else {
        // No last session, proceed to terminal selection
        setStep("select-terminal");
        await loadAvailableTerminals();
      }
    } catch (err) {
      // Don't block user on error, just proceed to terminal selection
      console.warn("Error loading last session info:", err);
      setStep("select-terminal");
      await loadAvailableTerminals();
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTerminals = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await terminalApi.getAvailableTerminals();
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setAvailableTerminals(result.data);
        if (result.data.length > 0 && !selectedTerminalId) {
          setSelectedTerminalId(result.data[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load terminals");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLastSession = async () => {
    if (!openingFloat || parseFloat(openingFloat) < 0) {
      setError("Please enter a valid opening float amount");
      return;
    }

    setStep("select-terminal");
    await loadAvailableTerminals();
  };

  const handleOpenSession = async () => {
    if (!selectedTerminalId) {
      setError("Please select a terminal");
      return;
    }

    const floatAmount = parseFloat(openingFloat);
    if (isNaN(floatAmount) || floatAmount < 0) {
      setError("Please enter a valid opening float amount");
      return;
    }

    setLoading(true);
    setError(null);
    setStep("opening");

    try {
      const result = await terminalApi.openSession({
        terminalId: selectedTerminalId,
        openingFloat: floatAmount,
      });

      if (result.error) {
        setError(result.error);
        setStep("select-terminal");
      } else if (result.data) {
        // Success! Session opened
        // Don't call onClose() here, let the parent handle navigation
        // This prevents any potential race conditions
        onSessionOpened(result.data.sessionId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open session");
      setStep("select-terminal");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Session Setup</h2>
          {step !== "opening" && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Loading Step */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Loading session information...</p>
            </div>
          )}

          {/* Last Session Info Step */}
          {step === "last-session" && lastSessionInfo && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Last Session Information</h3>
                {lastSessionInfo.closingAmount !== null && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Closing Amount:</span>
                      <span className="font-semibold text-gray-900">
                        {fmtMoney(lastSessionInfo.closingAmount)}
                      </span>
                    </div>
                    {lastSessionInfo.closedAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Closed At:</span>
                        <span className="text-gray-700">
                          {new Date(lastSessionInfo.closedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opening Float *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  placeholder="Enter opening float amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {lastSessionInfo.closingAmount !== null && (
                  <p className="mt-1 text-xs text-gray-500">
                    Suggested: {fmtMoney(lastSessionInfo.closingAmount)}
                  </p>
                )}
              </div>

              <button
                onClick={handleConfirmLastSession}
                disabled={loading || !openingFloat}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Select Terminal Step */}
          {step === "select-terminal" && (
            <div className="space-y-4">
              {lastSessionInfo === null && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Float *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    placeholder="Enter opening float amount"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Terminal *
                </label>
                {availableTerminals.length === 0 ? (
                  <div className="p-4 border border-gray-200 rounded-lg text-center text-gray-500">
                    {loading ? "Loading terminals..." : "No terminals available"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableTerminals.map((terminal) => (
                      <button
                        key={terminal.id}
                        onClick={() => setSelectedTerminalId(terminal.id)}
                        disabled={terminal.hasActiveSession}
                        className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                          selectedTerminalId === terminal.id
                            ? "border-blue-500 bg-blue-50"
                            : terminal.hasActiveSession
                            ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-medium text-gray-900">{terminal.code}</div>
                        {terminal.description && (
                          <div className="text-sm text-gray-500 mt-1">{terminal.description}</div>
                        )}
                        {terminal.hasActiveSession && (
                          <div className="text-xs text-red-500 mt-1">Has active session</div>
                        )}
                        {!terminal.isActive && (
                          <div className="text-xs text-gray-400 mt-1">Inactive</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleOpenSession}
                disabled={
                  loading ||
                  !selectedTerminalId ||
                  !openingFloat ||
                  parseFloat(openingFloat) < 0
                }
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening Session...
                  </>
                ) : (
                  "Open Session"
                )}
              </button>
            </div>
          )}

          {/* Opening Session Step */}
          {step === "opening" && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Opening session...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

