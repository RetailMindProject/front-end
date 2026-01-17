import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { customerApi } from "../services/customer.api";
import AuthCard from "../components/AuthCard";
import Logo from "../components/Logo";

export default function VerifyRegistrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const token = searchParams.get("token");
    const fullUrl = window.location.href;
    const safeUrl = fullUrl.replace(/token=([^&]+)/i, "token=***");

    console.log('[VerifyRegistrationPage] ===== PAGE LOADED =====');
    // Never log tokens. Mask querystring.
    console.log('[VerifyRegistrationPage] Full URL (masked):', safeUrl);
    console.log('[VerifyRegistrationPage] Token from URL:', token ? `present (length: ${token.length})` : 'MISSING');

    if (!token || token.trim().length === 0) {
      console.error('[VerifyRegistrationPage] ❌ No token in URL');
      setStatus("error");
      setMessage("No verification token provided. Please check your email link.");
      return;
    }

    verifyRegistration(token);
  }, [searchParams]);

  useEffect(() => {
    if (status === "success" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === "success" && countdown === 0) {
      // Redirect to customer dashboard after successful verification
      navigate("/customer");
    }
  }, [status, countdown, navigate]);

  const verifyRegistration = async (token: string) => {
    console.log('[VerifyRegistrationPage] Starting verification with token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    try {
      const result = await customerApi.verifyRegistration({ token });

      console.log('[VerifyRegistrationPage] API result:', {
        hasData: !!result.data,
        hasError: !!result.error,
        status: result.status,
        dataSuccess: result.data?.success,
        dataMessage: result.data?.message,
        dataToken: result.data?.token ? 'Token present' : 'No token',
        dataUser: result.data?.user ? 'User present' : 'No user',
        error: result.error,
        fullData: result.data,
      });

      // Check for success: 201 Created means account was created
      // Backend returns 201 with user data + token on success (no "success" field)
      // Error responses return 400 with { success: false, message: "..." }
      const isSuccess = result.status === 201 && result.data && result.data.token;
      
      if (isSuccess && result.data) {
        console.log('[VerifyRegistrationPage] ✅ Verification successful!');
        setStatus("success");
        const firstName = result.data.user?.firstName || "";
        setMessage(
          firstName 
            ? `Welcome ${firstName}! Your account has been verified.`
            : "Account created successfully! Your email has been verified."
        );
        // Token and user info are automatically saved by customerApi.verifyRegistration
      } else {
        console.log('[VerifyRegistrationPage] ❌ Verification failed:', result.error || 'Unknown error');
        setStatus("error");
        const errorMessage = result.error || 
                            result.data?.message || 
                            "Verification failed. This link may be invalid or expired.";
        setMessage(errorMessage);
      }
    } catch (error) {
      console.error('[VerifyRegistrationPage] Exception:', error);
      setStatus("error");
      setMessage("Network error. Please check your connection and try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo />
        </div>

        <AuthCard>
          {status === "loading" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-spin" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying your registration...</h2>
              <p className="text-sm text-gray-600">Please wait while we create your account.</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-6">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Account Created Successfully!</h2>
                <p className="text-gray-600 mb-1">{message}</p>
                <p className="text-sm text-gray-500">You can now access all features.</p>
              </div>

              <button
                onClick={() => navigate("/customer")}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mb-3"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>

              <p className="text-xs text-gray-500">
                Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-6">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Verification Failed</h2>
                <p className="text-gray-600 mb-4">{message}</p>
                <p className="text-sm text-gray-500">
                  This link may be invalid or has expired. Links expire after 24 hours.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate("/register")}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Register Again
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Go to Login
                </button>
              </div>
            </div>
          )}
        </AuthCard>
      </div>
    </div>
  );
}
