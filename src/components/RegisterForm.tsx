import { useState } from "react";

export default function RegisterForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName ] = useState("");
  const [email,     setEmail    ] = useState("");
  const [phone,     setPhone    ] = useState("");
  const [password,  setPassword ] = useState("");
  const [confirm,   setConfirm  ] = useState("");
  const [agree,     setAgree    ] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return alert("Passwords do not match.");
    if (!agree) return alert("Please agree to the Terms & Privacy.");
    // TODO: استدعاء API لإنشاء حساب Customer
    console.log("Register:", { firstName, lastName, email, phone, password });
    alert("Registered (demo) — customer account created.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">First name</label>
          <input
            value={firstName}
            onChange={e=>setFirstName(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Ahmad"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Last name</label>
          <input
            value={lastName}
            onChange={e=>setLastName(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Ewidat"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          required
          className="mt-1 w-full rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Phone</label>
        <input
          type="tel"
          value={phone}
          onChange={e=>setPhone(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="+970 5x xxx xxxx"
          autoComplete="tel"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={e=>setConfirm(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
      </div>

      <label className="inline-flex items-start gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={agree}
          onChange={e=>setAgree(e.target.checked)}
          className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>
          I agree to the <a href="#" className="text-indigo-600 hover:underline">Terms</a> and{" "}
          <a href="#" className="text-indigo-600 hover:underline">Privacy Policy</a>.
        </span>
      </label>

      <button
        type="submit"
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-white font-medium hover:bg-indigo-700 transition"
      >
        Create account
      </button>
    </form>
  );
}
