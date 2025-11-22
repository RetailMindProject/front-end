import React, { useState } from "react";
import { Topbar } from "../components";
import CEOSidebar from "../components/CEOSidebar";
import StoreDashboard from "./StoreDashboard";
import InventoryDashboard from "./InventoryDashboard";
import ManageAccounts from "./ManageAccounts";
import CreateAccountPage from "./CreateAccountPage";
import ReportsPage from "./reports/ReportsPage";
import Forecasting from "./Forecasting";
import Outbox from "./Outbox";
import MessageDetail from "./MessageDetail";
import Compose from "./Compose";
import { Routes, Route } from "react-router-dom";

export default function CEODashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'store'>('inventory');

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      <CEOSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((s) => !s)} />
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
          <Route path="reports" element={<div className="flex-1 overflow-auto"><ReportsPage /></div>} />
          <Route path="forecasting" element={<div className="flex-1 overflow-auto"><Forecasting /></div>} />
          <Route path="outbox" element={<div className="flex-1 overflow-auto"><Outbox /></div>} />
          <Route path="compose" element={<div className="flex-1 overflow-auto"><Compose /></div>} />
          <Route path="message/:id" element={<MessageDetail />} />
        </Routes>
      </div>
    </div>
  );
}

