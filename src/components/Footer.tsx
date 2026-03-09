import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-slate-200/70 bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="py-12 sm:py-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-left group">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm ring-1 ring-blue-400/20 flex items-center justify-center overflow-hidden">
                <img
                  src="/picture/retalmind%20(3).jpeg"
                  alt="RetailMind"
                  className="h-10 w-10 rounded-xl object-cover"
                />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight text-slate-900 group-hover:text-slate-800 transition-colors">
                  RetailMind
                </div>
                <div className="text-xs text-slate-500">POS • Inventory • AI</div>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
              A premium retail platform that unifies POS, inventory, terminals, and AI insights—built for fast stores and clean ops.
            </p>
          </div>

          {/* Product */}
          <div>
            <div className="text-sm font-semibold text-slate-900 mb-4">Product</div>
            <ul className="space-y-2.5">
              <li>
                <Link to="/" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/docs/reports" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Accounts */}
          <div>
            <div className="text-sm font-semibold text-slate-900 mb-4">Account</div>
            <ul className="space-y-2.5">
              <li>
                <Link to="/auth/login" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/auth/register" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">
                  Get Started
                </Link>
              </li>
              <li>
                <Link to="/reset-password" className="text-sm text-slate-600 hover:text-blue-700 transition-colors">
                  Reset Password
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div className="text-sm font-semibold text-slate-900 mb-4">Contact</div>
            <div className="space-y-2.5 text-sm text-slate-600">
              <div>support@retailmind.com</div>
              <div>+970 59 123 4567</div>
              <div>Ramallah, Palestine</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/70 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              © {currentYear} RetailMind POS • All rights reserved.
            </p>
            <div className="flex items-center gap-5 text-xs text-slate-500">
              <Link to="/docs/privacy" className="hover:text-blue-700 transition-colors">
                Privacy
              </Link>
              <Link to="/docs/terms" className="hover:text-blue-700 transition-colors">
                Terms
              </Link>
              <Link to="/docs/cookies" className="hover:text-blue-700 transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

