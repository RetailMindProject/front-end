import { useLocation, useNavigate } from "react-router-dom";
import { Mail, ArrowRight, RefreshCw } from "lucide-react";
import AuthCard from "../components/AuthCard";
import Logo from "../components/Logo";

export default function CheckEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as { email?: string })?.email || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo />
        </div>

        <AuthCard>
          <div className="text-center py-6">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-600 mb-4">
                We've sent a verification link to
                {email && (
                  <span className="font-semibold text-gray-900"> {email}</span>
                )}
                {!email && " your email address"}.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Please click the link in the email to verify your account and complete registration.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-sm text-blue-800 font-medium mb-2">What's next?</p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Check your inbox (and spam folder)</li>
                  <li>Click the verification link in the email</li>
                  <li>Your account will be activated automatically</li>
                  <li>You'll be redirected to login</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate("/login")}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Continue to Login
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate("/register")}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Register with Different Email
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              Didn't receive the email? Check your spam folder or contact support.
            </p>
          </div>
        </AuthCard>
      </div>
    </div>
  );
}
