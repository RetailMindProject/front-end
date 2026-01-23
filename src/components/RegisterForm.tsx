import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { customerApi } from "../services/customer.api";

// Password validation regex: at least one digit, one lowercase, one uppercase, one special char, min length 8
const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

// Phone validation regex: ^[0-9+\-\s()]*$
const PHONE_REGEX = /^[0-9+\-\s()]*$/;

export default function RegisterForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // First name validation
    if (!form.firstName.trim()) {
      errors.firstName = "First name is required";
    } else if (form.firstName.length > 60) {
      errors.firstName = "First name must be 60 characters or less";
    }

    // Last name validation (optional but if provided, max 60)
    if (form.lastName && form.lastName.length > 60) {
      errors.lastName = "Last name must be 60 characters or less";
    }

    // Email validation
    if (!form.email.trim()) {
      errors.email = "Email is required";
    } else if (form.email.length > 120) {
      errors.email = "Email must be 120 characters or less";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Phone validation (optional but if provided, must match regex)
    if (form.phone && !PHONE_REGEX.test(form.phone)) {
      errors.phone = "Phone number can only contain digits, +, -, spaces, and parentheses";
    } else if (form.phone && form.phone.length > 20) {
      errors.phone = "Phone number must be 20 characters or less";
    }

    // Password validation
    if (!form.password) {
      errors.password = "Password is required";
    } else if (form.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!PASSWORD_REGEX.test(form.password)) {
      errors.password = "Password must include at least one digit, one lowercase, one uppercase, and one special character";
    }

    // Confirm password validation
    if (!form.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Terms agreement
    if (!form.agree) {
      errors.agree = "You must agree to the Terms & Privacy";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    
    // Clear validation error for this field when user types
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Clear general error when user makes changes
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await customerApi.register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        role: "CUSTOMER",
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      if (result.error) {
        setError(result.error);
        setLoading(false);
      return;
    }

      if (result.data) {
        setSuccess(true);
        setLoading(false);
        // NEW SYSTEM: Registration creates pending account, no token returned
        // Redirect to check-email page instead of dashboard
        setTimeout(() => {
          navigate("/check-email", { 
            state: { email: form.email.trim() } // Pass email for display
          });
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* Success Message */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Registration submitted!</p>
            <p className="text-xs text-green-700 mt-1">Please check your email to verify your account...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Registration failed</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Personal info */}
      <div>
        <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">Personal info</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              First name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="Ahmad"
              maxLength={60}
              className={`w-full h-12 px-4 border rounded-2xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                validationErrors.firstName ? "border-red-300" : "border-slate-200"
              }`}
              required
            />
            {validationErrors.firstName && (
              <p className="text-xs text-red-600 mt-1.5">{validationErrors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Last name</label>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Ewidat"
              maxLength={60}
              className={`w-full h-12 px-4 border rounded-2xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                validationErrors.lastName ? "border-red-300" : "border-slate-200"
              }`}
            />
            {validationErrors.lastName && (
              <p className="text-xs text-red-600 mt-1.5">{validationErrors.lastName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200/70 pt-7">
        <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">Contact</div>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@company.com"
              maxLength={120}
              className={`w-full h-12 px-4 border rounded-2xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                validationErrors.email ? "border-red-300" : "border-slate-200"
              }`}
              required
            />
            {validationErrors.email && (
              <p className="text-xs text-red-600 mt-1.5">{validationErrors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+970 5x xxx xxxx"
                maxLength={20}
                className={`w-full h-12 px-4 border rounded-2xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  validationErrors.phone ? "border-red-300" : "border-slate-200"
                }`}
              />
              {validationErrors.phone && (
                <p className="text-xs text-red-600 mt-1.5">{validationErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Your address"
                className="w-full h-12 px-4 border border-slate-200 rounded-2xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200/70 pt-7">
        <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">Security</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full h-12 pl-4 pr-12 border rounded-2xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  validationErrors.password ? "border-red-300" : "border-slate-200"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {validationErrors.password && (
              <p className="text-xs text-red-600 mt-1.5">{validationErrors.password}</p>
            )}
            <p className="text-xs text-slate-500 mt-1.5">
              At least 8 characters with: digit, lowercase, uppercase, and special character.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirm password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full h-12 pl-4 pr-12 border rounded-2xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  validationErrors.confirmPassword ? "border-red-300" : "border-slate-200"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1.5">{validationErrors.confirmPassword}</p>
            )}
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className={`rounded-2xl border p-4 bg-slate-50 ${validationErrors.agree ? "border-red-200" : "border-slate-200/70"}`}>
        <div className="flex items-start gap-3">
          <input
            id="terms"
            type="checkbox"
            name="agree"
            checked={form.agree}
            onChange={handleChange}
            className={`w-4 h-4 mt-1 rounded text-blue-600 focus:ring-2 focus:ring-blue-500/30 ${
              validationErrors.agree ? "border-red-300" : "border-slate-300"
            }`}
          />
          <label htmlFor="terms" className="text-sm text-slate-700">
            I agree to the{" "}
            <a href="#" className="text-blue-700 hover:underline font-semibold">
              Terms
            </a>{" "}
            and{" "}
            <a href="#" className="text-blue-700 hover:underline font-semibold">
              Privacy Policy
            </a>
            <span className="text-red-500"> *</span>
          </label>
        </div>
        {validationErrors.agree && (
          <p className="text-xs text-red-600 mt-2">{validationErrors.agree}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || success}
        className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-sm hover:shadow-md hover:shadow-blue-500/20 transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Account created!
          </>
        ) : (
          "Create account"
        )}
      </button>

      <p className="text-center text-xs text-slate-500">
        By continuing, you agree to our Terms &amp; Privacy.
      </p>
    </form>
  );
}
