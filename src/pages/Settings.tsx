import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { terminalApi } from "../services/terminal.api";
import { clearSessionId } from "../services/tokens";

export default function Settings() {
  const navigate = useNavigate();
  const [unpairing, setUnpairing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleUnpair = async () => {
    if (unpairing) return;

    const confirmed = window.confirm(
      "Unpair this browser from its terminal? You'll need a new pairing code to reconnect."
    );

    if (!confirmed) {
      return;
    }

    setUnpairing(true);
    setFeedback(null);

    try {
      const result = await terminalApi.unpairTerminal();
      if (result.error) {
        setFeedback(result.error);
        setUnpairing(false);
        return;
      }

      // Clear any client-side session state but keep JWT
      sessionStorage.clear();
      clearSessionId();

      navigate("/select-terminal", {
        replace: true,
        state: {
          message: result.data?.message || "This browser is disconnected. Pick a terminal to continue.",
        },
      });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "فشل فك الربط");
      setUnpairing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-slate-600">Manage terminal pairing and session preferences.</p>
      </div>

      {feedback && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {feedback}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Terminal Pairing</h2>
        <p className="mt-1 text-sm text-slate-600">
          استخدم هذا الخيار لفك الربط بين هذا المتصفح والـ Terminal الحالي بدون تسجيل خروج كامل.
        </p>

        <button
          onClick={handleUnpair}
          disabled={unpairing}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
        >
          <span role="img" aria-label="unplug">
            🔌
          </span>
          {unpairing ? "جارٍ فك الربط..." : "فك ربط هذا الجهاز"}
        </button>
      </div>
    </div>
  );
}


