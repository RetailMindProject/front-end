import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  terminalApi,
  type Terminal,
  type PairTerminalResponse,
  type PairingRequestResponse,
  type PairingRequestStatusResponse,
} from "../services/terminal.api";
import { getUserInfo, setUserInfo, setSessionId } from "../services/tokens";

const DEFAULT_OPENING_FLOAT = 2000;
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

type FlowStep = "choice" | "select" | "waiting" | "success";

export default function SelectTerminal() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState =
    (location.state as { message?: string; fromUnpair?: boolean; fromLogin?: boolean } | undefined) ??
    undefined;
  const initialMessage = locationState?.message;
  const fromUnpair = Boolean(locationState?.fromUnpair);
  const fromLogin = Boolean(locationState?.fromLogin);

  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(initialMessage || null);
  const [error, setError] = useState<string | null>(null);
  const [loadingTerminals, setLoadingTerminals] = useState(false);
  const [requestingPairing, setRequestingPairing] = useState(false);
  const [pairingRequest, setPairingRequest] = useState<PairingRequestResponse | null>(null);
  const [pairingStatus, setPairingStatus] = useState<PairingRequestStatusResponse | null>(null);
  const [step, setStep] = useState<FlowStep>(fromUnpair ? "choice" : "select");
  const [pairingSummary, setPairingSummary] = useState<PairTerminalResponse | null>(null);
  const redirectTimerRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  const clearRedirectTimer = () => {
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  };

  const clearPollingInterval = () => {
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleEnterPos = () => {
    clearRedirectTimer();
    window.location.href = "/cashier";
  };

  const scheduleAutoRedirect = () => {
    clearRedirectTimer();
    redirectTimerRef.current = window.setTimeout(() => {
      handleEnterPos();
    }, 2500);
  };

  useEffect(() => {
    return () => {
      clearRedirectTimer();
      clearPollingInterval();
    };
  }, []);

  useEffect(() => {
    void loadTerminals();
  }, []);

  const loadTerminals = async () => {
    setLoadingTerminals(true);
    setError(null);

    try {
      const result = await terminalApi.getAvailableTerminals();
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setTerminals(result.data);
        if (!selectedTerminalId && result.data.length > 0) {
          setSelectedTerminalId(result.data[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load available terminals");
    } finally {
      setLoadingTerminals(false);
    }
  };


  const handleRequestPairing = async () => {
    if (!selectedTerminalId) {
      setError("Select a terminal before continuing");
      return;
    }

    // Check if user is logged in
    const userInfo = getUserInfo();
    if (!userInfo || userInfo.role !== 'CASHIER') {
      setError("You must be logged in as a cashier to request pairing. Please login first.");
      navigate("/login", { replace: true });
      return;
    }

    setRequestingPairing(true);
    setError(null);
    setMessage(null);
    setPairingRequest(null);
    setPairingStatus(null);
    setPairingSummary(null);

    try {
      console.log("Creating pairing request for terminal:", selectedTerminalId);
      console.log("User info:", userInfo);
      
      const result = await terminalApi.createPairingRequest({
        terminalId: selectedTerminalId,
      });
      
      console.log("Pairing request result:", result);

      if (result.error || !result.data) {
        if (result.status === 401) {
          setError(result.error || "Unauthorized. Browser token not found. Please make sure you logged in using the cashier login endpoint (/api/sessions/cashier/login).");
          // Redirect to login after a delay
          setTimeout(() => {
            navigate("/login", { replace: true });
          }, 3000);
        } else if (result.status === 409) {
          setError(result.error || "You already have a pending pairing request. Please wait for approval.");
          // If there's already a request, try to get its status
          const statusResult = await terminalApi.getPairingRequestStatus(selectedTerminalId);
          if (statusResult.data) {
            setPairingRequest({
              id: statusResult.data.id,
              terminalId: statusResult.data.terminalId,
              terminalCode: selectedTerminal?.code || "",
              terminalDescription: selectedTerminal?.description || "",
              requestedBy: userInfo.id || 0,
              requestedByName: `${userInfo.firstName || ""} ${userInfo.lastName || ""}`.trim() || userInfo.email || "Cashier",
              issuedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              status: statusResult.data.status,
              message: statusResult.data.message,
            });
            setPairingStatus(statusResult.data);
            setStep("waiting");
            startPolling(selectedTerminalId);
          }
        } else {
          setError(result.error || "Unable to create pairing request right now");
        }
        setRequestingPairing(false);
        return;
      }

      setPairingRequest(result.data);
      setMessage(result.data.message || "Your request is pending - Please wait for manager approval");
      setStep("waiting");
      
      // Start polling for status
      startPolling(selectedTerminalId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while creating the request");
      setRequestingPairing(false);
    }
  };

  const startPolling = (terminalId: number) => {
    clearPollingInterval();
    
    const poll = async () => {
      const result = await terminalApi.getPairingRequestStatus(terminalId);
      
      if (result.error) {
        if (result.error === "No pairing request found") {
          // Request might have expired or been deleted
          clearPollingInterval();
          setError("Pairing request not found. Please try again.");
          setStep("select");
          return;
        }
        console.error("Polling error:", result.error);
        return;
      }

      if (result.data) {
        setPairingStatus(result.data);
        
        if (result.data.status === "USED") {
          // Pairing approved! Check pairing status and proceed
          clearPollingInterval();
          await handlePairingApproved(terminalId);
        } else if (result.data.status === "REJECTED") {
          clearPollingInterval();
          setError(result.data.message || "Your request was rejected - Please contact the manager");
          setStep("select");
        } else if (result.data.status === "EXPIRED") {
          clearPollingInterval();
          setError("Request expired (5 minutes) - Please try again");
          setStep("select");
        } else if (result.data.status === "PENDING") {
          setMessage(result.data.message || "Your request is pending...");
        }
      }
    };

    // Poll immediately, then every 3 seconds
    poll();
    pollingIntervalRef.current = window.setInterval(poll, 3000);
  };

  const handlePairingApproved = async (terminalId: number) => {
    // When approved, backend automatically pairs. We just need to check status and proceed
    try {
      // Wait a bit for backend to complete pairing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check pairing status
      const pairingStatusResult = await terminalApi.checkPairingStatus();
      
      if (pairingStatusResult.data?.isPaired && pairingStatusResult.data.terminalId === terminalId) {
        // Get terminal details
        const terminalsResult = await terminalApi.getAvailableTerminals();
        const terminal = terminalsResult.data?.find(t => t.id === terminalId);
        
        if (terminal) {
          // Try to open session if not already open
          const sessionResult = await terminalApi.openSession({
            terminalId: terminalId,
            openingFloat: DEFAULT_OPENING_FLOAT,
          });

          const sessionId = sessionResult.data?.sessionId;
          if (sessionId) {
            setSessionId(sessionId);
            const userInfo = getUserInfo();
            if (userInfo) {
              setUserInfo({
                ...userInfo,
                sessionId: sessionId,
                terminalId: terminalId,
              });
            }
          }

          setPairingSummary({
            terminalId: terminal.id,
            terminalCode: terminal.code,
            terminalDescription: terminal.description,
            isPaired: true,
            sessionId: sessionId || 0,
            sessionStatus: "OPEN",
            openingFloat: DEFAULT_OPENING_FLOAT,
            message: "Pairing successful - You can proceed",
          });
          setStep("success");
          scheduleAutoRedirect();
        } else {
          setError("Request approved but terminal information not found");
        }
      } else {
        // Pairing might still be in progress, wait and retry
        setTimeout(() => handlePairingApproved(terminalId), 2000);
      }
    } catch (err) {
      console.error("Error handling approved pairing:", err);
      setError("Request approved but an error occurred during pairing. Please try again.");
    }
  };


  const handleCancelPairing = () => {
    clearRedirectTimer();
    clearPollingInterval();
    setPairingSummary(null);
    setPairingRequest(null);
    setPairingStatus(null);
    setStep(fromUnpair ? "choice" : "select");
    navigate("/login", {
      replace: true,
      state: { message: "Pairing canceled. You can sign in later when you're ready." },
    });
  };

  const selectedTerminal = useMemo(
    () => terminals.find((terminal) => terminal.id === selectedTerminalId) || null,
    [selectedTerminalId, terminals]
  );

  const stepIndicator = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-500">
      {[
        { label: "1. Choose Action", value: "choice" },
        { label: "2. Pick Terminal", value: "select" },
        { label: "3. Wait for Approval", value: "waiting" },
        { label: "4. Ready", value: "success" },
      ].map((item) => (
        <span
          key={item.value}
          className={`rounded-full px-3 py-1 transition ${
            step === item.value ? "bg-blue-600/10 text-blue-600" : "bg-white text-slate-400"
          }`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm font-medium text-slate-600">
              {fromUnpair
                ? "This browser was disconnected from its terminal. Decide whether to stay signed out or pair again."
                : fromLogin
                ? "Welcome back! Pick a terminal to continue your shift."
                : "Pair this browser with an available POS terminal to start accepting orders."}
            </p>
            <button
              type="button"
              onClick={handleCancelPairing}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              Cancel & switch cashier
            </button>
          </div>

          {stepIndicator}

          {message && (
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === "choice" && (
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={handleCancelPairing}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                <p className="text-lg font-semibold text-slate-900">Skip For Now</p>
                <p className="mt-1 text-sm text-slate-500">
                  You can sign in again later and pair this browser when you're ready.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setStep("select")}
                className="rounded-2xl border border-blue-200 bg-blue-50 px-6 py-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300"
              >
                <p className="text-lg font-semibold text-blue-900">Pair A Terminal</p>
                <p className="mt-1 text-sm text-blue-600">
                  See the list of available terminals and connect this browser in a few seconds.
                </p>
              </button>
            </div>
          )}

          {step === "select" && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-slate-900">Available Terminals</h2>
                  <p className="text-sm text-slate-500">Choose a terminal, then continue to generate a code.</p>
                </div>
                <button
                  type="button"
                  onClick={loadTerminals}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300"
                >
                  Refresh list
                </button>
              </div>
              <div className="space-y-3">
                {loadingTerminals && terminals.length === 0 ? (
                  <p className="text-sm text-slate-500">Loading terminals...</p>
                ) : terminals.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                    No terminals are available right now. Please try again in a moment.
                  </p>
                ) : (
                  terminals.map((terminal) => (
                    <button
                      key={terminal.id}
                      type="button"
                      onClick={() => setSelectedTerminalId(terminal.id)}
                      className={`w-full rounded-2xl border px-5 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        selectedTerminalId === terminal.id
                          ? "border-blue-500 bg-blue-50 shadow"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{terminal.code}</p>
                          <p className="text-sm text-slate-500">{terminal.description}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            terminal.hasActiveSession
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {terminal.hasActiveSession ? "In use" : "Available"}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-between">
                {fromUnpair && (
                  <button
                    type="button"
                    onClick={() => setStep("choice")}
                    className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
                  >
                    Back to options
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRequestPairing}
                  disabled={!selectedTerminalId || requestingPairing}
                  className="rounded-2xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {requestingPairing ? "Sending request..." : "Request Pairing from Manager"}
                </button>
              </div>
            </div>
          )}

          {step === "waiting" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-6">
                <p className="text-sm text-slate-500">Selected terminal</p>
                <p className="text-lg font-semibold text-slate-900">{selectedTerminal?.code}</p>
                <p className="text-sm text-slate-500">{selectedTerminal?.description}</p>
              </div>

              {pairingRequest && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center">
                  <div className="mb-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <svg className="h-6 w-6 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-blue-900">
                    {pairingStatus?.status === "PENDING" ? "Your request is pending..." : 
                     pairingStatus?.status === "USED" ? "Approved!" :
                     pairingStatus?.status === "REJECTED" ? "Rejected" :
                     pairingStatus?.status === "EXPIRED" ? "Expired" :
                     "Processing..."}
                  </p>
                  <p className="mt-2 text-sm text-blue-700">
                    {pairingStatus?.message || pairingRequest.message || "Please wait for manager approval"}
                  </p>
                  {pairingRequest.expiresAt && (
                    <p className="mt-2 text-xs text-blue-600">
                      Expires at: {new Date(pairingRequest.expiresAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <button
                  type="button"
                  onClick={() => {
                    clearPollingInterval();
                    setStep("select");
                    setPairingRequest(null);
                    setPairingStatus(null);
                  }}
                  className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
                >
                  Cancel Request
                </button>
                <p className="text-xs text-slate-500">
                  Status will be updated automatically when manager approves
                </p>
              </div>
            </div>
          )}

          {step === "success" && pairingSummary && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
                <p className="text-sm font-semibold text-emerald-700">Terminal paired successfully</p>
                <h3 className="mt-2 text-2xl font-bold text-emerald-900">
                  {pairingSummary.terminalCode}
                </h3>
                <p className="text-sm text-emerald-800">{pairingSummary.terminalDescription}</p>
                <dl className="mt-4 space-y-2 text-sm text-emerald-900">
                  <div className="flex items-center justify-between">
                    <dt className="text-emerald-800">Opening float</dt>
                    <dd className="font-semibold">
                      {currency.format(pairingSummary.openingFloat ?? DEFAULT_OPENING_FLOAT)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-emerald-800">Session ID</dt>
                    <dd className="font-semibold">#{pairingSummary.sessionId}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-emerald-800">Status</dt>
                    <dd className="font-semibold">{pairingSummary.sessionStatus}</dd>
                  </div>
                </dl>
                {pairingSummary.message && (
                  <p className="mt-4 text-xs text-emerald-700">{pairingSummary.message}</p>
                )}
                <p className="mt-2 text-xs text-emerald-700">
                  Redirecting you to the POS automatically...
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:justify-end">
                <button
                  type="button"
                  onClick={handleEnterPos}
                  className="rounded-2xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-emerald-700"
                >
                  Enter POS now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
