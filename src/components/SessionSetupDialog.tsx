import { useState, useEffect } from "react";
import { X, AlertCircle, Loader2 } from "lucide-react";
import { terminalApi, type PairTerminalResponse, type Terminal, type PairingCodeResponse } from "../services/terminal.api";
import { getCurrentToken, getTokenForRole, setTokenForRole, setUserInfo, getUserInfo, setSessionId, decodeJWT } from "../services/tokens";

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
  const [step, setStep] = useState<"select-terminal" | "show-code" | "pairing">("select-terminal");
  const [availableTerminals, setAvailableTerminals] = useState<Terminal[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<number | null>(null);
  const [selectedTerminalCode, setSelectedTerminalCode] = useState<string>("");
  const [generatedPairingCode, setGeneratedPairingCode] = useState<PairingCodeResponse | null>(null);
  const [pairingCode, setPairingCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pairingResult, setPairingResult] = useState<PairTerminalResponse | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAvailableTerminals();
    } else {
      // Reset state when dialog closes
      setStep("select-terminal");
      setPairingCode("");
      setError(null);
      setPairingResult(null);
      setSelectedTerminalId(null);
      setSelectedTerminalCode("");
      setGeneratedPairingCode(null);
      setAvailableTerminals([]);
    }
  }, [isOpen]);

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

  const handleSelectTerminal = async () => {
    if (!selectedTerminalId) {
      setError("Please select a terminal");
      return;
    }
    
    // Check if token exists before proceeding
    // Try to get CASHIER token specifically since we're on login page
    const cashierToken = getTokenForRole("CASHIER");
    const token = cashierToken || getCurrentToken();
    
    if (!token) {
      setError("Not authenticated. Please login again.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Generate pairing code for the selected terminal
      const selectedTerminal = availableTerminals.find(t => t.id === selectedTerminalId);
      if (selectedTerminal) {
        setSelectedTerminalCode(selectedTerminal.code);
      }
      
      const codeResult = await terminalApi.generatePairingCode({
        terminalId: selectedTerminalId,
        validityMinutes: 60, // Default validity
      });
      
      if (codeResult.error) {
        setError(codeResult.error);
        setLoading(false);
        return;
      }
      
      if (codeResult.data) {
        setGeneratedPairingCode(codeResult.data);
        setStep("show-code");
      } else {
        setError("Failed to generate pairing code");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate pairing code");
    } finally {
      setLoading(false);
    }
  };

  const handlePairTerminal = async () => {
    if (!selectedTerminalId) {
      setError("Please select a terminal");
      return;
    }

    if (!pairingCode || pairingCode.trim().length === 0) {
      setError("Please enter a pairing code");
      return;
    }

    setLoading(true);
    setError(null);
    setStep("pairing");

    try {
      const token = getCurrentToken();
      if (!token) {
        setError("Not authenticated. Please login again.");
        setLoading(false);
        setStep("show-code");
        return;
      }

      let pairResult = await terminalApi.pairTerminal({
        terminalId: selectedTerminalId,
        pairingCode: pairingCode.trim(),
      });

      if (pairResult.status === 409) {
        const confirmOverride = window.confirm(
          "This terminal is already paired with another browser. Do you want to override the existing pairing?"
        );

        if (confirmOverride) {
          pairResult = await terminalApi.pairTerminal({
            terminalId: selectedTerminalId,
            pairingCode: pairingCode.trim(),
            forceOverride: true,
          });
        } else {
          setError("Pairing cancelled. Please use a different terminal or confirm override.");
          setStep("show-code");
          setLoading(false);
          return;
        }
      }

      if (pairResult.data && !pairResult.error) {
        // Success! Terminal paired
        setPairingResult(pairResult.data);
        
        // Dispatch event to notify other components (e.g., TerminalsManagement) that a terminal was paired
        window.dispatchEvent(new CustomEvent('terminal-paired', { detail: { terminalId: selectedTerminalId } }));
        
        // Save token if we have one
        if (token) {
          setTokenForRole("CASHIER", token);
        }

        // Save sessionId and terminal info
        if (pairResult.data.sessionId !== undefined) {
          setSessionId(pairResult.data.sessionId);
          const userInfo = getUserInfo();
          if (userInfo) {
            setUserInfo({
              ...userInfo,
              sessionId: pairResult.data.sessionId,
              terminalId: pairResult.data.terminalId,
              terminalCode: pairResult.data.terminalCode,
            });
          } else {
            // If no userInfo, create one with basic info
            const cashierToken = getTokenForRole("CASHIER");
            if (cashierToken) {
              // Try to decode token to get user info
              const decoded = decodeJWT(cashierToken);
              if (decoded) {
                setUserInfo({
                  id: decoded.userId || decoded.user_id || decoded.sub,
                  userId: decoded.userId || decoded.user_id || decoded.sub,
                  firstName: decoded.firstName || decoded.first_name || "",
                  lastName: decoded.lastName || decoded.last_name || "",
                  email: decoded.email || decoded.username || "",
                  phone: decoded.phone || "",
                  address: decoded.address || "",
                  role: "CASHIER",
                  sessionId: pairResult.data.sessionId,
                  terminalId: pairResult.data.terminalId,
                  terminalCode: pairResult.data.terminalCode,
                });
              }
            }
          }

          // Wait a bit to show success message, then navigate
          setTimeout(() => {
            // Session is already opened by the backend, so call onSessionOpened
            if (pairResult.data && pairResult.data.sessionId !== undefined) {
              onSessionOpened(pairResult.data.sessionId);
            }
          }, 1500);
        }
      } else {
        setError(pairResult.error || "Invalid pairing code. Please check the code and try again.");
        setStep("show-code");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pair terminal");
      setStep("show-code");
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
          <h2 className="text-xl font-semibold text-gray-800">Pair Terminal</h2>
          {!loading && !pairingResult && step !== "pairing" && (
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

          {pairingResult ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Successfully Paired!</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Terminal:</span>
                    <span className="font-semibold text-gray-900">
                      {pairingResult.terminalCode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Description:</span>
                    <span className="text-gray-900">{pairingResult.terminalDescription}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Session Status:</span>
                    <span className="font-semibold text-green-700">{pairingResult.sessionStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Opening Float:</span>
                    <span className="font-semibold text-gray-900">
                      {fmtMoney(pairingResult.openingFloat ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 text-center">
                {pairingResult.message || "Redirecting to POS..."}
              </p>
            </div>
          ) : step === "select-terminal" ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Select Terminal</h3>
                <p className="text-sm text-gray-600">
                  Select the terminal you want to pair with.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terminal *
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
                        onClick={() => {
                          setSelectedTerminalId(terminal.id);
                          setSelectedTerminalCode(terminal.code);
                        }}
                        disabled={terminal.hasActiveSession || !terminal.isActive}
                        className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                          selectedTerminalId === terminal.id
                            ? "border-blue-500 bg-blue-50"
                            : terminal.hasActiveSession || !terminal.isActive
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
                onClick={handleSelectTerminal}
                disabled={loading || !selectedTerminalId}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Code...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </div>
          ) : step === "show-code" && generatedPairingCode ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Pairing Code Generated</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter this code on the terminal <strong>{selectedTerminalCode}</strong> to complete pairing.
                </p>
                
                {/* Display the pairing code prominently */}
                <div className="bg-white border-2 border-blue-300 rounded-lg p-6 text-center mb-4">
                  <div className="text-xs text-gray-500 mb-2">Pairing Code</div>
                  <div className="text-4xl font-bold text-blue-600 font-mono tracking-widest mb-2">
                    {generatedPairingCode.pairingCode}
                  </div>
                  <div className="text-xs text-gray-500">
                    Expires: {new Date(generatedPairingCode.expiresAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Valid for {generatedPairingCode.validityMinutes} minutes
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Pairing Code to Confirm *
                </label>
                <input
                  type="text"
                  value={pairingCode}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/\D/g, '');
                    setPairingCode(value);
                    setError(null);
                  }}
                  placeholder="Enter pairing code"
                  maxLength={10}
                  disabled={loading}
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl font-mono tracking-widest disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the code shown above to complete pairing
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep("select-terminal");
                    setPairingCode("");
                    setGeneratedPairingCode(null);
                    setError(null);
                  }}
                  disabled={loading}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handlePairTerminal}
                  disabled={loading || !pairingCode || pairingCode.trim().length === 0}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Pairing...
                    </>
                  ) : (
                    "Pair Terminal"
                  )}
                </button>
              </div>
            </div>
          ) : step === "pairing" ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600">Pairing terminal...</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

