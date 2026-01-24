import { Link, Outlet, useLocation } from "react-router-dom";
import { LogOut, MessageSquare, ReceiptText, User } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Footer from "../components/Footer";
import { useAuth } from "../hooks/useAuth";
import { CUSTOMER_STORE_NAME } from "../constants/customerBranding";
import CustomerChatWidget from "../components/customer/CustomerChatWidget";

function IconLink({
  to,
  label,
  active,
  children,
}: {
  to: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={`relative inline-flex items-center justify-center h-10 w-10 rounded-lg border transition-all duration-200 ${
        active
          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
          : "bg-white/70 border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900"
      }`}
      title={label}
    >
      {children}
    </Link>
  );
}

export default function CustomerLayout() {
  const { pathname } = useLocation();
  const { logout } = useAuth();

  const isMessages = pathname.startsWith("/dashboard/message") || pathname.startsWith("/dashboard/message-box");
  const isOrders = pathname.startsWith("/dashboard/orders");
  const showHeader = !pathname.startsWith("/dashboard/message/");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {showHeader && (
        <PageHeader
          title={CUSTOMER_STORE_NAME}
          icon={
            <img
              src="/picture/retalmind%20(3).jpeg"
              alt="RetailMind"
              className="h-8 w-8 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          }
          right={
            <div className="flex items-center gap-2">
              <IconLink to="/dashboard/message-box" label="Messages" active={isMessages}>
                <MessageSquare className="h-5 w-5" />
              </IconLink>
              <IconLink to="/dashboard/orders" label="Order history" active={isOrders}>
                <ReceiptText className="h-5 w-5" />
              </IconLink>
              <IconLink to="/dashboard/profile" label="Profile" active={pathname === "/dashboard/profile"}>
                <User className="h-5 w-5" />
              </IconLink>
              <button
                onClick={logout}
                className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white/70 border border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900 transition-all duration-200"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          }
        />
      )}

      <main className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Outlet />
      </main>

      <Footer />
      <CustomerChatWidget />
    </div>
  );
}

