import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import Logo from "../components/Logo";
import FeatureItem from "../components/FeatureItem";
import { login, cashierLogin } from "../services/auth.api";
import { terminalApi } from "../services/terminal.api";
import { setTokenForRole, setUserInfo } from "../services/tokens";
import type { UserRole } from "../services/tokens";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // First try regular login for all roles (STORE_MANAGER, CEO, INVENTORY_MANAGER, etc.)
      const result = await login(email, password);
      
      if (result.data) {
        // Login successful - check role to determine next step
        const role = result.data.role;
        
        if (role === "CASHIER") {
          // For cashier, try cashier login endpoint to get browser token
          const cashierResult = await cashierLogin(email, password);
          
          if (cashierResult.data) {
            const cashierData = cashierResult.data;
            
            // Save token and user info
            if (cashierData.token) {
              setTokenForRole("CASHIER", cashierData.token);
              setUserInfo({
                id: cashierData.userId,
                userId: cashierData.userId,
                firstName: "",
                lastName: "",
                email: cashierData.username,
                phone: "",
                address: "",
                role: "CASHIER",
                sessionId: cashierData.sessionId,
                terminalId: cashierData.terminalId,
                terminalCode: cashierData.terminalCode,
              });
            }

            // Check pairing status to determine next step
            const pairingStatus = await terminalApi.checkPairingStatus();
            
            if (pairingStatus.data?.isPaired) {
              navigate("/cashier", { replace: true });
            } else {
              navigate("/select-terminal", {
                replace: true,
                state: {
                  message: "This browser is not paired with a terminal yet. Please pair to continue.",
                  fromLogin: true,
                },
              });
            }
            setLoading(false);
            return;
          }

          if (cashierResult.error?.status === 409) {
            const blocker = cashierResult.error.details as { currentUserName?: string } | null | undefined;
            const blockingUserName = blocker?.currentUserName?.trim() || "Another cashier";

            alert(
              `Heads up: ${blockingUserName} is already signed in on this device.\n\n` +
              "Please ask them to end their session before continuing."
            );

            setError(
              blockingUserName === "Another cashier"
                ? "Another cashier is already active on this browser. Please ask them to close the session first."
                : `${blockingUserName} is already active on this browser. Please ask them to close the session first.`
            );
            setLoading(false);
            return;
          }
        } else {
          // For other roles (STORE_MANAGER, CEO, INVENTORY_MANAGER), redirect normally
          const route = getRoleRoute(role);
          navigate(route, { replace: true });
          setLoading(false);
          return;
        }
      }

      if (result.error) {
        setError(result.error.message || "Login failed. Please check your credentials.");
        setLoading(false);
        return;
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

    </div>
  );
}
