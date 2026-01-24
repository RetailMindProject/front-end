import { Link } from "react-router-dom";
import { CUSTOMER_CONTACT, CUSTOMER_STORE_NAME, CUSTOMER_TAGLINE } from "../../constants/customerBranding";

function FooterLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link to={to} className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
      {children}
    </Link>
  );
}

function FooterTodo({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm text-slate-500" title="TODO: wire to real route/anchor">
      {children} <span className="text-[10px] font-bold text-slate-400 ml-1">TODO</span>
    </span>
  );
}

export default function CustomerFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 grid place-items-center shadow-sm ring-2 ring-white/30">
                <div className="h-8 w-8 rounded-lg bg-white/80" />
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900">{CUSTOMER_STORE_NAME}</div>
                <div className="text-xs text-slate-600 mt-0.5">{CUSTOMER_TAGLINE}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-bold text-slate-900 mb-3">Quick Links</div>
            <div className="flex flex-col gap-2">
              <FooterLink to="/dashboard">Home</FooterLink>
              <FooterTodo>Special Offers</FooterTodo>
              <FooterTodo>Popular Items</FooterTodo>
              <FooterLink to="/dashboard/profile">Profile</FooterLink>
            </div>
          </div>

          <div>
            <div className="text-sm font-bold text-slate-900 mb-3">Contact</div>
            <div className="space-y-2 text-sm text-slate-600">
              <div><span className="font-semibold text-slate-800">Location:</span> {CUSTOMER_CONTACT.location}</div>
              <div><span className="font-semibold text-slate-800">Phone:</span> {CUSTOMER_CONTACT.phone}</div>
              <div><span className="font-semibold text-slate-800">Email:</span> {CUSTOMER_CONTACT.email}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-bold text-slate-900 mb-3">Help / Policies</div>
            <div className="flex flex-col gap-2">
              <FooterTodo>Support</FooterTodo>
              <FooterTodo>Privacy Policy</FooterTodo>
              <FooterTodo>Terms</FooterTodo>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500">© {year} RetailMind POS • Customer Portal</div>
          <div className="text-xs text-slate-400">Built for a fast, clean customer experience</div>
        </div>
      </div>
    </footer>
  );
}

