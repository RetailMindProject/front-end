import React, { useState } from "react";
import { Topbar } from "../components";
import CEOSidebar from "../components/CEOSidebar";
import StoreDashboard from "./StoreDashboard";
import InventoryDashboard from "./InventoryDashboard";
import ManageAccounts from "./ManageAccounts";

export default function CEODashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'store'>('inventory');
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  if (currentPage === 'manage-accounts') {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
        <CEOSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((s) => !s)} onNavigate={handleNavigate} />
        <div className="flex h-screen flex-1 flex-col">
          <Topbar />
          <div className="flex-1 overflow-auto">
            <ManageAccounts />
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'reports') {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
        <CEOSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((s) => !s)} onNavigate={handleNavigate} />
        <div className="flex h-screen flex-1 flex-col">
          <Topbar />
          <div className="flex-1 overflow-hidden p-6">
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'forecasting') {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
        <CEOSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((s) => !s)} onNavigate={handleNavigate} />
        <div className="flex h-screen flex-1 flex-col">
          <Topbar />
          <div className="flex-1 overflow-hidden p-6">
            <h1 className="text-3xl font-bold text-gray-900">Forecasting</h1>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      <CEOSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((s) => !s)} onNavigate={handleNavigate} />
      <div className="flex h-screen flex-1 flex-col">
        <Topbar />
        
        <main className="flex-1 overflow-auto">
          <div className="bg-white border-b border-gray-200 px-6 py-2">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'inventory'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📦 Inventory
              </button>
              <button
                onClick={() => setActiveTab('store')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'store'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
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
      </div>
    </div>
  );
}

