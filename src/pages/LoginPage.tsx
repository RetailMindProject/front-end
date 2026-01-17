import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  Brain,
  CreditCard,
  Package,
  FileText,
  Loader2,
  AlertCircle
} from "lucide-react";
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
      case "CUSTOMER":
        return "/customer";
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
      
      // Check for error first
      if (result.error) {
        const errorMessage = result.error.message || "Login failed. Please check your credentials.";
        console.error('[LoginPage] Login error:', result.error);
        
        // Provide specific error messages based on status
        if (result.error.status === 401) {
          setError("Invalid email or password. Please try again.");
        } else if (result.error.status === 403) {
          setError("Access denied. Please contact your administrator.");
        } else if (result.error.status === 429) {
          setError("Too many login attempts. Please try again later.");
        } else {
          setError(errorMessage);
        }
        setLoading(false);
        return;
      }

      // Check for success
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
      } else {
        // Unexpected response shape - no data and no error
        console.error("Unexpected login response: no data and no error", result);
        setError("Unexpected response from server. Please try again.");
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-stretch relative overflow-hidden animate-in fade-in">
      {/* Version Badge */}
      <div className="fixed top-4 right-4 z-50 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 border border-slate-200/50 shadow-sm">
        v1.0
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,_rgb(0_102_255)_1px,_transparent_0)] bg-[length:40px_40px]" />
      </div>

      {/* Abstract Shapes */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl pointer-events-none hidden lg:block" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-300/10 to-cyan-300/10 rounded-full blur-3xl pointer-events-none hidden lg:block" />

      {/* Left Panel - Welcome Section */}
      <div className="flex-1 relative bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col overflow-hidden min-h-[50vh] lg:min-h-screen">
        {/* Logo */}
        <div className="relative z-10">
          <Logo />
        </div>

        {/* RetailMind Logo Card with Glow */}
        <div className="mt-8 md:mt-12 flex justify-center md:justify-start relative z-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0066FF] to-[#0044CC] rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
            <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-700/50 group-hover:shadow-[0_20px_50px_rgba(0,102,255,0.3)] transition-all duration-500 hover:scale-[1.02]">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0066FF] to-[#0044CC] rounded-xl blur-md opacity-50" />
                  <div className="relative p-3 bg-gradient-to-br from-[#0066FF] to-[#0044CC] rounded-xl">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                </div>
                <img
                  src="/picture/retalmind%20(3).jpeg"
                  alt="RetailMind"
                  className="h-16 w-auto rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Content */}
        <div className="mt-12 md:mt-16 max-w-lg relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent leading-tight">
            Welcome to POS
          </h1>
          <p className="text-slate-600 text-lg md:text-xl mb-10 leading-relaxed">
            Sign in to manage sales, inventory, and sessions. Fast, secure, and built for multi-terminal stores.
          </p>

          {/* Feature List */}
          <div className="space-y-5">
            <FeatureItem 
              icon={<CreditCard className="h-5 w-5" />} 
              text="Integrated cash & card sessions" 
            />
            <FeatureItem 
              icon={<Package className="h-5 w-5" />} 
              text="Real-time inventory tracking" 
            />
            <FeatureItem 
              icon={<FileText className="h-5 w-5" />} 
              text="Receipt printing ready" 
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto relative z-10">
          <p className="text-sm text-slate-500">© 2025 RetailMind POS - All rights reserved</p>
        </div>
      </div>

      {/* Right Panel - Sign In Form */}
      <div className="w-full lg:w-[600px] xl:w-[650px] flex items-center justify-center p-6 sm:p-8 md:p-12 lg:p-16 relative z-10 bg-white/30 lg:bg-transparent">
        <AuthCard>
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0066FF] to-[#0044CC] rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
              <div className="relative w-14 h-14 bg-gradient-to-br from-[#0066FF] to-[#0044CC] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span className="text-white font-bold text-xl">P</span>
              </div>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Sign in</h2>
              <p className="text-slate-500 text-sm mt-1">Use your organization account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0066FF] transition-colors duration-200">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@company.com"
                  disabled={loading}
                  className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]/50 focus:border-[#0066FF] disabled:bg-slate-100 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-sm text-[#0066FF] hover:text-[#0044CC] font-medium transition-colors duration-200 hover:underline"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0066FF] transition-colors duration-200">
                  <Lock className="h-5 w-5" />
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
                  className="w-full pl-12 pr-12 py-3.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]/50 focus:border-[#0066FF] disabled:bg-slate-100 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0066FF] transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                    rememberMe 
                      ? 'bg-gradient-to-br from-[#0066FF] to-[#0044CC] border-[#0066FF] shadow-sm' 
                      : 'border-slate-300 group-hover:border-[#0066FF] bg-white'
                  }`}>
                    {rememberMe && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                </div>
                <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">Remember me</span>
              </label>
              <Link 
                to="/forgot-password"
                className="text-sm text-[#0066FF] hover:text-[#0044CC] font-medium transition-colors duration-200 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#0066FF] to-[#0044CC] text-white py-3.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#0066FF]/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-[#0066FF]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Sign in"
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#0044CC] to-[#0066FF] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>

            {/* Terms */}
            <p className="text-center text-xs text-slate-500 leading-relaxed">
              By continuing, you agree to our{" "}
              <a href="#" className="text-[#0066FF] hover:text-[#0044CC] hover:underline transition-colors">
                Terms
              </a>
              {" "}&{" "}
              <a href="#" className="text-[#0066FF] hover:text-[#0044CC] hover:underline transition-colors">
                Privacy
              </a>
              .
            </p>

            {/* Create Account Link */}
            <div className="text-center text-sm pt-2">
              <span className="text-slate-500">First time here?{" "}</span>
              <Link 
                to="/register" 
                className="text-[#0066FF] hover:text-[#0044CC] font-semibold hover:underline transition-colors duration-200"
              >
                Create an account
              </Link>
            </div>
          </form>
        </AuthCard>
      </div>

    </div>
  );
}
