import { useState } from "react";
import { Sidebar, Topbar } from "../components";
import InventoryDashboard from "./InventoryDashboard";
import { LayoutDashboard, Package, TrendingUp, Upload, Send, Trash2 } from "lucide-react";
import InventoryOperations from "./InventoryOperations";
import Forecasting from "./Forecasting";
import UploadReport from "./UploadReport";
import MessageDetail from "./MessageDetail";
import Outbox from "./Outbox";
import Compose from "./Compose";
import WasteManagement from "./WasteManagement";
import { Routes, Route } from "react-router-dom";

export default function InventoryManagerDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((s) => !s)}
        links={[
          { to: "/inventory-manager", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
          { to: "/inventory-manager/operations", label: "Inventory Operations", icon: <Package className="h-4 w-4" /> },
          { to: "/inventory-manager/waste", label: "Waste Management", icon: <Trash2 className="h-4 w-4" /> },
          { to: "/inventory-manager/forecasting", label: "Forecasting", icon: <TrendingUp className="h-4 w-4" /> },
          { to: "/inventory-manager/upload-report", label: "Upload Report", icon: <Upload className="h-4 w-4" /> },
          { to: "/inventory-manager/outbox", label: "Outbox", icon: <Send className="h-4 w-4" /> },
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
          <Route path="forecasting" element={<div className="flex-1 p-4 md:p-6"><Forecasting /></div>} />
          <Route
            path="upload-report"
            element={
              <div className="flex-1 p-4 md:p-6">
                <UploadReport
                  recipients={[
                    { value: "store_manager", label: "Store Manager" },
                    { value: "ceo", label: "CEO" },
                  ]}
                />
              </div>
            }
          />
          <Route path="outbox" element={<div className="flex-1 overflow-auto"><Outbox /></div>} />
          <Route path="compose" element={<Compose />} />
          <Route path="message/:id" element={<div className="flex-1 overflow-auto"><MessageDetail /></div>} />
        </Routes>
      </div>
    </div>
  );
}


