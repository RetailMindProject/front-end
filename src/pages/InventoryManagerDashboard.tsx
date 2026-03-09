import { useState } from "react";
import { Sidebar, Topbar } from "../components";
import InventoryDashboard from "./InventoryDashboard";
import { LayoutDashboard, Package, TrendingUp, Trash2, MessageSquare, ArrowRightLeft } from "lucide-react";
import InventoryOperations from "./InventoryOperations";
import Forecasting from "./Forecasting";
import MessageDetail from "./MessageDetail";
import MessageBox from "./MessageBox";
import Compose from "./Compose";
import WasteManagement from "./WasteManagement";
import TransferRequestsPage from "./TransferRequestsPage";
import { Routes, Route, Navigate } from "react-router-dom";

export default function InventoryManagerDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((s) => !s)}
        links={[
          { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, section: "Analytics" },
          { to: "/dashboard/forecasting", label: "Forecasting", icon: <TrendingUp className="h-4 w-4" />, section: "Analytics" },

          { to: "/dashboard/operations", label: "Inventory Operations", icon: <Package className="h-4 w-4" />, section: "Store Management" },
          { to: "/dashboard/waste", label: "Waste Management", icon: <Trash2 className="h-4 w-4" />, section: "Store Management" },
          { to: "/dashboard/inventory/transfer-requests", label: "Transfer Requests", icon: <ArrowRightLeft className="h-4 w-4" />, section: "Store Management" },

          { to: "/dashboard/message-box", label: "Message Box", icon: <MessageSquare className="h-4 w-4" />, section: "System" },
        ]}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <Routes>
          <Route
            index
            element={
              <div className="flex-1 p-4 md:p-6">

                <InventoryDashboard />
              </div>
            }
          />
          <Route path="operations" element={<div className="flex-1 p-4 md:p-6"><InventoryOperations /></div>} />
          <Route path="waste" element={<div className="flex-1 p-4 md:p-6"><WasteManagement /></div>} />
          <Route path="forecasting/*" element={<div className="flex-1 p-4 md:p-6"><Forecasting /></div>} />
          <Route path="inventory/transfer-requests/:requestId" element={<TransferRequestsPage />} />
          <Route path="inventory/transfer-requests" element={<TransferRequestsPage />} />
          <Route path="message-box" element={<div className="flex-1 overflow-auto"><MessageBox /></div>} />
          <Route path="outbox" element={<Navigate to="../message-box" replace />} />
          <Route path="inbox" element={<Navigate to="../message-box" replace />} />
          <Route path="compose" element={<Compose />} />
          <Route path="message/:id" element={<div className="flex-1 overflow-auto"><MessageDetail /></div>} />
        </Routes>
      </div>
    </div>
  );
}


