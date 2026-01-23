import { useState } from "react";
import { Sidebar, Topbar } from "../components";
import StoreDashboard from "./StoreDashboard";
import InventoryDashboard from "./InventoryDashboard";
import ManageAccounts from "./ManageAccounts";
import CreateAccountPage from "./CreateAccountPage";
import CEOReportsPage from "./reports/CEOReportsPage";
import Forecasting from "./Forecasting";
import MessageBox from "./MessageBox";
import MessageDetail from "./MessageDetail";
import Compose from "./Compose";
import { Routes, Route, Navigate } from "react-router-dom";
import { FileText, LayoutDashboard, MessageSquare, TrendingUp, UsersRound } from "lucide-react";

export default function CEODashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'store'>('inventory');

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((s) => !s)}
        links={[
          { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, section: "Analytics" },
          { to: "/dashboard/reports", label: "Reports", icon: <FileText className="h-4 w-4" />, section: "Analytics" },
          { to: "/dashboard/forecasting", label: "Forecasting", icon: <TrendingUp className="h-4 w-4" />, section: "Analytics" },
          { to: "/dashboard/manage-accounts", label: "Manage Accounts", icon: <UsersRound className="h-4 w-4" />, section: "System" },
          { to: "/dashboard/message-box", label: "Message Box", icon: <MessageSquare className="h-4 w-4" />, section: "System" },
        ]}
      />
      <div className="flex h-screen flex-1 flex-col">
        <Topbar />

        <Routes>
          <Route
            index
            element={
              <main className="flex-1 overflow-auto">
                <div className="bg-white border-b border-gray-200 px-6 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('inventory')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      📦 Inventory
                    </button>
                    <button
                      onClick={() => setActiveTab('store')}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === 'store' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      🏪 Store
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  {activeTab === 'inventory' ? <InventoryDashboard /> : <StoreDashboard />}
                </div>
              </main>
            }
          />
          <Route path="manage-accounts" element={<div className="flex-1 overflow-auto"><ManageAccounts /></div>} />
          <Route path="create-account" element={<div className="flex-1 overflow-auto"><CreateAccountPage /></div>} />
          <Route path="reports" element={<div className="flex-1 overflow-auto"><CEOReportsPage /></div>} />
          <Route path="forecasting/*" element={<div className="flex-1 overflow-auto"><Forecasting /></div>} />
          <Route path="message-box" element={<div className="flex-1 overflow-auto"><MessageBox /></div>} />
          <Route path="outbox" element={<Navigate to="../message-box" replace />} />
          <Route path="inbox" element={<Navigate to="../message-box" replace />} />
          <Route path="compose" element={<div className="flex-1 overflow-auto"><Compose /></div>} />
          <Route path="message/:id" element={<div className="flex-1 overflow-auto"><MessageDetail /></div>} />
        </Routes>
      </div>
    </div>
  );
}

