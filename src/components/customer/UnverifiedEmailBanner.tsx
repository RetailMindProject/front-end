import { useState } from "react";
import { AlertCircle, Mail, Loader2, X } from "lucide-react";
import { customerApi } from "../../services/customer.api";

interface UnverifiedEmailBannerProps {
  userEmail?: string;
}

export default function UnverifiedEmailBanner({ userEmail }: UnverifiedEmailBannerProps) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const handleResend = async () => {
    setSending(true);
    setMessage("");

    try {
      const result = await customerApi.resendVerification();

      if (result.data && result.data.success) {
        setMessage("✓ Verification email sent! Check your inbox.");
        setTimeout(() => setMessage(""), 5000);
      } else if (result.status === 429) {
        setMessage("⚠️ Too many requests. Please try again later.");
      } else if (result.status === 400) {
        setMessage("✓ Email already verified.");
        setTimeout(() => setDismissed(true), 2000);
      } else {
        setMessage(`✗ ${result.error || "Failed to send email"}`);
      }
    } catch (error) {
      setMessage("✗ Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (dismissed) return null;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800 mb-1">Email Not Verified</h3>
              <p className="text-sm text-amber-700">
                Please verify your email to access all features.
                {userEmail && <span className="ml-1">Check your inbox at {userEmail}</span>}
              </p>
              {message && (
                <p className={`text-xs mt-2 ${message.startsWith("✓") ? "text-green-700" : message.startsWith("⚠️") ? "text-amber-700" : "text-red-700"}`}>
                  {message}
                </p>
              )}
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-amber-600 hover:text-amber-800 flex-shrink-0"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3">
            <button
              onClick={handleResend}
              disabled={sending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Resend Verification Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
