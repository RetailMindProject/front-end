import AuthCard from "../components/AuthCard";
import Logo from "../components/Logo";
import FeatureItem from "../components/FeatureItem";
import CreateAccountForm from "../components/CreateAccountForm";
import { Sidebar, Topbar } from "../components";
import type { UserRole } from "../types/user";
import { useState } from "react";

interface CreateAccountPageProps {
  creatorRole: 'CEO' | 'STORE_MANAGER';
  withLayout?: boolean; // New prop to control layout
}

export default function CreateAccountPage({ creatorRole, withLayout = false }: CreateAccountPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Determine allowed roles based on creator
  const allowedRoles: UserRole[] = creatorRole === 'CEO' 
    ? ['INVENTORY_MANAGER', 'STORE_MANAGER', 'CASHIER']
    : ['CASHIER'];

  const title = creatorRole === 'CEO' 
    ? "Create Employee Account" 
    : "Create Cashier Account";

  const subtitle = creatorRole === 'CEO'
    ? "Add inventory manager, store manager, or cashier"
    : "Add a new cashier to your store";

  const handleSubmit = async (data: any) => {
    // This will be connected to your API
    console.log("Creating account:", data);
    alert(`${data.role} account created successfully`);
  };

  const handleNavigate = (page: string) => {
    // Handle navigation if needed
    console.log("Navigate to:", page);
  };

  // Full layout with Sidebar and Topbar (for Store Manager integrated in dashboard)
  if (withLayout) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((s) => !s)} onNavigate={handleNavigate} />
        <div className="flex h-screen flex-1 flex-col">
          <Topbar />
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col justify-center px-6 py-4">
              <div className="mb-4 text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {title}
                </h1>
                <p className="text-gray-600 text-sm">{subtitle}</p>
              </div>

              <div className="max-w-3xl mx-auto w-full">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg">
                          {creatorRole === 'CEO' ? 'E' : 'C'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900">Create New Account</h2>
                        <p className="text-gray-600 text-xs">
                          {creatorRole === 'CEO' ? 'Add inventory manager, store manager, or cashier' : 'Add a new cashier to your store'}
                        </p>
                      </div>
                    </div>
                    
                    <CreateAccountForm 
                      allowedRoles={allowedRoles}
                      onSubmit={handleSubmit}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standalone layout (for CEO or standalone use)
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 py-4 grid lg:grid-cols-2 gap-6 h-full">
        {/* Left side */}
        <section className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-slate-600 bg-white/60 backdrop-blur-sm">
            <Logo />
          </div>

          <h1 className="mt-4 text-3xl font-bold text-slate-900 leading-tight">
            {title}
          </h1>

          <p className="mt-2 text-slate-600 max-w-lg text-sm">
            {subtitle}
          </p>

          <div className="mt-4 space-y-2 text-slate-700">
            <FeatureItem icon="✓" text="Secure account creation" />
            <FeatureItem 
              icon="✓" 
              text={creatorRole === 'CEO' 
                ? "Manage roles and permissions" 
                : "Add and manage cashiers"}
            />
            <FeatureItem icon="✓" text="Integrated with POS system" />
          </div>
        </section>

        {/* Right side */}
        <section className="lg:max-w-md lg:ml-auto flex flex-col justify-center">
          <AuthCard>
            <div className="flex items-center gap-3 mb-4">
              <div className={`grid h-8 w-8 place-items-center rounded-full font-semibold text-sm ${
                creatorRole === 'CEO' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {creatorRole === 'CEO' ? 'E' : 'C'}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create Account</h2>
                <p className="text-xs text-slate-500">
                  {creatorRole === 'CEO' ? 'Employee registration' : 'Cashier registration'}
                </p>
              </div>
            </div>

            <CreateAccountForm 
              allowedRoles={allowedRoles}
              onSubmit={handleSubmit}
            />

            <div className="mt-4 text-center text-sm text-slate-600">
              <a href="/dashboard" className="font-medium text-indigo-600 hover:underline">
                Back to Dashboard
              </a>
            </div>
          </AuthCard>

          <p className="mt-3 text-center text-xs text-slate-500">
            Account will be created in the system immediately.
          </p>
        </section>
      </div>
    </div>
  );
}

// Export convenience components for specific roles
export function CEOCreateAccountPage() {
  return <CreateAccountPage creatorRole="CEO" />;
}

// Store Manager with dashboard layout (Sidebar + Topbar)
export function StoreManagerCreateCashierPage() {
  return <CreateAccountPage creatorRole="STORE_MANAGER" withLayout={true} />;
}

// Store Manager standalone (without Sidebar/Topbar)
export function StoreManagerCreateCashierStandalone() {
  return <CreateAccountPage creatorRole="STORE_MANAGER" withLayout={false} />;
}
