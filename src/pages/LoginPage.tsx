import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import Logo from "../components/Logo";
import FeatureItem from "../components/FeatureItem";
import SessionSetupDialog from "../components/SessionSetupDialog";
import { login, logout } from "../services/auth.api";
import { getCurrentToken } from "../services/tokens";
import type { UserRole } from "../services/tokens";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSessionSetup, setShowSessionSetup] = useState(false);

  const getRoleRoute = (role: UserRole): string => {
    switch (role) {
      case "CEO":
        return "/ceo";
      case "STORE_MANAGER":
        return "/store-manager";
      case "INVENTORY_MANAGER":
        return "/inventory-manager";
      case "CASHIER":
        return "/cashier";
      default:
        return "/login";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic validation
    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const result = await login(email, password);

      if (result.error) {
        setError(result.error.message || "Login failed. Please check your credentials.");
        setLoading(false);
        return;
      }

      if (result.data) {
        // If cashier, show session setup dialog instead of navigating directly
        if (result.data.role === "CASHIER") {
          setShowSessionSetup(true);
        } else {
          // For other roles, redirect normally
          const route = getRoleRoute(result.data.role);
          navigate(route, { replace: true });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-stretch">
      {/* Left */}
      <div className="flex-1 p-8 flex flex-col">
        <div><Logo /></div>

        <div className="mt-10 flex justify-center md:justify-start">
          <img
            src="/picture/retalmind%20(3).jpeg"
            alt="RetailMind"
            className="w-56 max-w-full rounded-lg shadow-sm filter brightness-95"
          />
        </div>

        <div className="mt-16 max-w-md">
          <h1 className="text-5xl font-extrabold mb-6 text-gray-800">Welcome to POS</h1>
          <p className="text-gray-600 text-lg mb-8">
            Sign in to manage sales, inventory, and sessions. Fast, secure, and built for multi-terminal stores.
          </p>

          <div className="space-y-6">
            <FeatureItem icon="🔵" text="Integrated cash & card sessions" />
            <FeatureItem icon="📦" text="Real-time inventory tracking" />
            <FeatureItem icon="📄" text="Receipt printing ready" />
          </div>
        </div>

        <div className="mt-auto">
          <p className="text-sm text-gray-500">© 2025 POS - All rights reserved</p>
        </div>
      </div>

      {/* Right */}
      <AuthCard>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-[#0066FF] rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="text-gray-500 text-sm">Use your organization account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@company.com"
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="block text-sm">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-sm text-gray-500"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="••••••••"
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 border-gray-300 rounded text-[#0066FF] focus:ring-2 focus:ring-blue-200"
              />
              <span className="text-sm">Remember me</span>
            </label>
            <a href="#" className="text-[#0066FF] text-sm hover:underline">Forgot password?</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0066FF] text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-center text-sm text-gray-500">
            By continuing, you agree to our Terms&Privacy.
          </p>

          <div className="text-center text-sm">
            <span className="text-gray-500">First time here?</span>{" "}
            <Link to="/register" className="text-[#0066FF] hover:underline">
              Create an account
            </Link>
          </div>
        </form>
      </AuthCard>

      {/* Session Setup Dialog for Cashiers */}
      <SessionSetupDialog
        isOpen={showSessionSetup}
        onClose={() => {
          // If user closes without setting up session, logout and return to login
          logout();
        }}
        onSessionOpened={async (_sessionId) => {
          // Session opened successfully, close dialog first
          setShowSessionSetup(false);
          
          // Verify token exists before navigation
          const token = getCurrentToken();
          if (!token) {
            console.error("No token found after session setup");
            setError("Authentication error. Please login again.");
            return;
          }
          
          // Small delay to ensure dialog closes and state updates
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Navigate to POS screen using window.location to ensure full page load
          // This prevents any potential React Router issues
          window.location.href = "/cashier";
        }}
      />
    </div>
  );
}
