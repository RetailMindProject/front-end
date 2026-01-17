import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
import { customerApi } from "../services/customer.api";
import AuthCard from "../components/AuthCard";
import Logo from "../components/Logo";

interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<"loading" | "form" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Password requirements state
  const [requirements, setRequirements] = useState<PasswordRequirements>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
  });

  useEffect(() => {
    const tokenParam = searchParams.get("token");

    if (!tokenParam) {
      setStatus("error");
      setMessage("No reset token provided. Please check your email link.");
      return;
    }

    setToken(tokenParam);
    validateToken(tokenParam);
  }, [searchParams]);

  useEffect(() => {
    if (status === "success" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === "success" && countdown === 0) {
      navigate("/login");
    }
  }, [status, countdown, navigate]);

  // Real-time password validation
  useEffect(() => {
    setRequirements({
      minLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasLowercase: /[a-z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      hasSpecial: /[@$!%*?&]/.test(newPassword),
    });
  }, [newPassword]);

  const validateToken = async (token: string) => {
    try {
      const result = await customerApi.validateResetToken(token);

      if (result.data && result.data.valid) {
        setStatus("form");
      } else {
        setStatus("error");
        setMessage(result.data?.message || result.error || "Invalid or expired reset link");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  const allRequirementsMet = Object.values(requirements).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRequirementsMet) {
      setMessage("Password does not meet requirements");
      return;
    }

    if (!passwordsMatch) {
      setMessage("Passwords do not match");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await customerApi.resetPassword({
        token,
        newPassword,
        confirmPassword,
      });

      if (result.data && result.data.success) {
        setStatus("success");
        setMessage(result.data.message || "Password reset successfully");
      } else {
        setMessage(result.error || "Password reset failed");
      }
    } catch (error) {
      setMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
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
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Validating reset link...</h2>
              <p className="text-sm text-gray-600">Please wait while we verify your reset link.</p>
            </div>
          )}

          {status === "form" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Reset Your Password</h2>
                <p className="text-sm text-gray-600">Enter your new password below.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-700 mb-3">Password Requirements:</p>
                  <ul className="space-y-2 text-xs">
                    <li className={`flex items-center gap-2 ${requirements.minLength ? "text-green-600" : "text-gray-500"}`}>
                      <span>{requirements.minLength ? "✓" : "✗"}</span>
                      <span>At least 8 characters</span>
                    </li>
                    <li className={`flex items-center gap-2 ${requirements.hasUppercase ? "text-green-600" : "text-gray-500"}`}>
                      <span>{requirements.hasUppercase ? "✓" : "✗"}</span>
                      <span>One uppercase letter</span>
                    </li>
                    <li className={`flex items-center gap-2 ${requirements.hasLowercase ? "text-green-600" : "text-gray-500"}`}>
                      <span>{requirements.hasLowercase ? "✓" : "✗"}</span>
                      <span>One lowercase letter</span>
                    </li>
                    <li className={`flex items-center gap-2 ${requirements.hasNumber ? "text-green-600" : "text-gray-500"}`}>
                      <span>{requirements.hasNumber ? "✓" : "✗"}</span>
                      <span>One number</span>
                    </li>
                    <li className={`flex items-center gap-2 ${requirements.hasSpecial ? "text-green-600" : "text-gray-500"}`}>
                      <span>{requirements.hasSpecial ? "✓" : "✗"}</span>
                      <span>One special character (@$!%*?&)</span>
                    </li>
                  </ul>
                </div>

                {!passwordsMatch && confirmPassword && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">Passwords do not match</p>
                  </div>
                )}

                {message && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{message}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!allRequirementsMet || !passwordsMatch || loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {status === "success" && (
            <div className="text-center py-6">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Password Reset Successfully!</h2>
                <p className="text-gray-600 mb-1">{message}</p>
                <p className="text-sm text-gray-500">You can now log in with your new password.</p>
              </div>

              <button
                onClick={() => navigate("/login")}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mb-3"
              >
                Continue to Login
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
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Invalid Reset Link</h2>
                <p className="text-gray-600 mb-4">{message}</p>
                <p className="text-sm text-gray-500">
                  This link may be invalid or has expired. Links expire after 1 hour.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate("/forgot-password")}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Request New Reset Link
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
