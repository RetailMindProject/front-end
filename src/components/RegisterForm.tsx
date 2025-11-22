import { useState } from "react";

export default function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.agree) {
      alert("You must agree to the Terms & Privacy.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    // هنا لاحقًا بتربطه مع API تبع Spring Boot
    console.log("Register data:", form);
    alert("Customer registered (demo). Connect this form to your API later.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* First + Last name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-2">First name</label>
          <input
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            placeholder="Ahmad"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-2">Last name</label>
          <input
            type="text"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            placeholder="Ewidat"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm mb-2">Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@company.com"
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm mb-2">Phone</label>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="+970 5x xxx xxxx"
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Password + Confirm */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between mb-2">
            <label className="block text-sm">Password</label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-sm text-gray-500"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="block text-sm">Confirm password</label>
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="text-sm text-gray-500"
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>
          <input
            type={showConfirm ? "text" : "password"}
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      {/* Terms */}
      <div className="flex items-center gap-3">
        <input
          id="terms"
          type="checkbox"
          name="agree"
          checked={form.agree}
          onChange={handleChange}
          className="w-4 h-4 border-gray-300 rounded text-[#0066FF] focus:ring-2 focus:ring-blue-200"
        />
        <label htmlFor="terms" className="text-sm">
          I agree to the{" "}
          <a href="#" className="text-[#0066FF] hover:underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="#" className="text-[#0066FF] hover:underline">
            Privacy Policy
          </a>
        </label>
      </div>

      <button
        type="submit"
        className="w-full bg-[#0066FF] text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-200"
      >
        Create account
      </button>

      <p className="text-center text-sm text-gray-500">
        By continuing, you agree to our Terms&Privacy.
      </p>
    </form>
  );
}
